import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
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

    // Get merchant record
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', merchantId)
      .single()

    if (merchantError || !merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      )
    }

    // Use merchant rate fields
    const baseRate = merchant.circuit_rate_percentage || 2.90
    const perTransactionFee = merchant.circuit_per_transaction_fee || 0.20

    const processingFee = Math.round((amount * (baseRate / 100)) + (perTransactionFee * 100))
    const netAmount = amount - processingFee

    // Generate unique transaction number
    const transactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency || 'usd',
      description: description || `Payment for merchant ${merchantId}`,
      metadata: {
        merchantId: merchantId,
        transactionNumber: transactionNumber,
        processingFee: processingFee.toString(),
        netAmount: netAmount.toString()
      }
    })

    // Record transaction - only using columns that exist in schema
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert([{
        merchant_id: merchantId,
        transaction_number: transactionNumber,
        subtotal: amount,
        total: amount,
        profit: netAmount,
        status: 'pending',
        payment_status: 'unpaid',
        stripe_payment_intent_id: paymentIntent.id,
        notes: description || null
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
            { error: (error as Error).message || 'Payment processing failed' },
      { status: 500 }
    )
  }
}
