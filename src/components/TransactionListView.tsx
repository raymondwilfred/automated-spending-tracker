import React, { useState } from 'react';
import { Search, Filter, RefreshCw, BadgePercent, CheckCircle2, AlertCircle, Trash2, Download, Star, Calendar } from 'lucide-react';
import { Transaction, CATEGORIES, CategoryName, PaymentMethod } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface TransactionListViewProps {
  transactions: Transaction[];
  onVerify: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
  onResetSeed: () => void;
}

export default function TransactionListView({ transactions, onVerify, onDelete, onResetSeed }: TransactionListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Filter application
  const filteredTransactions = transactions.filter((tx) => {
    // Search filter
    const matchesSearch = 
      tx.merchant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.merchant_raw.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.transaction_ref && tx.transaction_ref.toLowerCase().includes(searchTerm.toLowerCase()));

    // Category filter
    const matchesCategory = categoryFilter === 'all' || tx.category === categoryFilter;

    // Payment Filter
    const matchesPayment = paymentFilter === 'all' || tx.payment_method === paymentFilter;

    // Date filters
    const txDate = new Date(tx.transaction_at);
    const matchesStart = !dateStart || txDate >= new Date(dateStart);
    const matchesEnd = !dateEnd || txDate <= new Date(dateEnd + 'T23:59:59');

    return matchesSearch && matchesCategory && matchesPayment && matchesStart && matchesEnd;
  });

  // Sort application
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.transaction_at).getTime() - new Date(a.transaction_at).getTime();
    if (sortBy === 'date-asc') return new Date(a.transaction_at).getTime() - new Date(b.transaction_at).getTime();
    if (sortBy === 'amount-desc') return b.amount - a.amount;
    if (sortBy === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  // Dynamic CSV generator
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Amount (INR)', 'Merchant', 'Raw Merchant', 'Category', 'Payment Method', 'Reference No', 'LLM Confidence', 'Verified'];
    const rows = sortedTransactions.map((t) => [
      t.id,
      new Date(t.transaction_at).toLocaleString(),
      t.amount,
      `"${t.merchant_name.replace(/"/g, '""')}"`,
      `"${t.merchant_raw.replace(/"/g, '""')}"`,
      t.category,
      t.payment_method,
      t.transaction_ref || 'N/A',
      t.llm_confidence,
      t.is_verified ? 'Yes' : 'No'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `spending_tracker_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 0.7) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'UPI': return 'UPI (Core)';
      case 'CREDIT_CARD': return 'Credit Card';
      case 'DEBIT_CARD': return 'Debit Card';
      case 'NETBANKING': return 'Net Banking';
      default: return 'Other/ATM';
    }
  };

  return (
    <div className="space-y-6" id="transaction-list-container">
      {/* Search and Filters Strip */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-[0_0_15px_rgba(255,255,255,0.01)] space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search merchant, ID or reference UTR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-indigo-500 focus:bg-white/10 focus:outline-none rounded-xl py-2 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-500 transition"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Seed restorter */}
            <button 
              onClick={onResetSeed}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              title="Reset data store back to index 50 authentic transactions"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset 50 Seed</span>
            </button>

            {/* CSV Exporter */}
            <button 
              onClick={handleExportCSV}
              disabled={sortedTransactions.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs font-semibold text-white transition cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV ({sortedTransactions.length})</span>
            </button>
          </div>
        </div>

        {/* Granular Criteria Dropdowns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          {/* Category SELECT */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Category Filter</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">📁 All Categories</option>
              {Object.keys(CATEGORIES).map((catName) => (
                <option key={catName} value={catName}>
                  {CATEGORIES[catName as CategoryName]?.icon} {catName}
                </option>
              ))}
            </select>
          </div>
 
          {/* Payment method SELECT */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Wallet / Mechanism</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">💳 All Mechanisms</option>
              <option value="UPI">UPI Banking</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="DEBIT_CARD">Debit Card</option>
              <option value="NETBANKING">Netbanking Transfer</option>
              <option value="UNKNOWN">Other/Unknown</option>
            </select>
          </div>
 
          {/* Sorting */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Ordering</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="date-desc">⏰ Newest First</option>
              <option value="date-asc">⏰ Oldest First</option>
              <option value="amount-desc">📈 Amount: High to Low</option>
              <option value="amount-asc">📉 Amount: Low to High</option>
            </select>
          </div>
 
          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" /> Date From
            </label>
            <input 
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>
 
          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" /> Date To
            </label>
            <input 
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Clear indicators */}
        {(searchTerm || categoryFilter !== 'all' || paymentFilter !== 'all' || dateStart || dateEnd) && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-700/20">
            <span className="text-[11px] text-slate-400">
              Filtered <strong>{sortedTransactions.length}</strong> out of <strong>{transactions.length}</strong> transactions
            </span>
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setPaymentFilter('all');
                setDateStart('');
                setDateEnd('');
              }}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Clear Active Filters
            </button>
          </div>
        )}
      </div>

      {/* Grid of Results */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.01)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 text-slate-200 uppercase tracking-wider font-semibold border-b border-white/10">
                <th className="py-4 px-5">Verification</th>
                <th className="py-4 px-4">Timestamp (Date)</th>
                <th className="py-4 px-4">Commercial Vendor / Ref</th>
                <th className="py-4 px-4">Financial Category</th>
                <th className="py-4 px-4">Payment Node</th>
                <th className="py-4 px-4 text-center">Confidence</th>
                <th className="py-4 px-4 text-right">Amount (INR)</th>
                <th className="py-4 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence initial={false}>
                {sortedTransactions.length > 0 ? (
                  sortedTransactions.map((tx) => {
                    const cat = CATEGORIES[tx.category] || { icon: '🏷️', color: '#CCCCCC' };
                    return (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`hover:bg-white/5 transition group ${tx.is_verified ? 'bg-white/5' : ''}`}
                      >
                        {/* Verify Checkbox */}
                        <td className="py-3 px-5 text-center vertical-middle">
                          <button
                            onClick={() => onVerify(tx.id, tx.is_verified)}
                            className={`flex items-center justify-center p-1.5 rounded-lg border transition cursor-pointer mx-auto ${
                              tx.is_verified 
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 hover:bg-white/10' 
                                : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-300'
                            }`}
                            title={tx.is_verified ? "Click to flag as review needed" : "Click to tag as user validated"}
                          >
                            <CheckCircle2 className={`w-4 h-4 ${tx.is_verified ? 'fill-indigo-500/20' : ''}`} />
                          </button>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap vertical-middle">
                          <div className="font-medium text-slate-100">
                            {new Date(tx.transaction_at).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(tx.transaction_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </td>

                        {/* Merchant Details */}
                        <td className="py-3 px-4 vertical-middle">
                          <div className="font-semibold text-slate-200">
                            {tx.merchant_name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[200px] font-mono" title={tx.merchant_raw}>
                            Source: {tx.merchant_raw}
                          </div>
                          {tx.transaction_ref && (
                            <div className="text-[9px] text-indigo-400/80 font-mono mt-0.5">
                              Ref: {tx.transaction_ref}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 vertical-middle">
                          <span 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border"
                            style={{ 
                              color: cat.color, 
                              borderColor: `${cat.color}33`, 
                              backgroundColor: `${cat.color}11` 
                            }}
                          >
                            <span>{cat.icon}</span>
                            <span>{tx.category}</span>
                          </span>
                        </td>

                        {/* Payment Method Badge */}
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap vertical-middle">
                          <span className="inline-flex text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-white/5 border border-white/10">
                            {getPaymentMethodLabel(tx.payment_method)}
                          </span>
                        </td>

                        {/* LLM Confidence */}
                        <td className="py-3 px-4 text-center vertical-middle">
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono ${getConfidenceColor(tx.llm_confidence)}`}>
                            <BadgePercent className="w-3.5 h-3.5 shrink-0" />
                            <span>{Math.round(tx.llm_confidence * 100)}%</span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right vertical-middle font-mono font-semibold text-white whitespace-nowrap">
                          ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Deletion action */}
                        <td className="py-3 px-5 text-center vertical-middle">
                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this extracted transaction record?")) {
                                onDelete(tx.id);
                              }
                            }}
                            className="p-1 px-2 text-rose-400 hover:text-white hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                            title="Remove transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-500">
                      <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-medium">No transactions matched your active filter criteria</p>
                      <button 
                        onClick={() => {
                          setSearchTerm('');
                          setCategoryFilter('all');
                          setPaymentFilter('all');
                          setDateStart('');
                          setDateEnd('');
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs mt-2 cursor-pointer underline"
                      >
                        Reset search limits
                      </button>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
