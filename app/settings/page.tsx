'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BusinessSettingsForm } from '@/app/components/BusinessSettingsForm'
import { getMerchantProfile, MerchantFormData, profileToFormData, upsertMerchantProfile } from '@/lib/merchant'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [merchantData, setMerchantData] = useState<MerchantFormData | null>(null)

  useEffect(() => {
    async function loadMerchantData() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!session?.user) {
          router.replace('/login')
          return
        }

        const { data: merchant, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        if (merchantError) throw merchantError
        if (!merchant) {
          router.replace('/onboarding')
          return
        }

        setMerchantData(profileToFormData(merchant))
      } catch (err: unknown) {
        console.error('[settings] load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    loadMerchantData()
  }, [router])

  async function handleSave(data: MerchantFormData) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Not authenticated')
    await upsertMerchantProfile(supabase, session.user.id, {
      ...data,
      stripe_onboarding_complete: data.stripe_onboarding_complete,
    })
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div>Loading settings...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="text-4xl mb-4">&#9888;</div>
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          style={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#9ca3af',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#374151'
            e.currentTarget.style.color = '#f9fafb'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1f2937'
            e.currentTarget.style.color = '#9ca3af'
          }}
        >
          &larr; Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold">Business Settings</h1>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Update your business information and preferences</h2>
        {/* Settings Form */}
        {merchantData && (
          <BusinessSettingsForm
            initialData={merchantData}
            onSave={handleSave}
            submitLabel="Save Changes"
            mode="settings"
          />
        )}
      </div>
    </div>
  )
}
