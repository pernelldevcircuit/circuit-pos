'use client';

import { useState, useMemo, useRef, useEffect, FormEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// ── Stripe singleton ──────────────────────────────────────────────────────────
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

const stripeAppearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#2563eb",
    colorBackground: "#0d1117",
    colorText: "#e2e8f0",
    colorDanger: "#f87171",
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    borderRadius: "6px",
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
type LineItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type ReceiptDelivery =
  | { type: "print" }
  | { type: "email"; contact: string }
  | { type: "sms"; contact: string }
  | { type: "none" };

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

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

const uid = () => Math.random().toString(36).slice(2, 10);

function calcProcessingFee(total: number) {
  return total * 0.029 + 0.3;
}

// ── Shared UI primitives ──────────────────────────────────────────────────────
const inputCls =
  "w-full bg-[#0d1117] border border-[#1e2d45] rounded-md px-4 py-3.5 text-slate-100 text-sm " +
  "placeholder-slate-600 outline-none transition-all duration-150 font-mono " +
  "focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/50 hover:border-[#2a3f5f]";

const labelCls =
  "block text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className={labelCls}>{children}</label>;
}

function ErrorMsg({ msg }: { msg: string }) {
  return msg ? (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-md bg-red-500/8 border border-red-500/25 text-red-400 text-sm font-mono">
      <span className="text-base shrink-0">⚠</span>
      {msg}
    </div>
  ) : null;
}

// ── PaymentForm (inside context) ───────────────────────────────
interface PaymentFormProps {
  clientSecret: string;
  total: number;
  onSuccess: (txnId: string) => void;
  onCancel: () => void;
}

