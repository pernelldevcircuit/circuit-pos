'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BusinessSettingsForm } from '@/app/components/BusinessSettingsForm'
import { getMerchantProfile, MerchantFormData, profileToFormData } from '@/lib/merchant'
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

        // Get merchant profile
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

        // Convert merchant data to form data format
      setMerchantData(profileToFormData(merchant))
      } catch (err: unknown) {        console.error('[settings] load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadMerchantData()
  }, [router])

  async function handleSuccess(data: MerchantFormData) {
    // Reload the data to show updated values
    router.refresh()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
            Loading settings...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>
              Error
            </div>
            <div style={{ fontSize: '14px', color: '#ef4444' }}>{error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '24px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
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
              ← Back to Dashboard
            </button>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#f9fafb', marginBottom: '8px' }}>
            Business Settings
          </h1>
          <p style={{ fontSize: '15px', color: '#9ca3af' }}>
            Update your business information and preferences
          </p>
        </div>

        {/* Settings Form */}
        {merchantData && (
          <BusinessSettingsForm
            initialData={merchantData}
            onSave={handleSuccess}
          />
        )}
      </div>
    </div>
  )
}
