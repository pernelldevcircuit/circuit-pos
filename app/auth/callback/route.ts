import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('OAuth code exchange failed:', error)
      return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url))
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('No user after OAuth session exchange')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check if merchants profile exists
    let { data: profile, error: profileError } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Profile check failed:', profileError)
    }

    if (!profile) {
      // Create new merchants profile for OAuth user
      const businessName = user.user_metadata?.full_name || 
                          user.email?.split('@')[0] || 
                          'My Business'

      const { error: insertError } = await supabase
        .from('merchants')
        .insert({
          user_id: user.id,
          business_name: businessName,
          business_type: 'retail',
          subscription_tier: 'free',
          subscription_status: 'active'
        })

      if (insertError) {
        console.error('Profile creation failed:', insertError)
        // Still redirect to home - user is auth'd even without profile
      }
    }

    // Redirect to onboarding for new users or home for existing
    return NextResponse.redirect(new URL('/onboarding', request.url))

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL('/login?error=callback_failed', request.url))
  }
}
