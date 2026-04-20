import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface QuoteRequest {
  monthlyVolume: number
  currentProcessor?: string
  currentRate?: number
  averageTicket?: number
}

export async function POST(request: Request) {
  try {
    const body: QuoteRequest = await request.json()
    const { monthlyVolume, currentRate, averageTicket } = body

    if (!monthlyVolume || monthlyVolume <= 0) {
      return NextResponse.json(
        { error: 'Valid monthly volume required' },
        { status: 400 }
      )
    }

    // Fetch pricing tiers
    const { data: tiers, error: tiersError } = await supabase
      .from('pricing_tiers')
      .select('*')
      .order('id')

    if (tiersError) throw tiersError

    // Find best Circuit tier based on volume
    let selectedTier = tiers[0]
    for (const tier of tiers) {
      if (monthlyVolume >= (tier.min_monthly_volume || 0) && 
          (!tier.max_monthly_volume || monthlyVolume <= 
tier.max_monthly_volume)) {
        selectedTier = tier
      }
    }

    // Calculate Circuit's cost
    const avgTicket = averageTicket || (monthlyVolume / 100)
    const transactionCount = monthlyVolume / avgTicket
    
    const circuitRate = selectedTier.rate_percentage / 100
    const circuitPerTx = selectedTier.per_transaction_fee
    const circuitMonthlyFee = selectedTier.monthly_subscription_fee || 0
    
    const circuitProcessingCost = (monthlyVolume * circuitRate) + 
(transactionCount * circuitPerTx)
    const circuitTotalCost = circuitProcessingCost + circuitMonthlyFee

    // Calculate current processor cost if provided
    let currentMonthlyCost = null
    let savingsVsCurrent = null
    
    if (currentRate && currentRate > 0) {
      currentMonthlyCost = monthlyVolume * (currentRate / 100)
      savingsVsCurrent = currentMonthlyCost - circuitTotalCost
    }

    return NextResponse.json({
      success: true,
      quote: {
        recommendedTier: {
          id: selectedTier.id,
          name: selectedTier.tier_name,
          displayName: selectedTier.display_name,
          rate: selectedTier.rate_percentage,
          perTransaction: selectedTier.per_transaction_fee,
          monthlyFee: selectedTier.monthly_subscription_fee,
          features: selectedTier.features
        },
        monthlyVolume,
        estimatedTransactions: Math.round(transactionCount),
        averageTicket: Math.round(avgTicket * 100) / 100,
        circuitCost: {
          processing: Math.round(circuitProcessingCost * 100) / 100,
          monthlyFee: circuitMonthlyFee,
          total: Math.round(circuitTotalCost * 100) / 100
        },
        currentCost: currentMonthlyCost ? Math.round(currentMonthlyCost * 
100) / 100 : null,
        savingsVsCurrent: savingsVsCurrent ? Math.round(savingsVsCurrent * 
100) / 100 : null,
        savingsPercent: savingsVsCurrent && currentMonthlyCost ? 
          Math.round((savingsVsCurrent / currentMonthlyCost) * 10000) / 
100 : null,
        annualSavings: savingsVsCurrent ? Math.round(savingsVsCurrent * 12 
* 100) / 100 : null
      }
    })

  } catch (error) {
    console.error('Pricing quote error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quote' },
      { status: 500 }
    )
  }
}