function PaymentForm({ total, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setPayError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setPayError(error.message ?? "Payment failed. Please try again.");
      setPaying(false);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      setPayError("Unexpected payment status. Please try again.");
      setPaying(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 p-6 bg-[#0d1117] border border-[#1e2d45] rounded-xl"
    >
      {/* Blue accent line at top */}
      <div className="h-px bg-gradient-to-r from-blue-600 via-blue-400 to-transparent -mx-6 -mt-6 mb-1 rounded-t-xl" />

      <PaymentElement />

      {payError && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-md bg-red-500/8 border border-red-500/25 text-red-400 text-sm font-mono">
          <span className="text-base shrink-0">⚠</span>
          {payError}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={paying}
          className="flex-1 px-4 py-3.5 rounded-lg border border-[#1e2d45] text-slate-400 text-sm font-semibold hover:bg-[#131d2e] hover:text-slate-200 hover:border-[#2a3f5f] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || paying}
          className="flex-[2] px-4 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-lg shadow-blue-900/40"
        >
          {paying ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block animate-spin">⏳</span>
              Processing…
            </span>
          ) : (
            `Complete Payment · ${fmt(total)}`
          )}
        </button>
      </div>
    </form>
  );
}

// ── Main POS Component ─────────────────────────────────────────────────────────
export default function CircuitPOS() {
  const [merchantId, setMerchantId] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");
  const [taxRate, setTaxRate] = useState("8.5");
  const [addError, setAddError] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState("");
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [receiptType, setReceiptType] = useState<"print" | "email" | "sms" | "none">("none");
  const [receiptContact, setReceiptContact] = useState("");

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [items]);
  const tax = useMemo(() => subtotal * (parseFloat(taxRate) || 0) / 100, [subtotal, taxRate]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);
  const processingFee = useMemo(() => calcProcessingFee(total), [total]);

  function addItem() {
    setAddError("");
    const name = itemName.trim();
    const qty = parseInt(itemQty, 10);
    const price = parseFloat(itemPrice);
    if (!name) return setAddError("Item name is required.");
    if (!qty || qty < 1) return setAddError("Quantity must be at least 1.");
    if (isNaN(price) || price <= 0) return setAddError("Enter a valid price greater than $0.");
    setItems(prev => [...prev, { id: uid(), name, quantity: qty, unitPrice: price }]);
    setItemName("");
    setItemQty("1");
    setItemPrice("");
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function startCheckout() {
    setIntentError("");
    setLoadingIntent(true);
    try {
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(total * 100), merchantId }),
      });
      if (!res.ok) throw new Error("Failed to create payment intent.");
      const { clientSecret } = await res.json();
      setClientSecret(clientSecret);
    } catch (e: any) {
      setIntentError(e.message ?? "Something went wrong.");
    } finally {
      setLoadingIntent(false);
    }
  }

  function handleSuccess(txnId: string) {
    const receipt: ReceiptDelivery =
      receiptType === "print" ? { type: "print" } :
      receiptType === "email" ? { type: "email", contact: receiptContact } :
      receiptType === "sms" ? { type: "sms", contact: receiptContact } :
      { type: "none" };

    setResult({
      transactionId: txnId,
      amount: total,
      items,
      subtotal,
      taxRate: parseFloat(taxRate) || 0,
      taxAmount: tax,
      total,
      processingFee,
      receipt,
    });
    setClientSecret(null);
  }

  function reset() {
    setItems([]);
    setResult(null);
    setClientSecret(null);
    setReceiptType("none");
    setReceiptContact("");
    setIntentError("");
    setAddError("");
  }

  // ── Success View ─────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-[#080c12] font-mono flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Success card */}
          <div className="bg-[#0d1117] border border-[#1e2d45] rounded-2xl overflow-hidden">
            {/* Top accent */}
            <div className="h-1 bg-gradient-to-r from-blue-600 to-cyan-400" />

            <div className="p-8">
              {/* Icon + status */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-blue-600/15 border border-blue-500/30 flex items-center justify-center mb-4">
                  <span className="text-2xl">✓</span>
                </div>
                <h2 className="text-xl font-bold text-slate-100 tracking-tight">Payment Confirmed</h2>
                <p className="text-slate-500 text-sm mt-1">Transaction processed successfully</p>
              </div>

              {/* Amount */}
              <div className="text-center mb-8">
                <div className="text-4xl font-bold text-blue-400 tracking-tight">{fmt(result.total)}</div>
              </div>

              {/* Details grid */}
              <div className="space-y-1 mb-8">
                {[
                  ["Transaction ID", result.transactionId.slice(0, 20) + "…"],
                  ["Subtotal", fmt(result.subtotal)],
                  [`Tax (${result.taxRate}%)`, fmt(result.taxAmount)],
                  ["Processing Fee", fmt(result.processingFee)],
                  ["Receipt", result.receipt.type === "none" ? "None" :
                    result.receipt.type === "print" ? "Print" :
                    `${result.receipt.type.toUpperCase()} · ${'contact' in result.receipt ? result.receipt.contact : ''}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-2.5 border-b border-[#131d2e] last:border-0">
                    <span className="text-[11px] text-slate-500 uppercase tracking-widest">{label}</span>
                    <span className="text-sm text-slate-300 font-mono">{value}</span>
                  </div>
                ))}
              </div>

              {/* Items */}
              <div className="mb-8">
                <div className={labelCls}>Items ({result.items.length})</div>
                <div className="space-y-1.5">
                  {result.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-[#0a0f18] rounded-md">
                      <span className="text-sm text-slate-300">{item.name} <span className="text-slate-600">×{item.quantity}</span></span>
                      <span className="text-sm text-slate-400">{fmt(item.quantity * item.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={reset}
                className="w-full py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold tracking-wide transition-all duration-150 shadow-lg shadow-blue-900/30"
              >
                New Transaction
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main POS View ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080c12] font-mono text-slate-200">
      {/* Header */}
      <header className="border-b border-[#1e2d45] bg-[#0a0f18]/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-xs font-black text-white">C</span>
            </div>
            <span className="text-sm font-bold tracking-widest text-slate-200 uppercase">Circuit</span>
            <span className="text-[10px] text-slate-600 tracking-widest uppercase border border-[#1e2d45] px-2 py-0.5 rounded">POS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-600 uppercase tracking-widest">Merchant</span>
            <input
              value={merchantId}
              onChange={e => setMerchantId(e.target.value)}
              placeholder="MID-000000"
              className="bg-[#0d1117] border border-[#1e2d45] rounded px-3 py-1.5 text-xs text-slate-300 placeholder-slate-700 outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/40 w-36 transition-all duration-150"
            />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

        {/* ── Left column: Add item + Cart ── */}
        <div className="space-y-5">

          {/* Add Item Card */}
          <div className="bg-[#0d1117] border border-[#1e2d45] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#131d2e] flex items-center gap-3">
              <div className="w-1.5 h-4 rounded-full bg-blue-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Add Item</span>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_auto] gap-3 items-end">
              <div>
                <FieldLabel>Item Name</FieldLabel>
                <input
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addItem()}
                  placeholder="Product or service"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Qty</FieldLabel>
                <input
                  type="number"
                  min="1"
                  value={itemQty}
                  onChange={e => setItemQty(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Unit Price</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemPrice}
                  onChange={e => setItemPrice(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addItem()}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <button
                onClick={addItem}
                className="h-[46px] px-5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold tracking-wide transition-all duration-150 shadow-md shadow-blue-900/30 whitespace-nowrap"
              >
                + Add
              </button>
            </div>
            {addError && (
              <div className="px-6 pb-5">
                <ErrorMsg msg={addError} />
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="bg-[#0d1117] border border-[#1e2d45] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#131d2e] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-4 rounded-full bg-cyan-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Cart</span>
              </div>
              {items.length > 0 && (
                <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="w-10 h-10 rounded-xl bg-[#131d2e] flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg opacity-40">🛒</span>
                </div>
                <p className="text-slate-600 text-sm">No items added yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#0f1825]">
                {items.map((item, idx) => (
                  <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[#0a0f18] transition-colors duration-100 group">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-[10px] text-slate-700 w-5 text-right shrink-0 font-bold">{idx + 1}</span>
                      <div className="min-w-0">
                        <div className="text-sm text-slate-200 font-medium truncate">{item.name}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{fmt(item.unitPrice)} × {item.quantity}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-sm font-bold text-slate-300">{fmt(item.quantity * item.unitPrice)}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column: Totals + Checkout ── */}
        <div className="space-y-5">

          {/* Tax Rate */}
          <div className="bg-[#0d1117] border border-[#1e2d45] rounded-xl p-5">
            <FieldLabel>Tax Rate (%)</FieldLabel>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={taxRate}
              onChange={e => setTaxRate(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Totals */}
          <div className="bg-[#0d1117] border border-[#1e2d45] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#131d2e] flex items-center gap-3">
              <div className="w-1.5 h-4 rounded-full bg-blue-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Summary</span>
            </div>
            <div className="p-5 space-y-2">
              {[
                ["Subtotal", fmt(subtotal)],
                [`Tax (${parseFloat(taxRate) || 0}%)`, fmt(tax)],
                ["Processing Fee", fmt(processingFee)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-1.5">
                  <span className="text-xs text-slate-500 uppercase tracking-widest">{label}</span>
                  <span className="text-sm text-slate-400">{value}</span>
                </div>
              ))}

              <div className="!mt-4 pt-4 border-t border-[#1e2d45]">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Total</span>
                  <span className="text-2xl font-black text-blue-400 tracking-tight">{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt */}
          <div className="bg-[#0d1117] border border-[#1e2d45] rounded-xl p-5">
            <FieldLabel>Receipt Delivery</FieldLabel>
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {(["none", "print", "email", "sms"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setReceiptType(type)}
                  className={`py-2 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all duration-150 ${
                    receiptType === type
                      ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                      : "bg-[#0a0f18] text-slate-500 border border-[#1e2d45] hover:text-slate-300 hover:border-[#2a3f5f]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {(receiptType === "email" || receiptType === "sms") && (
              <div>
                <FieldLabel>{receiptType === "email" ? "Email Address" : "Phone Number"}</FieldLabel>
                <input
                  value={receiptContact}
                  onChange={e => setReceiptContact(e.target.value)}
                  placeholder={receiptType === "email" ? "customer@email.com" : "+1 (555) 000-0000"}
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {/* Checkout button */}
          {!clientSecret ? (
            <div className="space-y-3">
              {intentError && <ErrorMsg msg={intentError} />}
              <button
                onClick={startCheckout}
                disabled={items.length === 0 || loadingIntent || total <= 0}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 shadow-xl shadow-blue-900/40"
              >
                {loadingIntent ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block animate-spin">⏳</span>
                    Initializing…
                  </span>
                ) : (
                  `Charge ${fmt(total)}`
                )}
              </button>
            </div>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
              <PaymentForm
                clientSecret={clientSecret}
                total={total}
                onSuccess={handleSuccess}
                onCancel={() => setClientSecret(null)}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
