'use client';

import { useState, useMemo, useRef, useEffect, FormEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

type LineItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type ReceiptDelivery =
  | { type: 'print' }
  | { type: 'email'; contact: string }
  | { type: 'sms'; contact: string }
  | { type: 'none' };

type TransactionResult = {
  transactionId: string;
  amount: number;
  items: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  processingFee: number;
  receipt: ReceiptDelivery;
};

// ---------------- Payment Form (inside <Elements>) ----------------
function PaymentForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Validation failed');
      setSubmitting(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/pos`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed');
      setSubmitting(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess();
    } else {
      setError('Payment did not complete. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-4">
        <PaymentElement />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-medium rounded-lg transition"
        >
          Cancel
        </button>
        <button
          onClick={handlePay}
          disabled={submitting || !stripe || !elements}
          className="flex-[2] py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-purple-500/20 transition"
        >
          {submitting ? 'Processing...' : 'Complete Payment'}
        </button>
      </div>
    </div>
  );
}

// ---------------- Receipt Delivery Modal ----------------
type PendingTxn = Omit<TransactionResult, 'receipt'>;

function ReceiptDeliveryModal({
  onSelect,
}: {
  onSelect: (delivery: ReceiptDelivery) => void;
}) {
  const [mode, setMode] = useState<'choose' | 'email' | 'sms'>('choose');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode !== 'choose') inputRef.current?.focus();
  }, [mode]);

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }
    onSelect({ type: 'email', contact: trimmed });
  };

  const handleSmsSubmit = (e: FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    onSelect({ type: 'sms', contact: phone.trim() });
  };

  const options = [
    {
      key: 'print',
      label: 'Print',
      sublabel: 'Physical receipt',
      onClick: () => onSelect({ type: 'print' }),
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sublabel: 'Send to inbox',
      onClick: () => { setMode('email'); setError(null); },
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: 'sms',
      label: 'SMS',
      sublabel: 'Send by text',
      onClick: () => { setMode('sms'); setError(null); },
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      key: 'none',
      label: 'No Receipt',
      sublabel: 'Skip delivery',
      onClick: () => onSelect({ type: 'none' }),
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl p-6 md:p-8">
        {/* Success header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-3">
            <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Payment Approved</h2>
          <p className="text-gray-400 text-sm mt-1">
            How would you like your receipt?
          </p>
        </div>

        {mode === 'choose' && (
          <div className="grid grid-cols-2 gap-3">
            {options.map((opt) => (
              <button
                key={opt.key}
                onClick={opt.onClick}
                className="group relative flex flex-col items-center justify-center gap-2 p-5 bg-gray-950/50 hover:bg-gray-950/80 border border-gray-800 hover:border-purple-500/50 rounded-xl transition-all duration-200"
              >
                <div className="text-gray-400 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition">
                  {opt.icon}
                </div>
                <div className="text-white font-semibold">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.sublabel}</div>
              </button>
            ))}
          </div>
        )}

        {mode === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Email address
              </label>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="customer@example.com"
                className="w-full px-4 py-3 bg-gray-950/50 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                required
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setMode('choose'); setError(null); }}
                className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-[2] py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/20 transition"
              >
                Send Receipt
              </button>
            </div>
          </form>
        )}

        {mode === 'sms' && (
          <form onSubmit={handleSmsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Phone number
              </label>
              <input
                ref={inputRef}
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(null); }}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 bg-gray-950/50 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                required
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setMode('choose'); setError(null); }}
                className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-[2] py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/20 transition"
              >
                Send Receipt
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------- Main POS Page ----------------
export default function POSPage() {
  const [merchantId, setMerchantId] = useState('');

  // Item entry form
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');

  // Cart
  const [items, setItems] = useState<LineItem[]>([]);

  // Tax
  const [taxRate, setTaxRate] = useState('8');

  // Payment flow state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Receipt delivery flow
  const [pendingTxn, setPendingTxn] = useState<PendingTxn | null>(null);
  const [completed, setCompleted] = useState<TransactionResult | null>(null);

  // ---------- Totals ----------
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const taxPct = parseFloat(taxRate) || 0;
    const taxAmount = subtotal * (taxPct / 100);
    const total = subtotal + taxAmount;
    const processingFee = total > 0 ? total * 0.029 + 0.3 : 0;
    return { subtotal, taxPct, taxAmount, total, processingFee };
  }, [items, taxRate]);

  // ---------- Cart actions ----------
  const handleAddItem = (e: FormEvent) => {
    e.preventDefault();
    const name = itemName.trim();
    const qty = parseInt(itemQty, 10);
    const price = parseFloat(itemPrice);

    if (!name || !qty || qty < 1 || isNaN(price) || price < 0) return;

    setItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        quantity: qty,
        unitPrice: price,
      },
    ]);

    setItemName('');
    setItemQty('1');
    setItemPrice('');
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const buildDescription = (list: LineItem[]) =>
    list.map((i) => `${i.quantity}x ${i.name}`).join(', ');

  // ---------- Checkout: request clientSecret ----------
  const handleCheckout = async () => {
    setCheckoutError(null);

    if (!merchantId.trim()) {
      setCheckoutError('Merchant ID is required');
      return;
    }
    if (items.length === 0) {
      setCheckoutError('Add at least one item to the cart');
      return;
    }
    if (totals.total <= 0) {
      setCheckoutError('Total must be greater than zero');
      return;
    }

    setCheckoutLoading(true);

    try {
      const description = buildDescription(items);
      const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchantId.trim(),
          amount: Number(totals.total.toFixed(2)),
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }
      if (!data.clientSecret) {
        throw new Error('No client secret returned from server');
      }

      setClientSecret(data.clientSecret);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : 'Unexpected error'
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ---------- Payment success → stage pending txn, show receipt modal ----------
  const handlePaymentSuccess = () => {
    const secretPart = clientSecret?.split('_secret_')[0] || 'unknown';
    setPendingTxn({
      transactionId: secretPart,
      amount: totals.total,
      items: [...items],
      subtotal: totals.subtotal,
      taxRate: totals.taxPct,
      taxAmount: totals.taxAmount,
      total: totals.total,
      processingFee: totals.processingFee,
    });
    setClientSecret(null);
  };

  // ---------- Receipt delivery selected → finalize txn ----------
  const handleReceiptSelected = (delivery: ReceiptDelivery) => {
    if (!pendingTxn) return;
    const finalTxn: TransactionResult = { ...pendingTxn, receipt: delivery };
    setCompleted(finalTxn);
    setPendingTxn(null);

    // Fire the print dialog after the receipt view has had a chance to render
    if (delivery.type === 'print') {
      setTimeout(() => window.print(), 250);
    }
  };

  // ---------- Reset for new sale ----------
  const handleNewSale = () => {
    setItems([]);
    setItemName('');
    setItemQty('1');
    setItemPrice('');
    setTaxRate('8');
    setClientSecret(null);
    setPendingTxn(null);
    setCompleted(null);
    setCheckoutError(null);
  };

  // ---------- Receipt delivery note ----------
  const receiptNote = (receipt: ReceiptDelivery) => {
    switch (receipt.type) {
      case 'print':
        return { label: 'Receipt printed', tone: 'ok' as const };
      case 'email':
        return { label: `Receipt sent to: ${receipt.contact}`, tone: 'ok' as const };
      case 'sms':
        return { label: `Receipt sent to: ${receipt.contact}`, tone: 'ok' as const };
      case 'none':
        return { label: 'No receipt requested', tone: 'muted' as const };
    }
  };

  // ---------- Receipt view ----------
  if (completed) {
    const note = receiptNote(completed.receipt);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white">Payment Received</h1>
              <p className="text-gray-400 mt-1">Transaction complete</p>
            </div>

            {/* Delivery note */}
            <div
              className={`mb-5 p-3 rounded-lg border text-sm flex items-center gap-2 ${
                note.tone === 'ok'
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{note.label}</span>
            </div>

            <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-5 mb-5">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Transaction ID
              </div>
              <div className="text-sm text-gray-300 font-mono break-all">
                {completed.transactionId}
              </div>
            </div>

            <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-5 mb-5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Items
              </h2>
              <div className="divide-y divide-gray-800">
                {completed.items.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-center">
                    <div>
                      <div className="text-white">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {item.quantity} × ${item.unitPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-white font-medium">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-5 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-gray-200">${completed.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tax ({completed.taxRate}%)</span>
                <span className="text-gray-200">${completed.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Processing fee</span>
                <span className="text-gray-200">${completed.processingFee.toFixed(2)}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-gray-800 flex justify-between items-center">
                <span className="text-white font-semibold">Total Paid</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  ${completed.total.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={handleNewSale}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/20 transition print:hidden"
            >
              New Sale
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Main POS view ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              POS Terminal
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Ring up a sale and take payment
            </p>
          </div>
          <div className="w-full sm:w-80">
            <label
              htmlFor="merchantId"
              className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5"
            >
              Merchant ID
            </label>
            <input
              type="text"
              id="merchantId"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="mch_xxxxxxxxxx"
              className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Item entry + Cart */}
          <div className="lg:col-span-3 space-y-6">
            {/* Item entry */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Add Item</h2>
              <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Item name
                  </label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Coffee"
                    className="w-full px-3 py-2.5 bg-gray-950/50 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-950/50 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Unit price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2.5 bg-gray-950/50 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
                <div className="sm:col-span-12">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium rounded-lg transition"
                  >
                    + Add to cart
                  </button>
                </div>
              </form>
            </div>

            {/* Cart */}
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Cart</h2>
                <span className="text-sm text-gray-500">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No items yet. Add one above to get started.
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {items.map((item) => (
                    <div key={item.id} className="py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          {item.quantity} × ${item.unitPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-white font-medium">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={!!clientSecret}
                        className="text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition p-1"
                        aria-label={`Remove ${item.name}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Totals + Checkout */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl p-6 lg:sticky lg:top-6">
              <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>

              {/* Totals */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-gray-200">${totals.subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Tax rate</span>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        disabled={!!clientSecret}
                        className="w-16 pr-5 pl-2 py-1 text-right bg-gray-950/50 border border-gray-800 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                    </div>
                  </div>
                  <span className="text-gray-200">${totals.taxAmount.toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t border-gray-800">
                  <div className="flex justify-between items-baseline">
                    <span className="text-white font-semibold">Total due</span>
                    <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      ${totals.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 text-right">
                  Processing fee ~2.9% + $0.30 ≈ ${totals.processingFee.toFixed(2)}
                </div>
              </div>

              {checkoutError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {checkoutError}
                </div>
              )}

              {/* Checkout / Payment area */}
              {!clientSecret ? (
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || items.length === 0 || totals.total <= 0}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-purple-500/20 transition"
                >
                  {checkoutLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Preparing...
                    </span>
                  ) : (
                    `Charge $${totals.total.toFixed(2)}`
                  )}
                </button>
              ) : (
                <div className="pt-2 border-t border-gray-800">
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                      Payment details
                    </div>
                  </div>
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'night',
                        variables: {
                          colorPrimary: '#a855f7',
                          colorBackground: '#030712',
                          colorText: '#f3f4f6',
                        },
                      },
                    }}
                  >
                    <PaymentForm
                      clientSecret={clientSecret}
                      onSuccess={handlePaymentSuccess}
                      onCancel={() => {
                        setClientSecret(null);
                        setCheckoutError(null);
                      }}
                    />
                  </Elements>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt delivery modal (post-payment, pre-receipt) */}
      {pendingTxn && !completed && (
        <ReceiptDeliveryModal onSelect={handleReceiptSelected} />
      )}
    </div>
  );
}
