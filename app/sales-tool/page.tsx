'use client'

import { useState } from 'react'

export default function SalesToolPage() {
  const [inputs, setInputs] = useState({
    monthlyVolume: 50000,
    currentRate: 2.9,
    averageTicket: 45,
    currentProcessor: 'Square'
  })
  
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleCalculate = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/pricing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs)
      })
      const data = await response.json()
      setQuote(data.quote)
    } catch (error) {
      console.error('Quote error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r 
from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Circuit Sales Calculator
          </h1>
          <p className="text-gray-400 mt-2">Show merchants exactly how 
much they'll save with Circuit</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-gray-900 p-6 rounded-lg border 
border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Merchant 
Information</h2>
            
            <div className="space-y-4">
              <div>
                abel className="block text-sm font-medium text-gray-300 
mb-2">
                  Monthly Card Volume ($)
                </label>
                <input
                  type="number"
                  value={inputs.monthlyVolume}
                  onChange={(e) => setInputs({...inputs, monthlyVolume: 
parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-gray-800 border 
border-gray-700 rounded-lg text-white focus:border-purple-500 
focus:outline-none"
                />
              </div>

              <div>
                abel className="block text-sm font-medium text-gray-300 
mb-2">
                  Current Processor
                </label>
                <select
                  value={inputs.currentProcessor}
                  onChange={(e) => setInputs({...inputs, currentProcessor: 
e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800 border 
border-gray-700 rounded-lg text-white focus:border-purple-500 
focus:outline-none"
                >
                  <option>Square</option>
                  <option>Clover</option>
                  <option>Toast</option>
                  <option>Shopify POS</option>
                  <option>PayPal</option>
                  <option>Stripe Terminal</option>
                </select>
              </div>

              <div>
                abel className="block text-sm font-medium text-gray-300 
mb-2">
                  Current Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.currentRate}
                  onChange={(e) => setInputs({...inputs, currentRate: 
parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-gray-800 border 
border-gray-700 rounded-lg text-white focus:border-purple-500 
focus:outline-none"
                />
              </div>

              <div>
                abel className="block text-sm font-medium text-gray-300 
mb-2">
                  Average Transaction ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputs.averageTicket}
                  onChange={(e) => setInputs({...inputs, averageTicket: 
parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-gray-800 border 
border-gray-700 rounded-lg text-white focus:border-purple-500 
focus:outline-none"
                />
              </div>

              <button
                onClick={handleCalculate}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r 
from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 
text-white font-semibold rounded-lg shadow-lg transition-all 
disabled:opacity-50"
              >
                {loading ? 'Calculating...' : 'Calculate Savings'}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-gray-900 p-6 rounded-lg border 
border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Your Circuit 
Offer</h2>
            
            {quote ? (
              <div className="space-y-6">
                {/* Savings Headline */}
                <div className="bg-gradient-to-r from-green-500/20 
to-emerald-500/20 border border-green-500/50 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-300 mb-1">Monthly 
Savings</p>
                    <p className="text-4xl font-bold text-green-400">
                      ${quote.savingsVsCurrent > 0 ? '+' : 
''}{quote.savingsVsCurrent?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      ${((quote.savingsVsCurrent || 0) * 12).toFixed(2)} / 
year
                    </p>
                  </div>
                </div>

                {/* Recommended Tier */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 
mb-2">Recommended Plan</h3>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xl font-semibold 
text-purple-400">{quote.recommendedTier.displayName}</p>
                    <p className="text-gray-300 
mt-1">{quote.recommendedTier.rate}% + 
${quote.recommendedTier.perTransaction}</p>
                    <p className="text-sm 
text-gray-400">${quote.recommendedTier.monthlyFee}/month</p>
                  </div>
                </div>

                {/* Cost Comparison */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 
mb-2">Cost Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 
bg-gray-800 rounded">
                      <span className="text-gray-300">Current Cost</span>
                      <span 
className="font-semibold">${quote.currentCost?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 
bg-gray-800 rounded">
                      <span className="text-gray-300">Circuit Cost</span>
                      <span className="font-semibold 
text-purple-400">${quote.circuitCost.total?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 
bg-green-500/20 border border-green-500/50 rounded">
                      <span className="text-gray-300">You Save</span>
                      <span className="font-bold 
text-green-400">${quote.savingsVsCurrent?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Est. {quote.estimatedTransactions} 
transactions/month</p>
                  <p>Avg ticket: ${quote.averageTicket}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 
text-gray-500">
                Enter merchant details and click Calculate
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-purple-400 hover:text-purple-300 
transition-colors">← Back to Dashboard</a>
        </div>
      </div>
    </div>
  )
}
