"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getHistory } from "../../services/api";
import ErrorMessage from "../../components/ErrorMessage";

export default function AuditTrailPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHistory()
      .then((data) => {
        setClaims(data.claims || []);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load operations logs from claims collection.");
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
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Operations Audit Trail</h1>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Operations Audit Trail</h1>
        <p className="text-sm text-slate-500 mt-1">Immutable ledger logs showing document processing steps, edits, and policy decisions.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Claim ID</th>
                <th className="p-4">Member Name</th>
                <th className="p-4">Decision</th>
                <th className="p-4">Claimed Amount</th>
                <th className="p-4">Approved Amount</th>
                <th className="p-4">Ingested Time</th>
                <th className="p-4 pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {claims.length > 0 ? (
                claims.map((claim: any, index: number) => {
                  const claimRef = `CLM-00${index + 1}`;
                  const isExpanded = expandedClaim === claimRef;
                  
                  return (
                    <tr key={claimRef} className="contents">
                      <tr className="hover:bg-slate-50/40 transition">
                        <td className="p-4 pl-6 font-mono font-bold text-slate-500">{claimRef}</td>
                        <td className="p-4">
                          <div>{claim.member_name}</div>
                          <span className="text-[9px] text-slate-400 font-mono font-normal">ID: {claim.member_id}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            claim.decision === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : claim.decision === "PARTIAL"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : claim.decision === "MANUAL_REVIEW"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : "bg-rose-50 border-rose-200 text-rose-700"
                          }`}>
                            {claim.decision}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-600">₹{(claim.claim_amount || 0).toFixed(2)}</td>
                        <td className="p-4 font-mono text-emerald-600">₹{(claim.approved_amount || 0).toFixed(2)}</td>
                        <td className="p-4 text-slate-400 font-normal">
                          {claim.timestamp ? new Date(claim.timestamp).toLocaleString("en-IN") : new Date().toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 pr-6">
                          <button
                            onClick={() => setExpandedClaim(isExpanded ? null : claimRef)}
                            className="text-teal-600 hover:text-teal-800 font-bold underline"
                          >
                            {isExpanded ? "Collapse Logs" : "View Audit Logs"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={7} className="p-5 pl-12 pr-6 border-b border-slate-100">
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Audit Trail Details</h4>
                              
                              {/* Audit trail edits table */}
                              <div className="space-y-2">
                                <span className="font-bold text-slate-800 text-[10px] block">Auditor Edit Ledger (Human-in-the-Loop corrections)</span>
                                {claim.audit_trail && claim.audit_trail.length > 0 ? (
                                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                    <table className="w-full text-left text-[10px] border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                                          <th className="p-2 pl-4">Field Changed</th>
                                          <th className="p-2">Original AI Extraction</th>
                                          <th className="p-2">Corrected Value</th>
                                          <th className="p-2">Edited By</th>
                                          <th className="p-2 pr-4">Timestamp</th>
                                        </tr>
                                      </thead>
                                      <tbody className="text-slate-600">
                                        {claim.audit_trail.map((log: any, idx: number) => (
                                          <tr key={idx} className="border-b border-slate-100 last:border-0">
                                            <td className="p-2 pl-4 font-mono font-bold text-slate-700 capitalize">{log.field?.replace("_", " ")}</td>
                                            <td className="p-2 font-mono text-slate-500">{JSON.stringify(log.original)}</td>
                                            <td className="p-2 font-mono text-teal-600 font-bold">{JSON.stringify(log.edited)}</td>
                                            <td className="p-2">{log.edited_by || "Operator-Admin"}</td>
                                            <td className="p-2 pr-4 font-mono text-slate-400">
                                              {log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN") : "N/A"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-slate-400 italic text-[10px]">No operator corrections were made to this claim. AI data was submitted directly.</p>
                                )}
                              </div>

                              {/* Rule Trace Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <span className="font-bold text-slate-800 text-[10px] block">Passed Rules Execution Trace</span>
                                  <div className="flex flex-wrap gap-1">
                                    {claim.passed_rules && claim.passed_rules.length > 0 ? (
                                      claim.passed_rules.map((rule: string) => (
                                        <span key={rule} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono">
                                          ✓ {rule}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-slate-400 italic text-[9px]">None</span>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-bold text-slate-800 text-[10px] block">Triggered / Failed Rules List</span>
                                  <div className="flex flex-wrap gap-1">
                                    {claim.failed_rules && claim.failed_rules.length > 0 ? (
                                      claim.failed_rules.map((rule: string) => (
                                        <span key={rule} className="bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono">
                                          ✗ {rule}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-slate-400 italic text-[9px]">None</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Rule trace logs */}
                              {claim.audit_trace && claim.audit_trace.length > 0 && (
                                <div className="space-y-1">
                                  <span className="font-bold text-slate-800 text-[10px] block">Immutable Adjudication Audit Trace Logs</span>
                                  <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200/50 font-mono text-[9px] text-slate-600 leading-normal max-h-24 overflow-y-auto space-y-0.5">
                                    {claim.audit_trace.map((trace: string, idx: number) => (
                                      <div key={idx}>• {trace}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                    No claim records registered in system history directory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
