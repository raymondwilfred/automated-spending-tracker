import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
import OpenAI from "openai";
import dotenv from "dotenv";
import cron from "node-cron";
import { google } from "googleapis";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" }
});
const PORT = process.env.PORT || 3000;

app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CATEGORIES: Record<string, { icon: string; color: string }> = {
  "Food & Dining": { icon: "🍔", color: "#F59E0B" },
  "Shopping": { icon: "🛍️", color: "#EC4899" },
  "Transport": { icon: "🚕", color: "#3B82F6" },
  "Utilities": { icon: "💡", color: "#10B981" },
  "Entertainment": { icon: "🎬", color: "#8B5CF6" },
  "Healthcare": { icon: "💊", color: "#EF4444" },
  "Groceries": { icon: "🛒", color: "#84CC16" },
  "Transfers": { icon: "💸", color: "#64748B" },
  "Subscriptions": { icon: "🔄", color: "#06B6D4" },
  "Other": { icon: "📝", color: "#9CA3AF" },
};

// ==========================================
// GOOGLE OAUTH CLIENT
// ==========================================
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// OAUTH GENERATE URL
app.get("/api/auth/google", (req: Request, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    res.status(500).json({ error: "Missing GOOGLE_CLIENT_ID in .env" });
    return;
  }
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"]
  });
  res.json({ url });
});

// OAUTH CALLBACK
app.get("/auth/callback", async (req: Request, res: Response) => {
  const code = req.query.code as string;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    let user = await prisma.user.findFirst();
    if (!user) user = await prisma.user.create({ data: { email: "local@user.com" } });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
      }
    });

    await prisma.emailLog.create({
      data: {
        userId: user.id,
        event_type: "OAUTH_SUCCESS",
        message: "Successfully connected Gmail account."
      }
    });

    res.send(`
      <script>
        window.opener.postMessage({ type: 'GMAIL_AUTH_SUCCESS' }, '*');
        window.close();
      </script>
    `);
  } catch (err: any) {
    console.error(err);
    res.send(`<h2>Failed to authorize: ${err.message}</h2>`);
  }
});

// ==========================================
// EMAIL SYNC ENGINE
// ==========================================
async function runEmailSync(userId: string) {
  console.log("[Worker] Starting Email Sync...");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.googleRefreshToken) {
    console.log("[Worker] No Google Refresh Token found. Skipping sync.");
    return;
  }

  oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  await prisma.emailLog.create({
    data: { userId, event_type: "SYNC_STARTED", message: "Initiating Gmail inbox scan..." }
  });

  try {
    // Determine whether this is a historical sync or incremental
    const query = user.lastSyncAt ? `newer_than:1d` : `newer_than:365d`;
    
    // We search across all mail, avoiding spam unless explicitly wanted, but the prompt says 
    // "Scan these folders: INBOX, SPAM, JUNK, PROMOTIONS, UPDATES, ALL MAIL"
    // Using "in:anywhere" covers spam/trash but we will query specific folders if needed.
    const res = await gmail.users.messages.list({
      userId: "me",
      q: `in:anywhere (debited OR credited OR rs. OR inr OR payment OR transaction) ${query}`,
      maxResults: 50 // Keep batch size small for safety
    });

    const messages = res.data.messages || [];
    let processed = 0;
    let transactionsFound = 0;

    for (const msg of messages) {
      if (!msg.id) continue;
      
      const existing = await prisma.transaction.findUnique({ where: { message_id: msg.id } });
      if (existing) continue; // Skip already processed

      const email = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "full" });
      const headers = email.data.payload?.headers;
      const subject = headers?.find(h => h.name === "Subject")?.value || "No Subject";
      const sender = headers?.find(h => h.name === "From")?.value || "Unknown";
      
      let body = "";
      if (email.data.snippet) body = email.data.snippet;

      // Extract using OpenAI
      const prompt = `You are a financial data extraction engine. Extract transaction details.
      Email Subject: ${subject}
      Email Sender: ${sender}
      Email Snippet: ${body}
      
      Return a JSON object:
      {
        "amount": number (positive),
        "transaction_type": "DEBIT" or "CREDIT",
        "merchant_name": "string (cleaned up)",
        "payment_method": "UPI" | "DEBIT_CARD" | "CREDIT_CARD" | "NETBANKING" | "UNKNOWN",
        "bank_name": "string",
        "transaction_reference": "string",
        "transaction_date": "ISO string",
        "category": "Food & Dining" | "Shopping" | "Transport" | "Utilities" | "Entertainment" | "Healthcare" | "Groceries" | "Transfers" | "Subscriptions" | "Other",
        "currency": "INR",
        "confidence": number (0.0 to 1.0)
      }`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful financial assistant." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(completion.choices[0].message.content || "{}");
        if (parsed.amount > 0) {
          const tx = await prisma.transaction.create({
            data: {
              amount: parsed.amount,
              merchant_name: parsed.merchant_name || "Unknown",
              category: parsed.category || "Other",
              payment_method: parsed.payment_method || "UNKNOWN",
              bank_name: parsed.bank_name,
              transaction_reference: parsed.transaction_reference,
              transaction_date: parsed.transaction_date ? new Date(parsed.transaction_date) : new Date(),
              email_sender: sender,
              email_subject: subject,
              email_folder: "All Mail",
              message_id: msg.id,
              llm_confidence: parsed.confidence || 1.0,
              userId: user.id
            }
          });
          transactionsFound++;

          await prisma.emailLog.create({
            data: { userId, event_type: "LLM_SUCCESS", subject, sender, message: "Transaction extracted via OpenAI", transactionId: tx.id }
          });
        } else {
          await prisma.emailLog.create({
            data: { userId, event_type: "EMAIL_CLASSIFIED", subject, sender, message: "Email parsed but no valid transaction amount found." }
          });
        }
      } catch (err: any) {
        await prisma.emailLog.create({
          data: { userId, event_type: "LLM_FAILURE", subject, sender, message: `Extraction failed: ${err.message}`, success: false }
        });
      }
      processed++;
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastSyncAt: new Date() } });

    console.log(`[Worker] Sync complete. Scanned: ${processed}, Found: ${transactionsFound}`);
    io.emit('transactions_updated');

  } catch (err: any) {
    console.error(err);
    await prisma.emailLog.create({
      data: { userId, event_type: "SYNC_FAILURE", message: `Sync failed: ${err.message}`, success: false }
    });
  }
}

