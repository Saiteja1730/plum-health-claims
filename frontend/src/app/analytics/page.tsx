"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getStats, getHistory } from "../../services/api";
import ErrorMessage from "../../components/ErrorMessage";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getHistory()])
      .then(([statsData, historyData]) => {
        setStats(statsData);
        setHistory(historyData.claims || []);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch analytics statistics from backend database.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Analytics</h1>
        <ErrorMessage message={error} />
      </div>
    );
  }

  const approved = stats.approved || 0;
  const rejected = stats.rejected || 0;
  const partial = stats.partial || 0;
  const manual = stats.manual_review || 0;
  const total = stats.total_claims || 1;

  // Render variables for circular progress gauge
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const approvalPct = stats.approval_rate || 0;
  const strokeOffset = circumference - (approvalPct / 100) * circumference;

  // Dynamic rejection reasons from stats
  const rejectionReasons = Object.entries(stats.rejection_distribution || {})
    .map(([label, count]: any) => ({
      label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const rejectionColors = ["bg-orange-500", "bg-rose-500", "bg-amber-500", "bg-red-500", "bg-pink-500", "bg-fuchsia-500"];

  // Dynamic category payouts from stats
  const categoryPayouts = (stats.category_payouts || []).map((item: any) => ({
    label: item.category,
    value: `₹${item.total_approved.toLocaleString("en-IN")}`,
    count: item.count,
    pct: total > 0 ? Math.round((item.count / total) * 100) : 0,
  }));

  const categoryColors = ["bg-teal-500", "bg-emerald-500", "bg-indigo-500", "bg-cyan-500", "bg-violet-500", "bg-blue-500"];

  // Dynamic monthly trend from stats
  const monthlyData = Object.entries(stats.volume_by_month || {}).map(([month, count]: any) => ({
    month,
    count,
  }));

  const maxMonthlyCount = Math.max(...monthlyData.map((m) => m.count), 1);

  // Dynamic fraud detection counts from stats
  const fraud = stats.fraud_detection || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Operational Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Visualize key performance indicators, adjudication rule trigger rates, and payout ratios.</p>
        </div>
        <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-lg font-mono">
          {stats.total_claims || 0} claims analyzed
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Decision Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Decision Distribution</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Ratio of absolute approved files</p>
          </div>

          <div className="relative flex items-center justify-center my-2">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="text-slate-100"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="text-teal-500 transition-all"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-extrabold text-slate-800 font-mono">{approvalPct}%</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Approved</span>
            </div>
          </div>

          <div className="space-y-1.5 text-[10px] font-bold text-slate-600">
            <div className="flex justify-between">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-teal-500"></span> Approved</span>
              <span>{approved} ({((approved / total) * 100).toFixed(0)}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500"></span> Partial</span>
              <span>{partial} ({((partial / total) * 100).toFixed(0)}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-orange-500"></span> Manual</span>
              <span>{manual} ({((manual / total) * 100).toFixed(0)}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500"></span> Rejected</span>
              <span>{rejected} ({((rejected / total) * 100).toFixed(0)}%)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Rejection Reasons Chart — DYNAMIC */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Top Rejection Reasons</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Ratio of active policy triggers</p>
          </div>

          <div className="space-y-3 py-2 text-[10px] font-semibold text-slate-600">
            {rejectionReasons.length > 0 ? (
              rejectionReasons.map((item, idx) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span className="font-mono">{item.label}</span>
                    <span>{item.count} Cases ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className={`${rejectionColors[idx % rejectionColors.length]} h-1.5 rounded-full`} style={{ width: `${Math.max(item.pct, 5)}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-6 italic">No rejection reasons recorded yet.</p>
            )}
          </div>
        </div>

        {/* Card 3: Claim Category Payout Breakdown — DYNAMIC */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Category Payout breakdown</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Claims counts and metrics by tags</p>
          </div>

          <div className="space-y-3 py-2 text-[10px] font-semibold text-slate-600">
            {categoryPayouts.length > 0 ? (
              categoryPayouts.map((item: any, idx: number) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span className="capitalize font-mono">{item.label}</span>
                    <span>{item.value} ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className={`${categoryColors[idx % categoryColors.length]} h-1.5 rounded-full`} style={{ width: `${Math.max(item.pct, 5)}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-6 italic">No category data recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Grid 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Claims Trend Graph — DYNAMIC */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Claims Volume by Period</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Processed claim files count by month/date</p>
          </div>
          {monthlyData.length > 0 ? (
            <div className="h-44 flex items-end justify-between gap-4 pt-4 px-2">
              {monthlyData.map((item) => {
                const pctHeight = Math.round((item.count / maxMonthlyCount) * 100);
                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[9px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition font-mono">
                      {item.count}
                    </span>
                    <div className="w-full bg-slate-100 rounded h-28 flex items-end overflow-hidden">
                      <div className="w-full bg-teal-500 rounded-t transition-all duration-300" style={{ height: `${Math.max(pctHeight, 5)}%` }}></div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 mt-1 text-center leading-tight">{item.month}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-400 text-xs italic">
              No monthly data available yet.
            </div>
          )}
        </div>

        {/* Fraud Detection Trend Cards — DYNAMIC */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Fraud Detection Analytics</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Triggers on policy exceptions</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center py-2 text-xs">
            <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Blacklisted Providers</span>
              <span className="text-xl font-extrabold text-rose-600 font-mono block mt-1">{fraud.blacklisted_hits || 0} Hit{(fraud.blacklisted_hits || 0) !== 1 ? "s" : ""}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Duplicate Claims</span>
              <span className="text-xl font-extrabold text-slate-800 font-mono block mt-1">{fraud.duplicate_hits || 0} Hit{(fraud.duplicate_hits || 0) !== 1 ? "s" : ""}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Patient Mismatches</span>
              <span className="text-xl font-extrabold text-amber-600 font-mono block mt-1">{fraud.patient_mismatch_hits || 0} Hit{(fraud.patient_mismatch_hits || 0) !== 1 ? "s" : ""}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Date Mismatches</span>
              <span className="text-xl font-extrabold text-slate-800 font-mono block mt-1">{fraud.date_mismatch_hits || 0} Hit{(fraud.date_mismatch_hits || 0) !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
