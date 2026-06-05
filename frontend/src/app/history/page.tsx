"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getHistory } from "../../services/api";
import ErrorMessage from "../../components/ErrorMessage";

export default function HistoryPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal detail state
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);

  useEffect(() => {
    getHistory()
      .then((data) => {
        // Backend returns claims pre-sorted descending by created_at (Item #3)
        const claimsList = data.claims || [];
        setClaims(claimsList);
        setFilteredClaims(claimsList);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Could not connect to the backend server. Make sure the backend is active at http://127.0.0.1:8000.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Update filters when search or status changes
  useEffect(() => {
    let result = claims;

    if (search.trim() !== "") {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          (c.claim_id && c.claim_id.toLowerCase().includes(q)) ||
          (c.member_id && c.member_id.toLowerCase().includes(q)) ||
          (c.member_name && c.member_name.toLowerCase().includes(q)) ||
          (c.diagnosis && c.diagnosis.toLowerCase().includes(q)) ||
          (c.treatment_type && c.treatment_type.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "ALL") {
      result = result.filter((c) => c.decision === statusFilter);
    }

    setFilteredClaims(result);
  }, [search, statusFilter, claims]);

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
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Claims History</h1>
        <ErrorMessage message={error} />
      </div>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-50 border-emerald-200 text-emerald-700";
      case "PARTIAL":
        return "bg-amber-50 border-amber-200 text-amber-700";
      case "MANUAL_REVIEW":
        return "bg-orange-50 border-orange-200 text-orange-700";
      case "REJECTED":
        return "bg-rose-50 border-rose-200 text-rose-700";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Claims History</h1>
          <p className="text-sm text-slate-500 mt-1">
            Business registry of all adjudicated claims. For technical details or operators logs, visit the Audit Trail.
          </p>
        </div>
        <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-lg font-mono">
          {filteredClaims.length} of {claims.length} claims
        </span>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search claim ID, member ID, name, diagnosis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 placeholder-slate-400"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {["ALL", "APPROVED", "PARTIAL", "MANUAL_REVIEW", "REJECTED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition ${
                statusFilter === status
                  ? "bg-teal-50 text-teal-700 border-teal-200 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:text-slate-800"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4.5 pl-6">Claim ID</th>
                <th className="p-4.5">Member Name</th>
                <th className="p-4.5">Diagnosis</th>
                <th className="p-4.5">Claimed Amount</th>
                <th className="p-4.5">Approved Amount</th>
                <th className="p-4.5">Status</th>
                <th className="p-4.5 font-bold">Timestamp</th>
                <th className="p-4.5 pr-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {filteredClaims.length > 0 ? (
                filteredClaims.map((claim, idx) => {
                  const claimId = claim.claim_id || `CLM-00${idx + 1}`;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-slate-700">
                      <td className="p-4.5 pl-6 font-mono font-bold text-slate-400">{claimId}</td>
                      <td className="p-4.5 text-slate-900 font-bold">
                        <div>{claim.member_name}</div>
                        <span className="text-[9px] text-slate-400 font-mono font-normal">{claim.member_id}</span>
                      </td>
                      <td className="p-4.5">{claim.diagnosis || "General checkup"}</td>
                      <td className="p-4.5 font-mono">₹{(claim.claim_amount || 0).toFixed(2)}</td>
                      <td className="p-4.5 font-mono text-teal-600 font-bold">₹{(claim.approved_amount || 0).toFixed(2)}</td>
                      <td className="p-4.5">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold border ${getStatusBadgeClass(claim.decision || "PENDING")}`}>
                          {claim.decision || "PENDING"}
                        </span>
                      </td>
                      <td className="p-4.5 text-slate-400 font-normal text-[10px]">
                        {claim.created_at || claim.timestamp ? new Date(claim.created_at || claim.timestamp).toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="p-4.5 pr-6 text-center">
                        <button
                          onClick={() => setSelectedClaim({ ...claim, claimId })}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700 shadow-xs"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-slate-400 font-medium">
                    No matching claims found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Claim Details ({selectedClaim.claimId})</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Business claim summary</p>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 transition rounded-lg hover:bg-slate-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-normal">Member Name</span>
                <span className="text-slate-900 font-bold">{selectedClaim.member_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-normal">Member ID</span>
                <span className="text-slate-900 font-mono">{selectedClaim.member_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-normal">Diagnosis</span>
                <span className="text-slate-900">{selectedClaim.diagnosis || "General checkup"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-normal">Claimed Amount</span>
                <span className="text-slate-900 font-mono">₹{(selectedClaim.claim_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-normal">Approved Amount</span>
                <span className="text-teal-600 font-mono font-bold">₹{(selectedClaim.approved_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-normal">Adjudication Status</span>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(selectedClaim.decision || "PENDING")}`}>
                  {selectedClaim.decision || "PENDING"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-normal">Timestamp</span>
                <span className="text-slate-600 font-mono">
                  {selectedClaim.created_at || selectedClaim.timestamp ? new Date(selectedClaim.created_at || selectedClaim.timestamp).toLocaleString("en-IN") : "—"}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}