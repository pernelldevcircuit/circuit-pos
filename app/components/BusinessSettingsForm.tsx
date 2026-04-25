'use client'

import { useState } from 'react'
import { MerchantFormData, Address } from '@/lib/merchant'

// ── Props ─────────────────────────────────────────────────────────────────────

interface BusinessSettingsFormProps {
  initialData:  MerchantFormData
  onSave:       (data: MerchantFormData) => Promise<void>
  submitLabel:  string
  mode:         'onboarding' | 'settings'
}

// ── Style constants ───────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-[#1f2937] border border-[#374151] rounded-xl px-4 py-2.5 ' +
  'text-slate-100 text-[14px] placeholder-slate-600 outline-none ' +
  'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150'

const labelCls = 'block text-[13px] text-slate-300 mb-1'

const sectionHeaderCls =
  'text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-3'

const sectionCls = 'space-y-4'

const gridTwo = 'grid grid-cols-1 sm:grid-cols-2 gap-4'

// ── Business type options ─────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  'Retail',
  'Restaurant',
  'Service',
  'E-commerce',
  'Other',
] as const

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label:     string
  required?: boolean
  children:  React.ReactNode
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
      />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function BusinessSettingsForm({
  initialData,
  onSave,
  submitLabel,
  mode,
}: BusinessSettingsFormProps) {
  // ── Form state ────────────────────────────────────────────────────────
  const [businessName,           setBusinessName]           = useState(initialData.business_name)
  const [businessType,           setBusinessType]           = useState(initialData.business_type)
  const [contactEmail,           setContactEmail]           = useState(initialData.contact_email)
  const [phone,                  setPhone]                  = useState(initialData.phone)

  const [addrLine1,              setAddrLine1]              = useState(initialData.address.line1)
  const [addrLine2,              setAddrLine2]              = useState(initialData.address.line2)
  const [addrCity,               setAddrCity]               = useState(initialData.address.city)
  const [addrState,              setAddrState]              = useState(initialData.address.state)
  const [addrZip,                setAddrZip]                = useState(initialData.address.zip)

  const [currentProcessor,       setCurrentProcessor]       = useState(initialData.current_processor)
  const [currentRate,            setCurrentRate]            = useState(initialData.current_rate_percentage)
  const [perTransactionFee,      setPerTransactionFee]      = useState(initialData.current_per_transaction_fee)
  const [monthlyFee,             setMonthlyFee]             = useState(initialData.current_monthly_fee)
  const [monthlyVolume,          setMonthlyVolume]          = useState(initialData.estimated_monthly_volume)
  const [transactionCount,       setTransactionCount]       = useState(initialData.estimated_transaction_count)

  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string>('')
  const [fieldErrors, setFieldErrors] = useState<{ business_name?: string; contact_email?: string }>({})

  // ── Validation ────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: { business_name?: string; contact_email?: string } = {}
    if (!businessName.trim())   errs.business_name  = 'Business name is required.'
    if (!contactEmail.trim())   errs.contact_email  = 'Contact email is required.'
    else if (!/\S+@\S+\.\S+/.test(contactEmail))
      errs.contact_email = 'Enter a valid email address.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!validate()) return

    const address: Address = {
      line1: addrLine1,
      line2: addrLine2,
      city:  addrCity,
      state: addrState,
      zip:   addrZip,
    }

    const formData: MerchantFormData = {
      business_name:               businessName,
      business_type:               businessType,
      contact_email:               contactEmail,
      phone,
      address,
      current_processor:           currentProcessor,
      current_rate_percentage:     currentRate,
      current_per_transaction_fee: perTransactionFee,
      current_monthly_fee:         monthlyFee,
      estimated_monthly_volume:    monthlyVolume,
      estimated_transaction_count: transactionCount,
      stripe_onboarding_complete:  initialData.stripe_onboarding_complete,
    }

    setSubmitting(true)
    try {
      await onSave(formData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">

      {/* ── Section 1: Business Info ── */}
      <div className={sectionCls}>
        <p className={sectionHeaderCls}>Business Info</p>

        <Field label="Business Name" required>
          <input
            type="text"
            value={businessName}
            onChange={e => {
              setBusinessName(e.target.value)
              setFieldErrors(prev => ({ ...prev, business_name: undefined }))
            }}
            placeholder="Acme Store"
            className={inputCls}
            autoComplete="organization"
          />
          {fieldErrors.business_name && (
            <p className="mt-1 text-[12px] text-red-400">{fieldErrors.business_name}</p>
          )}
        </Field>

        <Field label="Business Type">
          <select
            value={businessType}
            onChange={e => setBusinessType(e.target.value)}
            className={inputCls + ' cursor-pointer appearance-none'}
          >
            <option value="">Select a type…</option>
            {BUSINESS_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        <Field label="Contact Email" required>
          <input
            type="email"
            value={contactEmail}
            onChange={e => {
              setContactEmail(e.target.value)
              setFieldErrors(prev => ({ ...prev, contact_email: undefined }))
            }}
            placeholder="you@yourbusiness.com"
            className={inputCls}
            autoComplete="email"
          />
          {fieldErrors.contact_email && (
            <p className="mt-1 text-[12px] text-red-400">{fieldErrors.contact_email}</p>
          )}
        </Field>

        <Field label="Phone">
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className={inputCls}
            autoComplete="tel"
          />
        </Field>
      </div>

      <div className="border-t border-[#1f2937]" />

      {/* ── Section 2: Location ── */}
      <div className={sectionCls}>
        <p className={sectionHeaderCls}>Location</p>

        <Field label="Address Line 1">
          <input
            type="text"
            value={addrLine1}
            onChange={e => setAddrLine1(e.target.value)}
            placeholder="123 Main St"
            className={inputCls}
            autoComplete="address-line1"
          />
        </Field>

        <Field label="Address Line 2">
          <input
            type="text"
            value={addrLine2}
            onChange={e => setAddrLine2(e.target.value)}
            placeholder="Suite 100"
            className={inputCls}
            autoComplete="address-line2"
          />
        </Field>

        <Field label="City">
          <input
            type="text"
            value={addrCity}
            onChange={e => setAddrCity(e.target.value)}
            placeholder="New York"
            className={inputCls}
            autoComplete="address-level2"
          />
        </Field>

        <div className={gridTwo}>
          <Field label="State (2-letter)">
            <input
              type="text"
              value={addrState}
              onChange={e => setAddrState(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="NY"
              maxLength={2}
              className={inputCls}
              autoComplete="address-level1"
            />
          </Field>

          <Field label="ZIP Code">
            <input
              type="text"
              value={addrZip}
              onChange={e => setAddrZip(e.target.value)}
              placeholder="10001"
              className={inputCls}
              autoComplete="postal-code"
            />
          </Field>
        </div>
      </div>

      {/* ── Section 3: Current Processing (onboarding only) ── */}
      {mode === 'onboarding' && (
        <>
          <div className="border-t border-[#1f2937]" />

          <div className={sectionCls}>
            <p className={sectionHeaderCls}>Current Processing</p>
            <p className="text-[13px] text-slate-500 -mt-2 mb-1">
              Help us calculate your savings with Circuit.
            </p>

            <Field label="Current Processor">
              <input
                type="text"
                value={currentProcessor}
                onChange={e => setCurrentProcessor(e.target.value)}
                placeholder="e.g. Square, PayPal, Stripe"
                className={inputCls}
              />
            </Field>

            <div className={gridTwo}>
              <Field label="Current Rate (%)">
                <input
                  type="number"
                  value={currentRate}
                  onChange={e => setCurrentRate(e.target.value)}
                  placeholder="2.90"
                  step={0.01}
                  min={0}
                  className={inputCls}
                />
              </Field>

              <Field label="Per Transaction Fee ($)">
                <input
                  type="number"
                  value={perTransactionFee}
                  onChange={e => setPerTransactionFee(e.target.value)}
                  placeholder="0.30"
                  step={0.01}
                  min={0}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className={gridTwo}>
              <Field label="Monthly Fee ($)">
                <input
                  type="number"
                  value={monthlyFee}
                  onChange={e => setMonthlyFee(e.target.value)}
                  placeholder="0.00"
                  step={0.01}
                  min={0}
                  className={inputCls}
                />
              </Field>

              <Field label="Est. Monthly Volume ($)">
                <input
                  type="number"
                  value={monthlyVolume}
                  onChange={e => setMonthlyVolume(e.target.value)}
                  placeholder="10000"
                  min={0}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Est. Transaction Count (monthly)">
              <input
                type="number"
                value={transactionCount}
                onChange={e => setTransactionCount(e.target.value)}
                placeholder="200"
                step={1}
                min={0}
                className={inputCls}
              />
            </Field>
          </div>
        </>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="rounded-xl bg-red-900/30 border border-red-700 px-4 py-3 text-[13px] text-red-300">
          {error}
        </div>
      )}

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={submitting}
        className={[
          'w-full h-12 rounded-xl text-white text-[15px] font-semibold',
          'bg-gradient-to-r from-blue-600 to-purple-600',
          'hover:from-blue-500 hover:to-purple-500',
          'active:from-blue-700 active:to-purple-700',
          'transition-all duration-150',
          'flex items-center justify-center gap-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        ].join(' ')}
      >
        {submitting ? (
          <>
            <Spinner />
            Saving…
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  )
}
