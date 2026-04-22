'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('retail')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('circuit-theme')
    if (saved !== null) setIsDark(saved === 'dark')
    // Check if already logged in, redirect to dashboard
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/')
    })
  }, [router])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            business_name: businessName,
            business_type: businessType,
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        // Create merchant profile
        const { error: merchantError } = await supabase
          .from('merchants')
          .insert({
            user_id: authData.user.id,
            business_name: businessName,
            business_type: businessType,
            subscription_tier: 'free',
            subscription_status: 'active',
          })

        if (merchantError) throw merchantError

        // Check if email confirmation is required
        if (authData.session) {
          // Automatically logged in, redirect to onboarding
          router.replace('/onboarding')
        } else {
          // Email confirmation required
          setError('Please check your email to confirm your account.')
          setTimeout(() => router.replace('/login'), 3000)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  // Theme colors matching login page
  const bg = isDark ? '#0a0a0a' : '#f0f9fc'
  const cardBg = isDark ? '#111827' : '#ffffff'
  const border = isDark ? '#1f2937' : '#e2e8f0'
  const text = isDark ? '#f9fafb' : '#0f172a'
  const muted = isDark ? '#9ca3af' : '#64748b'
  const accent = '#3b82f6'

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '96px', height: '96px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', margin: '0 auto', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px' }}>CC</span>
          </div>
          <span style={{ fontSize: '22px', fontWeight: 700, color: text }}>Circuit POS</span>
          <p style={{ color: muted, fontSize: '14px' }}>Create your merchant account</p>
        </div>

        {/* Card */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '32px' }}>
          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: muted, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Business Name
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  placeholder="Your Business"
                  style={{ width: '100%', padding: '12px 14px', background: isDark ? '#1f2937' : '#f1f5f9', border: 'none', borderRadius: '8px', color: text, marginTop: '4px' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: muted, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Business Type
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', background: isDark ? '#1f2937' : '#f1f5f9', border: 'none', borderRadius: '8px', color: text, marginTop: '4px' }}
                >
                  <option value="retail">Retail</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="service">Service</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: muted, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={{ width: '100%', padding: '12px 14px', background: isDark ? '#1f2937' : '#f1f5f9', border: 'none', borderRadius: '8px', color: text, marginTop: '4px' }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: muted, fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="•••••••••"
                  style={{ width: '100%', padding: '12px 14px', background: isDark ? '#1f2937' : '#f1f5f9', border: 'none', borderRadius: '8px', color: text, marginTop: '4px' }}
                />
              </label>
            </div>

            {error && (
              <div style={{ background: isDark ? '#1f1112' : '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? '#6b7280' : 'linear-gradient(to right, #6b7280, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: muted, fontSize: '13px' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </a>
        </p>

        <p style={{ textAlign: 'center', marginTop: '24px', color: muted, fontSize: '13px' }}>
          Circuit POS &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
