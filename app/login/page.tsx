'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail]               = useState<string>('')
  const [password, setPassword]         = useState<string>('')
  const [error, setError]               = useState<string>('')
  const [loading, setLoading]           = useState<boolean>(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
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
  const bg          = isDark ? '#0a0a0a' : '#f0f9fc'
  const cardBg      = isDark ? '#111827' : '#ffffff'
  const border      = isDark ? '#1f2937' : '#e2e8f0'
  const text        = isDark ? '#f9fafb' : '#0f172a'
  const muted       = isDark ? '#9ca3af' : '#64748b'
  const accent      = '#3b82f6'
  const inputBg     = isDark ? '#1f2937' : '#f1f5f9'
  const oauthBg     = isDark ? '#1f2937' : '#f8fafc'
  const oauthBorder = isDark ? '#374151' : '#e2e8f0'
  const oauthHover  = isDark ? '#263040' : '#f1f5f9'
  const dividerColor = isDark ? '#1f2937' : '#e2e8f0'
  const dividerText  = isDark ? '#4b5563' : '#94a3b8'

  // ── Email/password handler ──────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) throw authError
      router.replace('/')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // ── OAuth handler ───────────────────────────────────────────────────
  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError('')
    setOauthLoading(provider)
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })
      if (authError) throw authError
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'OAuth sign-in failed.'
      setError(message)
      setOauthLoading(null)
    }
  }

  // ── OAuth button style helper ───────────────────────────────────────
  const oauthBtnStyle = (provider: 'google' | 'apple'): React.CSSProperties => ({
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
    cursor: oauthLoading === provider ? 'not-allowed' : 'pointer',
    opacity: oauthLoading && oauthLoading !== provider ? 0.5 : 1,
    transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
    outline: 'none',
  })

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
            Sign in to your merchant account
          </p>
        </div>

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

        {/* ── Email / Password Form ─────────────────────────────────── */}
        <form onSubmit={handleLogin} noValidate>
          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
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
              placeholder="Your password"
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !!oauthLoading}
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
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* ── OR Divider ────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '24px 0',
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
            OR CONTINUE WITH
          </span>
          <div style={{ flex: 1, height: '1px', background: dividerColor }} />
        </div>

        {/* ── OAuth Buttons ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Google */}
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={!!oauthLoading || loading}
            style={oauthBtnStyle('google')}
            onMouseEnter={e => { if (!oauthLoading && !loading) e.currentTarget.style.background = oauthHover }}
            onMouseLeave={e => { e.currentTarget.style.background = oauthBg }}
          >
            {oauthLoading === 'google' ? (
              <OauthSpinner />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <path d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107" />
                <path d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00" />
                <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.311 0-9.821-3.317-11.563-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50" />
                <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2" />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Apple */}
          <button
            type="button"
            onClick={() => handleOAuth('apple')}
            disabled={!!oauthLoading || loading}
            style={oauthBtnStyle('apple')}
            onMouseEnter={e => { if (!oauthLoading && !loading) e.currentTarget.style.background = oauthHover }}
            onMouseLeave={e => { e.currentTarget.style.background = oauthBg }}
          >
            {oauthLoading === 'apple' ? (
              <OauthSpinner />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isDark ? '#f9fafb' : '#0f172a'}>
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.39.07 2.35.74 3.15.8.95-.19 1.86-.89 3.06-.96 1.3-.08 2.54.49 3.24 1.35-2.86 1.69-2.36 5.46.42 6.54-.5 1.37-1.17 2.73-1.87 3.15zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            )}
            <span>Continue with Apple</span>
          </button>
        </div>

        {/* Sign up link */}
        <p
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '14px',
            color: muted,
          }}
        >
          Don&apos;t have an account?{' '}
          <a
            href="/signup"
            style={{
              color: accent,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Sign up
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

// ── Inline spinner for OAuth buttons ─────────────────────────────────────────
function OauthSpinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="#6b7280" strokeWidth="3" />
      <path d="M12 2a10 10 0 0110 10" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
