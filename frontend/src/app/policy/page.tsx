"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getPolicy } from "../../services/api";
import ErrorMessage from "../../components/ErrorMessage";

export default function PolicyPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPolicy()
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to retrieve policy rules from the backend. Ensure the server is active.");
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
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Enforced Policy Rules</h1>
        <ErrorMessage message={error} />
      </div>
    );
  }

  const rules = data?.rules || {};
  const policies = data?.policies || [];
  const activePolicy = policies[0] || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Live Policy Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">Live limits, exclusions, and waiting timelines configured inside the adjudication server database.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Coverage Limits */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-teal-500"></span>
            Coverage Limits
          </h3>
          <div className="divide-y divide-slate-100 text-[11px] font-bold text-slate-600">
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Annual Limit</span>
              <span className="text-slate-800 font-mono">₹{activePolicy.annual_limit?.toLocaleString() ?? "50,000"}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Per Claim limit</span>
              <span className="text-slate-800 font-mono">₹{rules.per_claim_limit?.toLocaleString() ?? "5,000"}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Consultation Cap</span>
              <span className="text-slate-800 font-mono">₹{activePolicy.consultation_limit?.toLocaleString() ?? "2,000"}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Diagnostics Cap</span>
              <span className="text-slate-800 font-mono">₹{activePolicy.diagnostic_limit?.toLocaleString() ?? "10,000"}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Pharmacy Cap</span>
              <span className="text-slate-800 font-mono">₹{activePolicy.pharmacy_limit?.toLocaleString() ?? "15,000"}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Dental Cap</span>
              <span className="text-slate-800 font-mono">₹{activePolicy.dental_limit?.toLocaleString() ?? "5,000"}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Vision Cap</span>
              <span className="text-slate-800 font-mono">₹{activePolicy.vision_limit?.toLocaleString() ?? "4,000"}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Alternative Medicine Cap</span>
              <span className="text-slate-800 font-mono">₹{activePolicy.alternative_limit?.toLocaleString() ?? "8,000"}</span>
            </div>
            <div className="py-2.5 flex justify-between border-t border-slate-100 mt-2 pt-2">
              <span className="text-slate-500">Remaining Balance</span>
              <span className="text-emerald-600 font-mono">₹{((activePolicy.annual_limit || 50000) - (activePolicy.annual_used || 0)).toLocaleString()}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-500">Policy Status</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${activePolicy.active !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                {activePolicy.active !== false ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
          </div>
        </div>

        {/* Waiting Periods & Benefits */}
        <div className="space-y-6">
          {/* Waiting Periods */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-amber-500"></span>
              Waiting Periods (Days)
            </h3>
            <div className="divide-y divide-slate-100 text-[11px] font-bold text-slate-600">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Initial Waiting Days</span>
                <span className="text-slate-800 font-mono">{activePolicy.initial_waiting_days ?? "30"} Days</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Diabetes Exclusions</span>
                <span className="text-slate-800 font-mono">{activePolicy.diabetes_waiting_days ?? "90"} Days</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Hypertension Exclusions</span>
                <span className="text-slate-800 font-mono">{activePolicy.hypertension_waiting_days ?? "90"} Days</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Maternity Exclusions</span>
                <span className="text-slate-800 font-mono">{activePolicy.maternity_waiting_days ?? "270"} Days</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Joint Replacement Exclusions</span>
                <span className="text-slate-800 font-mono">{activePolicy.joint_replacement_waiting_days ?? "730"} Days</span>
              </div>
            </div>
          </div>

          {/* Network Benefits */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
              Network Benefits
            </h3>
            <div className="divide-y divide-slate-100 text-[11px] font-bold text-slate-600">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Network Discount</span>
                <span className="text-slate-800">20% Off Invoice</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Cashless Direct Settlement</span>
                <span className="text-slate-800">Eligible (at network hospitals)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Rules and Decisions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Validation Checkpoints */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Enforced Validation Rules</h3>
          <div className="grid grid-cols-2 gap-2.5 text-[10px] font-bold text-slate-700">
            {[
              "Policy Active Required",
              "Member Coverage Check",
              "Doctor Registration Check",
              "Submission Window Check",
              "Medical Necessity Score",
              "Document upload check",
              "Date Mismatch Check",
              "Patient Details Matching",
              "Fraud Validation Checks",
            ].map((rule) => (
              <div key={rule} className="bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rejection / Decision types */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Decision Categories</h3>
          <div className="space-y-2.5 text-[11px]">
            <div className="flex justify-between">
              <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">APPROVED</span>
              <span className="text-slate-500 text-right">Payment processed under standard copay</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">REJECTED</span>
              <span className="text-slate-500 text-right">Rejection trigger found under policy exclusions</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">PARTIAL</span>
              <span className="text-slate-500 text-right">Claim exceeds single limit but approved up to cap</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">MANUAL_REVIEW</span>
              <span className="text-slate-500 text-right">Requires human verification (exceeds ₹25,000)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hard Exclusions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
          Standard Exclusions (Hard Rejections)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 text-[10px] font-bold text-rose-700 uppercase font-mono">
          {(rules.exclusions || [
            "weight loss",
            "cosmetic procedure",
            "experimental treatment",
            "obesity",
            "lasik"
          ]).map((exc: string) => (
            <div key={exc} className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-center truncate">
              {exc}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
