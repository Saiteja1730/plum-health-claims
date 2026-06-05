"use client";

import { useEffect, useState, Fragment } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getHistory, addCorrection } from "../../services/api";
import ErrorMessage from "../../components/ErrorMessage";
import { API_BASE_URL } from "../../utils/constants";

export default function AuditTrailPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Correction form state
  const [correctionForm, setCorrectionForm] = useState<{
    claimId: string;
    field: string;
    old_value: string;
    new_value: string;
    auditor_name: string;
  } | null>(null);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState<string | null>(null);

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

  const handleAddCorrection = async () => {
    if (!correctionForm) return;
    setCorrectionLoading(true);
    setCorrectionMessage(null);
    try {
      await addCorrection(correctionForm.claimId, {
        field: correctionForm.field,
        old_value: correctionForm.old_value,
        new_value: correctionForm.new_value,
        auditor_name: correctionForm.auditor_name || "Operator-Admin",
      });
      setCorrectionMessage("Correction saved successfully.");
      setCorrectionForm(null);
      // Reload claims
      const data = await getHistory();
      setClaims(data.claims || []);
    } catch (err) {
      setCorrectionMessage("Failed to save correction.");
    } finally {
      setCorrectionLoading(false);
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Technical Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-1">
            Technical-focused system logs including OCR fields, rule execution logs, decision traces, and Operator/Auditor edits.
          </p>
        </div>
        <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-lg font-mono">
          {claims.length} audit records
        </span>
      </div>

      {correctionMessage && (
        <div className={`p-3 rounded-xl text-xs font-semibold border ${correctionMessage.includes("success") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
          {correctionMessage}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Claim ID</th>
                <th className="p-4">Final Decision</th>
                <th className="p-4">OCR Confidence</th>
                <th className="p-4">Rules Executed</th>
                <th className="p-4">Failed Rules</th>
                <th className="p-4">Triggered Rules</th>
                <th className="p-4 pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {claims.length > 0 ? (
                claims.map((claim: any, index: number) => {
                  const claimRef = claim.claim_id || `CLM-00${index + 1}`;
                  const isExpanded = expandedClaim === claimRef;
                  const decisionValue = claim.decision || "PENDING";
                  
                  // Extract rule counts
                  const rulesCount = Object.keys(claim.rule_trace || {}).length;
                  const failedCount = (claim.failed_rules || []).length;
                  const triggeredCount = (claim.triggered_rules || []).length;
                  const ocrConf = claim.ocr_extraction?.confidence_score || claim.extraction_confidence || 0;

                  return (
                    <Fragment key={claimRef}>
                      <tr className="hover:bg-slate-50/40 transition">
                        <td className="p-4 pl-6 font-mono font-bold text-slate-500">{claimRef}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            decisionValue === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : decisionValue === "PARTIAL"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : decisionValue === "MANUAL_REVIEW"
                              ? "bg-orange-50 text-orange-700 border-orange-200"
                              : decisionValue === "PENDING"
                              ? "bg-slate-50 text-slate-500 border-slate-200"
                              : "bg-rose-50 border-rose-200 text-rose-700"
                          }`}>
                            {decisionValue}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-600">
                          {(ocrConf * 100).toFixed(0)}%
                        </td>
                        <td className="p-4 text-slate-500 font-medium">
                          {rulesCount} Rules
                        </td>
                        <td className="p-4 text-rose-600 font-bold">
                          {failedCount} Failed
                        </td>
                        <td className="p-4 text-orange-600 font-bold">
                          {triggeredCount} Triggered
                        </td>
                        <td className="p-4 pr-6">
                          <button
                            onClick={() => setExpandedClaim(isExpanded ? null : claimRef)}
                            className="text-teal-600 hover:text-teal-800 font-bold underline"
                          >
                            {isExpanded ? "Hide Logs" : "Inspect Logs"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-t border-slate-100">
                          <td colSpan={7} className="p-6 pl-12 pr-6 border-b border-slate-200 bg-slate-50/30">
                            <div className="space-y-6">
                              
                              {/* Top Details Header */}
                              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">Technical Adjudication Trace // {claimRef}</h4>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Execution logs, raw OCR extractions, and decision trees</p>
                                </div>
                                <div className="flex gap-2">
                                  <a
                                    href={`${API_BASE_URL}/claims/${claimRef}/export/json`}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 transition"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Export JSON
                                  </a>
                                  <a
                                    href={`${API_BASE_URL}/claims/${claimRef}/export/pdf`}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 transition"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export PDF
                                  </a>
                                </div>
                              </div>

                              {/* Timestamps of Processing Steps */}
                              <div className="bg-slate-100 border border-slate-200/50 p-4 rounded-xl">
                                <span className="font-bold text-slate-800 text-[10px] uppercase block mb-2">Processing Step Timestamps</span>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-mono">
                                  <div>
                                    <span className="text-slate-400 block font-sans">1. Document Upload / Ingestion:</span>
                                    <span className="text-slate-700 font-bold">
                                      {claim.created_at ? new Date(claim.created_at).toISOString() : new Date(claim.timestamp || Date.now()).toISOString()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-sans">2. OCR Text Extraction:</span>
                                    <span className="text-slate-700 font-bold">
                                      {claim.ocr_extraction?.extraction_timestamp ? new Date(claim.ocr_extraction.extraction_timestamp).toISOString() : "Done (~1.2s)"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-sans">3. Rules Engine Execution:</span>
                                    <span className="text-slate-700 font-bold">
                                      {claim.created_at ? new Date(claim.created_at).toISOString() : new Date(claim.timestamp || Date.now()).toISOString()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-sans">4. Final DB Record Saved:</span>
                                    <span className="text-slate-700 font-bold">
                                      {claim.created_at ? new Date(claim.created_at).toISOString() : new Date(claim.timestamp || Date.now()).toISOString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* OCR Extraction Details & Fields */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-3">
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <span className="font-bold text-slate-800 text-[10px] uppercase">OCR Extraction Output</span>
                                    <span className="bg-teal-50 border border-teal-100 text-teal-700 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                                      Overall: {(ocrConf * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="space-y-1.5 max-h-52 overflow-y-auto text-[10px] font-mono text-slate-600">
                                    <div className="flex justify-between border-b border-slate-50 py-0.5">
                                      <span className="text-slate-400">Source Document:</span>
                                      <span className="text-slate-800 font-bold">{claim.source_document_name || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 py-0.5">
                                      <span className="text-slate-400">Extracted Member Name:</span>
                                      <span className="text-slate-800 font-bold">{claim.ocr_extraction?.extracted_fields?.member_name || claim.member_name || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 py-0.5">
                                      <span className="text-slate-400">Extracted Member ID:</span>
                                      <span className="text-slate-800 font-bold">{claim.ocr_extraction?.extracted_fields?.member_id || claim.member_id || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 py-0.5">
                                      <span className="text-slate-400">Diagnosis Code:</span>
                                      <span className="text-slate-800 font-bold">{claim.ocr_extraction?.extracted_fields?.diagnosis || claim.diagnosis || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 py-0.5">
                                      <span className="text-slate-400">Treatment Category:</span>
                                      <span className="text-slate-800 font-bold capitalize">{claim.ocr_extraction?.extracted_fields?.treatment_type || claim.treatment_type || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 py-0.5">
                                      <span className="text-slate-400">Hospital:</span>
                                      <span className="text-slate-800 font-bold">{claim.ocr_extraction?.extracted_fields?.hospital_name || claim.hospital_name || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 py-0.5">
                                      <span className="text-slate-400">Doctor Registration:</span>
                                      <span className="text-slate-800 font-bold">{claim.ocr_extraction?.extracted_fields?.doctor_registration || claim.doctor_registration || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 py-0.5">
                                      <span className="text-slate-400">Invoiced Amount:</span>
                                      <span className="text-slate-800 font-bold">₹{claim.ocr_extraction?.extracted_fields?.claim_amount || claim.claim_amount || "N/A"}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Rules executed / Passed / Failed / Triggered */}
                                <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-4">
                                  <div className="border-b border-slate-100 pb-2">
                                    <span className="font-bold text-slate-800 text-[10px] uppercase">Rules Engine Evaluation Logs</span>
                                  </div>
                                  <div className="space-y-3 text-[10px]">
                                    <div>
                                      <span className="text-slate-400 font-bold block mb-1">Triggered Rules (Failures/Warnings)</span>
                                      <div className="flex flex-wrap gap-1">
                                        {claim.triggered_rules && claim.triggered_rules.length > 0 ? (
                                          claim.triggered_rules.map((rule: string) => (
                                            <span key={rule} className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded font-bold font-mono">
                                              ⚠ {rule}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-slate-400 italic font-mono">No warnings triggered</span>
                                        )}
                                      </div>
                                    </div>

                                    <div>
                                      <span className="text-slate-400 font-bold block mb-1">Failed Hard Block Rules</span>
                                      <div className="flex flex-wrap gap-1">
                                        {claim.failed_rules && claim.failed_rules.length > 0 ? (
                                          claim.failed_rules.map((rule: string) => (
                                            <span key={rule} className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-bold font-mono">
                                              ✗ {rule}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-slate-400 italic font-mono">No hard blocks failed</span>
                                        )}
                                      </div>
                                    </div>

                                    <div>
                                      <span className="text-slate-400 font-bold block mb-1">Passed Policy Rules</span>
                                      <div className="flex flex-wrap gap-1">
                                        {claim.passed_rules && claim.passed_rules.length > 0 ? (
                                          claim.passed_rules.map((rule: string) => (
                                            <span key={rule} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded font-bold font-mono">
                                              ✓ {rule}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-slate-400 italic font-mono">No rules passed</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Manual reviews notes / Final decision trace */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-3">
                                  <span className="font-bold text-slate-800 text-[10px] uppercase block border-b border-slate-100 pb-2">Final Decision Trace</span>
                                  <div className="space-y-2 text-[10px]">
                                    <div>
                                      <span className="text-slate-400 block font-sans">Final Decision State:</span>
                                      <span className={`px-2 py-0.5 rounded font-bold border inline-block mt-0.5 font-mono ${
                                        decisionValue === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        decisionValue === "PARTIAL" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                        decisionValue === "MANUAL_REVIEW" ? "bg-orange-50 text-orange-700 border-orange-200" :
                                        "bg-rose-50 border-rose-200 text-rose-700"
                                      }`}>
                                        {decisionValue}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block font-sans">Review Notes / Next Steps:</span>
                                      <p className="text-slate-700 font-medium mt-0.5">{claim.notes || claim.next_steps || "Automated adjudication completed with no manual reviews pending."}</p>
                                    </div>
                                    {claim.waiting_period_trace && (
                                      <div>
                                        <span className="text-slate-400 block font-sans">Waiting Period Evaluation Log:</span>
                                        <p className="text-slate-700 font-mono text-[9px] mt-0.5">{JSON.stringify(claim.waiting_period_trace)}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-3">
                                  <span className="font-bold text-slate-800 text-[10px] uppercase block border-b border-slate-100 pb-2">Immutable Rule Evaluation Stack</span>
                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/50 font-mono text-[9px] text-slate-500 leading-normal max-h-40 overflow-y-auto space-y-0.5">
                                    {claim.audit_trace && claim.audit_trace.length > 0 ? (
                                      claim.audit_trace.map((trace: string, idx: number) => (
                                        <div key={idx} className="border-b border-slate-100/50 pb-0.5 last:border-0 last:pb-0">• {trace}</div>
                                      ))
                                    ) : (
                                      <div className="italic text-slate-400">No rule trace log available.</div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Operator Corrections (Human-in-the-Loop) */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800 text-[10px] block">Operator Audit Corrections (Human-in-the-Loop)</span>
                                  <button
                                    onClick={() => setCorrectionForm({
                                      claimId: claimRef,
                                      field: "",
                                      old_value: "",
                                      new_value: "",
                                      auditor_name: "Operator-Admin"
                                    })}
                                    className="px-2.5 py-1 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-[10px] font-bold text-teal-700 transition"
                                  >
                                    + Add Correction
                                  </button>
                                </div>

                                {/* Correction form */}
                                {correctionForm && correctionForm.claimId === claimRef && (
                                  <div className="border border-teal-200 rounded-xl bg-white p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Field Changed</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. claim_amount"
                                          value={correctionForm.field}
                                          onChange={(e) => setCorrectionForm({ ...correctionForm, field: e.target.value })}
                                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-400"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Auditor Name</label>
                                        <input
                                          type="text"
                                          value={correctionForm.auditor_name}
                                          onChange={(e) => setCorrectionForm({ ...correctionForm, auditor_name: e.target.value })}
                                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-400"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Original Value</label>
                                        <input
                                          type="text"
                                          placeholder="Old value"
                                          value={correctionForm.old_value}
                                          onChange={(e) => setCorrectionForm({ ...correctionForm, old_value: e.target.value })}
                                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-400"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Corrected Value</label>
                                        <input
                                          type="text"
                                          placeholder="New value"
                                          value={correctionForm.new_value}
                                          onChange={(e) => setCorrectionForm({ ...correctionForm, new_value: e.target.value })}
                                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-400"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => setCorrectionForm(null)}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={handleAddCorrection}
                                        disabled={correctionLoading || !correctionForm.field || !correctionForm.new_value}
                                        className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-50"
                                      >
                                        {correctionLoading ? "Saving..." : "Save Correction"}
                                      </button>
                                    </div>
                                  </div>
                                )}

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

                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
