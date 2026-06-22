import React, { useState } from 'react';
import { PlusCircle, FileSpreadsheet, RotateCcw, Save } from 'lucide-react';
import { CategoryName, CATEGORIES, PaymentMethod } from '../types';

interface ManualEntryViewProps {
  onAddTransaction: (tx: {
    merchant_name: string;
    amount: number;
    category: CategoryName;
    payment_method: PaymentMethod;
    transaction_ref: string;
    transaction_at: string;
    notes?: string;
  }) => Promise<boolean>;
}

export default function ManualEntryView({ onAddTransaction }: ManualEntryViewProps) {
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryName>('Food & Dining');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [transactionAt, setTransactionAt] = useState('2026-06-21T12:00'); // matched to user local time June 2026
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantName.trim()) {
      setMessage({ type: 'error', text: 'Merchant/Vendor name is required.' });
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setMessage({ type: 'error', text: 'Please specify a positive transactional amount.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const success = await onAddTransaction({
        merchant_name: merchantName,
        amount: parsedAmount,
        category,
        payment_method: paymentMethod,
        transaction_ref: transactionRef,
        transaction_at: new Date(transactionAt).toISOString(),
        notes: notes ? notes : undefined
      });

      if (success) {
        setMessage({ type: 'success', text: 'Transaction recorded successfully into ledger!' });
        // Reset
        setMerchantName('');
        setAmount('');
        setTransactionRef('');
        setNotes('');
        setTransactionAt('2026-06-21T12:00');
      } else {
        setMessage({ type: 'error', text: 'Failed to record the manual ledger transaction.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto" id="manual-entry-container">
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <PlusCircle className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold tracking-tight text-white font-display">Record Manual Outflow</h3>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Manually record a transaction that didn't occur via classic email statements, such as cash expenditures or immediate in-store checkouts, to ensure complete budget overview logs.
        </p>

        {message && (
          <div className={`p-4 rounded-xl text-xs mb-6 border ${
            message.type === 'success' 
              ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-950/40 border-rose-500/20 text-rose-400'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Merchant */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Commercial Entity</label>
              <input 
                type="text"
                placeholder="e.g. Swiggy Restaurant, Decathlon Store"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:bg-white/10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Outflow Value (INR)</label>
              <input 
                type="number"
                step="0.01"
                placeholder="e.g. 850.50"
                 value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:bg-white/10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            {/* Category Select */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Financial Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryName)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                {Object.keys(CATEGORIES).map((catName) => (
                  <option key={catName} value={catName}>
                    {CATEGORIES[catName as CategoryName]?.icon} {catName}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Payment Node / Mechanism</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="UPI">UPI Banking (Core)</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="NETBANKING">Netbanking Direct Transfer</option>
                <option value="UNKNOWN">Other Wallet / Ledger Cash</option>
              </select>
            </div>

            {/* Date time Picker */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-display">Spending Time Reference</label>
              <input 
                type="datetime-local"
                value={transactionAt}
                onChange={(e) => setTransactionAt(e.target.value)}
                required
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Reference */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Receipt Reference / UTR (Optional)</label>
              <input 
                type="text"
                placeholder="e.g. UTRN10928472910"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:bg-white/10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-mono"
              />
            </div>

          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Contextual Notes (Optional)</label>
            <textarea 
              rows={3}
              placeholder="Record any other comments regarding this budget outflow..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-slate-200 focus:bg-white/10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/30"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording Outflow...' : 'Save Outflow Ledger'}</span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                setMerchantName('');
                setAmount('');
                setTransactionRef('');
                setNotes('');
                setTransactionAt('2026-06-21T12:00');
              }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
