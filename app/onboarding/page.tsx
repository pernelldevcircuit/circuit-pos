'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
  const [userId, setUserId] = useState<string | null>(null)
  const [initialData, setInitialData] = useState<MerchantFormData | null>(null)
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'complete' | 'error'>('loading')
  const [pageError, setPageError] = useState<string>('')

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
        if (profile?.stripe_onboarding_complete) {
          router.replace('/dashboard')
          return
        }
        const base: MerchantFormData = profile
          ? profileToFormData(profile)
          : DEFAULT_MERCHANT_FORM
        if (cancelled) return
        setInitialData(base)
        setPageState('ready')
      } catch (err) {
        if (cancelled) return
        setPageError(err instanceof Error ? err.message : 'Failed to load onboarding')
        setPageState('error')
      }
    }
    bootstrap()
    return () => { cancelled = true }
  }, [router])

  async function handleSave(formData: MerchantFormData) {
    if (!userId) return
    await upsertMerchantProfile(supabase, userId, {
      ...formData,
      stripe_onboarding_complete: true,
    })
    setPageState('complete')
  }

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div>Loading onboarding...</div>
      </div>
    )
  }

  if (pageState === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="text-5xl mb-4">&#10003;</div>
        <h2 className="text-2xl font-bold mb-2">Onboarding Complete</h2>
        <p className="text-gray-400 mb-6">Redirecting you to your dashboard...</p>
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="text-4xl mb-4">&#9888;</div>
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p className="text-red-400">{pageError}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome to Circuit</h1>
        <p className="text-gray-400 mt-2">Let&#39;s set up your business profile to get started.</p>
      </div>

      {initialData && (
        <BusinessSettingsForm
          initialData={initialData}
          onSave={handleSave}
          submitLabel="Complete Onboarding"
          mode="onboarding"
        />
      )}
    </div>
  )
}
