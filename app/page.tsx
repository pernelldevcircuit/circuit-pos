'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import CircuitRatesDashboard from './components/CircuitRatesDashboard'
export default function Home() {
  const [pricingTiers, setPricingTiers] = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [tiersRes, merchantsRes, transactionsRes] = await Promise.all([
          supabase.from('pricing_tiers').select('*'),
          supabase.from('merchants').select('*').limit(5),
          supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(10)
        ])
        setPricingTiers(tiersRes.data || [])
        setMerchants(merchantsRes.data || [])
        setTransactions(transactionsRes.data || [])
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Fix: use 'profit' column (net_amount does not exist in schema)
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.profit || 0), 0)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Circuit POS</h1>
            <p className="text-gray-400 mt-2">Modern Point of Sale SaaS Platform</p>
          </div>
          <a href="/checkout" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition">Process Payment</a>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Revenue</p>
                <p className="text-2xl font-bold text-green-400">${totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Transactions</p>
                <p className="text-2xl font-bold text-blue-400">{transactions.length}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Merchants</p>
                <p className="text-2xl font-bold text-purple-400">{merchants.length}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Pricing Tiers</p>
                <p className="text-2xl font-bold text-pink-400">{pricingTiers.length}</p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Pricing Tiers</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {pricingTiers.map((tier) => (
                  <div key={tier.id} className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-purple-400 font-semibold">{tier.tier_name}</h3>
                    {/* Fix: use rate_percentage (base_rate does not exist in schema) */}
                    <p className="text-2xl font-bold">{tier.rate_percentage}%</p>
                    <p className="text-gray-400 text-sm">+ ${tier.per_transaction_fee?.toFixed(2)}/transaction</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
              {transactions.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800">
                      <th className="text-left py-2">ID</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="border-b border-gray-800/50">
                        <td className="py-2">{txn.id?.slice(0, 8)}...</td>
                        {/* Fix: use txn.total (no 'amount' column in schema; total is in dollars) */}
                        <td className="py-2">${(txn.total || 0).toFixed(2)}</td>
                        <td className="py-2">{txn.status || 'completed'}</td>
                        <td className="py-2">{new Date(txn.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500">No transactions yet</p>
              )}
            </div>
          </>
        )}

        <CircuitRatesDashboard />
      </div>
    </div>
  )
}
