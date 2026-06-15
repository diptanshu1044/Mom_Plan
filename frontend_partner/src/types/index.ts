// =============================================================================
// Partner Portal — Shared Types
// =============================================================================

// ---- Auth ----

export interface PartnerUser {
  id: string;
  email: string;
  full_name: string;
  role: "partner_admin" | "partner_member" | "admin" | "counselor";
  organization_id?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  title?: string | null;
  [key: string]: unknown;
}

// ---- Organization ----

export type OrgType =
  | "Corporation (C-Corp)"
  | "S-Corporation"
  | "Limited Liability (LLC)"
  | "Partnership"
  | "Sole Proprietorship"
  | "Non-profit (501c3)"
  | "Government Agency"
  | "Cooperative"
  | "Startup"
  | "Other";

export type OrgStatus = "pending" | "active" | "suspended" | "inactive";

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  status: OrgStatus;
  website?: string | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  employees?: string | null;
  founded?: string | null;
  tax_id?: string | null;
  linkedin?: string | null;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Case ----

export type CaseStatus =
  | "open"
  | "in_progress"
  | "pending"
  | "closed"
  | "cancelled";

export type CasePriority = "low" | "medium" | "high" | "urgent";

export interface Case {
  id: string;
  case_number: string;
  title: string;
  status: CaseStatus;
  priority: CasePriority;
  mother_name: string;
  mother_id?: string;
  assigned_to?: string | null;
  organization_id: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
}

// ---- Referral ----

export type ReferralStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

export interface Referral {
  id: string;
  referral_number: string;
  status: ReferralStatus;
  mother_name: string;
  mother_id?: string;
  from_organization_id: string;
  to_organization_id: string;
  from_organization_name?: string;
  to_organization_name?: string;
  service_type: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

// ---- Document ----

export type DocumentType =
  | "report"
  | "consent"
  | "referral_letter"
  | "intake_form"
  | "assessment"
  | "other";

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  organization_id: string;
  case_id?: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

// ---- Analytics ----

export interface DashboardMetrics {
  total_cases: number;
  open_cases: number;
  closed_this_month: number;
  total_referrals: number;
  pending_referrals: number;
  accepted_referrals: number;
  total_mothers_served: number;
  new_mothers_this_month: number;
  total_documents: number;
  avg_case_resolution_days?: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface CasesByStatus {
  status: string;
  count: number;
  color?: string;
}

// ---- API Helpers ----

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// ---- UI ----

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