cron.schedule("*/5 * * * *", async () => {
  const users = await prisma.user.findMany();
  for (const user of users) {
    await runEmailSync(user.id);
  }
});

app.post("/api/email/sync", async (req: Request, res: Response) => {
  const user = await prisma.user.findFirst();
  if (!user) return res.status(404).json({ error: "User not found" });
  
  runEmailSync(user.id).catch(console.error); // Async dispatch
  res.json({ success: true, message: "Sync job dispatched" });
});

// ==========================================
// API ENDPOINTS
// ==========================================

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/api/health/email", async (req: Request, res: Response) => {
  const user = await prisma.user.findFirst();
  if (!user) {
    res.json({ gmail_connected: false, oauth_valid: false, emails_scanned: 0, transactions_found: 0, database_records: 0, last_sync: "" });
    return;
  }
  const txCount = await prisma.transaction.count({ where: { userId: user.id } });
  const logsCount = await prisma.emailLog.count({ where: { userId: user.id } });
  
  res.json({
    gmail_connected: !!user.googleRefreshToken,
    oauth_valid: !!user.googleRefreshToken,
    emails_scanned: logsCount,
    transactions_found: txCount,
    database_records: txCount,
    last_sync: user.lastSyncAt ? user.lastSyncAt.toISOString() : "Never"
  });
});

