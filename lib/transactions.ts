import { SupabaseClient } from '@supabase/supabase-js'

// ── Transaction Types ───────────────────────────────────────────────────────

export interface Transaction {
  id: string
  merchant_id: string
  customer_id?: string | null
  transaction_number: string
  status?: string | null
  payment_status?: string | null
  payment_method?: string | null
  subtotal: number
  tax?: number | null
  discount?: number | null
  total: number
  cost_of_goods?: number | null
  profit?: number | null
  stripe_payment_intent_id?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id?: string | null
  name: string
  quantity: number
  unit_price: number
  total_price: number
  cost?: number | null
  created_at: string
}

export interface TransactionWithItems extends Transaction {
  items: TransactionItem[]
}

// ── Helper Functions ────────────────────────────────────────────────────────

/**
 * Fetch all transactions for a merchant, ordered by created_at DESC
 */
export async function getTransactions(
  supabase: SupabaseClient,
  merchantId: string,
  limit = 100
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data as Transaction[]) || []
}

/**
 * Fetch a single transaction with its line items
 */
export async function getTransactionWithItems(
  supabase: SupabaseClient,
  transactionId: string
): Promise<TransactionWithItems | null> {
  // Fetch transaction
  const { data: transaction, error: txnError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (txnError) throw txnError
  if (!transaction) return null

  // Fetch items
  const { data: items, error: itemsError } = await supabase
    .from('transaction_items')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true })

  if (itemsError) throw itemsError

  return {
    ...(transaction as Transaction),
    items: (items as TransactionItem[]) || [],
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string | null | undefined): string {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'paid':
      return '#10b981' // green
    case 'pending':
      return '#f59e0b' // amber
    case 'failed':
    case 'cancelled':
    case 'refunded':
      return '#ef4444' // red
    default:
      return '#6b7280' // gray
  }
}
