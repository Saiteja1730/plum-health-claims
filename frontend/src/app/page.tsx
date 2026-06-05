"use client";

import { useState, useRef } from "react";
import { uploadDocument, processClaim } from "../services/api";

interface ClaimFormState {
  member_id: string;
  member_name: string;
  member_age: number;
  treatment_date: string;
  claim_amount: number;
  diagnosis: string;
  treatment_type: string;
  doctor_name: string;
  doctor_registration: string;
  hospital_name: string;
  prescription_uploaded: boolean;
  bill_uploaded: boolean;
  report_uploaded: boolean;
  document_patient_name: string;
  prescription_date: string;
  bill_date: string;
  report_date: string;
  pre_authorized: boolean;
  cashless_request: boolean;
  previous_claims_same_day: number;
  network_hospital: boolean;
  medical_necessity_score: number;
  extraction_confidence: number;
  policy_active: boolean;
  member_covered: boolean;
  annual_limit: number;
  annual_used: number;
  provider_blacklisted: boolean;
  submission_days: number;
  service_category: string;
  source_document_name?: string;
  policy_join_date: string;
  member_join_date: string;
  claim_submission_date: string;
  procedures: string;
}

const DEFAULT_CLAIM_STATE: ClaimFormState = {
  member_id: "EMP001",
  member_name: "Rajesh Kumar",
  member_age: 30,
  treatment_date: "2026-06-01",
  claim_amount: 1500,
  diagnosis: "Acute Gastritis",
  treatment_type: "consultation",
  doctor_name: "Dr. A. K. Sharma",
  doctor_registration: "DL/12345/2018",
  hospital_name: "Max Healthcare",
  prescription_uploaded: true,
  bill_uploaded: true,
  report_uploaded: false,
  document_patient_name: "Rajesh Kumar",
  prescription_date: "01/06/2026",
  bill_date: "01/06/2026",
  report_date: "",
  pre_authorized: false,
  cashless_request: false,
  previous_claims_same_day: 0,
  network_hospital: true,
  medical_necessity_score: 0.95,
  extraction_confidence: 0.92,
  policy_active: true,
  member_covered: true,
  annual_limit: 50000,
  annual_used: 12000,
  provider_blacklisted: false,
  submission_days: 3,
  service_category: "OPD Consultation",
  source_document_name: "prescription_bill.pdf",
  policy_join_date: "01/01/2025",
  member_join_date: "01/01/2025",
  claim_submission_date: "04/06/2026",
  procedures: "OPD Consultation, General Checkup",
};

const EMPTY_CLAIM_STATE: ClaimFormState = {
  member_id: "",
  member_name: "",
  member_age: 30,
  treatment_date: "",
  claim_amount: 0,
  diagnosis: "",
  treatment_type: "consultation",
  doctor_name: "",
  doctor_registration: "",
  hospital_name: "",
  prescription_uploaded: true,
  bill_uploaded: true,
  report_uploaded: false,
  document_patient_name: "",
  prescription_date: "",
  bill_date: "",
  report_date: "",
  pre_authorized: false,
  cashless_request: false,
  previous_claims_same_day: 0,
  network_hospital: false,
  medical_necessity_score: 1.0,
  extraction_confidence: 1.0,
  policy_active: true,
  member_covered: true,
  annual_limit: 50000,
  annual_used: 0,
  provider_blacklisted: false,
  submission_days: 0,
  service_category: "",
  source_document_name: "",
  policy_join_date: "",
  member_join_date: "",
  claim_submission_date: "",
  procedures: "",
};

