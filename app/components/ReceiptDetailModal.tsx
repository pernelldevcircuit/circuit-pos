'use client'

import { useEffect, useState } from 'react'
import { TransactionWithItems, formatCurrency, formatDate, getStatusColor } from '@/lib/transactions'

interface ReceiptDetailModalProps {
  transaction: TransactionWithItems | null
  onClose: () => void
}

export function ReceiptDetailModal({ transaction, onClose }: ReceiptDetailModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (transaction) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [transaction])

  if (!transaction) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          zIndex: 50,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${isVisible ? 1 : 0.95})`,
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '16px',
          padding: '32px',
          zIndex: 51,
          opacity: isVisible ? 1 : 0,
          transition: 'all 0.2s',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f9fafb', marginBottom: '8px' }}>
                Receipt
              </h2>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                {transaction.transaction_number}
              </div>
            </div>
            <button
              onClick={onClose}
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
              Close
            </button>
          </div>

          {/* Date & Status */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>
              {formatDate(transaction.created_at)}
            </div>
            <span style={{
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              background: `${getStatusColor(transaction.status)}20`,
              color: getStatusColor(transaction.status),
              textTransform: 'capitalize',
            }}>
              {transaction.status || 'pending'}
            </span>
            <span style={{
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              background: `${getStatusColor(transaction.payment_status)}20`,
              color: getStatusColor(transaction.payment_status),
              textTransform: 'capitalize',
            }}>
              {transaction.payment_status || 'unpaid'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#1f2937', marginBottom: '24px' }} />

        {/* Line Items */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
            Items
          </h3>
          {transaction.items.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
              No line items recorded
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {transaction.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '12px',
                    background: '#0a0a0a',
                    borderRadius: '8px',
                    border: '1px solid #1f2937',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#f9fafb', marginBottom: '4px' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                      Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                    </div>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#10b981', textAlign: 'right' }}>
                    {formatCurrency(item.total_price)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#1f2937', marginBottom: '24px' }} />

        {/* Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ color: '#9ca3af' }}>Subtotal</span>
            <span style={{ color: '#f9fafb', fontWeight: 500 }}>{formatCurrency(transaction.subtotal)}</span>
          </div>
          {transaction.tax !== null && transaction.tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#9ca3af' }}>Tax</span>
              <span style={{ color: '#f9fafb', fontWeight: 500 }}>{formatCurrency(transaction.tax)}</span>
            </div>
          )}
          {transaction.discount !== null && transaction.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#9ca3af' }}>Discount</span>
              <span style={{ color: '#ef4444', fontWeight: 500 }}>-{formatCurrency(transaction.discount)}</span>
            </div>
          )}
          <div style={{ height: '1px', background: '#1f2937', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700 }}>
            <span style={{ color: '#f9fafb' }}>Total</span>
            <span style={{ color: '#10b981' }}>{formatCurrency(transaction.total)}</span>
          </div>
        </div>

        {/* Payment Info */}
        {transaction.payment_method && (
          <>
            <div style={{ height: '1px', background: '#1f2937', margin: '24px 0' }} />
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                Payment Details
              </h3>
              <div style={{ fontSize: '14px', color: '#f9fafb' }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#9ca3af' }}>Method: </span>
                  <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{transaction.payment_method}</span>
                </div>
                {transaction.stripe_payment_intent_id && (
                  <div style={{ fontSize: '13px', color: '#6b7280', fontFamily: 'monospace' }}>
                    {transaction.stripe_payment_intent_id}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        {transaction.notes && (
          <>
            <div style={{ height: '1px', background: '#1f2937', margin: '24px 0' }} />
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                Notes
              </h3>
              <div style={{ fontSize: '14px', color: '#d1d5db', lineHeight: 1.6 }}>
                {transaction.notes}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
