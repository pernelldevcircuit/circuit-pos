'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AuthTab = 'password' | 'magic'

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

  // ── Auth state ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState<AuthTab>('password')
  const [email, setEmail]               = useState<string>('')
  const [password, setPassword]         = useState<string>('')
  const [businessName, setBusinessName] = useState<string>('')
  const [businessType, setBusinessType] = useState<BusinessType>('retail')
  const [magicEmail, setMagicEmail]     = useState<string>('')
  const [error, setError]               = useState<string>('')
  const [loading, setLoading]           = useState<boolean>(false)
  const [oauthLoading, setOauthLoading] = useState<boolean>(false)
  const [magicSent, setMagicSent]       = useState<boolean>(false)
  const [confirmed, setConfirmed]       = useState<boolean>(false)
  const [isDark, setIsDark]             = useState<boolean>(true)

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
  const bg            = isDark ? '#0a0a0a' : '#f0f9fc'
  const cardBg        = isDark ? '#111827' : '#ffffff'
  const border        = isDark ? '#1f2937' : '#e2e8f0'
  const text          = isDark ? '#f9fafb' : '#0f172a'
  const muted         = isDark ? '#9ca3af' : '#64748b'
  const accent        = '#3b82f6'
  const inputBg       = isDark ? '#1f2937' : '#f1f5f9'
  const oauthBg       = isDark ? '#1f2937' : '#f8fafc'
  const oauthBorder   = isDark ? '#374151' : '#e2e8f0'
  const oauthHover    = isDark ? '#263040' : '#f1f5f9'
  const dividerColor  = isDark ? '#1f2937' : '#e2e8f0'
  const dividerText   = isDark ? '#4b5563' : '#94a3b8'
  const tabBg         = isDark ? '#1f2937' : '#f1f5f9'
  const tabActive     = isDark ? '#111827' : '#ffffff'
  const tabBorder     = isDark ? '#374151' : '#e2e8f0'
  const successBg     = isDark ? '#052e16' : '#f0fdf4'
  const successBorder = isDark ? '#15803d' : '#86efac'
  const successText   = isDark ? '#4ade80' : '#15803d'

  // ── Shared input style ──────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 12px',
    background: inputBg,
    border: 'none',
    borderRadius: '8px',
    color: text,
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: muted,
    marginBottom: '6px',
  }

  // ── Tab switch — clear errors and success state ─────────────────────
  function handleTabSwitch(tab: AuthTab) {
    setActiveTab(tab)
    setError('')
    setMagicSent(false)
    setConfirmed(false)
  }

  // ── Email / password signup handler ────────────────────────────────
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
        user_id:             authData.user.id,
        business_name:       businessName,
        business_type:       businessType,
        subscription_tier:   'free',
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

  // ── Magic link handler ──────────────────────────────────────────────
  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: magicEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          shouldCreateUser: true,
        },
      })
      if (otpError) throw otpError
      setMagicSent(true)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send magic link.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // ── Google OAuth handler ────────────────────────────────────────────
  const handleGoogle = async () => {
    setError('')
    setOauthLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (authError) throw authError
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Google sign-up failed.'
      setError(message)
      setOauthLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
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
        {/* ── Logo ── */}
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

        {/* ── Google OAuth ── */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={oauthLoading || loading || confirmed}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '13px 16px',
            background: oauthBg,
            border: `1px solid ${oauthBorder}`,
            borderRadius: '8px',
            color: text,
            fontSize: '14px',
            fontWeight: 500,
            cursor: oauthLoading || loading || confirmed ? 'not-allowed' : 'pointer',
            opacity: oauthLoading || loading || confirmed ? 0.6 : 1,
            transition: 'background 0.15s, opacity 0.15s',
            outline: 'none',
            marginBottom: '20px',
          }}
          onMouseEnter={e => {
            if (!oauthLoading && !loading && !confirmed)
              e.currentTarget.style.background = oauthHover
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = oauthBg
          }}
        >
          {oauthLoading ? (
            <OauthSpinner />
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <path d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107" />
              <path d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00" />
              <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.311 0-9.821-3.317-11.563-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50" />
              <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2" />
            </svg>
          )}
          <span>Sign up with Google</span>
        </button>

        {/* ── OR Divider ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: dividerColor }} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: dividerText,
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}
          >
            OR
          </span>
          <div style={{ flex: 1, height: '1px', background: dividerColor }} />
        </div>

        {/* ── Auth Method Tabs ── */}
        <div
          style={{
            display: 'flex',
            background: tabBg,
            border: `1px solid ${tabBorder}`,
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '20px',
            gap: '4px',
          }}
        >
          {(
            [
              { id: 'password', label: 'Password' },
              { id: 'magic',    label: 'Magic Link' },
            ] as { id: AuthTab; label: string }[]
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabSwitch(tab.id)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: '7px',
                border: activeTab === tab.id
                  ? `1px solid ${tabBorder}`
                  : '1px solid transparent',
                background: activeTab === tab.id ? tabActive : 'transparent',
                color: activeTab === tab.id ? text : muted,
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                outline: 'none',
                boxShadow: activeTab === tab.id && isDark
                  ? '0 1px 3px rgba(0,0,0,0.4)'
                  : activeTab === tab.id
                  ? '0 1px 3px rgba(0,0,0,0.08)'
                  : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Confirmed Banner ── */}
        {confirmed && (
          <div
            style={{
              background: successBg,
              border: `1px solid ${successBorder}`,
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: successText,
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            ✅ Check your email to confirm your account. Redirecting to login…
          </div>
        )}

        {/* ── Error Banner ── */}
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

        {/* ══════════════════════════════════════════════
            PASSWORD TAB
        ══════════════════════════════════════════════ */}
        {activeTab === 'password' && (
          <form onSubmit={handleSignup} noValidate>

            {/* Business Name */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Store"
                required
                style={inputStyle}
              />
            </div>

            {/* Business Type */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Business Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                required
                style={{
                  ...inputStyle,
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
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={loading || oauthLoading || confirmed}
              style={{
                width: '100%',
                padding: '13px',
                background: loading
                  ? '#6b7280'
                  : 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading || oauthLoading || confirmed ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                opacity: loading || oauthLoading || confirmed ? 0.8 : 1,
              }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}

        {/* ══════════════════════════════════════════════
            MAGIC LINK TAB
        ══════════════════════════════════════════════ */}
        {activeTab === 'magic' && (
          <>
            {magicSent ? (
              /* ── Success state ── */
              <div
                style={{
                  background: successBg,
                  border: `1px solid ${successBorder}`,
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: isDark ? '#14532d' : '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      stroke={successText}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p
                  style={{
                    margin: '0 0 6px',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: successText,
                  }}
                >
                  Check your inbox
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: muted, lineHeight: 1.5 }}>
                  We sent a magic link to{' '}
                  <strong style={{ color: text }}>{magicEmail}</strong>.
                  Click it to create your account instantly — no password needed.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMagicSent(false)
                    setMagicEmail('')
                    setError('')
                  }}
                  style={{
                    marginTop: '16px',
                    background: 'none',
                    border: 'none',
                    color: accent,
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                    outline: 'none',
                  }}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              /* ── Magic link form ── */
              <form onSubmit={handleMagicLink} noValidate>
                <p
                  style={{
                    margin: '0 0 16px',
                    fontSize: '13px',
                    color: muted,
                    lineHeight: 1.5,
                  }}
                >
                  Enter your email and we&apos;ll send you a link that creates
                  your account instantly — no password required.
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={inputStyle}
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || oauthLoading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    background: loading
                      ? '#6b7280'
                      : 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: loading || oauthLoading ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s',
                    opacity: loading || oauthLoading ? 0.8 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {loading ? (
                    <>
                      <OauthSpinner />
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Send Magic Link
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* ── Sign in link ── */}
        <p
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '14px',
            color: muted,
          }}
        >
          Already have an account?{' '}
          
            <a
            href="/login"
            style={{ color: accent, textDecoration: 'none', fontWeight: 500 }}
          >
            Sign in
          </a>
        </p>
      </div>

      {/* ── Footer ── */}
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

// ── Inline spinner ────────────────────────────────────────────────────────────
function OauthSpinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="#6b7280" strokeWidth="3" />
      <path d="M12 2a10 10 0 0110 10" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
