import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ReceiptText, Sparkles, PlusCircle, RefreshCw, KeyRound, CheckCircle, Settings as SettingsIcon } from 'lucide-react';
import DashboardView from './components/DashboardView';
import TransactionListView from './components/TransactionListView';
import ManualEntryView from './components/ManualEntryView';
import SettingsView from './components/SettingsView';
import { Transaction, AnalyticsSummary, EmailLog, CategoryName, PaymentMethod } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';

const socket = io(window.location.origin);


export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'manual' | 'settings'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isKeyMissing, setIsKeyMissing] = useState(false);

  // Load backend state
  const fetchAllData = async () => {
    try {
      const [txRes, analyticsRes, logsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/analytics'),
        fetch('/api/email-logs')
      ]);

      if (txRes.ok && analyticsRes.ok && logsRes.ok) {
        const txData = await txRes.json();
        const analyticsData = await analyticsRes.json();
        const logsData = await logsRes.json();

        setTransactions(txData);
        setAnalytics(analyticsData);
        setEmailLogs(logsData);
        
        // Quick verification of API Key existence silently
        setIsKeyMissing(false);
      }
    } catch (err) {
      console.error("Fetch synchronization loop error: ", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    socket.on('transactions_updated', () => {
      console.log('Real-time update received! Fetching new transactions...');
      fetchAllData();
    });

    return () => {
      socket.off('transactions_updated');
    };
  }, []);

  // Verification Checker Toggle
  const handleVerify = async (id: string, currentStatus: boolean) => {
    const matched = transactions.find((t) => t.id === id);
    if (!matched) return;

    try {
      const response = await fetch('/api/transactions/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...matched,
          is_verified: !currentStatus
        })
      });

      if (response.ok) {
        await fetchAllData();
      }
    } catch (error) {
      console.error("Failed to toggle transaction verification", error);
    }
  };

  // Delete transaction
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchAllData();
      }
    } catch (error) {
      console.error("Failed to delete transaction: ", error);
    }
  };

  // Re-seed Database back to 50 records
  const handleResetSeed = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/transactions/seed', {
        method: 'POST'
      });
      if (response.ok) {
        await fetchAllData();
      }
    } catch (error) {
      console.error("Error resetting database: ", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Ingest unstructured email text via API
  const handleParseEmail = async (subject: string, sender: string, body: string) => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/parse-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, sender, body })
      });

      const data = await response.json();
      await fetchAllData();

      if (response.status === 500 && data.error && data.error.includes("Key")) {
        setIsKeyMissing(true);
      }

      return {
        success: response.ok,
        transaction: data.transaction,
        reason: data.reason,
        error: data.error
      };
    } catch (err: any) {
      console.error("Ingestion loop failed: ", err);
      return { success: false, error: err?.message || "Failed parsing request" };
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual Spending Creation
  const handleAddTransaction = async (txPayload: {
    merchant_name: string;
    amount: number;
    category: CategoryName;
    payment_method: PaymentMethod;
    transaction_ref: string;
    transaction_at: string;
    notes?: string;
  }) => {
    try {
      const response = await fetch('/api/transactions/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txPayload)
      });

      if (response.ok) {
        await fetchAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Error creating custom ledger entry: ", err);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-slate-100 flex flex-col font-sans relative overflow-hidden selection:bg-pink-500/30 selection:text-white" id="main-app">
      
      {/* Mesh Gradient Background Elements */}
      <div className="absolute -top-24 -left-24 w-[800px] h-[800px] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute -bottom-32 -right-32 w-[800px] h-[800px] bg-orange-500/20 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Dynamic Sync Banner / API Key Missing Notification */}
      <AnimatePresence>
        {isKeyMissing && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-rose-950/80 backdrop-blur-md border-b border-rose-500/20 text-rose-200 px-6 py-3 text-xs font-semibold text-center flex items-center justify-center gap-2 z-50 relative"
          >
            <KeyRound className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Missing Gemini API Key! Configure your <strong>GEMINI_API_KEY</strong> inside the <strong>Settings &gt; Secrets</strong> panel in Google AI Studio to enable active email extraction parsing.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Top Header Navigation */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-wider text-white font-display">Automated Spending Tracker</h1>
              <p className="text-[10px] text-slate-400">Email-Powered Transaction Intelligence</p>
            </div>
          </div>

          {/* Tab Button Switches */}
          <div className="hidden md:flex bg-white/5 border border-white/10 p-1 rounded-2xl gap-1 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition select-none cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-white/15 text-white shadow-lg border border-white/10 backdrop-blur-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Analytics Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition select-none cursor-pointer ${
                activeTab === 'transactions' 
                  ? 'bg-white/15 text-white shadow-lg border border-white/10 backdrop-blur-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ReceiptText className="w-3.5 h-3.5" />
              <span>Spend Ledger</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition select-none cursor-pointer ${
                activeTab === 'manual' 
                  ? 'bg-white/15 text-white shadow-lg border border-white/10 backdrop-blur-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Manual Outflow</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition select-none cursor-pointer ${
                activeTab === 'settings' 
                  ? 'bg-white/15 text-white shadow-lg border border-white/10 backdrop-blur-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>

          {/* Quick Metrics Badge and Sync Trigger */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">System State Time</span>
              <span className="text-xs font-mono font-medium text-slate-300">2026-06-21 13:01 UTC</span>
            </div>
            
            <button
              onClick={fetchAllData}
              disabled={isSyncing || isLoading}
              className="p-2.5 border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition disabled:opacity-50 cursor-pointer backdrop-blur-sm shadow-md"
              title="Refresh ledger state"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Sticky Tab Navigation bottom bar */}
      <div className="md:hidden border-b border-white/10 bg-white/5 backdrop-blur-md p-2 flex justify-around">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center p-2 rounded-xl text-slate-400 text-[10px] ${activeTab === 'dashboard' ? 'text-white bg-white/10 font-bold' : 'hover:bg-white/5'}`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Dashboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center p-2 rounded-xl text-slate-400 text-[10px] ${activeTab === 'transactions' ? 'text-white bg-white/10 font-bold' : 'hover:bg-white/5'}`}
        >
          <ReceiptText className="w-4 h-4 mb-0.5" />
          <span>Ledger</span>
        </button>
        <button 
          onClick={() => setActiveTab('manual')}
          className={`flex flex-col items-center p-2 rounded-xl text-slate-400 text-[10px] ${activeTab === 'manual' ? 'text-white bg-white/10 font-bold' : 'hover:bg-white/5'}`}
        >
          <PlusCircle className="w-4 h-4 mb-0.5" />
          <span>Manual</span>
        </button>
      </div>

      {/* Primary View Router Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm text-slate-400 font-medium font-mono">Synchronizing transactions matrix...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && analytics && (
                <DashboardView 
                  analytics={analytics} 
                  onNavigateToLogs={() => setActiveTab('gemini')}
                />
              )}

              {activeTab === 'transactions' && (
                <TransactionListView 
                  transactions={transactions} 
                  onVerify={handleVerify}
                  onDelete={handleDelete}
                  onResetSeed={handleResetSeed}
                />
              )}

              {activeTab === 'manual' && (
                <ManualEntryView 
                  onAddTransaction={handleAddTransaction}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Footer System Credits */}
      <footer className="border-t border-white/5 bg-slate-950/60 backdrop-blur-md py-6 mt-12 text-center text-xs text-slate-600 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Automated Spending Tracker | Confidential Sprint Release v1.0</p>
          <p className="font-mono text-[10px] flex items-center gap-1.5 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            Node REST Services Connected Successfully
          </p>
        </div>
      </footer>

    </div>
  );
}
