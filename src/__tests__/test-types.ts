// Test-specific types for API responses
import type { UserRow, ReportRow, AntragRow } from '../types'

// ============================================
// Common Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success?: boolean
  error?: string
  message?: string
  data?: T
  [key: string]: unknown
}

export interface AuthResponse {
  success: boolean
  userId?: string
  email?: string
  role?: string
  token?: string
  refreshToken?: string
  error?: string
  message?: string
  requiresVerification?: boolean
  details?: string[]
}

export interface UserProfileResponse {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  company?: string
  bafaId?: string
  kontingent?: { total: number; used: number }
}

export interface ReportListResponse {
  success: boolean
  reports: Array<{
    id: string
    companyName: string
    branche: string
    status: string
    createdAt: string
    updatedAt: string
  }>
  total: number
}

export interface ReportCreateResponse {
  success: boolean
  reportId: string
  status: string
  message?: string
}

export interface ReportDetailResponse {
  success: boolean
  report: Partial<ReportRow>
  error?: string
}

export interface BranchenResponse {
  success: boolean
  branchen: Array<{
    id: string
    name: string
    description: string
  }>
  total: number
}

export interface PromoValidationResponse {
  success: boolean
  valid: boolean
  code?: string
  discount?: number
  error?: string
}

export interface PaymentSessionResponse {
  success: boolean
  sessionId?: string
  checkoutUrl?: string
  error?: string
}

export interface AdminStatsResponse {
  success: boolean
  stats: {
    totalUsers: number
    newUsersThisMonth: number
    totalReports: number
    activeBerater: number
    totalRevenue: number
    monthlyRevenue: number
    openRequests: number
    systemAlerts: number
  }
}

export interface AdminUserListResponse {
  success: boolean
  users: Array<{
    id: string
    firstName: string
    lastName: string
    email: string
    rolle: string
    emailVerified: boolean
    bafaStatus: string
    reportsCount: number
  }>
}

export interface FoerdermittelListResponse {
  success: boolean
  foerdermittel: Array<{
    id: string
    name: string
    beschreibung: string
    max_foerderung: number
  }>
  total: number
}

export interface FoerdermittelCaseResponse {
  success: boolean
  caseId?: string
  status?: string
  error?: string
}

export interface GdprExportResponse {
  success: boolean
  downloadUrl?: string
  expiresAt?: string
  error?: string
}

export interface GdprDeleteResponse {
  success: boolean
  deletedAt?: string
  message?: string
  error?: string
}

export interface HealthCheckResponse {
  status: 'ok' | 'healthy' | 'degraded'
  service?: string
  version?: string
  checks?: Record<string, boolean>
  timestamp?: string
}

export interface CorsPreflight {
  // CORS preflight response has no body
}

export interface CsrfValidationResponse {
  success: boolean
  error?: string
}

export interface HmacSignatureResponse {
  success: boolean
  valid: boolean
  error?: string
}

export interface PasswordTestResponse {
  success: boolean
  hashed?: boolean
  verified?: boolean
  error?: string
}

// ============================================
// Database Query Response Types
// ============================================

export interface UserQueryResult extends Partial<UserRow> {}

export interface ReportQueryResult extends Partial<ReportRow> {}

export interface AntragQueryResult extends Partial<AntragRow> {}

export interface PaymentQueryResult {
  id: string
  user_id: string
  report_id: string
  amount: number
  status: string
  provider: string
  created_at: string
}

export interface RoleQueryResult {
  role: string
}

export interface PrivacyQueryResult {
  privacy_accepted_at: string | null
}

export interface HashVersionQueryResult {
  hash_version: number
  salt: string | null
}

export interface KontingentQueryResult {
  kontingent_used: number
}

export interface StatusQueryResult {
  status: string
}