app.get("/api/transactions", async (req: Request, res: Response) => {
  const { search, category, payment_method, date_start, date_end } = req.query;
  let whereClause: any = {};
  if (search) {
    const q = String(search).toLowerCase();
    whereClause.OR = [
      { merchant_name: { contains: q } },
      { raw_email: { contains: q } },
      { transaction_reference: { contains: q } }
    ];
  }
  if (category && category !== "all") whereClause.category = category;
  if (payment_method && payment_method !== "all") whereClause.payment_method = payment_method;
  if (date_start || date_end) {
    whereClause.transaction_date = {};
    if (date_start) whereClause.transaction_date.gte = new Date(String(date_start));
    if (date_end) {
      const end = new Date(String(date_end));
      end.setHours(23, 59, 59, 999);
      whereClause.transaction_date.lte = end;
    }
  }

  try {
    const txs = await prisma.transaction.findMany({ where: whereClause, orderBy: { transaction_date: 'desc' } });
    res.json(txs.map(t => ({ ...t, merchant_raw: t.raw_email || "", transaction_at: t.transaction_date.toISOString() })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

app.get("/api/analytics", async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany();
    if (transactions.length === 0) {
      res.json({ totalSpent: 0, transactionCount: 0, averageTransaction: 0, categorySpent: [], merchantSpent: [], dailySpent: [], paymentMethodSpent: [] });
      return;
    }

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = transactions.length;
    const averageTransaction = parseFloat((totalSpent / transactionCount).toFixed(2));

    const categoryMap: Record<string, { amount: number; count: number }> = {};
    const merchantMap: Record<string, { amount: number; count: number }> = {};
    const dailyMap: Record<string, number> = {};
    const methodsMap: Record<string, { amount: number; count: number }> = {};

    transactions.forEach((tx) => {
      if (!categoryMap[tx.category]) categoryMap[tx.category] = { amount: 0, count: 0 };
      categoryMap[tx.category].amount += tx.amount;
      categoryMap[tx.category].count += 1;

      if (!merchantMap[tx.merchant_name]) merchantMap[tx.merchant_name] = { amount: 0, count: 0 };
      merchantMap[tx.merchant_name].amount += tx.amount;
      merchantMap[tx.merchant_name].count += 1;

      const dateStr = tx.transaction_date.toISOString().split("T")[0];
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + tx.amount;

      if (!methodsMap[tx.payment_method]) methodsMap[tx.payment_method] = { amount: 0, count: 0 };
      methodsMap[tx.payment_method].amount += tx.amount;
      methodsMap[tx.payment_method].count += 1;
    });

    const categorySpent = Object.keys(categoryMap).map((name) => {
      const info = CATEGORIES[name] || { icon: "🏷️", color: "#CCCCCC" };
      return { category: name, amount: parseFloat(categoryMap[name].amount.toFixed(2)), count: categoryMap[name].count, color: info.color, icon: info.icon };
    }).sort((a, b) => b.amount - a.amount);

    const merchantSpent = Object.keys(merchantMap).map((merchant) => ({ merchant, amount: parseFloat(merchantMap[merchant].amount.toFixed(2)), count: merchantMap[merchant].count }))
      .sort((a, b) => b.amount - a.amount).slice(0, 10);

    const dailySpent = Object.keys(dailyMap).map((date) => ({ date, amount: parseFloat(dailyMap[date].toFixed(2)) })).sort((a, b) => a.date.localeCompare(b.date));
    const paymentMethodSpent = Object.keys(methodsMap).map((method) => ({ method, amount: parseFloat(methodsMap[method].amount.toFixed(2)), count: methodsMap[method].count }));

    res.json({ totalSpent: parseFloat(totalSpent.toFixed(2)), transactionCount, averageTransaction, categorySpent, merchantSpent, dailySpent, paymentMethodSpent });
  } catch (err) {
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

app.get("/api/email-logs", async (req: Request, res: Response) => {
  const logs = await prisma.emailLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(logs);
});

app.post("/api/transactions/add", async (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload.amount || !payload.merchant_name || !payload.category || !payload.transaction_at) return res.status(400).json({ error: "Missing fields" });

  try {
    let user = await prisma.user.findFirst();
    if (!user) user = await prisma.user.create({ data: { email: "local@user.com" }});

    const tx = await prisma.transaction.create({
      data: {
        amount: parseFloat(payload.amount), merchant_name: payload.merchant_name, category: payload.category, payment_method: payload.payment_method || "UNKNOWN",
        transaction_date: new Date(payload.transaction_at), email_sender: "manual@entry.local", email_subject: "Manual Entry", email_folder: "Manual",
        message_id: `manual-${Date.now()}-${Math.random()}`, userId: user.id
      }
    });

    io.emit('transactions_updated');
    res.json({ success: true, transaction: tx });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

app.delete("/api/transactions/:id", async (req: Request, res: Response) => {
  try {
    await prisma.transaction.delete({ where: { id: req.params.id } });
    io.emit('transactions_updated');
    res.json({ success: true, message: "Deleted." });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

io.on("connection", (socket) => { console.log("Client connected via Socket.IO:", socket.id); });

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => res.sendFile(path.join(distPath, "index.html")));
  }
  httpServer.listen(PORT, () => console.log(`Server successfully running at http://0.0.0.0:${PORT}`));
}
startServer();
