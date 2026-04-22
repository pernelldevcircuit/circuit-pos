'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type BusinessType = 'retail' | 'restaurant' | 'service' | 'other'

interface MerchantProfile {
  user_id: string
  business_name: string
  business_type: BusinessType
  subscription_tier: 'free'
  subscription_status: 'active'
}

export default function SignupPage() {
  const router = useRouter()

  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [businessName, setBusinessName] = useState<string>('')
  const [businessType, setBusinessType] = useState<BusinessType>('retail')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [isDark, setIsDark] = useState<boolean>(true)
  const [confirmed, setConfirmed] = useState<boolean>(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light') setIsDark(false)
    else setIsDark(true)

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) router.replace('/')
    }
    checkSession()
  }, [router])

  // ── Derived style tokens ────────────────────────────────────────────
  const bg       = isDark ? '#0a0a0a' : '#f0f9fc'
  const cardBg   = isDark ? '#111827' : '#ffffff'
  const border   = isDark ? '#1f2937' : '#e2e8f0'
  const text     = isDark ? '#f9fafb' : '#0f172a'
  const muted    = isDark ? '#9ca3af' : '#64748b'
  const accent   = '#3b82f6'
  const inputBg  = isDark ? '#1f2937' : '#f1f5f9'

  // ── Handlers ────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('No user returned from sign-up.')

      // 2. Create merchant profile
      const profile: MerchantProfile = {
        user_id: authData.user.id,
        business_name: businessName,
        business_type: businessType,
        subscription_tier: 'free',
        subscription_status: 'active',
      }

      const { error: profileError } = await supabase
        .from('merchants')
        .insert(profile)

      if (profileError) throw profileError

      // 3. Redirect logic
      if (authData.session) {
        router.replace('/onboarding')
      } else {
        // Email confirmation required
        setConfirmed(true)
        setTimeout(() => router.replace('/login'), 3000)
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        transition: 'background 0.3s',
      }}
    >
      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: cardBg,
          border: `1px solid ${border}`,
          borderRadius: '16px',
          padding: '32px',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.6)'
            : '0 8px 32px rgba(0,0,0,0.08)',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              marginBottom: '14px',
            }}
          >
            {/* Circuit icon */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
              <path d="M17.5 14v7M14 17.5h7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M10 6.5h4M17.5 10v4M6.5 10v4M10 17.5h4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 2" />
            </svg>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 700,
              color: text,
              letterSpacing: '-0.3px',
            }}
          >
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
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: muted }}>
            Create your merchant account
          </p>
        </div>

        {/* Confirmed Banner */}
        {confirmed && (
          <div
            style={{
              background: isDark ? '#052e16' : '#f0fdf4',
              border: `1px solid ${isDark ? '#15803d' : '#86efac'}`,
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: isDark ? '#4ade80' : '#15803d',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            ✅ Check your email to confirm your account. Redirecting to login…
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              background: isDark ? '#1c0a0a' : '#fff5f5',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#ef4444',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignup} noValidate>
          {/* Business Name */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: muted,
                marginBottom: '6px',
              }}
            >
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Acme Store"
              required
              style={{
                width: '100%',
                padding: '14px 12px',
                background: inputBg,
                border: 'none',
                borderRadius: '8px',
                color: text,
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Business Type */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: muted,
                marginBottom: '6px',
              }}
            >
              Business Type
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              required
              style={{
                width: '100%',
                padding: '14px 12px',
                background: inputBg,
                border: 'none',
                borderRadius: '8px',
                color: text,
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                appearance: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="retail">Retail</option>
              <option value="restaurant">Restaurant</option>
              <option value="service">Service</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: muted,
                marginBottom: '6px',
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%',
                padding: '14px 12px',
                background: inputBg,
                border: 'none',
                borderRadius: '8px',
                color: text,
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: muted,
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              minLength={8}
              style={{
                width: '100%',
                padding: '14px 12px',
                background: inputBg,
                border: 'none',
                borderRadius: '8px',
                color: text,
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || confirmed}
            style={{
              width: '100%',
              padding: '13px',
              background: loading
                ? '#6b7280'
                : 'linear-gradient(to right, #6b7280, #8b5cf6)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        {/* Link */}
        <p
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '14px',
            color: muted,
          }}
        >
          Already have an account?{' '}
          <a
            href="/login"
            style={{
              color: accent,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Sign in
          </a>
        </p>
      </div>

      {/* Footer */}
      <p
        style={{
          marginTop: '24px',
          fontSize: '13px',
          color: muted,
          textAlign: 'center',
        }}
      >
        Circuit POS © {new Date().getFullYear()}
      </p>
    </div>
  )
}
