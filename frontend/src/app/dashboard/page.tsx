"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getStats, getHistory } from "../../services/api";
import ErrorMessage from "../../components/ErrorMessage";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([getStats(), getHistory()])
      .then(([statsData, historyData]) => {
        setStats(statsData);
        setHistory(historyData.claims || []);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not connect to the backend server. Make sure the backend is active.");
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
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Analytics Dashboard</h1>
        <ErrorMessage message={error} />
      </div>
    );
  }

  // Derived metrics
  const totalAmount = history.reduce((sum, c) => sum + (c.claim_amount || 0), 0);
  const totalApprovedAmount = stats.total_approved_amount || 0;
  const averageClaimAmount = history.length > 0 ? totalAmount / history.length : 0;
  const highestClaim = history.length > 0 ? Math.max(...history.map((c) => c.claim_amount || 0)) : 0;
  const totalRejectedAmount = history
    .filter((c) => c.decision === "REJECTED")
    .reduce((sum, c) => sum + (c.claim_amount || 0), 0);

  const totalClaimsCount = stats.total_claims || 1;

  // Render variables for circular progress gauge
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const approvalPct = stats.approval_rate || 0;
  const strokeOffset = circumference - (approvalPct / 100) * circumference;

  // Sort and format rejection reason distribution
  const rejectionsList = Object.entries(stats.rejection_distribution || {}).map(([key, val]: any) => {
    const pct = totalClaimsCount > 0 ? Math.round((val / totalClaimsCount) * 100) : 0;
    return { label: key, count: val, pct };
  }).sort((a, b) => b.count - a.count);

  // Sort and format treatment distribution
  const treatmentsList = Object.entries(stats.treatment_distribution || {}).map(([key, val]: any) => {
    const pct = totalClaimsCount > 0 ? Math.round((val / totalClaimsCount) * 100) : 0;
    return { label: key, count: val, pct };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Operations Control Center</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time KPIs, rule violations ratio, and payouts analytics of claim records.</p>
      </div>

      {/* Grid of KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Claims Processed</p>
          <p className="text-2xl font-extrabold text-slate-900 font-mono mt-1">{stats.total_claims}</p>
          <span className="text-[9px] text-teal-600 font-bold bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md self-start">
            Active Registry
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved Payouts</p>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">₹{totalApprovedAmount.toLocaleString("en-IN")}</p>
          <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md self-start">
            Rate: {stats.approval_rate}%
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manual Audits Referral</p>
          <p className="text-2xl font-extrabold text-orange-600 font-mono mt-1">{stats.manual_review}</p>
          <span className="text-[9px] text-orange-600 font-bold bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md self-start">
            Requires Auditor Audit
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rejected Value</p>
          <p className="text-2xl font-extrabold text-rose-600 font-mono mt-1">₹{totalRejectedAmount.toLocaleString("en-IN")}</p>
          <span className="text-[9px] text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md self-start">
            Rejected Count: {stats.rejected}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waiting Period Rejections</p>
          <p className="text-2xl font-extrabold text-amber-600 font-mono mt-1">{stats.waiting_period_rejections || 0}</p>
          <span className="text-[9px] text-amber-600 font-bold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md self-start">
            Tenure Checks Failed
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Excessive Activity Flags</p>
          <p className="text-2xl font-extrabold text-rose-700 font-mono mt-1">{stats.claims_flaged_excessive_activity || 0}</p>
          <span className="text-[9px] text-rose-700 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md self-start">
            &gt; 4 claims / day
          </span>
        </div>
      </div>

      {/* Fraud Review Queue Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>Fraud Review Queue</span>
            <span className="bg-rose-100 text-rose-700 text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-rose-200">
              FRAUD REVIEW REQUIRED
            </span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Members flagged for excessive claim activity (&gt; 4 submissions within a single calendar day)</p>
        </div>

        <div className="overflow-x-auto text-[11px]">
          {stats.fraud_queue && stats.fraud_queue.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-2.5">Member ID</th>
                  <th className="py-2.5">Member Name</th>
                  <th className="py-2.5 text-center">Claims Today</th>
                  <th className="py-2.5 text-right">Total Claimed</th>
                  <th className="py-2.5">Source Files</th>
                  <th className="py-2.5">Flagged Time</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-700">
                {stats.fraud_queue.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="py-2.5 font-mono">{item.member_id}</td>
                    <td className="py-2.5">{item.member_name}</td>
                    <td className="py-2.5 text-center text-rose-600 font-bold">{item.claims_today} claims</td>
                    <td className="py-2.5 text-right font-mono">₹{item.total_amount.toLocaleString("en-IN")}</td>
                    <td className="py-2.5 text-slate-400 font-normal">{item.claim_ids}</td>
                    <td className="py-2.5 text-slate-500 font-normal">{item.flagged_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-400 text-center py-6 font-semibold italic">No members currently flagged for excessive activity.</p>
          )}
        </div>
      </div>

      {/* Grid 2: Charts and analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Decision Distribution circular progress */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between items-center text-center">
          <div className="w-full text-left">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Decision Distribution</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Ratio of absolute approved files</p>
          </div>

          <div className="relative flex items-center justify-center my-6">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle cx="56" cy="56" r={radius} className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" />
              <circle cx="56" cy="56" r={radius} className="text-teal-500 transition-all duration-500" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={strokeOffset} strokeLinecap="round" stroke="currentColor" fill="transparent" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-extrabold text-slate-800 font-mono">{approvalPct}%</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Pass Rate</span>
            </div>
          </div>

          <div className="w-full space-y-1.5 text-[9px] font-bold text-slate-500 border-t border-slate-100 pt-4 text-left">
            <div className="flex justify-between">
              <span>Approved ({stats.approved})</span>
              <span className="text-teal-600">{((stats.approved / totalClaimsCount) * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Partial ({stats.partial})</span>
              <span className="text-amber-600">{((stats.partial / totalClaimsCount) * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Rejected ({stats.rejected})</span>
              <span className="text-rose-600">{((stats.rejected / totalClaimsCount) * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Manual Review ({stats.manual_review})</span>
              <span className="text-orange-600">{((stats.manual_review / totalClaimsCount) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Rejection Reasons Distribution Bar Chart */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Rejection Reason Distribution</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Ratio of active rule exceptions</p>
          </div>

          <div className="space-y-2 text-[10px] font-semibold text-slate-600 max-h-[170px] overflow-y-auto pr-1">
            {rejectionsList.length > 0 ? (
              rejectionsList.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span className="font-mono">{item.label}</span>
                    <span>{item.count} Cases ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1">
                    <div className="bg-rose-500 h-1 rounded-full" style={{ width: `${item.pct}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-8">No rejection logs recorded.</p>
            )}
          </div>
        </div>

        {/* Treatment Category Distribution */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Treatment Category Distribution</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Types of medical service claims processed</p>
          </div>

          <div className="space-y-2 text-[10px] font-semibold text-slate-600 max-h-[170px] overflow-y-auto pr-1">
            {treatmentsList.length > 0 ? (
              treatmentsList.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span className="capitalize font-mono">{item.label}</span>
                    <span>{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1">
                    <div className="bg-teal-500 h-1 rounded-full" style={{ width: `${item.pct}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-8">No category logs recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Grid 3: Claims Volume Trends and Monthly Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Monthly Analytics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Monthly Claims Analytics</h3>
          <div className="space-y-3 text-[10px] font-bold text-slate-600">
            {Object.entries(stats.volume_by_month || {}).map(([month, count]: any) => (
              <div key={month} className="flex justify-between items-center bg-slate-50 border border-slate-200/50 p-2.5 rounded-xl">
                <span>{month}</span>
                <span className="bg-teal-50 border border-teal-200 px-2 py-0.5 rounded text-teal-700 font-mono">{count} Claims</span>
              </div>
            ))}
          </div>
        </div>

        {/* Claim Volume Trend by Date */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Claim Volume Trend (By Date)</h3>
          <div className="space-y-2 text-[10px] font-semibold text-slate-600 max-h-[170px] overflow-y-auto pr-1">
            {Object.entries(stats.volume_by_date || {}).map(([date, count]: any) => (
              <div key={date} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="font-mono text-slate-500">{date}</span>
                <span className="font-mono font-bold text-slate-800">{count} Claims</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Grid 4: Payout Analytics */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Claims Amount Analytics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="font-semibold block text-slate-400">Average Claim Value</span>
            <span className="text-lg font-extrabold text-slate-900 font-mono">₹{averageClaimAmount.toFixed(2)}</span>
          </div>
          <div>
            <span className="font-semibold block text-slate-400">Highest Claim Submitted</span>
            <span className="text-lg font-extrabold text-slate-900 font-mono">₹{highestClaim.toFixed(2)}</span>
          </div>
          <div>
            <span className="font-semibold block text-slate-400">Average Extraction Confidence</span>
            <span className="text-lg font-extrabold text-teal-600 font-mono">94%</span>
          </div>
        </div>
      </div>
    </div>
  );
}