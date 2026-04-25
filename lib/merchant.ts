import { SupabaseClient } from '@supabase/supabase-js'

// ── Address ───────────────────────────────────────────────────────────────────

export interface Address {
  line1: string
  line2: string
  city:  string
  state: string
  zip:   string
}

// ── MerchantFormData ──────────────────────────────────────────────────────────

export interface MerchantFormData {
  business_name:               string
  business_type:               string
  contact_email:               string   // maps to `email` column
  phone:                       string
  address:                     Address
  current_processor:           string
  current_rate_percentage:     string   // string for form inputs; converted on save
  current_per_transaction_fee: string
  current_monthly_fee:         string
  estimated_monthly_volume:    string
  estimated_transaction_count: string
  stripe_onboarding_complete:  boolean
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const EMPTY_ADDRESS: Address = {
  line1: '',
  line2: '',
  city:  '',
  state: '',
  zip:   '',
}

export const DEFAULT_MERCHANT_FORM: MerchantFormData = {
  business_name:               '',
  business_type:               '',
  contact_email:               '',
  phone:                       '',
  address:                     EMPTY_ADDRESS,
  current_processor:           '',
  current_rate_percentage:     '',
  current_per_transaction_fee: '',
  current_monthly_fee:         '',
  estimated_monthly_volume:    '',
  estimated_transaction_count: '',
  stripe_onboarding_complete:  false,
}

// ── Type guards ───────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

function safeBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false
}

function safeNumericString(value: unknown): string {
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string' && value.trim() !== '') return value
  return ''
}

function parseAddress(value: unknown): Address {
  if (!isRecord(value)) return { ...EMPTY_ADDRESS }
  return {
    line1: safeString(value.line1),
    line2: safeString(value.line2),
    city:  safeString(value.city),
    state: safeString(value.state),
    zip:   safeString(value.zip),
  }
}

// ── getMerchantProfile ────────────────────────────────────────────────────────

export async function getMerchantProfile(
  supabase: SupabaseClient,
  userId:   string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!isRecord(data)) return null
  return data
}

// ── upsertMerchantProfile ─────────────────────────────────────────────────────

export async function upsertMerchantProfile(
  supabase: SupabaseClient,
  userId:   string,
  data:     MerchantFormData & { stripe_onboarding_complete: boolean },
): Promise<void> {
  const payload: Record<string, unknown> = {
    user_id:                     userId,
    business_name:               data.business_name,
    business_type:               data.business_type,
    email:                       data.contact_email,   // contact_email → email column
    phone:                       data.phone,
    address:                     data.address,
    current_processor:           data.current_processor,
    current_rate_percentage:     data.current_rate_percentage !== ''
                                   ? parseFloat(data.current_rate_percentage)
                                   : null,
    current_per_transaction_fee: data.current_per_transaction_fee !== ''
                                   ? parseFloat(data.current_per_transaction_fee)
                                   : null,
    current_monthly_fee:         data.current_monthly_fee !== ''
                                   ? parseFloat(data.current_monthly_fee)
                                   : null,
    estimated_monthly_volume:    data.estimated_monthly_volume !== ''
                                   ? parseFloat(data.estimated_monthly_volume)
                                   : null,
    estimated_transaction_count: data.estimated_transaction_count !== ''
                                   ? parseInt(data.estimated_transaction_count, 10)
                                   : null,
    stripe_onboarding_complete:  data.stripe_onboarding_complete,
    updated_at:                  new Date().toISOString(),
  }

  const { error } = await supabase
    .from('merchants')
    .upsert(payload, { onConflict: 'user_id' })

  if (error) throw error
}

// ── profileToFormData ─────────────────────────────────────────────────────────

export function profileToFormData(
  profile: Record<string, unknown>,
): MerchantFormData {
  return {
    business_name:               safeString(profile.business_name),
    business_type:               safeString(profile.business_type),
    contact_email:               safeString(profile.email),   // email column → contact_email
    phone:                       safeString(profile.phone),
    address:                     parseAddress(profile.address),
    current_processor:           safeString(profile.current_processor),
    current_rate_percentage:     safeNumericString(profile.current_rate_percentage),
    current_per_transaction_fee: safeNumericString(profile.current_per_transaction_fee),
    current_monthly_fee:         safeNumericString(profile.current_monthly_fee),
    estimated_monthly_volume:    safeNumericString(profile.estimated_monthly_volume),
    estimated_transaction_count: safeNumericString(profile.estimated_transaction_count),
    stripe_onboarding_complete:  safeBoolean(profile.stripe_onboarding_complete),
  }
}
