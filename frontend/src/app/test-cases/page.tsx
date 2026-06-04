"use client";

import { useState } from "react";
import { processClaim } from "../../services/api";

interface TestCase {
  id: string;
  title: string;
  description: string;
  outcomeExpectation: string;
  payload: any;
}

const TEST_CASES: TestCase[] = [
  {
    id: "approved",
    title: "Approved (Clean Pass)",
    description: "Standard general consultation, valid registry numbers, documents present.",
    outcomeExpectation: "APPROVED (10% co-pay applied: ₹1,080 payable on ₹1,200)",
    payload: {
      member_id: "EMP001",
      member_name: "Rajesh Kumar",
      member_age: 30,
      treatment_date: "2026-06-01",
      claim_amount: 1200,
      diagnosis: "Common Cold & Flu",
      treatment_type: "consultation",
      doctor_name: "Dr. A. K. Sharma",
      doctor_registration: "DL/12345/2018",
      hospital_name: "Max Clinic Delhi",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Rajesh Kumar",
      prescription_date: "01/06/2026",
      bill_date: "01/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 0,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  },
  {
    id: "rejected",
    title: "Rejected (Exclusions)",
    description: "Claim for bariatric weight loss therapy which is explicitly excluded from cover.",
    outcomeExpectation: "REJECTED (EXCLUDED_CONDITION rule trigger)",
    payload: {
      member_id: "EMP001",
      member_name: "Rajesh Kumar",
      member_age: 30,
      treatment_date: "2026-06-01",
      claim_amount: 4500,
      diagnosis: "Obesity bariatric weight loss",
      treatment_type: "consultation",
      doctor_name: "Dr. A. K. Sharma",
      doctor_registration: "DL/12345/2018",
      hospital_name: "Max Clinic Delhi",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Rajesh Kumar",
      prescription_date: "01/06/2026",
      bill_date: "01/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 0,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  },
  {
    id: "partial",
    title: "Partial (Co-pay Limit)",
    description: "Invoice amount is ₹6,000, which exceeds the single claim threshold of ₹5,000.",
    outcomeExpectation: "PARTIAL (Approved up to ₹5,000 max. ₹4,500 payable after 10% co-pay)",
    payload: {
      member_id: "EMP001",
      member_name: "Rajesh Kumar",
      member_age: 30,
      treatment_date: "2026-06-01",
      claim_amount: 6000,
      diagnosis: "Acute Gastroenteritis",
      treatment_type: "consultation",
      doctor_name: "Dr. A. K. Sharma",
      doctor_registration: "DL/12345/2018",
      hospital_name: "Max Clinic Delhi",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Rajesh Kumar",
      prescription_date: "01/06/2026",
      bill_date: "01/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 0,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  },
  {
    id: "manual",
    title: "Manual Review",
    description: "High value claim exceeding the standard ₹25,000 high-value threshold.",
    outcomeExpectation: "MANUAL_REVIEW (Requires secondary human doctor verification)",
    payload: {
      member_id: "EMP001",
      member_name: "Rajesh Kumar",
      member_age: 30,
      treatment_date: "2026-06-01",
      claim_amount: 30000,
      diagnosis: "General evaluation consultation",
      treatment_type: "consultation",
      doctor_name: "Dr. A. K. Sharma",
      doctor_registration: "DL/12345/2018",
      hospital_name: "Max Clinic Delhi",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Rajesh Kumar",
      prescription_date: "01/06/2026",
      bill_date: "01/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 0,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  },
  {
    id: "waiting_period",
    title: "Waiting Period",
    description: "Diagnosis for Diabetes within active policy waiting exclusions.",
    outcomeExpectation: "REJECTED (WAITING_PERIOD rule trigger)",
    payload: {
      member_id: "EMP001",
      member_name: "Rajesh Kumar",
      member_age: 30,
      treatment_date: "2026-06-01",
      claim_amount: 2200,
      diagnosis: "Chronic diabetes checkup",
      treatment_type: "consultation",
      doctor_name: "Dr. A. K. Sharma",
      doctor_registration: "DL/12345/2018",
      hospital_name: "Max Clinic Delhi",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Rajesh Kumar",
      prescription_date: "01/06/2026",
      bill_date: "01/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 0,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  },
  {
    id: "policy_inactive",
    title: "Policy Inactive",
    description: "Submission for member EMP003 whose policy is currently inactive.",
    outcomeExpectation: "REJECTED (POLICY_INACTIVE rule trigger)",
    payload: {
      member_id: "EMP003",
      member_name: "Amit Verma",
      member_age: 45,
      treatment_date: "2026-06-01",
      claim_amount: 1500,
      diagnosis: "General Viral Fever",
      treatment_type: "consultation",
      doctor_name: "Dr. A. K. Sharma",
      doctor_registration: "DL/12345/2018",
      hospital_name: "Max Clinic Delhi",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Amit Verma",
      prescription_date: "01/06/2026",
      bill_date: "01/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 0,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  },
  {
    id: "provider_blacklist",
    title: "Provider Blacklist",
    description: "Submitted physician registration matches blacklisted database keys.",
    outcomeExpectation: "REJECTED (PROVIDER_BLACKLIST violation)",
    payload: {
      member_id: "EMP001",
      member_name: "Rajesh Kumar",
      member_age: 30,
      treatment_date: "2026-06-01",
      claim_amount: 1500,
      diagnosis: "General Checkup",
      treatment_type: "consultation",
      doctor_name: "Blacklisted Clinic Clinic",
      doctor_registration: "FAKE/0000",
      hospital_name: "Blacklisted Provider Center",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Rajesh Kumar",
      prescription_date: "01/06/2026",
      bill_date: "01/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 0,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  },
  {
    id: "date_mismatch",
    title: "Date Mismatch",
    description: "Invoice bill date differs from prescription date by more than 7 days.",
    outcomeExpectation: "REJECTED (DATE_MISMATCH rule trigger)",
    payload: {
      member_id: "EMP001",
      member_name: "Rajesh Kumar",
      member_age: 30,
      treatment_date: "2026-06-01",
      claim_amount: 1500,
      diagnosis: "Viral Fever",
      treatment_type: "consultation",
      doctor_name: "Dr. A. K. Sharma",
      doctor_registration: "DL/12345/2018",
      hospital_name: "Max Clinic Delhi",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Rajesh Kumar",
      prescription_date: "01/06/2026",
      bill_date: "20/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 0,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  },
  {
    id: "patient_mismatch",
    title: "Patient Mismatch",
    description: "Patient name on the medical document does not match the insurance records.",
    outcomeExpectation: "REJECTED (PATIENT_MISMATCH rule trigger)",
    payload: {
      member_id: "EMP001",
      member_name: "Rajesh Kumar",
      member_age: 30,
      treatment_date: "2026-06-01",
      claim_amount: 1500,
      diagnosis: "Viral Fever",
      treatment_type: "consultation",
      doctor_name: "Dr. A. K. Sharma",
      doctor_registration: "DL/12345/2018",
      hospital_name: "Max Clinic Delhi",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Jane Smith",
      prescription_date: "01/06/2026",
      bill_date: "01/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 0,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  },
  {
    id: "dental_limit",
    title: "Dental Limit",
    description: "Dental treatment invoice (₹5,500) exceeds the dental limit of ₹5,000.",
    outcomeExpectation: "REJECTED (DENTAL_SUB_LIMIT rule trigger)",
    payload: {
      member_id: "EMP001",
      member_name: "Rajesh Kumar",
      member_age: 30,
      treatment_date: "2026-06-01",
      claim_amount: 5500,
      diagnosis: "Root canal surgery",
      treatment_type: "dental",
      doctor_name: "Dr. A. K. Sharma",
      doctor_registration: "DL/12345/2018",
      hospital_name: "Max Dental Care",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Rajesh Kumar",
      prescription_date: "01/06/2026",
      bill_date: "01/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 0,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  },
  {
    id: "vision_limit",
    title: "Vision Limit",
    description: "Vision treatment invoice (₹4,500) exceeds the vision limit of ₹4,000.",
    outcomeExpectation: "REJECTED (VISION_SUB_LIMIT rule trigger)",
    payload: {
      member_id: "EMP001",
      member_name: "Rajesh Kumar",
      member_age: 30,
      treatment_date: "2026-06-01",
      claim_amount: 4500,
      diagnosis: "Refractive spectacles prescription",
      treatment_type: "vision",
      doctor_name: "Dr. A. K. Sharma",
      doctor_registration: "DL/12345/2018",
      hospital_name: "Max Eye Clinic",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Rajesh Kumar",
      prescription_date: "01/06/2026",
      bill_date: "01/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 0,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  },
  {
    id: "fraud_claim",
    title: "Fraud Claim",
    description: "Multiple claims logged for the same patient on the same day (4 claims).",
    outcomeExpectation: "MANUAL_REVIEW (Triggered by high daily claims count)",
    payload: {
      member_id: "EMP001",
      member_name: "Rajesh Kumar",
      member_age: 30,
      treatment_date: "2026-06-01",
      claim_amount: 1500,
      diagnosis: "General viral consultation",
      treatment_type: "consultation",
      doctor_name: "Dr. A. K. Sharma",
      doctor_registration: "DL/12345/2018",
      hospital_name: "Max Clinic Delhi",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Rajesh Kumar",
      prescription_date: "01/06/2026",
      bill_date: "01/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 4,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  },
  {
    id: "high_value",
    title: "High Value Claim",
    description: "Claims value ₹30,000 exceeds high value audit threshold ₹25,000.",
    outcomeExpectation: "MANUAL_REVIEW (Exceeds operations threshold)",
    payload: {
      member_id: "EMP001",
      member_name: "Rajesh Kumar",
      member_age: 30,
      treatment_date: "2026-06-01",
      claim_amount: 30000,
      diagnosis: "Post operative consultation",
      treatment_type: "consultation",
      doctor_name: "Dr. A. K. Sharma",
      doctor_registration: "DL/12345/2018",
      hospital_name: "Max Clinic Delhi",
      prescription_uploaded: true,
      bill_uploaded: true,
      report_uploaded: false,
      document_patient_name: "Rajesh Kumar",
      prescription_date: "01/06/2026",
      bill_date: "01/06/2026",
      pre_authorized: false,
      cashless_request: false,
      previous_claims_same_day: 0,
      network_hospital: false,
      medical_necessity_score: 0.95,
      extraction_confidence: 0.95,
    }
  }
];

export default function SandboxPage() {
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTest = async (testCase: TestCase) => {
    setSelectedCase(testCase);
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const adjudication = await processClaim(testCase.payload);
      setResult(adjudication);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || "Connection failed. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Claims Adjudication Sandbox</h1>
        <p className="text-sm text-slate-500 mt-1">Select and run simulation cases to test the insurance rules engine limits, exceptions, and coverage ratios.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left List of test cases */}
        <div className="lg:col-span-5 space-y-3 max-h-[600px] overflow-y-auto pr-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Scenarios ({TEST_CASES.length})</h3>
          <div className="space-y-2">
            {TEST_CASES.map((tc) => (
              <button
                key={tc.id}
                onClick={() => runTest(tc)}
                className={`w-full p-3 border rounded-xl cursor-pointer transition text-left text-xs block ${
                  selectedCase?.id === tc.id
                    ? "bg-teal-50/50 border-teal-500 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div className="font-bold text-slate-900">{tc.title}</div>
                <p className="text-[10px] text-slate-500 mt-0.5">{tc.description}</p>
                <div className="text-[9px] text-teal-700 font-bold mt-1.5 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded inline-block">
                  Expectation: {tc.outcomeExpectation}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Output inspection */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1 border-b border-slate-100 pb-4">Simulation Inspector</h3>

          {loading && (
            <div className="h-64 flex flex-col items-center justify-center">
              <span className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></span>
              <p className="text-xs text-slate-500 mt-3 font-semibold">Running rules engine evaluation...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs leading-relaxed">
              <p className="font-bold mb-1">Execution Failure</p>
              {error}
            </div>
          )}

          {!loading && !result && !error && (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
              <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <p className="text-xs font-bold text-slate-700">Select a simulation scenario on the left</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[240px]">This will submit the corresponding Pydantic claim object and verify the rules output in real-time.</p>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-6">
              {/* Outcome status banner */}
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Engine Decision</span>
                  <div className="text-lg font-extrabold text-slate-900 mt-0.5">{result.decision}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Payable Approved</span>
                  <div className="text-lg font-extrabold text-teal-600 font-mono mt-0.5">₹{result.approved_amount.toFixed(2)}</div>
                </div>
              </div>

              {/* Rules triggered */}
              {result.rejection_reasons && result.rejection_reasons.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider">Violated Policies</h4>
                  <div className="space-y-1.5">
                    {result.rejection_reasons.map((reason: string, idx: number) => (
                      <div key={idx} className="text-xs bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-lg font-mono">
                        Rule: {reason}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg font-medium">
                  ✓ Complies with all general coverage clauses, wait exclusion periods, and sub-limit thresholds.
                </div>
              )}

              {/* Execution payload */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted Claim JSON Payload</h4>
                <pre className="bg-slate-50 p-4 rounded-xl text-[10px] font-mono text-slate-600 overflow-x-auto border border-slate-200/80 max-h-60">
                  {JSON.stringify(selectedCase?.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
