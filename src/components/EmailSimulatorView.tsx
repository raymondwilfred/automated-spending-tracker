import React, { useState, useEffect } from 'react';
import { Mail, Play, AlertCircle, FileText, CheckCircle2, ShieldAlert, Cpu, Sparkles, RefreshCw, KeyRound, Lock, Unlock, Inbox, ExternalLink, HelpCircle } from 'lucide-react';
import { EmailLog, Transaction, CATEGORIES, CategoryName } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface EmailTemplate {
  title: string;
  sender: string;
  subject: string;
  body: string;
  isTransactional: boolean;
  bank: string;
}

const TEMPLATES: EmailTemplate[] = [
  {
    title: "🍔 HDFC UPI Debit (Swiggy)",
    sender: "alerts@hdfcbank.net",
    subject: "HDFC Bank Alert: Rs. 450.00 debited for Swiggy UPI",
    body: "Rs. 450.00 has been debited from your HDFC Bank account 50201928 for UPI transaction to Swiggy via Ref No. 412345678901 on 20-Jun-2026 at 13:22:15 IST.",
    isTransactional: true,
    bank: "HDFC Bank"
  },
  {
    title: "🛍️ SBI Credit Card (Amazon India)",
    sender: "alerts@sbicard.com",
    subject: "ALERT: Transaction on SBI Credit Card ending 4521",
    body: "Your SBI Credit Card ending 4521 has been used for Rs.1,299.00 at AMAZON.IN on 21-Jun-2026. Ref No: APY-981729384.",
    isTransactional: true,
    bank: "SBI Card"
  },
  {
    title: "🏠 Axis Netbanking Transfer (Rent)",
    sender: "noreply@axisbank.com",
    subject: "Axis Bank Alert: NEFT Outward Transfer Rs. 24,500.00",
    body: "Axis Bank Outward transfer confirmation. Rs.24,500.00 was transferred from your account ending 2049 to MR SHARMA (RENT) via NEFT on 15-Jun-2026. Ref number Axis732984.",
    isTransactional: true,
    bank: "Axis Bank"
  },
  {
    title: "🎬 Netflix Premium Subscription Bill",
    sender: "services@netflix.com",
    subject: "Your subscription renewal: Netflix India",
    body: "Receipt: Netflix India Premium billing completed successfully. Billed Rs. 649.00 to Credit Card ending 8812 on 12-Jun-2026. Next billing date: 12-Jul-2026.",
    isTransactional: true,
    bank: "Netflix"
  },
  {
    title: "🌐 Airtel Broadband Payment (Apeejay)",
    sender: "billing@airtel.in",
    subject: "Broadband Bill Payment Receipt: Rs 799",
    body: "Thank you for your Airtel broadband payment of Rs. 799.00 for landline ID 022-482910 on 18-Jun-2026. Payment method: UPI Gpay.",
    isTransactional: true,
    bank: "Airtel"
  },
  {
    title: "🔑 ICICI OTP Alert (NOT Spending)",
    sender: "alert@icicibank.com",
    subject: "OTP for ICICI Card txn: Rs. 4,500.00 at MakeMyTrip",
    body: "Dear Customer, One Time Password (OTP) for your online transaction of Rs. 4,500.00 on ICICI Bank Credit Card ending 1008 is 928374. OTP is active for 5 mins.",
    isTransactional: false,
    bank: "ICICI Bank"
  },
  {
    title: "🏷️ Myntra Promotional Offer (NOT Spending)",
    sender: "offers@myntra-fashion.com",
    subject: "Flat 50% Off! Weekend Shoe Blowout Sale is Live",
    body: "Dear User, weekend super scale is active. Flat 50% to 70% off on all premium sports shoes. No minimum value required. Order now and get free cashback.",
    isTransactional: false,
    bank: "Promo Network"
  },
  {
    title: "🏍️ Ola Cabs Auto Debit (Transport)",
    sender: "receipts@olacabs.com",
    subject: "Trip Invoice Receipt CRN82937402",
    body: "Thanks for riding with Ola Cabs. Total cost of ride CRN82937402 was Rs. 280.00, automatically debited on 19-Jun-2026 via Linked UPI GPay wallet.",
    isTransactional: true,
    bank: "Ola"
  }
];

