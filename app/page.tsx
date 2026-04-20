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

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.net_amount || 0), 0) / 100

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Circuit POS</h1>
            <p className="text-gray-400 mt-2">Modern Point of Sale SaaS Platform</p>
          </div>
          <a href="/checkout" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg shadow-lg transition-all">Process Payment</a>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                <p className="text-gray-400 text-sm">Revenue</p>
                <p className="text-3xl font-bold text-green-400">${totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                <p className="text-gray-400 text-sm">Transactions</p>
                <p className="text-3xl font-bold text-blue-400">{transactions.length}</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                <p className="text-gray-400 text-sm">Merchants</p>
                <p className="text-3xl font-bold text-purple-400">{merchants.length}</p>
              </div>
              <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                <p className="text-gray-400 text-sm">Pricing Tiers</p>
                <p className="text-3xl font-bold text-pink-400">{pricingTiers.length}</p>
              </div>
            </div>

            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
              <h2 className="text-2xl font-bold mb-4">Pricing Tiers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {pricingTiers.map((tier) => (
                  <div key={tier.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold text-purple-400">{tier.tier_name}</h3>
                    <p className="text-2xl font-bold text-white mt-2">{tier.base_rate}%</p>
                    <p className="text-sm text-gray-400">+ ${tier.per_transaction_fee?.toFixed(2)}/transaction</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
              <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
              {transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 text-gray-400">ID</th>
                        <th className="text-left py-3 text-gray-400">Amount</th>
                        <th className="text-left py-3 text-gray-400">Status</th>
                        <th className="text-left py-3 text-gray-400">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="border-b border-gray-800">
                          <td className="py-3 font-mono text-sm">{txn.id?.slice(0, 8)}...</td>
                          <td className="py-3 text-white font-semibold">${(txn.amount / 100).toFixed(2)}</td>
                          <td className="py-3">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">{txn.status || 'completed'}</span>
                          </td>
                          <td className="py-3 text-sm">{new Date(txn.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-12 text-gray-400">No transactions yet</p>
              )}
            </div>

            <CircuitRatesDashboard />
          </div>
        )}
      </div>
    </div>
  )
}
