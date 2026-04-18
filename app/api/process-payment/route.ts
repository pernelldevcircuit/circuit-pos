import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

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

    // Get merchant and pricing tier
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

    // Calculate Circuit's processing fee
    const baseRate = merchant.pricing_tiers?.base_rate || 2.9
    const perTransactionFee = merchant.pricing_tiers?.per_transaction_fee || 0.30
    
    const processingFee = Math.round((amount * (baseRate / 100)) + (perTransactionFee * 100))
    const netAmount = amount - processingFee

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency || 'usd',
      description: description || `Payment for merchant ${merchantId}`,
      metadata: {
        merchantId: merchantId,
        processingFee: processingFee.toString(),
        netAmount: netAmount.toString()
      }
    })

    // Record transaction in database
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert([{
        merchant_id: merchantId,
        amount: amount,
        currency: currency || 'usd',
        processing_fee: processingFee,
        net_amount: netAmount,
        status: 'pending',
        stripe_payment_intent_id: paymentIntent.id,
        description: description
      }])
      .select()
      .single()

    if (txError) throw txError

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
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
