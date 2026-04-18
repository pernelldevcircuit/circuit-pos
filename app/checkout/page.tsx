'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFormProps {
  clientSecret: string
  amount: number
  onSuccess: (paymentIntent: any) => void
  onError: (error: string) => void
}

function PaymentForm({ clientSecret, amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    setProcessing(true)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout?success=true`,
        },
        redirect: 'if_required',
      })

      if (error) {
        onError(error.message || 'Payment failed')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent)
      }
    } catch (err: any) {
      onError(err.message || 'Payment processing error')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <PaymentElement />
      </div>
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  )
}

export default function CheckoutPage() {
  const [formData, setFormData] = useState({
    merchantId: '',
    amount: '',
    description: ''
  })
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [transactionData, setTransactionData] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: formData.merchantId,
          amount: parseFloat(formData.amount) * 100,
          currency: 'usd',
          description: formData.description
        })
      })

      const data = await response.json()

      if (data.success && data.clientSecret) {
        setClientSecret(data.clientSecret)
        setTransactionData(data)
      } else {
        setResult({ success: false, error: data.error || 'Failed to create payment' })
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = (paymentIntent: any) => {
    setResult({
      success: true,
      paymentIntent,
      transaction: transactionData?.transaction,
      processingFee: transactionData?.processingFee,
      netAmount: transactionData?.netAmount
    })
    setClientSecret(null)
  }

  const handlePaymentError = (error: string) => {
    setResult({ success: false, error })
    setClientSecret(null)
  }

  const handleReset = () => {
    setFormData({ merchantId: '', amount: '', description: '' })
    setClientSecret(null)
    setTransactionData(null)
    setResult(null)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Circuit POS Terminal</h1>
          <p className="text-gray-400 mt-2">Process payments with live card details</p>
        </div>

        {!clientSecret && !result && (
          <form onSubmit={handleCreatePayment} className="space-y-6 bg-gray-900 p-6 rounded-lg border border-gray-800">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Merchant ID</label>
              <input
                type="text"
                required
                value={formData.merchantId}
                onChange={(e) => setFormData({...formData, merchantId: e.target.value})}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                placeholder="Enter merchant ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                placeholder="Payment description"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Continue to Payment'}
            </button>
          </form>
        )}

        {clientSecret && (
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <div className="mb-4">
              <p className="text-gray-300 mb-1">Amount: <span className="text-white font-semibold">${(parseFloat(formData.amount)).toFixed(2)}</span></p>
              <p className="text-gray-400 text-sm">{formData.description || 'No description'}</p>
            </div>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm
                clientSecret={clientSecret}
                amount={parseFloat(formData.amount) * 100}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
            <button
              onClick={() => setClientSecret(null)}
              className="mt-4 w-full px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        {result && (
          <div className={`p-6 rounded-lg border ${
            result.success ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'
          }`}>
            {result.success ? (
              <div>
                <p className="text-green-400 font-semibold text-xl mb-4">✓ Payment Successful!</p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-300">Transaction ID: <span className="text-white font-mono">{result.transaction?.id?.slice(0, 8)}...</span></p>
                  <p className="text-gray-300">Payment Intent: <span className="text-white font-mono">{result.paymentIntent?.id?.slice(0, 16)}...</span></p>
                  <p className="text-gray-300">Amount: <span className="text-white font-semibold">${(result.transaction?.amount / 100).toFixed(2)}</span></p>
                  <p className="text-gray-300">Processing Fee: <span className="text-white">${(result.processingFee / 100).toFixed(2)}</span></p>
                  <p className="text-gray-300">Net to Merchant: <span className="text-white font-semibold">${(result.netAmount / 100).toFixed(2)}</span></p>
                  {result.paymentIntent?.payment_method && (
                    <p className="text-gray-300">Card: <span className="text-white">•••• {result.paymentIntent.payment_method}</span></p>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all"
                >
                  Process Another Payment
                </button>
              </div>
            ) : (
              <div>
                <p className="text-red-400 font-semibold text-xl mb-2">✗ Payment Failed</p>
                <p className="text-red-300 text-sm mb-4">{result.error}</p>
                <button
                  onClick={() => setResult(null)}
                  className="w-full px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-all"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-purple-400 hover:text-purple-300 transition-colors">← Back to Dashboard</a>
        </div>
      </div>
    </div>
  )
}
