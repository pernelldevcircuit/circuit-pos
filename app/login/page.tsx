'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('circuit-theme')
    if (saved !== null) setIsDark(saved === 'dark')
    // If already logged in, redirect to dashboard
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/')
    })
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.replace('/')
    }
  }

  const bg = isDark ? '#0a0a0a' : '#f8fafc'
  const cardBg = isDark ? '#111827' : '#ffffff'
  const border = isDark ? '#1f2937' : '#e2e8f0'
  const text = isDark ? '#f9fafb' : '#0f172a'
  const muted = isDark ? '#9ca3af' : '#64748b'
  const accent = '#3b82f6'

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px' }}>C</span>
            </div>
            <span style={{ fontSize: '22px', fontWeight: 700, color: text }}>Circuit POS</span>
          </div>
          <p style={{ color: muted, fontSize: '14px' }}>Sign in to your merchant account</p>
        </div>

        {/* Card */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '32px' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: muted, fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{ width: '100%', padding: '12px 14px', background: isDark ? '#1f2937' : '#f1f5f9', border: `1px solid ${border}`, borderRadius: '10px', color: text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: muted, fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: '100%', padding: '12px 14px', background: isDark ? '#1f2937' : '#f1f5f9', border: `1px solid ${border}`, borderRadius: '10px', color: text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {error && (
              <div style={{ background: isDark ? '#1f1212' : '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#ef4444', fontSize: '13px' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? '#6b7280' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: muted, fontSize: '13px' }}>
          Circuit POS &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
