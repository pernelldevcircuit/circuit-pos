'use client'

import { Transaction, formatCurrency, formatDate, getStatusColor } from '@/lib/transactions'

interface TransactionListProps {
  transactions: Transaction[]
  onSelectTransaction: (transaction: Transaction) => void
  loading?: boolean
}

export function TransactionList({ 
  transactions, 
  onSelectTransaction,
  loading = false 
}: TransactionListProps) {
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
        Loading transactions...
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>
          No transactions yet
        </div>
        <div style={{ fontSize: '14px', color: '#9ca3af' }}>
          Transactions will appear here once you start making sales
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      overflowX: 'auto',
      border: '1px solid #1f2937',
      borderRadius: '12px',
    }}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        fontSize: '14px',
      }}>
        <thead>
          <tr style={{ 
            background: '#111827',
            borderBottom: '1px solid #1f2937',
          }}>
            <th style={headerCellStyle}>Transaction #</th>
            <th style={headerCellStyle}>Date</th>
            <th style={headerCellStyle}>Status</th>
            <th style={headerCellStyle}>Payment</th>
            <th style={headerCellStyle}>Amount</th>
            <th style={headerCellStyle}>Method</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr
              key={txn.id}
              onClick={() => onSelectTransaction(txn)}
              style={{
                borderBottom: '1px solid #1f2937',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1f2937'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <td style={cellStyle}>
                <div style={{ fontWeight: 600, color: '#3b82f6' }}>
                  {txn.transaction_number}
                </div>
              </td>
              <td style={cellStyle}>
                <div style={{ color: '#d1d5db' }}>
                  {formatDate(txn.created_at)}
                </div>
              </td>
              <td style={cellStyle}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: `${getStatusColor(txn.status)}20`,
                  color: getStatusColor(txn.status),
                  textTransform: 'capitalize',
                }}>
                  {txn.status || 'pending'}
                </span>
              </td>
              <td style={cellStyle}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: `${getStatusColor(txn.payment_status)}20`,
                  color: getStatusColor(txn.payment_status),
                  textTransform: 'capitalize',
                }}>
                  {txn.payment_status || 'unpaid'}
                </span>
              </td>
              <td style={cellStyle}>
                <div style={{ fontWeight: 600, color: '#10b981', fontSize: '15px' }}>
                  {formatCurrency(txn.total)}
                </div>
              </td>
              <td style={cellStyle}>
                <div style={{ color: '#9ca3af', textTransform: 'capitalize' }}>
                  {txn.payment_method || 'N/A'}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const headerCellStyle: React.CSSProperties = {
  padding: '16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const cellStyle: React.CSSProperties = {
  padding: '16px',
  color: '#f9fafb',
}
