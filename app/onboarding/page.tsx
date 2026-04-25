'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import { supabase }            from '@/lib/supabase'
import {
  MerchantFormData,
  getMerchantProfile,
  upsertMerchantProfile,
  profileToFormData,
  DEFAULT_MERCHANT_FORM,
} from '@/lib/merchant'
import { BusinessSettingsForm } from '@/app/components/BusinessSettingsForm'

export default function OnboardingPage() {
  const router = useRouter()

  const [userId, setUserId]           = useState<string | null>(null)
  const [initialData, setInitialData] = useState<MerchantFormData | null>(null)
  const [pageState, setPageState]     = useState<'loading' | 'ready' | 'complete' | 'error'>('loading')
  const [pageError, setPageError]     = useState<string>('')

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const { data: { session }, error: sessionError } =
          await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (!session?.user) {
          router.replace('/login')
          return
        }

        const uid = session.user.id
        if (cancelled) return
        setUserId(uid)

        const profile = await getMerchantProfile(supabase, uid)

        if (cancelled) return

        if (profile?.onboarding_complete) {
          router.replace('/dashboard')
          return
        }

        const base: MerchantFormData = profile
          ? profileToFormData(profile)
          : {
              ...DEFAULT_MERCHANT_FORM,
              contact_email: session.user.email ?? '',
            }

        setInitialData(base)
        setPageState('ready')
      } catch (err: unknown) {
        if (cancelled) return
        console.error('[onboarding] bootstrap error:', err)
        setPageError(
          err instanceof Error ? err.message : 'Failed to load your account. Please refresh.',
        )
        setPageState('error')
      }
    }

    bootstrap()
    return () => { cancelled = true }
  }, [router])

  async function handleSave(formData: MerchantFormData) {
    if (!userId) throw new Error('No authenticated user found.')

    await upsertMerchantProfile(supabase, userId, {
      ...formData,
      stripe_onboarding_complete: true,
    })

    setPageState('complete')
    await new Promise(resolve => setTimeout(resolve, 1200))
    router.replace('/dashboard')
  }

  return (
    <div
      style={{ minHeight: '100vh', background: '#0a0a0a' }}
      className="flex flex-col items-center justify-center px-4 py-10 font-sans"
    >
      <div className="w-full max-w-lg bg-[#111827] border border-[#1f2937] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
                <path d="M17.5 14v7M14 17.5h7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M10 6.5h4M17.5 10v4M6.5 10v4M10 17.5h4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 2" />
              </svg>
            </div>
            <div>
              <span className="text-[17px] font-bold text-slate-100 tracking-tight">
                Circuit{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  POS
                </span>
              </span>
              <p className="text-[12px] text-slate-500 -mt-0.5">Merchant Setup</p>
            </div>
          </div>

          {pageState === 'ready' && (
            <div className="mb-6">
              <h1 className="text-[24px] font-bold text-slate-100 tracking-tight leading-tight">
                Set up your account
              </h1>
              <p className="text-[14px] text-slate-400 mt-1">
                Complete your merchant profile to start accepting payments.
                {initialData?.business_name ? " We've prefilled what we already know." : ''}
              </p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-8 pb-8">

          {/* Loading */}
          {pageState === 'loading' && (
            <div className="py-20 flex flex-col items-center gap-4">
              <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
              <p className="text-[14px] text-slate-400">Loading your account…</p>
            </div>
          )}

          {/* Error */}
          {pageState === 'error' && (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-700 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-slate-200 mb-1">Something went wrong</p>
              <p className="text-[13px] text-slate-400 mb-6">{pageError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-[14px] font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Complete */}
          {pageState === 'complete' && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-900/30 border-2 border-emerald-600 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[20px] font-bold text-slate-100 mb-1">You&apos;re all set!</p>
              <p className="text-[14px] text-slate-400">Taking you to your dashboard…</p>
            </div>
          )}

          {/* Onboarding form */}
          {pageState === 'ready' && initialData && (
            <BusinessSettingsForm
              initialData={initialData}
              onSave={handleSave}
              submitLabel="Complete Setup"
              mode="onboarding"
            />
          )}

        </div>
      </div>

      <p className="mt-6 text-[12px] text-slate-600">
        Circuit POS © {new Date().getFullYear()}
      </p>
    </div>
  )
}
