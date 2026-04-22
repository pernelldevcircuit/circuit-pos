'use client'

import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { supabase } from './supabase'

export interface MerchantProfile {
  id: string
  user_id: string
  business_name: string
  business_type: string
  subscription_tier: string
  subscription_status: string
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  merchant: MerchantProfile | null
  session: Session | null
  loading: boolean
}

/**
 * Hook to get current auth state
 * Auto-refreshes when auth state changes
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    merchant: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setState({ user: null, merchant: null, session: null, loading: false })
          return
        }

        if (session?.user) {
          // Fetch merchant profile
          const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('*')
            .eq('user_id', session.user.id)
            .single()

          if (merchantError) {
            console.error('Error fetching merchant:', merchantError)
          }

          setState({
            user: session.user,
            merchant: merchant || null,
            session,
            loading: false,
          })
        } else {
          setState({ user: null, merchant: null, session: null, loading: false })
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        setState({ user: null, merchant: null, session: null, loading: false })
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          // Fetch merchant profile on auth change
          const { data: merchant } = await supabase
            .from('merchants')
            .select('*')
            .eq('user_id', session.user.id)
            .single()

          setState({
            user: session.user,
            merchant: merchant || null,
            session,
            loading: false,
          })
        } else {
          setState({ user: null, merchant: null, session: null, loading: false })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return state
}

/**
 * Hook to check if user has specific subscription tier
 */
export function useSubscription() {
  const { merchant, loading } = useAuth()

  return {
    tier: merchant?.subscription_tier || 'free',
    status: merchant?.subscription_status || 'inactive',
    loading,
    isActive: merchant?.subscription_status === 'active',
    isFree: merchant?.subscription_tier === 'free',
    isPro: merchant?.subscription_tier === 'pro',
    isEnterprise: merchant?.subscription_tier === 'enterprise',
  }
}

/**
 * Sign out helper
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error signing out:', error)
    throw error
  }
}
