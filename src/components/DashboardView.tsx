import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { IndianRupee, TrendingUp, ShoppingBag, Receipt, ArrowUpRight, Award } from 'lucide-react';
import { AnalyticsSummary, CATEGORIES, CategoryName } from '../types';
import { motion } from 'motion/react';

interface DashboardViewProps {
  analytics: AnalyticsSummary;
  onNavigateToLogs?: () => void;
}

export default function DashboardView({ analytics, onNavigateToLogs }: DashboardViewProps) {
  // Setup Calendar heatmap of June 2026 (Since current date is June 21, 2026)
  const daysInJune = 30;
  const juneDays = Array.from({ length: daysInJune }, (_, idx) => {
    const day = idx + 1;
    const dateString = `2026-06-${day.toString().padStart(2, '0')}`;
    
    // Find matching spent from analytics
    const dayData = analytics.dailySpent.find(d => d.date === dateString);
    const amount = dayData ? dayData.amount : 0;
    
    return {
      day,
      dateString,
      amount
    };
  });

  // Calculate heatmap color class
  const getHeatmapColorClass = (amount: number) => {
    if (amount === 0) return 'bg-white/5 text-slate-500 border-white/5';
    if (amount < 600) return 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20 hover:bg-emerald-950/60';
    if (amount < 2000) return 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60';
    if (amount < 6000) return 'bg-emerald-800/50 text-emerald-200 border-emerald-500/40 hover:bg-emerald-800/70';
    return 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-semibold border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:from-emerald-500 hover:to-teal-400';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  };

  // Find top spending category
  const topCategoryItem = analytics.categorySpent[0];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
      id="dashboard-container"
    >
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1 */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 relative overflow-hidden hover:border-emerald-500/30 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(16,185,129,0.15)] transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.02)]"
          id="kpi-total-spent"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Total Outflow (Monthly)</span>
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold font-display tracking-tight text-white">
              ₹{analytics.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Synced real-time across connected portfolios</span>
            </p>
          </div>
        </motion.div>
 
        {/* KPI 2 */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 relative overflow-hidden hover:border-sky-500/30 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(14,165,233,0.15)] transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.02)]"
          id="kpi-tx-count"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-sky-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Transactions Logged</span>
            <div className="w-10 h-10 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold font-display tracking-tight text-white">
              {analytics.transactionCount} <span className="text-lg font-medium text-slate-400">records</span>
            </div>
            <p className="text-xs text-slate-400">
              Auto-ingested from classified inboxes and spam folders
            </p>
          </div>
        </motion.div>
 
        {/* KPI 3 */}
        <motion.div 
          variants={itemVariants}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 relative overflow-hidden hover:border-violet-500/30 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(139,92,246,0.15)] transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.02)]"
          id="kpi-avg-outflow"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-400">Average Transaction</span>
            <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold font-display tracking-tight text-white">
              ₹{analytics.averageTransaction.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400">
              Ideal threshold indicator for personal budget alerts
            </p>
          </div>
        </motion.div>
      </div>

      {/* Visual Analytics Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <motion.div 
          variants={itemVariants}
          className="bg-gradient-to-br from-yellow-500/20 via-pink-500/20 to-blue-500/20 backdrop-blur-xl border border-white/20 rounded-3xl p-6 flex flex-col justify-between hover:scale-[1.01] hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(236,72,153,0.25)] transition-all duration-300 shadow-[0_0_30px_rgba(236,72,153,0.15)] relative overflow-hidden"
          id="category-breakdown-card"
        >
          {/* Subtle colorful glow blobs in background */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-green-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-white font-display">Categorical Portfolio</h3>
              <p className="text-xs text-slate-400">Distribution of expenditures by wallet target</p>
            </div>
            {topCategoryItem && (
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Top Goal</span>
                <div className="text-xs font-semibold text-emerald-400 flex items-center justify-end gap-1">
                  <span>{topCategoryItem.icon} {topCategoryItem.category}</span>
                </div>
              </div>
            )}
          </div>

          <div className="h-64 flex items-center justify-center relative">
            {analytics.categorySpent.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.categorySpent}
                    nameKey="category"
                    dataKey="amount"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {analytics.categorySpent.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                    formatter={(value: any) => [`₹${parseFloat(value).toLocaleString('en-IN')}`, 'Expenditure']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null}

            {/* Absolute Center Legend Overlay for Donut */}
            <div className="absolute flex flex-col items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 rounded-full w-32 h-32 shadow-[0_8px_32px_rgba(59,130,246,0.2)] hover:bg-white/60 hover:scale-105 hover:shadow-[0_8px_32px_rgba(59,130,246,0.4)] transition-all duration-300 cursor-pointer z-10">
              <span className="text-blue-800 text-[10px] uppercase font-bold tracking-widest drop-shadow-sm">Outflow</span>
              <span className="text-2xl font-extrabold text-blue-950 font-display mt-0.5 drop-shadow-sm">
                ₹{Math.round(analytics.totalSpent).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-6 border-t border-white/10 pt-4 text-xs">
            {analytics.categorySpent.slice(0, 6).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-1.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 truncate">{item.icon} {item.category}</span>
                </div>
                <span className="text-slate-100 font-semibold shrink-0">₹{Math.round(item.amount).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:scale-[1.01] hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.01)]"
          id="merchant-ranking-card"
        >
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-white font-display">Merchant Outflow Leaderboard</h3>
            <p className="text-xs text-slate-400 mb-6">Top 7 commercial entities by total volume</p>
          </div>

          <div className="h-64 flex items-center justify-center">
            {analytics.merchantSpent.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <BarChart
                  data={analytics.merchantSpent.slice(0, 7)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <YAxis 
                    dataKey="merchant" 
                    type="category" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    width={100}
                    tickFormatter={(v) => v.length > 15 ? `${v.substring(0, 15)}...` : v}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                    formatter={(value: any) => [`₹${parseFloat(value).toLocaleString('en-IN')}`, 'Spent']}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {analytics.merchantSpent.slice(0, 7).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} fillOpacity={1 - index * 0.1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-500 text-sm">No merchant records logged</span>
            )}
          </div>

          {/* Quick list leaderboard summary */}
          <div className="mt-4 border-t border-white/10 pt-4 text-xs space-y-1.5">
            {analytics.merchantSpent.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-300 bg-white/5 p-2 rounded-xl border border-white/5">
                <span className="flex items-center gap-1.5 font-medium">
                  <Award className={`w-3.5 h-3.5 ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-400' : 'text-amber-600'}`} />
                  {item.merchant}
                </span>
                <span className="font-semibold text-slate-100">
                  ₹{item.amount.toLocaleString('en-IN')} <span className="text-[10px] text-slate-500 font-normal">({item.count} orders)</span>
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div 
        variants={itemVariants}
        className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 hover:scale-[1.01] hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(16,185,129,0.15)] transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.01)]"
        id="june-heatmap-card"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-white font-display">Daily Spend Intensity</h3>
            <p className="text-xs text-slate-400">Chronological calendar heatmap of spending in June 2026</p>
          </div>
          <div className="flex items-center gap-3 text-xs bg-white/5 border border-white/10 rounded-xl p-2 shrink-0">
            <span className="text-slate-400 shrink-0">Less</span>
            <div className="w-3 h-3 rounded bg-white/5 border border-white/10" />
            <div className="w-3 h-3 rounded bg-emerald-950 border border-emerald-950" />
            <div className="w-3 h-3 rounded bg-emerald-900 border border-emerald-900" />
            <div className="w-3 h-3 rounded bg-emerald-800 border border-emerald-800" />
            <div className="w-3 h-3 rounded bg-emerald-600 border border-emerald-500" />
            <span className="text-slate-400 shrink-0">More</span>
          </div>
        </div>

        {/* Calendar Heatmap Grid */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs mb-2 text-slate-400 font-medium font-display">
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
          <span>SUN</span>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {/* Calendar padding - June 1, 2026 is a Monday. No leading empty days needed! */}
          {juneDays.map((item) => (
            <div 
              key={item.day}
              className={`p-3 rounded-xl border text-center transition-all duration-200 cursor-help group relative ${getHeatmapColorClass(item.amount)}`}
            >
              <div className="text-[10px] text-slate-400/80 group-hover:text-white transition-colors">{item.day}</div>
              <div className="text-xs font-semibold mt-1 truncate max-w-full">
                {item.amount > 0 ? `₹${Math.round(item.amount)}` : '—'}
              </div>

              {/* Heatmap Tooltip on Hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-950 text-slate-200 text-[11px] p-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-slate-700/60 shadow-2xl z-20 pointer-events-none">
                <div className="font-semibold text-white mb-0.5">June {item.day}, 2026</div>
                <div className="flex justify-between">
                  <span>Total Spent:</span>
                  <span className="font-bold text-emerald-400">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <p className="text-[10px] text-slate-500">
            Tip: Hover over any active day square to reveal granular date aggregates. Use the <strong>Email Simulator</strong> to add new spending patterns!
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
