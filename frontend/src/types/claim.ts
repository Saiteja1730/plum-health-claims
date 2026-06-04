export interface Decision {
  decision: string;
  approved_amount: number;
  confidence_score: number;
  rejection_reasons: string[];
  notes?: string;
}

export interface Stats {
  total_claims: number;
  approved: number;
  rejected: number;
  partial: number;
  manual_review: number;
  approval_rate: number;
}

export interface ClaimHistory {
  member_id: string;
  member_name: string;
  diagnosis: string;
  treatment_type: string;
  claim_amount: number;
  decision: string;
  approved_amount: number;
}