'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Transaction, 
  TransactionWithItems,
  getTransactions, 
  getTransactionWithItems 
} from '@/lib/transactions'
import { TransactionList } from '@/app/components/TransactionList'
import { ReceiptDetailModal } from '@/app/components/ReceiptDetailModal'

export default function TransactionsPage() {
  const router = useRouter()
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Auth check and load merchant ID
  useEffect(() => {
    async function init() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) throw sessionError
        if (!session?.user) {
          router.replace('/login')
          return
        }

        // Get merchant profile
        const { data: merchant, error: merchantError } = await supabase
          .from('merchants')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (merchantError) throw merchantError
        if (!merchant) {
          router.replace('/onboarding')
          return
        }

        setMerchantId(merchant.id)
      } catch (err: unknown) {
        console.error('[transactions] init error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load account')
        setLoading(false)
      }
    }

    init()
  }, [router])

  // Load transactions when merchantId is set
  useEffect(() => {
    if (!merchantId) return

    async function loadTransactions() {
      try {
        const txns = await getTransactions(supabase, merchantId!, 100)
        setTransactions(txns)
      } catch (err: unknown) {
        console.error('[transactions] load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load transactions')
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [merchantId])

  // Handle transaction click - load full details
  async function handleSelectTransaction(txn: Transaction) {
    try {
      const fullTxn = await getTransactionWithItems(supabase, txn.id)
      setSelectedTransaction(fullTxn)
    } catch (err: unknown) {
      console.error('[transactions] detail error:', err)
      alert(err instanceof Error ? err.message : 'Failed to load transaction details')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
            Loading transactions...
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>
              Error
            </div>
            <div style={{ fontSize: '14px', color: '#ef4444' }}>{error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#9ca3af',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#374151'
                e.currentTarget.style.color = '#f9fafb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1f2937'
                e.currentTarget.style.color = '#9ca3af'
              }}
            >
              ← Back to Dashboard
            </button>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#f9fafb', marginBottom: '8px' }}>
            Transaction History
          </h1>
          <p style={{ fontSize: '15px', color: '#9ca3af' }}>
            View and manage all your transactions
          </p>
        </div>

        {/* Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{ 
            background: '#111827', 
            border: '1px solid #1f2937', 
            borderRadius: '12px', 
            padding: '20px' 
          }}>
            <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>
              Total Transactions
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f9fafb' }}>
              {transactions.length}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <TransactionList
          transactions={transactions}
          onSelectTransaction={handleSelectTransaction}
          loading={false}
        />

        {/* Receipt Detail Modal */}
        <ReceiptDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      </div>
    </div>
  )
}