export default function AdjudicatePage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [entryMode, setEntryMode] = useState<"AI" | "MANUAL">("AI");
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accordion states for the collapsible form
  const [openAccordions, setOpenAccordions] = useState({
    member: true,
    treatment: true,
    provider: true,
    documents: true,
    fraud: true,
    ai: true,
    waiting_period: true,
  });

  const toggleAccordion = (sec: keyof typeof openAccordions) => {
    setOpenAccordions((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const syncDocsWithFiles = (filesList: typeof uploadedFiles) => {
    const hasBill = filesList.some(f => /bill|invoice|receipt|invoice_bill/i.test(f.name));
    const hasRx = filesList.some(f => /prescription|rx/i.test(f.name));
    const hasReport = filesList.some(f => /report|lab|scan|mri|ct/i.test(f.name));
    
    setFormValues(prev => ({
      ...prev,
      bill_uploaded: hasBill,
      prescription_uploaded: hasRx,
      report_uploaded: hasReport
    }));
  };

  // Form states
  const [formValues, setFormValues] = useState<ClaimFormState>(DEFAULT_CLAIM_STATE);
  const [originalValues, setOriginalValues] = useState<ClaimFormState>(DEFAULT_CLAIM_STATE);

  // Edit Audit logs ledger state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Adjudication result state
  const [adjudicationResult, setAdjudicationResult] = useState<any>(null);

  // JSON Import state
  const [jsonInput, setJsonInput] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleJsonImport = () => {
    try {
      if (!jsonInput.trim()) return;
      const parsed = JSON.parse(jsonInput);
      setFormValues((prev) => ({ ...prev, ...parsed }));
      setJsonError(null);
    } catch (e: any) {
      setJsonError("Invalid JSON format");
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (files: File[]) => {
    const newFiles = files.map((f) => ({ name: f.name, type: f.name.split(".").pop() || "" }));
    setUploadedFiles((prev) => {
      const updated = [...prev, ...newFiles];
      syncDocsWithFiles(updated);
      return updated;
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      syncDocsWithFiles(updated);
      return updated;
    });
  };

  const handleExtract = async () => {
    setExtracting(true);
    setError(null);
    setAdjudicationResult(null);
    setAuditLogs([]);
    try {
      const fileToUpload = fileInputRef.current?.files?.[0];

      if (fileToUpload) {
        const response = await uploadDocument(fileToUpload);
        const extracted = response.extracted_data;
        const today = new Date().toLocaleDateString("en-GB").replace(/\//g, "/"); // DD/MM/YYYY

        const mappedData: ClaimFormState = {
          member_id: "EMP001",
          member_name: extracted.member_name || extracted.document_patient_name || "",
          member_age: extracted.member_age || 0,
          treatment_date: extracted.treatment_date || "",
          claim_amount: Number(extracted.claim_amount) || 0,
          diagnosis: extracted.diagnosis || "",
          treatment_type: extracted.treatment_type || "consultation",
          doctor_name: extracted.doctor_name || "",
          doctor_registration: extracted.doctor_registration || "",
          hospital_name: extracted.hospital_name || "",
          prescription_uploaded: extracted.prescription_present ?? false,
          bill_uploaded: extracted.bill_present ?? false,
          report_uploaded: extracted.report_present ?? false,
          document_patient_name: extracted.document_patient_name || extracted.member_name || "",
          prescription_date: extracted.prescription_date || "",
          bill_date: extracted.bill_date || "",
          report_date: extracted.report_date || today,
          pre_authorized: false,
          cashless_request: false,
          previous_claims_same_day: 0,
          network_hospital: true,
          medical_necessity_score: extracted.medical_necessity_score || 0.95,
          extraction_confidence: extracted.confidence_score || 0.92,
          policy_active: true,
          member_covered: true,
          annual_limit: extracted.annual_limit || 50000,
          annual_used: extracted.annual_used || 0,
          provider_blacklisted: false,
          submission_days: 3,
          service_category: extracted.service_category || "OPD Consultation",
          source_document_name: fileToUpload.name,
          policy_join_date: extracted.policy_join_date || "",
          member_join_date: extracted.member_join_date || "",
          claim_submission_date: extracted.claim_submission_date || today,
          procedures: extracted.procedures || "",
        };

        setFormValues(mappedData);
        setOriginalValues(mappedData);
      } else {
        const docName = uploadedFiles.length > 0 ? uploadedFiles[0].name : "sample_prescription.pdf";
        const demoData: ClaimFormState = {
          ...DEFAULT_CLAIM_STATE,
          source_document_name: docName,
        };
        if (uploadedFiles.length > 0) {
          demoData.bill_uploaded = uploadedFiles.some(f => /bill|invoice|receipt|invoice_bill/i.test(f.name));
          demoData.prescription_uploaded = uploadedFiles.some(f => /prescription|rx/i.test(f.name));
          demoData.report_uploaded = uploadedFiles.some(f => /report|lab|scan|mri|ct/i.test(f.name));
        }
        setFormValues(demoData);
        setOriginalValues(demoData);
      }
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || "AI Extraction failed. Ensure backend is running.");
    } finally {
      setExtracting(false);
    }
  };

  const handleStartManualForm = () => {
    setFormValues(EMPTY_CLAIM_STATE);
    setOriginalValues(EMPTY_CLAIM_STATE);
    setAdjudicationResult(null);
    setAuditLogs([]);
    setError(null);
    setStep(2);
  };

  const handleSubmitAdjudication = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...formValues,
        procedures: formValues.procedures
          ? formValues.procedures.split(",").map((p: string) => p.trim()).filter(Boolean)
          : [],
        audit_trail: auditLogs
      };
      const result = await processClaim(payload);
      setAdjudicationResult(result);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || "Claim adjudication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (field: keyof ClaimFormState, value: any) => {
    // 3 characters edit limit for member_name
    if (field === "member_name") {
      const original = originalValues.member_name;
      const maxDiff = 3;
      const prefixLength = Math.max(0, original.length - maxDiff);
      const requiredPrefix = original.substring(0, prefixLength);
      if (!value.startsWith(requiredPrefix)) {
        return;
      }
    }

    // Register edit in the audit log
    const origVal = originalValues[field];
    if (origVal !== value) {
      const existingIdx = auditLogs.findIndex((log) => log.field === field);
      const newLog = {
        field,
        original: origVal,
        edited: value,
        edited_by: "Operator-Admin",
        timestamp: new Date().toISOString()
      };
      if (existingIdx >= 0) {
        setAuditLogs((prev) => {
          const list = [...prev];
          list[existingIdx] = newLog;
          return list;
        });
      } else {
        setAuditLogs((prev) => [...prev, newLog]);
      }
    } else {
      // Reverted to original
      setAuditLogs((prev) => prev.filter((log) => log.field !== field));
    }

    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const isFieldModified = (field: keyof ClaimFormState) => {
    return formValues[field] !== originalValues[field];
  };

  // Helper to compute live frontend completeness score
  const getCompletenessScore = () => {
    const checks = [
      formValues.bill_uploaded,
      formValues.prescription_uploaded,
      formValues.report_uploaded,
      boolVal(formValues.doctor_registration),
      boolVal(formValues.diagnosis)
    ];
    return Math.round((checks.filter(Boolean).length / 5) * 100);
  };

  const getWaitingPeriodEval = () => {
    let joinDateStr = formValues.member_join_date || "01/01/2024";
    let treatmentDateStr = formValues.treatment_date || "2026-06-01";
    
    let joinDt: Date;
    if (joinDateStr.includes("-")) {
      joinDt = new Date(joinDateStr);
    } else {
      const parts = joinDateStr.split("/");
      joinDt = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }

    let treatDt: Date;
    if (treatmentDateStr.includes("-")) {
      treatDt = new Date(treatmentDateStr);
    } else {
      const parts = treatmentDateStr.split("/");
      treatDt = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }

    const diffTime = treatDt.getTime() - joinDt.getTime();
    const daysSinceJoining = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    const diag = (formValues.diagnosis || "").toLowerCase();
    let ruleName = "Initial 30-Day Waiting Period";
    let requiredDays = 30;
    
    if (diag.includes("diabetes")) {
      ruleName = "Diabetes 90-Day waiting period";
      requiredDays = 90;
    } else if (diag.includes("hypertension") || diag.includes("blood pressure")) {
      ruleName = "Hypertension 90-Day waiting period";
      requiredDays = 90;
    } else if (diag.includes("maternity")) {
      ruleName = "Maternity 270-Day waiting period";
      requiredDays = 270;
    } else if (diag.includes("joint replacement") || diag.includes("knee replacement")) {
      ruleName = "Joint Replacement 730-Day waiting period";
      requiredDays = 730;
    }

    const isPass = daysSinceJoining >= requiredDays;
    
    return {
      joinDate: joinDateStr,
      treatmentDate: treatmentDateStr,
      daysSinceJoining,
      applicableRule: `${ruleName} (Requires ${requiredDays} days)`,
      result: isPass ? "PASS" : "FAIL"
    };
  };

  const boolVal = (val: any) => {
    return val !== null && val !== undefined && val !== "" && val !== 0;
  };

  const getConfidenceBadgeColor = (score: number) => {
    if (score >= 0.9) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 0.7) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const getRuleExplanation = (rule: string) => {
    const rulesMap: Record<string, { severity: string; reason: string; impact: string }> = {
      WAITING_PERIOD: {
        severity: "CRITICAL",
        reason: "Patient falls within wait exclusions logic calculated against policy join date.",
        impact: "Payout reduced to zero."
      },
      PATIENT_MISMATCH: {
        severity: "CRITICAL",
        reason: "Name parsed from medical invoice differs from member records.",
        impact: "Claim automatically rejected."
      },
      DATE_MISMATCH: {
        severity: "HIGH",
        reason: "Document dates are inconsistent or exceed the 7-day threshold.",
        impact: "Claim rejected."
      },
      DOCTOR_REG_INVALID: {
        severity: "HIGH",
        reason: "Physician registry number format is invalid or unregistered.",
        impact: "Claim rejected."
      },
      PROVIDER_BLACKLIST: {
        severity: "CRITICAL",
        reason: "Medical provider has been flagged as blacklisted in systems index.",
        impact: "Immediate claim rejection."
      },
      MISSING_DOCUMENTS: {
        severity: "HIGH",
        reason: "Required invoice receipts or prescriptions are missing.",
        impact: "Claim rejected."
      },
      MANDATORY_FIELD_MISSING: {
        severity: "CRITICAL",
        reason: "Required baseline claim parameter variables are empty or missing.",
        impact: "Console referral to Manual Review."
      },
      PRESCRIPTION_REQUIRED: {
        severity: "HIGH",
        reason: "Prescription missing from submission (bill-only uploads exception).",
        impact: "Console referral to Manual Review."
      },
      LOW_CONFIDENCE: {
        severity: "HIGH",
        reason: "AI data extraction confidence falls below the 85% threshold.",
        impact: "Console referral to Manual Review."
      }
    };

    return rulesMap[rule] || {
      severity: "MEDIUM",
      reason: "Policy rule criteria check failed.",
      impact: "Claim status adjusted."
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans">Claim Adjudication Console</h2>
          <p className="text-xs text-slate-500 mt-1">Ingest invoices, review AI parameters, and execute rule adjudications.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setStep(1)}
            className={`px-3 py-1.5 rounded-lg border transition font-bold ${
              step === 1 ? "bg-teal-50 text-teal-700 border-teal-200 shadow-sm" : "bg-white text-slate-500 border-slate-200"
            }`}
          >
            1. Ingestion Mode
          </button>
          <span className="text-slate-300">/</span>
          <button
            onClick={() => setStep(2)}
            className={`px-3 py-1.5 rounded-lg border transition font-bold ${
              step === 2 ? "bg-teal-50 text-teal-700 border-teal-200 shadow-sm" : "bg-white text-slate-500 border-slate-200"
            }`}
          >
            2. Auditor Console
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-xs">
            <p className="font-bold">System Alert</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Path */}
          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center font-bold text-lg">
                AI
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">AI Document Extraction Path</h3>
                <p className="text-sm text-slate-500 mt-1">Upload digital receipt copies. AI will auto-extract claims parameters and enforce locked compliance fields.</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                  isDragging ? "border-teal-500 bg-teal-50/20" : "border-slate-300 bg-slate-50 hover:bg-slate-100/50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                />
                <p className="text-xs font-bold text-slate-600">Drag files here or click to browse</p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="max-h-24 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                      <span className="truncate max-w-[200px]">{file.name}</span>
                      <button onClick={() => removeFile(idx)} className="text-rose-500 hover:text-rose-700">Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setUploadedFiles([
                    { name: "Bill.pdf", type: "pdf" },
                    { name: "Prescription.pdf", type: "pdf" },
                    { name: "LabReport.pdf", type: "pdf" }
                  ])}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-sm"
                >
                  Load Demo Invoices
                </button>
                <button
                  onClick={() => {
                    setEntryMode("AI");
                    handleExtract();
                  }}
                  disabled={uploadedFiles.length === 0 || extracting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition flex items-center gap-2"
                >
                  {extracting && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  Extract Information
                </button>
              </div>
            </div>
          </div>

          {/* Manual Entry Path */}
          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center font-bold text-lg">
                M
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Direct Manual Entry Flow</h3>
                <p className="text-sm text-slate-500 mt-1">Directly key in all claim parameters into an empty form. Best for manual backups or overrides.</p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setEntryMode("MANUAL");
                  handleStartManualForm();
                }}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                Start Direct Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: THREE-PANE LAYOUT */}
      {step === 2 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* PANEL 1: LEFT PANEL (Document & Ingestion Checkpoint) */}
          <div className="xl:col-span-3 bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">1. Document Ingestion</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Ingested files and processing status</p>
            </div>

            <div className="space-y-4">
              {/* Uploaded Documents List */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Ingested Attachments</span>
                <div className="space-y-1.5 text-xs text-slate-700">
                  {uploadedFiles.length > 0 ? (
                    uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                        <span>✓ {file.name}</span>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Uploaded</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-slate-400 italic p-2">No documents uploaded yet</div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition text-center shadow-sm block"
            >
              Reset Entry Path
            </button>

            {/* JSON Importer */}
            <div className="pt-4 border-t border-slate-200/60 space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Raw JSON Import</label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"member_id": "EMP100", "claim_amount": 5000}'
                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] font-mono text-slate-700 focus:outline-none focus:border-teal-500/50"
              />
              {jsonError && <div className="text-[10px] text-rose-500">{jsonError}</div>}
              <button
                onClick={handleJsonImport}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition text-center shadow-sm block"
              >
                Apply JSON Data
              </button>
            </div>
          </div>

          {/* PANEL 2: CENTER PANEL (Editable form with Lock Indicators) */}
          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">2. Claim Parameters Review</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Edit values to correct model predictions</p>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700 max-h-[600px] overflow-y-auto pr-1">
              
              {/* Accordion 1: Member Information */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleAccordion("member")}
                  className="w-full flex items-center justify-between font-bold text-teal-700 bg-teal-50/50 hover:bg-teal-50 px-3 py-2 rounded-lg border border-teal-100 transition"
                >
                  <span className="text-[10px] uppercase tracking-wider">Member Information</span>
                  <span>{openAccordions.member ? "▲" : "▼"}</span>
                </button>
                
                {openAccordions.member && (
                  <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-lg grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500">Member Name (Editable)</label>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">98% Conf</span>
                      </div>
                      <input
                        type="text"
                        value={formValues.member_name}
                        onChange={(e) => handleFieldChange("member_name", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white font-medium"
                      />
                      <span className="text-[8px] text-slate-400 block mt-0.5 font-normal">📄 {formValues.source_document_name || "N/A"} | Conf: 98% | Orig: {originalValues.member_name}</span>
                      {isFieldModified("member_name") && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[9px] text-amber-600 block">Orig: {originalValues.member_name}</span>
                          <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 font-sans">MANUALLY MODIFIED</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Member ID {entryMode === "MANUAL" && "(Editable)"}</span>
                          {entryMode === "AI" && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </label>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">100% Conf</span>
                      </div>
                      <input
                        type="text"
                        value={formValues.member_id}
                        onChange={(e) => handleFieldChange("member_id", e.target.value)}
                        readOnly={entryMode === "AI"}
                        disabled={entryMode === "AI"}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs$ font-mono font-medium ${
                          entryMode === "AI"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white"
                        }`}
                      />
                      <span className="text-[8px] text-slate-400 block mt-0.5 font-normal">📄 System Database Registry Link</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500">Member Age</label>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">98% Conf</span>
                      </div>
                      <input
                        type="number"
                        value={formValues.member_age}
                        onChange={(e) => handleFieldChange("member_age", Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white font-medium"
                      />
                      <span className="text-[8px] text-slate-400 block mt-0.5 font-normal">📄 {formValues.source_document_name || "N/A"} | Conf: 98%</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Annual Limit (₹) {entryMode === "MANUAL" && "(Editable)"}</span>
                          {entryMode === "AI" && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </label>
                      </div>
                      <input
                        type="number"
                        value={formValues.annual_limit}
                        onChange={(e) => handleFieldChange("annual_limit", Number(e.target.value))}
                        readOnly={entryMode === "AI"}
                        disabled={entryMode === "AI"}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs$ font-mono font-medium ${
                          entryMode === "AI"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white"
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Annual Used (₹) {entryMode === "MANUAL" && "(Editable)"}</span>
                          {entryMode === "AI" && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </label>
                      </div>
                      <input
                        type="number"
                        value={formValues.annual_used}
                        onChange={(e) => handleFieldChange("annual_used", Number(e.target.value))}
                        readOnly={entryMode === "AI"}
                        disabled={entryMode === "AI"}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs$ font-mono font-medium ${
                          entryMode === "AI"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white"
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Member Join Date {entryMode === "MANUAL" && "(Editable)"}</span>
                          {entryMode === "AI" && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </label>
                      </div>
                      <input
                        type="text"
                        value={formValues.member_join_date}
                        onChange={(e) => handleFieldChange("member_join_date", e.target.value)}
                        readOnly={entryMode === "AI"}
                        disabled={entryMode === "AI"}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs$ font-mono font-medium ${
                          entryMode === "AI"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white"
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Policy Join Date {entryMode === "MANUAL" && "(Editable)"}</span>
                          {entryMode === "AI" && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </label>
                      </div>
                      <input
                        type="text"
                        value={formValues.policy_join_date}
                        onChange={(e) => handleFieldChange("policy_join_date", e.target.value)}
                        readOnly={entryMode === "AI"}
                        disabled={entryMode === "AI"}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs$ font-mono font-medium ${
                          entryMode === "AI"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white"
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-4 pt-4 col-span-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formValues.policy_active}
                          onChange={(e) => handleFieldChange("policy_active", e.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-[10px] font-bold text-slate-500">Policy Active</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formValues.member_covered}
                          onChange={(e) => handleFieldChange("member_covered", e.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-[10px] font-bold text-slate-500">Member Covered</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Treatment Information */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleAccordion("treatment")}
                  className="w-full flex items-center justify-between font-bold text-teal-700 bg-teal-50/50 hover:bg-teal-50 px-3 py-2 rounded-lg border border-teal-100 transition"
                >
                  <span className="text-[10px] uppercase tracking-wider">Treatment Information</span>
                  <span>{openAccordions.treatment ? "▲" : "▼"}</span>
                </button>

                {openAccordions.treatment && (
                  <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-lg grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500">Diagnosis (Editable)</label>
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.2 rounded font-mono">85% Conf</span>
                      </div>
                      <input
                        type="text"
                        value={formValues.diagnosis}
                        onChange={(e) => handleFieldChange("diagnosis", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white font-medium"
                      />
                      <span className="text-[8px] text-slate-400 block mt-0.5 font-normal">📄 {formValues.source_document_name || "N/A"} | Conf: 85% | Orig: {originalValues.diagnosis}</span>
                      {isFieldModified("diagnosis") && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[9px] text-amber-600 block">Orig: {originalValues.diagnosis}</span>
                          <span className="text-[8px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">MANUALLY MODIFIED</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500">Treatment Type (Editable)</label>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">99% Conf</span>
                      </div>
                      <select
                        value={formValues.treatment_type}
                        onChange={(e) => handleFieldChange("treatment_type", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white font-medium"
                      >
                        <option value="consultation">Consultation</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="diagnostics">Diagnostics</option>
                        <option value="dental">Dental</option>
                        <option value="vision">Vision</option>
                        <option value="mri">MRI Scan</option>
                      </select>
                      <span className="text-[8px] text-slate-400 block mt-0.5 font-normal">📄 {formValues.source_document_name || "N/A"} | Conf: 99%</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Treatment Date {entryMode === "MANUAL" && "(Editable)"}</span>
                          {entryMode === "AI" && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </label>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">99% Conf</span>
                      </div>
                      <input
                        type="text"
                        value={formValues.treatment_date}
                        onChange={(e) => handleFieldChange("treatment_date", e.target.value)}
                        readOnly={entryMode === "AI"}
                        disabled={entryMode === "AI"}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs$ font-mono font-medium ${
                          entryMode === "AI"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white"
                        }`}
                      />
                      <span className="text-[8px] text-slate-400 block mt-0.5 font-normal">📄 {formValues.source_document_name || "N/A"}</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Claim Submission Date {entryMode === "MANUAL" && "(Editable)"}</span>
                          {entryMode === "AI" && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </label>
                      </div>
                      <input
                        type="text"
                        value={formValues.claim_submission_date}
                        onChange={(e) => handleFieldChange("claim_submission_date", e.target.value)}
                        readOnly={entryMode === "AI"}
                        disabled={entryMode === "AI"}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs$ font-mono font-medium ${
                          entryMode === "AI"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white"
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Claim Amount (₹) {entryMode === "MANUAL" && "(Editable)"}</span>
                          {entryMode === "AI" && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </label>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">99% Conf</span>
                      </div>
                      <input
                        type="number"
                        value={formValues.claim_amount}
                        onChange={(e) => handleFieldChange("claim_amount", Number(e.target.value))}
                        readOnly={entryMode === "AI"}
                        disabled={entryMode === "AI"}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs$ font-mono font-bold ${
                          entryMode === "AI"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white"
                        }`}
                      />
                      <span className="text-[8px] text-slate-400 block mt-0.5 font-normal">📄 {formValues.source_document_name || "N/A"} | Conf: 99%</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500">Procedures</label>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">94% Conf</span>
                      </div>
                      <input
                        type="text"
                        value={formValues.procedures}
                        onChange={(e) => handleFieldChange("procedures", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white font-medium"
                      />
                      <span className="text-[8px] text-slate-400 block mt-0.5 font-normal">📄 {formValues.source_document_name || "N/A"} | Conf: 94%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 3: Provider Information */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleAccordion("provider")}
                  className="w-full flex items-center justify-between font-bold text-teal-700 bg-teal-50/50 hover:bg-teal-50 px-3 py-2 rounded-lg border border-teal-100 transition"
                >
                  <span className="text-[10px] uppercase tracking-wider">Provider Information</span>
                  <span>{openAccordions.provider ? "▲" : "▼"}</span>
                </button>

                {openAccordions.provider && (
                  <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-lg grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500">Hospital Name (Editable)</label>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">96% Conf</span>
                      </div>
                      <input
                        type="text"
                        value={formValues.hospital_name || ""}
                        onChange={(e) => handleFieldChange("hospital_name", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white font-medium"
                      />
                      <span className="text-[8px] text-slate-400 block mt-0.5 font-normal">📄 {formValues.source_document_name || "N/A"} | Conf: 96%</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500">Doctor Name (Editable)</label>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">95% Conf</span>
                      </div>
                      <input
                        type="text"
                        value={formValues.doctor_name}
                        onChange={(e) => handleFieldChange("doctor_name", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white font-medium"
                      />
                      <span className="text-[8px] text-slate-400 block mt-0.5 font-normal">📄 {formValues.source_document_name || "N/A"} | Conf: 95%</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Doctor Registration {entryMode === "MANUAL" && "(Editable)"}</span>
                          {entryMode === "AI" && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </label>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">99% Conf</span>
                      </div>
                      <input
                        type="text"
                        value={formValues.doctor_registration}
                        onChange={(e) => handleFieldChange("doctor_registration", e.target.value)}
                        readOnly={entryMode === "AI"}
                        disabled={entryMode === "AI"}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs$ font-mono font-medium ${
                          entryMode === "AI"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white"
                        }`}
                      />
                      <span className="text-[8px] text-slate-400 block mt-0.5 font-normal">📄 {formValues.source_document_name || "N/A"} | Conf: 99%</span>
                    </div>

                    <div className="flex items-center pt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formValues.network_hospital}
                          onChange={(e) => handleFieldChange("network_hospital", e.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-[10px] font-bold text-slate-500">Network Hospital Override</span>
                      </label>
                    </div>

                    {/* Network Provider Lookup Live Widget */}
                    <div className="col-span-2 mt-2 p-3 bg-teal-50/50 border border-teal-100 rounded-lg space-y-1 text-[11px] font-semibold">
                      <span className="text-[9px] font-bold text-teal-800 uppercase tracking-wider block">Network Provider Lookup Registry</span>
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600 pt-1">
                        <div>
                          <span className="text-[8px] text-slate-400 block">Doctor/Provider</span>
                          <span className="font-bold text-slate-700">{formValues.doctor_name || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 block">Network Status</span>
                          <span className={`font-bold ${adjudicationResult?.provider_status === "Preferred Network Partner" ? "text-emerald-600" : adjudicationResult?.provider_status === "Blacklisted" ? "text-rose-600 font-extrabold" : "text-slate-500"}`}>
                            {adjudicationResult ? adjudicationResult.provider_status : (formValues.doctor_registration === "KA/45678/2015" || formValues.doctor_registration === "GJ/56789/2014" ? "Preferred Network Partner" : "Out of Network")}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 block">Cashless Eligibility</span>
                          <span className={`font-bold ${adjudicationResult?.provider_cashless === "Eligible" ? "text-emerald-600" : "text-slate-500"}`}>
                            {adjudicationResult ? adjudicationResult.provider_cashless : (formValues.doctor_registration === "KA/45678/2015" || formValues.doctor_registration === "GJ/56789/2014" ? "Eligible" : "Not Eligible")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 4: Documents Section */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleAccordion("documents")}
                  className="w-full flex items-center justify-between font-bold text-teal-700 bg-teal-50/50 hover:bg-teal-50 px-3 py-2 rounded-lg border border-teal-100 transition"
                >
                  <span className="text-[10px] uppercase tracking-wider">Document Metadata</span>
                  <span>{openAccordions.documents ? "▲" : "▼"}</span>
                </button>

                {openAccordions.documents && (
                  <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-lg grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500">Document Patient Name</label>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">97% Conf</span>
                      </div>
                      <input
                        type="text"
                        value={formValues.document_patient_name}
                        onChange={(e) => handleFieldChange("document_patient_name", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white font-medium"
                      />
                      <span className="text-[8px] text-slate-400 block mt-0.5 font-normal">📄 {formValues.source_document_name || "N/A"} | Conf: 97%</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Prescription Date {entryMode === "MANUAL" && "(Editable)"}</span>
                          {entryMode === "AI" && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </label>
                      </div>
                      <input
                        type="text"
                        value={formValues.prescription_date}
                        onChange={(e) => handleFieldChange("prescription_date", e.target.value)}
                        readOnly={entryMode === "AI"}
                        disabled={entryMode === "AI"}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs$ font-mono font-medium ${
                          entryMode === "AI"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white"
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Bill Date {entryMode === "MANUAL" && "(Editable)"}</span>
                          {entryMode === "AI" && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </label>
                      </div>
                      <input
                        type="text"
                        value={formValues.bill_date}
                        onChange={(e) => handleFieldChange("bill_date", e.target.value)}
                        readOnly={entryMode === "AI"}
                        disabled={entryMode === "AI"}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs$ font-mono font-medium ${
                          entryMode === "AI"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white"
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Report Date {entryMode === "MANUAL" && "(Editable)"}</span>
                          {entryMode === "AI" && (
                            <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </label>
                      </div>
                      <input
                        type="text"
                        value={formValues.report_date}
                        onChange={(e) => handleFieldChange("report_date", e.target.value)}
                        readOnly={entryMode === "AI"}
                        disabled={entryMode === "AI"}
                        className={`w-full border rounded-lg px-2.5 py-1.5 text-xs$ font-mono font-medium ${
                          entryMode === "AI"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white"
                        }`}
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-2 col-span-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Attachment Toggles</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formValues.prescription_uploaded}
                            onChange={(e) => handleFieldChange("prescription_uploaded", e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-[10px] font-bold text-slate-500">Prescription</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formValues.bill_uploaded}
                            onChange={(e) => handleFieldChange("bill_uploaded", e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-[10px] font-bold text-slate-500">Bill</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formValues.report_uploaded}
                            onChange={(e) => handleFieldChange("report_uploaded", e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-[10px] font-bold text-slate-500">Report</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 5: Fraud Checks */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleAccordion("fraud")}
                  className="w-full flex items-center justify-between font-bold text-teal-700 bg-teal-50/50 hover:bg-teal-50 px-3 py-2 rounded-lg border border-teal-100 transition"
                >
                  <span className="text-[10px] uppercase tracking-wider">Fraud & History Flags</span>
                  <span>{openAccordions.fraud ? "▲" : "▼"}</span>
                </button>

                {openAccordions.fraud && (
                  <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-lg grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500">Daily Claim Count</label>
                      </div>
                      <input
                        type="number"
                        value={formValues.previous_claims_same_day}
                        onChange={(e) => handleFieldChange("previous_claims_same_day", Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white font-medium"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500">Submission Delay (Days)</label>
                      </div>
                      <input
                        type="number"
                        value={formValues.submission_days}
                        onChange={(e) => handleFieldChange("submission_days", Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500/50 focus:bg-white font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-4 pt-4 col-span-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formValues.provider_blacklisted}
                          onChange={(e) => handleFieldChange("provider_blacklisted", e.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-[10px] font-bold text-slate-500">Provider Blacklisted</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 6: AI Extraction details */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleAccordion("ai")}
                  className="w-full flex items-center justify-between font-bold text-teal-700 bg-teal-50/50 hover:bg-teal-50 px-3 py-2 rounded-lg border border-teal-100 transition"
                >
                  <span className="text-[10px] uppercase tracking-wider">AI Extraction Scoring</span>
                  <span>{openAccordions.ai ? "▲" : "▼"}</span>
                </button>

                {openAccordions.ai && (
                  <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-lg grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Extraction Confidence</span>
                          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </label>
                      </div>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={`${(formValues.extraction_confidence * 100).toFixed(0)}%`}
                        className="w-full bg-slate-100 text-slate-400 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs cursor-not-allowed font-mono font-medium"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <span>Necessity Score</span>
                          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </label>
                      </div>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={`${(formValues.medical_necessity_score * 100).toFixed(0)}%`}
                        className="w-full bg-slate-100 text-slate-400 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs cursor-not-allowed font-mono font-medium"
                      />
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold text-slate-500">Source Document Name</label>
                      </div>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={formValues.source_document_name || "N/A"}
                        className="w-full bg-slate-100 text-slate-400 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs cursor-not-allowed font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 7: Waiting Period Evaluation Panel */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleAccordion("waiting_period")}
                  className="w-full flex items-center justify-between font-bold text-teal-700 bg-teal-50/50 hover:bg-teal-50 px-3 py-2 rounded-lg border border-teal-100 transition"
                >
                  <span className="text-[10px] uppercase tracking-wider">Waiting Period Evaluation Panel</span>
                  <span>{openAccordions.waiting_period ? "▲" : "▼"}</span>
                </button>

                {openAccordions.waiting_period && (
                  <div className="p-3 bg-slate-50/30 border border-slate-100 rounded-lg space-y-2 text-[10px] font-semibold text-slate-600">
                    {(() => {
                      const evalResult = getWaitingPeriodEval();
                      return (
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <span className="text-[8px] text-slate-400 block uppercase">Join Date</span>
                            <span className="font-mono text-slate-850 font-bold">{evalResult.joinDate}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-400 block uppercase">Treatment Date</span>
                            <span className="font-mono text-slate-850 font-bold">{evalResult.treatmentDate}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-400 block uppercase">Days Since Joining</span>
                            <span className="font-mono text-slate-850 font-bold">{evalResult.daysSinceJoining} days</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-400 block uppercase">Evaluation Result</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold border font-mono ${
                              evalResult.result === "PASS" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>{evalResult.result}</span>
                          </div>
                          <div className="col-span-2 border-t border-slate-100 pt-1.5">
                            <span className="text-[8px] text-slate-400 block uppercase">Applicable Waiting Rule</span>
                            <span className="text-slate-800 font-bold">{evalResult.applicableRule}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Audit logs trail viewer */}
              {auditLogs.length > 0 && (
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg space-y-2">
                  <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block">Auditor Edit Ledger (Unsubmitted Changes)</span>
                  <div className="space-y-1.5 text-[9px] font-medium text-slate-700">
                    {auditLogs.map((log, idx) => (
                      <div key={idx} className="bg-white p-2 border border-amber-100 rounded-lg space-y-0.5 shadow-sm">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Field: {log.field}</span>
                          <span className="text-[7.5px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-500">Original: <span className="font-mono">{JSON.stringify(log.original)}</span> | Modified: <span className="font-mono text-teal-600 font-bold">{JSON.stringify(log.edited)}</span></p>
                        <p className="text-[7px] text-slate-400 italic">Logged by: {log.edited_by}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={handleSubmitAdjudication}
                disabled={submitting}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                {submitting ? (
                  <>
                     <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                     Running Policies...
                  </>
                ) : (
                  <>Adjudicate Claim File</>
                )}
              </button>
            </div>
          </div>

          {/* PANEL 3: RIGHT PANEL (Decision & Checklist timelines) */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Document Verification Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">Document Verification</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Static validation parameters of files</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-[11px] font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Bill Present</span>
                  <span className={formValues.bill_uploaded ? "text-emerald-600" : "text-rose-600"}>
                    {formValues.bill_uploaded ? "✓ YES" : "✗ NO"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Prescription Present</span>
                  <span className={formValues.prescription_uploaded ? "text-emerald-600" : "text-rose-600"}>
                    {formValues.prescription_uploaded ? "✓ YES" : "✗ NO"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Report Present</span>
                  <span className={formValues.report_uploaded ? "text-emerald-600" : "text-rose-600"}>
                    {formValues.report_uploaded ? "✓ YES" : "✗ NO"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span>OCR Confidence</span>
                  <span className="font-mono text-slate-800">
                    {(formValues.extraction_confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Completeness %</span>
                  <span className="font-mono text-teal-600 font-bold">
                    {getCompletenessScore()}%
                  </span>
                </div>
              </div>
            </div>

            {/* Decision Details Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">Decision Panel</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Rules Engine output and payables analysis</p>
              </div>

              {adjudicationResult ? (
                <div className="space-y-4 text-xs font-semibold text-slate-700">
                  {/* Status Banner */}
                  <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-lg">
                    <div>
                      <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400">Rules Status</span>
                      <div className="font-extrabold text-slate-900 text-sm mt-0.5">{adjudicationResult.decision}</div>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase ${
                      adjudicationResult.decision === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : adjudicationResult.decision === "PARTIAL"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : adjudicationResult.decision === "MANUAL_REVIEW"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}>
                      {adjudicationResult.decision}
                    </span>
                  </div>

                  {/* Dynamic Decision Explanation */}
                  <div className="p-3 rounded-lg border text-[11px] leading-relaxed font-semibold bg-slate-50 border-slate-200">
                    {adjudicationResult.decision === "APPROVED" && (
                      <div>
                        <span className="text-emerald-700 font-bold uppercase tracking-wider text-[8px] block mb-1">✓ Why Approved</span>
                        <p className="text-slate-600 leading-normal">The claim has successfully passed all policy coverage rules, verified member activity records, and doctor credentials. Document completeness met the necessary requirements with no fraud or sublimit flags triggered.</p>
                      </div>
                    )}
                    {adjudicationResult.decision === "PARTIAL" && (
                      <div>
                        <span className="text-amber-700 font-bold uppercase tracking-wider text-[8px] block mb-1">⚠ Why Partially Approved</span>
                        <p className="text-slate-600 leading-normal">The claim was approved, but the requested amount exceeded sublimit caps (such as Dental/Vision limits) or general per-claim limits. Payable benefits were capped at the policy limit.</p>
                      </div>
                    )}
                    {adjudicationResult.decision === "REJECTED" && (
                      <div>
                        <span className="text-rose-700 font-bold uppercase tracking-wider text-[8px] block mb-1">✗ Why Rejected</span>
                        <p className="text-slate-600 leading-normal">Rejection triggered due to policy compliance violations: <span className="font-mono text-rose-600 font-bold">{adjudicationResult.rejection_reasons.join(", ")}</span>. These include active waiting periods, inactive policies, patient mismatch, or blacklisted providers.</p>
                      </div>
                    )}
                    {adjudicationResult.decision === "MANUAL_REVIEW" && (
                      <div>
                        <span className="text-orange-700 font-bold uppercase tracking-wider text-[8px] block mb-1">⚙ Why Manual Review</span>
                        <p className="text-slate-600 leading-normal">Routed to manual audit due to data exception flags: <span className="font-mono text-orange-600 font-bold">{adjudicationResult.rejection_reasons.join(", ")}</span>. Common triggers include low AI extraction confidence, missing critical form values, or missing supporting documentation files.</p>
                      </div>
                    )}
                  </div>

                  {/* Comprehensive Metadata Checklist */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-[11px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Original Claim Amount</span>
                      <span className="font-mono">₹{adjudicationResult.original_amount ? adjudicationResult.original_amount.toFixed(2) : formValues.claim_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Approved Amount</span>
                      <span className="font-mono text-emerald-600 font-bold">₹{adjudicationResult.approved_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Excluded Amount</span>
                      <span className="font-mono text-rose-600 font-bold">₹{adjudicationResult.excluded_amount ? adjudicationResult.excluded_amount.toFixed(2) : "0.00"}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Co-pay Applied</span>
                      <span className="font-mono text-amber-600 font-bold">₹{adjudicationResult.copay_applied ? adjudicationResult.copay_applied.toFixed(2) : "0.00"}</span>
                    </div>
                    {adjudicationResult.policy_limit_applied > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Policy Limit Applied</span>
                        <span className="font-mono text-orange-600 font-bold">₹{adjudicationResult.policy_limit_applied.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500 border-t border-slate-200 pt-2">
                      <span>AI extraction confidence</span>
                      <span className="font-mono">{(adjudicationResult.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Network Discount</span>
                      <span className="font-mono text-emerald-600">₹{(adjudicationResult.network_discount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Cashless Status</span>
                      <span className={`font-bold ${adjudicationResult.cashless_approved ? "text-emerald-600" : "text-slate-500"}`}>
                        {adjudicationResult.cashless_approved ? "APPROVED" : "NOT APPROVED"}
                      </span>
                    </div>
                    {adjudicationResult.review_category && (
                      <div className="flex justify-between text-slate-500">
                        <span>Review Referral Category</span>
                        <span className="font-mono text-orange-600 font-bold uppercase">{adjudicationResult.review_category}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-2 text-[10px]">
                      <span className="text-slate-400 font-bold uppercase tracking-wider block">Auditor Notes</span>
                      <p className="text-slate-600 italic mt-0.5 font-sans font-medium">{adjudicationResult.notes || "All checks cleared."}</p>
                    </div>
                    <div className="text-[10px]">
                      <span className="text-slate-400 font-bold uppercase tracking-wider block">Next Steps</span>
                      <p className="text-slate-600 mt-0.5 font-sans font-medium">{adjudicationResult.next_steps || "No pending actions."}</p>
                    </div>

                    {/* Rule Execution Audit Trace */}
                    {adjudicationResult.audit_trace && adjudicationResult.audit_trace.length > 0 && (
                      <div className="border-t border-slate-200 pt-2 text-[9px]">
                        <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Execution Audit Trail</span>
                        <div className="bg-slate-100 p-2 rounded border border-slate-200/50 font-mono text-slate-600 space-y-1 max-h-[150px] overflow-y-auto">
                          {adjudicationResult.audit_trace.map((trace: string, idx: number) => (
                            <div key={idx} className="border-b border-slate-200/40 last:border-0 pb-1 mb-1 last:pb-0 last:mb-0">
                              • {trace}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rejection Reasons */}
                  {adjudicationResult.rejection_reasons && adjudicationResult.rejection_reasons.length > 0 && (
                    <div className="space-y-1 bg-rose-50/50 p-2 border border-rose-100 rounded-lg">
                      <span className="text-[8px] font-bold text-rose-600 uppercase tracking-wider">Rejection Reasons</span>
                      <ul className="list-disc pl-3 text-[10px] text-rose-700 space-y-0.5 font-mono">
                        {adjudicationResult.rejection_reasons.map((reason: string, idx: number) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              ) : (
                <div className="h-40 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-center p-4">
                  <p className="text-xs font-semibold text-slate-600">Awaiting Adjudication</p>
                  <p className="text-[9px] text-slate-400 mt-1 max-w-[150px]">Adjudicate the review parameters on the left to see dynamic outcome flags.</p>
                </div>
              )}
            </div>

            {/* Rule Execution Timeline */}
            {adjudicationResult && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Rule Execution Timeline</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Chronological rules evaluation pipeline</p>
                </div>
                <div className="space-y-2 text-[10px] relative pl-4 border-l border-slate-100 font-semibold">
                  {(() => {
                    const steps = [
                      { name: "Mandatory Fields Check", status: adjudicationResult.rule_trace["MANDATORY_FIELDS"] },
                      { name: "Document Completeness", status: adjudicationResult.rule_trace["DOCUMENT_COMPLETENESS"] },
                      { name: "Member Active & Covered Check", status: adjudicationResult.rule_trace["MEMBER_VALIDATION"] },
                      { name: "Policy Active & Expiry Check", status: adjudicationResult.rule_trace["POLICY_VALIDATION"] },
                      { name: "Annual Limit Cap Check", status: adjudicationResult.rule_trace["ANNUAL_LIMIT"] },
                      { name: "Tenure & Waiting Periods", status: adjudicationResult.rule_trace["WAITING_PERIOD"] },
                      { name: "Doctor Registry & Blacklist Check", status: adjudicationResult.rule_trace["PROVIDER_BLACKLIST"] },
                      { name: "Claim Exclusion Condition Check", status: adjudicationResult.rule_trace["EXCLUDED_CONDITION"] },
                      { name: "Alternative Sublimit Caps Check", status: adjudicationResult.rule_trace["PER_CLAIM_LIMIT"] },
                      { name: "Pricing and Payment Allocation", status: "PASS" }
                    ];
                    
                    let halted = false;
                    return steps.map((s, idx) => {
                      const currentHalted = !halted && s.status === "FAIL";
                      if (s.status === "FAIL") {
                        halted = true;
                      }
                      const circleColor = currentHalted ? "bg-rose-500 border-rose-300" : s.status === "FAIL" ? "bg-slate-300 border-slate-200" : "bg-emerald-500 border-emerald-300";
                      const textColor = currentHalted ? "text-rose-700 font-bold" : s.status === "FAIL" ? "text-slate-400" : "text-slate-700";
                      
                      return (
                        <div key={idx} className="relative mb-2.5 last:mb-0">
                          <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 ${circleColor}`}></div>
                          <div className="flex justify-between">
                            <span className={textColor}>{s.name}</span>
                            <span className={`text-[8px] px-1 py-0.2 rounded font-extrabold ${s.status === "FAIL" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                              {s.status === "FAIL" ? "HALTED / FAIL" : "PASSED"}
                            </span>
                          </div>
                          {currentHalted && <span className="text-[8px] text-rose-500 block italic font-medium mt-0.5">Timeline halted here due to rule trigger rejection.</span>}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Adjudication Review Panel - Triggered Rules Details */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">Adjudication Review Panel</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Full audit trail of rule triggers evaluated by backend</p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {(() => {
                  const list = [
                    "MANDATORY_FIELDS",
                    "MEMBER_VALIDATION",
                    "POLICY_VALIDATION",
                    "WAITING_PERIOD",
                    "DOCTOR_REG",
                    "PROVIDER_VALIDATION",
                    "PATIENT_VALIDATION",
                    "DATE_VALIDATION",
                    "FRAUD_CHECK",
                    "DUPLICATE_CHECK",
                    "COVERAGE_CHECK",
                    "MEDICAL_NECESSITY",
                    "PRICING_CALCULATION"
                  ];
                  
                  const ALL_RULES_INFO: Record<string, { name: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO" | "SUCCESS"; explanation: string }> = {
                    MANDATORY_FIELDS: { name: "Mandatory Fields Check", severity: "CRITICAL", explanation: "Verify all mandatory information and required document uploads are present." },
                    MEMBER_VALIDATION: { name: "Member Validation Check", severity: "CRITICAL", explanation: "Verify member details and active coverage status in registry database." },
                    POLICY_VALIDATION: { name: "Policy Validation Check", severity: "CRITICAL", explanation: "Verify policy validity and cumulative claims annual limit caps." },
                    WAITING_PERIOD: { name: "Waiting Period Check", severity: "CRITICAL", explanation: "Evaluate diagnosis against policy initial and specific disease wait lists." },
                    DOCTOR_REG: { name: "Doctor Registration Check", severity: "HIGH", explanation: "Verify treating doctor license and registration code format." },
                    PROVIDER_VALIDATION: { name: "Provider Validation Check", severity: "CRITICAL", explanation: "Check provider blacklist directory and network preferred partner status." },
                    PATIENT_VALIDATION: { name: "Patient Validation Check", severity: "CRITICAL", explanation: "Verify match between claimant member name and document patient name." },
                    DATE_VALIDATION: { name: "Date Validation Check", severity: "HIGH", explanation: "Validate submission timelines, document dates consistency, and check for future dates." },
                    FRAUD_CHECK: { name: "Fraud Check", severity: "HIGH", explanation: "Analyze daily submission counts and historical claims for anomalous activity." },
                    DUPLICATE_CHECK: { name: "Duplicate Check", severity: "CRITICAL", explanation: "Scan historical claim database for duplicate submissions on same date and amount." },
                    COVERAGE_CHECK: { name: "Coverage Check", severity: "HIGH", explanation: "Check service eligibility, general condition exclusions, and sublimit caps." },
                    MEDICAL_NECESSITY: { name: "Medical Necessity Check", severity: "HIGH", explanation: "Evaluate necessity score and ensure diagnostic reports are attached." },
                    PRICING_CALCULATION: { name: "Pricing Calculation Check", severity: "INFO", explanation: "Calculate network discounts, applicable co-pays, and final payable amount." }
                  };

                  return list.map((rule, idx) => {
                    const info = ALL_RULES_INFO[rule] || { name: rule, severity: "MEDIUM" as const, explanation: "Policy criteria validation evaluated by backend." };
                    
                    // Determine Live PASS / FAIL status from results
                    let isFail = false;
                    let isSuccess = false;
                    let isInfo = false;
                    if (adjudicationResult && adjudicationResult.rule_trace) {
                      const status = adjudicationResult.rule_trace[rule];
                      isFail = status === "FAIL";
                      isSuccess = status === "SUCCESS" || status === "PASS";
                      isInfo = status === "INFO";
                    } else {
                      // Pre-adjudication estimate fallback
                      if (rule === "MANDATORY_FIELDS") isFail = !formValues.member_name || !formValues.diagnosis || !formValues.doctor_registration || !formValues.bill_uploaded || !formValues.prescription_uploaded;
                      if (rule === "MEMBER_VALIDATION") isFail = !formValues.member_covered;
                      if (rule === "POLICY_VALIDATION") isFail = !formValues.policy_active;
                      if (rule === "DOCTOR_REG") isFail = !!(formValues.doctor_registration && !/^[A-Z]{2}\/\d+\/\d{4}$/.test(formValues.doctor_registration));
                      if (rule === "PROVIDER_VALIDATION") isFail = !!formValues.provider_blacklisted;
                      if (rule === "FRAUD_CHECK") isFail = formValues.previous_claims_same_day >= 3;
                      isInfo = rule === "PRICING_CALCULATION";
                      isSuccess = !isFail && !isInfo;
                    }

                    const badgeColor = 
                      isFail ? "bg-rose-50 text-rose-700 border-rose-200" :
                      isInfo ? "bg-blue-50 text-blue-700 border-blue-200" :
                      "bg-emerald-50 text-emerald-700 border-emerald-200";

                    const statusText = isFail ? "FAIL" : isInfo ? "INFO" : "PASS";

                    return (
                      <div key={idx} className="p-2 border border-slate-100 rounded-lg space-y-1 bg-slate-50/50 text-[10px]">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{info.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold border ${badgeColor}`}>
                            {statusText}
                          </span>
                        </div>
                        <p className="text-slate-500 leading-relaxed font-medium">{info.explanation}</p>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Presets */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Sandbox Presets</h4>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
                <button
                  onClick={() => {
                    handleFieldChange("doctor_registration", "KA/45678/2015");
                    handleFieldChange("prescription_uploaded", true);
                    handleFieldChange("bill_uploaded", true);
                    handleFieldChange("claim_amount", 1200);
                    handleFieldChange("diagnosis", "Cold Fever");
                    handleFieldChange("treatment_type", "consultation");
                    handleFieldChange("member_covered", true);
                    handleFieldChange("policy_active", true);
                    handleFieldChange("provider_blacklisted", false);
                  }}
                  className="p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 text-left font-medium"
                >
                  🟢 Clean Pass Case
                </button>
                <button
                  onClick={() => {
                    handleFieldChange("doctor_registration", "INVALID_REG_123");
                  }}
                  className="p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 text-left font-medium"
                >
                  🔴 Force Invalid Doc
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}