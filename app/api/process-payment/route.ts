import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { merchantId, amount, currency, description } = body

    if (!merchantId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*, pricing_tiers(*)')
      .eq('id', merchantId)
      .single()

    if (merchantError || !merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      )
    }

    const baseRate = merchant.pricing_tiers?.base_rate || 2.9
    const perTransactionFee = merchant.pricing_tiers?.per_transaction_fee || 0.30
    
    const processingFee = Math.round((amount * (baseRate / 100)) + (perTransactionFee * 100))
    const netAmount = amount - processingFee

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert([
        {
          merchant_id: merchantId,
          amount: amount,
          currency: currency || 'usd',
          processing_fee: processingFee,
          net_amount: netAmount,
          status: 'completed',
          description: description
        }
      ])
      .select()
      .single()

    if (txError) throw txError

    return NextResponse.json({
      success: true,
      transaction: transaction,
      processingFee: processingFee,
      netAmount: netAmount
    })

  } catch (error) {
    console.error('Payment processing error:', error)
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    )
  }
}
