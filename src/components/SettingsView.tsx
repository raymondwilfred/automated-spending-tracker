import React, { useState, useEffect } from 'react';
import { Mail, Settings as SettingsIcon, AlertCircle, RefreshCw, KeyRound, Database, Activity, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function SettingsView() {
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health/email');
      const data = await res.json();
      setHealth(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    
    // Listen for OAuth callback success
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GMAIL_AUTH_SUCCESS') {
        fetchHealth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGmail = async () => {
    try {
      const res = await fetch('/api/auth/google');
      const data = await res.json();
      if (data.url) {
        window.open(data.url, 'Google OAuth', 'width=500,height=600');
      } else if (data.error) {
        alert("Error: " + data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncEmails = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/email/sync', { method: 'POST' });
      // We don't await the job finish, we just kick it off.
      // The Socket.IO listener in App.tsx will trigger a global refresh when done.
      alert("Email sync job dispatched! The dashboard will update automatically as transactions are found.");
    } catch (e) {
      console.error(e);
      alert("Failed to dispatch sync job.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) return <div className="text-white p-8 text-center animate-pulse">Loading settings...</div>;

  const connected = health?.gmail_connected;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Integrations & Settings</h2>
          <p className="text-sm text-slate-400">Manage your email ingestion pipelines</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Email Connection Card */}
        <motion.div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-blue-400" />
            Email Provider
          </h3>
          
          <div className="bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Connection Status</span>
              {connected ? (
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-md text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded-md text-xs font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Disconnected
                </span>
              )}
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Provider</span>
              <span className="text-sm text-white font-medium">Google Workspace / Gmail</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Last Sync Time</span>
              <span className="text-sm text-white font-mono">{health?.last_sync || "Never"}</span>
            </div>
          </div>

          {!connected ? (
            <button 
              onClick={handleConnectGmail}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              Connect Gmail
            </button>
          ) : (
            <button 
              onClick={handleSyncEmails}
              disabled={isSyncing}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? "Dispatching Sync..." : "Sync Emails Now"}
            </button>
          )}
        </motion.div>

        {/* Pipeline Health Card */}
        <motion.div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-emerald-400" />
            Pipeline Health
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-white mb-1 font-mono">{health?.emails_scanned || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Emails Scanned</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1 font-mono">{health?.transactions_found || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Tx Extracted</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-center col-span-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-slate-300">Database Records</span>
              </div>
              <span className="text-lg font-bold text-white font-mono">{health?.database_records || 0}</span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