interface EmailSimulatorViewProps {
  emailLogs: EmailLog[];
  onParseEmail: (subject: string, sender: string, body: string) => Promise<{ success: boolean; transaction?: Transaction; reason?: string; error?: string }>;
  isParsing: boolean;
}

export default function EmailSimulatorView({ emailLogs, onParseEmail, isParsing }: EmailSimulatorViewProps) {
  // Navigation Tabs inside Ingestion Panel
  const [subTab, setSubTab] = useState<'simulation' | 'gmail'>('simulation');

  // Simulated Email State values
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);
  const [senderInput, setSenderInput] = useState(TEMPLATES[0].sender);
  const [subjectInput, setSubjectInput] = useState(TEMPLATES[0].subject);
  const [bodyInput, setBodyInput] = useState(TEMPLATES[0].body);

  const [activeStep, setActiveStep] = useState<'idle' | 'classifying' | 'parsing' | 'finished' | 'failed'>('idle');
  const [classifierScore, setClassifierScore] = useState<number | null>(null);
  const [extractionResult, setExtractionResult] = useState<Transaction | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  // REAL GMAIL SYNC STATE VARIABLES
  const [gmailClientId, setGmailClientId] = useState<string>(() => {
    return localStorage.getItem('gmail_client_id') || '';
  });
  const [gmailToken, setGmailToken] = useState<string | null>(null);
  const [gmailUserInfo, setGmailUserInfo] = useState<{ email: string; name: string; picture?: string } | null>(null);
  const [gmailSearchQuery, setGmailSearchQuery] = useState<string>('subject:(debit OR credit OR transaction OR spent OR remitted OR alert) OR "ending" OR "UPI to"');
  const [gmailMaxResults, setGmailMaxResults] = useState<number>(5);
  
  // Dynamic sync process indicators
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isGmailLoading, setIsGmailLoading] = useState<boolean>(false);
  const [currentSyncProgress, setCurrentSyncProgress] = useState<{ current: number; total: number } | null>(null);

  // Auto save Client ID locally
  useEffect(() => {
    localStorage.setItem('gmail_client_id', gmailClientId);
  }, [gmailClientId]);

  // Handle direct message communication channel from oauth popup
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      // Security: Validate domain suffix or local match for container runtime
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === "GMAIL_AUTH_SUCCESS" && event.data.token) {
        const token = event.data.token;
        setGmailToken(token);
        logSync("✓ OAuth Access Token successfully acquired securely in memory.");
        fetchGmailUserInfo(token);
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [gmailClientId]);

  const logSync = (msg: string) => {
    setSyncLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const fetchGmailUserInfo = async (token: string) => {
    try {
      logSync("Fetching Google User profile...");
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGmailUserInfo({
          email: data.email,
          name: data.name,
          picture: data.picture
        });
        logSync(`✓ Connected as: ${data.name} (${data.email})`);
      } else {
        logSync("⚠ Unable to resolve Google User details, but Gmail token is active.");
      }
    } catch (e: any) {
      logSync(`⚠ Google user info query error: ${e.message}`);
    }
  };

  const handleConnectGmail = () => {
    if (!gmailClientId || !gmailClientId.trim()) {
      alert("Please provide your Google OAuth Client ID first.");
      return;
    }

    logSync("Preparing Google OAuth window popup...");
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scopes = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";
    
    // Launch standard explicit Implicit Flow
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: gmailClientId.trim(),
      redirect_uri: redirectUri,
      response_type: "token",
      scope: scopes,
      include_granted_scopes: "true",
      prompt: "consent"
    }).toString();

    // Spawn window popup
    const width = 600;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      "google_oauth_popup",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );

    if (!popup) {
      alert("Popup blocker detected! Please allow popups for this site to complete standard Google secure sign-in.");
      logSync("❌ Google Sign In popup was actively blocked by browser.");
    } else {
      logSync("Authorization popup opened. Waiting for permission confirmation...");
    }
  };

  const decodeBase64 = (data: string): string => {
    const cleanData = data.replace(/-/g, '+').replace(/_/g, '/');
    try {
      return decodeURIComponent(escape(atob(cleanData)));
    } catch {
      return atob(cleanData); // fallback without URI decoding
    }
  };

  const extractBodyText = (payload: any): string => {
    if (!payload) return "";
    
    // 1. Direct body text
    if (payload.body && payload.body.data) {
      return decodeBase64(payload.body.data);
    }

    // 2. Multi-part lookup
    let body = "";
    if (payload.parts && payload.parts.length > 0) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body && part.body.data) {
          body += decodeBase64(part.body.data) + "\n";
        } else if (part.mimeType === "text/html" && part.body && part.body.data) {
          // Strip basic HTML elements to keep text readable for Gemini AI
          const rawText = decodeBase64(part.body.data);
          body += rawText.replace(/<[^>]*>/g, ' ') + "\n";
        } else if (part.parts) {
          body += extractBodyText(part) + "\n";
        }
      }
    }
    return body;
  };

  // FETCH & PARSE LIVE GMAIL CORPUS THROUGH GMAIL REST API
  const handlePerformSync = async () => {
    if (!gmailToken) {
      logSync("❌ No active Gmail credential session token found.");
      return;
    }

    setIsGmailLoading(true);
    setSyncLogs([]);
    logSync(`Initiating query: "${gmailSearchQuery}"`);

    try {
      // Page index 1. Load list
      const listUrl = `https://gmail.googleapis.com/v1/users/me/messages?q=${encodeURIComponent(gmailSearchQuery)}&maxResults=${gmailMaxResults}`;
      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${gmailToken}` }
      });

      if (!listRes.ok) {
        if (listRes.status === 401) {
          setGmailToken(null);
          setGmailUserInfo(null);
          throw new Error("Google Session token expired. Please Sign In again.");
        }
        throw new Error(`Gmail API List error: status code ${listRes.status}`);
      }

      const listData = await listRes.json();
      if (!listData.messages || listData.messages.length === 0) {
        logSync("✓ Done. No matching bank emails found with search parameters.");
        setIsGmailLoading(false);
        return;
      }

      const messages = listData.messages;
      logSync(`Discovered ${messages.length} matching emails. Parsing items individually...`);
      setCurrentSyncProgress({ current: 0, total: messages.length });

      let successfullySyncCount = 0;

      for (let i = 0; i < messages.length; i++) {
        const msgRef = messages[i];
        setCurrentSyncProgress({ current: i + 1, total: messages.length });
        logSync(`[${i + 1}/${messages.length}] Querying message ID: ${msgRef.id}...`);

        const detailRes = await fetch(`https://gmail.googleapis.com/v1/users/me/messages/${msgRef.id}?format=full`, {
          headers: { Authorization: `Bearer ${gmailToken}` }
        });

        if (!detailRes.ok) {
          logSync(`⚠ Failed to pull detail for ${msgRef.id}`);
          continue;
        }

        const msgDetail = await detailRes.json();
        const headers = msgDetail.payload?.headers || [];
        
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || "No Subject";
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || "unknown@sender.com";
        const textBody = extractBodyText(msgDetail.payload) || msgDetail.snippet || "";

        logSync(`Found Email: "${subject}" | From: ${from}`);
        logSync("Forwarding email payload to server-side Gemini 3.5 parsing pipeline...");

        // Fire to standard Gemini transactional parse-email route
        const parseRes = await onParseEmail(subject, from, textBody);
        if (parseRes.success && parseRes.transaction) {
          successfullySyncCount++;
          logSync(`✓ SUCCESS. Extracted transaction: ₹${parseRes.transaction.amount} spent at ${parseRes.transaction.merchant_name}`);
        } else {
          logSync(`✕ Skipped/Failed: ${parseRes.error || parseRes.reason || "Non-transactional content detected."}`);
        }
      }

      logSync(`★★ Synchronization Finalized. Ingested ${successfullySyncCount} real financial transactions into the Spend Ledger!`);
      setCurrentSyncProgress(null);
    } catch (err: any) {
      logSync(`❌ Error during sync: ${err.message}`);
    } finally {
      setIsGmailLoading(false);
    }
  };

  const handleTemplateSelection = (idx: number) => {
    setSelectedTemplateIndex(idx);
    setSenderInput(TEMPLATES[idx].sender);
    setSubjectInput(TEMPLATES[idx].subject);
    setBodyInput(TEMPLATES[idx].body);
    setActiveStep('idle');
    setClassifierScore(null);
    setExtractionResult(null);
    setFailureReason(null);
  };

  const handleRunSimulation = async () => {
    setActiveStep('classifying');
    setClassifierScore(null);
    setExtractionResult(null);
    setFailureReason(null);

    await new Promise((resolve) => setTimeout(resolve, 800));

    // Simple heuristic scorer simulation for instantaneous UI update state
    const BANK_SENDER_PATTERNS = [
      /alerts?@.*hdfc/i, /noreply@.*icici/i, /alerts?@.*sbi/i,
      /alerts?@.*axisbank/i, /noreply@.*kotak/i, /alerts?@.*yesbank/i,
      /alerts?@.*paytm/i, /noreply@.*phonepe/i, /alerts?@.*gpay/i,
      /transaction@.*amazon/i, /noreply@.*razorpay/i, /bank/i, /card/i, /cardalerts/i
    ];
    let score = 0;
    const text = `${senderInput} ${subjectInput} ${bodyInput}`.toLowerCase();
    for (const pattern of BANK_SENDER_PATTERNS) {
      if (pattern.test(senderInput)) { score += 0.5; break; }
    }
    let hitCount = 0;
    const keywords = ['debited', 'credited', 'spent', 'payment', 'purchase', 'transaction', 'upi ref', 'utr no', 'rs.', '₹', 'inr'];
    keywords.forEach(kw => { if (text.includes(kw)) hitCount++; });
    score += Math.min(hitCount * 0.1, 0.4);
    if (/(?:rs\.?|₹|inr)\s*[\d,]+(?:\.\d{2})?/i.test(text)) score += 0.2;
    const exclude = ['otp', 'password reset', 'one time password', 'offers', 'flat'];
    exclude.forEach(kw => { if (text.includes(kw)) score -= 0.4; });
    const finalScore = Math.max(0, Math.min(1, score));

    setClassifierScore(finalScore);

    if (finalScore < 0.5) {
      setActiveStep('finished');
      setFailureReason("Classified as Non-Transaction (Blocked at routing layer to prevent unnecessary LLM API costs).");
      await onParseEmail(subjectInput, senderInput, bodyInput);
      return;
    }

    setActiveStep('parsing');
    try {
      const resp = await onParseEmail(subjectInput, senderInput, bodyInput);
      if (resp.success && resp.transaction) {
        setExtractionResult(resp.transaction);
        setActiveStep('finished');
      } else {
        setFailureReason(resp.error || resp.reason || "Extraction failed");
        setActiveStep('failed');
      }
    } catch (err: any) {
      setFailureReason(err?.message || "Internal server error connecting to Gemini SDK");
      setActiveStep('failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'parsed':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono">Parsed Successfully</span>;
      case 'classified_no':
        return <span className="bg-slate-500/10 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono">Filtered (No Txn)</span>;
      case 'failed':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono">Extraction Failed</span>;
      default:
        return <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[10px] font-medium font-mono">{status}</span>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="simulator-container">
      
      {/* LEFT BAY - 7 COL CONTROLS */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Toggle between Simulation and Real GMail Ingestion */}
        <div className="bg-white/5 border border-white/10 p-1 rounded-2xl flex max-w-sm">
          <button
            onClick={() => setSubTab('simulation')}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-xl transition cursor-pointer ${subTab === 'simulation' ? 'bg-white/15 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            🧪 Simulated Ingestion
          </button>
          <button
            onClick={() => setSubTab('gmail')}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-xl transition relative cursor-pointer ${subTab === 'gmail' ? 'bg-white/15 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            📬 Live Gmail Sync
            {gmailToken && (
              <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {subTab === 'simulation' ? (
          /* Simulated Email Panel */
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-semibold tracking-tight text-white font-display">Simulated Bank Notifications</h3>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Pick a pre-formatted notification email payload from standard retail bank accounts, credit card alerts, utility networks, or promo ads to trigger our event-driven processing pipeline.
            </p>

            {/* Preset Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {TEMPLATES.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTemplateSelection(idx)}
                  className={`flex flex-col text-left p-3.5 rounded-2xl border text-xs transition cursor-pointer select-none ${
                    selectedTemplateIndex === idx 
                      ? 'bg-white/10 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-950/25' 
                      : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
                  }`}
                >
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-[10px] text-slate-500 mt-1 font-mono">{item.bank}</span>
                </button>
              ))}
            </div>

            {/* Granular Editing Fields */}
            <div className="space-y-4 border-t border-white/10 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sender Address</label>
                  <input 
                    type="text"
                    value={senderInput}
                    onChange={(e) => setSenderInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-slate-200 focus:bg-white/10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Subject</label>
                  <input 
                    type="text"
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-slate-200 focus:bg-white/10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Body Message</label>
                <textarea 
                  rows={4}
                  value={bodyInput}
                  onChange={(e) => setBodyInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:bg-white/10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={isParsing || activeStep === 'classifying' || activeStep === 'parsing'}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/30"
              >
                {isParsing || activeStep === 'parsing' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gemini LLM Extraction In Progress...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Pipeline Ingestion Engine</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Live Gmail Direct Syncer */
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl space-y-6 transition-all duration-300">
            
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-sm">G</div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight font-display">Live Google Gmail Sync</h3>
                  <p className="text-[10px] text-slate-400">Read live banking notifications directly with OAuth</p>
                </div>
              </div>

              {gmailToken ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Authorized Session</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/40 border border-rose-500/20 text-rose-400 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>Unauthorized</span>
                </div>
              )}
            </div>

            {/* Profile view if active */}
            {gmailUserInfo && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                {gmailUserInfo.picture ? (
                  <img src={gmailUserInfo.picture} alt="Google Profile" className="w-10 h-10 rounded-full border border-white/10 shadow referrerPolicy='no-referrer'" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white uppercase">{gmailUserInfo.name[0]}</div>
                )}
                <div>
                  <h4 className="text-xs font-semibold text-white">{gmailUserInfo.name}</h4>
                  <p className="text-[10px] text-slate-400">{gmailUserInfo.email}</p>
                </div>
                <button
                  onClick={() => {
                    setGmailToken(null);
                    setGmailUserInfo(null);
                    logSync("Signed out of Google Session.");
                  }}
                  className="ml-auto text-[10px] text-slate-500 hover:text-rose-400 font-bold transition px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* Step-by-step setup guides */}
            {!gmailToken && (
              <div className="bg-slate-900/60 border border-indigo-500/10 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>1-Minute OAuth Configuration Instructions</span>
                </div>
                <ol className="text-[10px] text-slate-300 space-y-1.5 list-decimal pl-4.5 leading-relaxed">
                  <li>Navigate to Google Cloud Console Credentials Panel: <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5">console.cloud.google.com <ExternalLink className="w-2.5 h-2.5" /></a></li>
                  <li>Click <strong>+ Create Credentials</strong> &gt; <strong>OAuth client ID</strong> (Set Application Type to <i>Web Application</i>).</li>
                  <li>In Authorized Redirect URIs, specify this exact secure URL:
                    <div className="bg-slate-950 p-1.5 rounded-lg border border-white/5 font-mono text-[9px] text-indigo-300 mt-1 select-all break-all">
                      {window.location.origin}/auth/callback
                    </div>
                  </li>
                  <li>Copy your generated Client ID and paste it in the field below.</li>
                </ol>
              </div>
            )}

            {/* Inputs Block */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Google OAuth Client ID</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="e.g. 12345678-abc123xyz.apps.googleusercontent.com"
                    value={gmailClientId}
                    onChange={(e) => setGmailClientId(e.target.value)}
                    disabled={!!gmailToken}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:bg-white/10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-mono pr-10"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    {gmailToken ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <Unlock className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              {gmailToken && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Subject Keywords Search Query</label>
                    <input
                      type="text"
                      value={gmailSearchQuery}
                      onChange={(e) => setGmailSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 focus:bg-white/10 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Max Scan Count</label>
                    <select
                      value={gmailMaxResults}
                      onChange={(e) => setGmailMaxResults(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="1">1 Email</option>
                      <option value="3">3 Emails</option>
                      <option value="5">5 Emails</option>
                      <option value="10">10 Emails</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!gmailToken ? (
                <button
                  onClick={handleConnectGmail}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/20"
                >
                  <span className="w-4 h-4 rounded-full bg-white text-red-600 flex items-center justify-center font-bold text-[10px]">G</span>
                  <span>Connect GMAIL Securely</span>
                </button>
              ) : (
                <button
                  onClick={handlePerformSync}
                  disabled={isGmailLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/30"
                >
                  {isGmailLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Syncing Live Gmail Inbox...</span>
                    </>
                  ) : (
                    <>
                      <Inbox className="w-4 h-4" />
                      <span>Scan & Ingest Live Gmail Notifications</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        )}

      </div>

      {/* RIGHT BAY - 5 COL PIPELINE ANALYSIS & CONSOLE LOGS */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Core Live Pipeline Logger Console */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
          <div className="bg-white/5 px-4 py-3 border-b border-white/10 text-xs font-semibold text-slate-300 font-mono flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Real-time Ingest Pipeline Log</span>
          </div>

          <div className="p-5 min-h-[295px] flex flex-col justify-center space-y-4 font-mono text-[11px]">
            {subTab === 'simulation' ? (
              // Live logs for simulation
              <>
                {activeStep === 'idle' && (
                  <div className="text-center text-slate-500 py-10">
                    <Mail className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p>Waiting for bank log ingestion...</p>
                    <p className="text-[9px] text-slate-600 mt-1">Select a simulated bank email and click run above.</p>
                  </div>
                )}

                {/* Step 1: Classification Routing */}
                {(activeStep !== 'idle') && (
                  <div className="space-y-1.5 p-3.5 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span>1.</span>
                        <span>Classification Layer (Zod Regex)</span>
                      </span>
                      <span className="text-[10px] text-slate-600 font-normal">Active</span>
                    </div>
                    <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-slate-500">Checking keywords & bank headers...</p>
                      {classifierScore !== null ? (
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-slate-400">Heuristics Signal Score:</span>
                          <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${classifierScore >= 0.5 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-slate-800 text-slate-400'}`}>
                            {classifierScore.toFixed(2)} / 1.00
                          </span>
                        </div>
                      ) : (
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                          <div className="bg-indigo-500 h-full animate-[shimmer_1.5s_infinite]" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2: Gemini LLM Extraction */}
                {(activeStep === 'parsing' || activeStep === 'finished' || activeStep === 'failed') && classifierScore !== null && classifierScore >= 0.5 && (
                  <div className="space-y-1.5 p-3.5 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span>2.</span>
                        <span>Gemini 3.5 Schema Extraction</span>
                      </span>
                      <span className="text-[10px] text-slate-600 font-normal flex items-center gap-1">
                        <Sparkles className="w-3" /> API Route
                      </span>
                    </div>
                    <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                      {activeStep === 'parsing' ? (
                        <div className="space-y-2">
                           <p className="text-slate-500 text-[10px] animate-pulse">Running server-side unstructured email parsing via Gemini...</p>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full animate-[shimmer_1.5s_infinite]" />
                          </div>
                        </div>
                      ) : extractionResult ? (
                        <div className="space-y-1 text-slate-300">
                          <p className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Structured JSON Output received</p>
                          <div className="bg-slate-950/80 p-2 rounded-xl text-[10px] text-slate-400 font-mono leading-relaxed mt-2.5 overflow-x-auto max-h-48 whitespace-pre-wrap">
                            {JSON.stringify({
                              amount: extractionResult.amount,
                              currency: extractionResult.currency,
                              merchant_name: extractionResult.merchant_name,
                              category: extractionResult.category,
                              payment_method: extractionResult.payment_method,
                              transaction_ref: extractionResult.transaction_ref,
                              transaction_at: extractionResult.transaction_at,
                              confidence: extractionResult.llm_confidence
                            }, null, 2)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-rose-400 text-[10px] flex items-center gap-1">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>{failureReason || "Failed to initialize standard @google/genai module."}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Block Warn */}
                {activeStep === 'finished' && classifierScore !== null && classifierScore < 0.5 && (
                  <div className="p-3.5 bg-amber-950/40 border border-amber-900/40 rounded-xl space-y-1.5 text-amber-400">
                    <div className="flex items-center gap-1 bg-amber-900/30 p-1 rounded font-bold">
                      <ShieldAlert className="w-4 h-4" /> Routing Filter Triggered
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-400">
                      This message failed to breach the 0.50 threshold of financial identifiers. Transaction extraction has been aborted to safeguard API quote levels.
                    </p>
                  </div>
                )}
              </>
            ) : (
              // Live logs for GMail integration
              <div className="space-y-4 h-full flex flex-col justify-between">
                {currentSyncProgress && (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Syncing messages progress</span>
                      <span>{currentSyncProgress.current} / {currentSyncProgress.total}</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full transition-all duration-300"
                        style={{ width: `${(currentSyncProgress.current / currentSyncProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-[10px] leading-relaxed text-indigo-200 overflow-y-auto max-h-[300px] space-y-1 scrollbar-thin">
                  {syncLogs.length > 0 ? (
                    syncLogs.map((log, idx) => (
                      <div key={idx} className="whitespace-pre-wrap">{log}</div>
                    ))
                  ) : (
                    <div className="text-center text-slate-600 py-12">
                      <Inbox className="w-6 h-6 text-slate-700 mx-auto mb-1.5" />
                      <span>Console Logs output...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Historic logs strip */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-md">
          <h4 className="text-sm font-semibold text-slate-200 mb-4 font-display">Ingestion Audit Log ({emailLogs.length})</h4>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {emailLogs.length > 0 ? (
              emailLogs.map((log) => (
                <div key={log.id} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-3.5 text-xs transition space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 truncate max-w-[150px]" title={log.subject}>
                      {log.subject}
                    </span>
                    {getStatusBadge(log.status)}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span className="truncate max-w-[150px]">From: {log.sender}</span>
                    <span>Score: {log.score.toFixed(2)}</span>
                  </div>
                  {log.error_message && (
                    <div className="text-[10px] text-rose-400/90 leading-tight bg-rose-950/20 p-1.5 border border-rose-900/30 rounded mt-1">
                      {log.error_message}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-slate-600 py-6 text-xs font-mono">No audits saved in this runtime.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
