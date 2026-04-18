'use client'

import { useState } from 'react'

export default function CheckoutPage() {
  const [formData, setFormData] = useState({
    merchantId: '',
    amount: '',
    description: ''
  })
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
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
      setResult(data)
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Circuit POS Checkout</h1>
          <p className="text-gray-400 mt-2">Process a payment</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 p-6 rounded-lg border border-gray-800">
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
            {loading ? 'Processing...' : 'Process Payment'}
          </button>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded-lg ${
            result.success ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'
          }`}>
            {result.success ? (
              <div>
                <p className="text-green-400 font-semibold mb-2">Payment Successful!</p>
                <p className="text-sm text-gray-300">Transaction ID: {result.transaction?.id?.slice(0, 8)}...</p>
                <p className="text-sm text-gray-300">Amount: ${(result.transaction?.amount / 100).toFixed(2)}</p>
                <p className="text-sm text-gray-300">Fee: ${(result.processingFee / 100).toFixed(2)}</p>
                <p className="text-sm text-gray-300">Net: ${(result.netAmount / 100).toFixed(2)}</p>
              </div>
            ) : (
              <p className="text-red-400">{result.error}</p>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-purple-400 hover:text-purple-300">← Back to Dashboard</a>
        </div>
      </div>
    </div>
  )
}
