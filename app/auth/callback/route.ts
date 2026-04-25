import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  // ── OAuth provider returned an error ───────────────────────────────
  if (error) {
    console.error('[auth/callback] OAuth error:', error)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}`
    )
  }

  // ── No code present — malformed request ───────────────────────────
  if (!code) {
    console.error('[auth/callback] No code in request')
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  // ── Exchange code for session ──────────────────────────────────────
  const supabase = createClient()
  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(code)
    console.error('[auth/callback] Session exchange failed:', sessionError)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        sessionError?.message ?? 'session_exchange_failed'
      )}`
    )
  }

  const user = sessionData.user

  // ── Check if a merchants profile already exists ────────────────────
  const { data: existingProfile, error: profileFetchError } = await supabase
    .from('merchants')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileFetchError) {
    console.error('[auth/callback] Profile fetch error:', profileFetchError)
    // Non-fatal — still signed in, send to home and let the app handle it
    return NextResponse.redirect(`${origin}/`)
  }

  // ── Existing user — skip onboarding ───────────────────────────────
  if (existingProfile) {
    return NextResponse.redirect(`${origin}/`)
  }

  // ── New user — create merchant profile then send to onboarding ─────
  const { error: insertError } = await supabase
    .from('merchants')
    .insert({
      user_id:             user.id,
      business_name:       user.user_metadata?.full_name
                             ?? user.email?.split('@')[0]
                             ?? 'My Business',
      business_type:       'retail',
      subscription_tier:   'free',
      subscription_status: 'active',
    })

  if (insertError) {
    console.error('[auth/callback] Profile insert error:', insertError)
    // Non-fatal — still signed in, send home
    return NextResponse.redirect(`${origin}/`)
  }

  return NextResponse.redirect(`${origin}/onboarding`)

  return NextResponse.redirect(`${origin}/onboarding`)
}
