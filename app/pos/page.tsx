'use client';

import { useState, useMemo, useRef, useEffect, FormEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';"use client";

/**
 * Circuit POS — Terminal Page
 * Path: app/pos/page.tsx  (or pages/pos.tsx for Pages Router)
 *
 * Dependencies:
 *   npm install @stripe/stripe-js @stripe/react-stripe-js
 *
 * Environment variables:
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
 *
 * API route expected at POST /api/process-payment:
 *   Body:    { merchantId: string; amount: number; description: string }
 *   Returns: { clientSecret: string }
 */

import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  FormEvent,
} from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// ── Stripe singleton ──────────────────────────────────────────────────────────
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

const stripeAppearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#a855f7",
    colorBackground: "#030712",
    colorText: "#f3f4f6",
    colorDanger: "#f87171",
    fontFamily: "ui-monospace, monospace",
    borderRadius: "8px",
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
  "w-full bg-gray-950/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm " +
  "placeholder-gray-600 outline-none transition-all duration-200 " +
  "focus:ring-2 focus:ring-purple-500 focus:border-purple-500/60";

const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className={labelCls}>{children}</label>;
}

function ErrorMsg({ msg }: { msg: string }) {
  return msg ? (
    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">⚠ {msg}</p>
  ) : null;
}

// ── PaymentForm (inside <Elements> context) ───────────────────────────────────
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

  async function handleSubmit(e: FormEvent) {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
          fields: { billingDetails: { name: "auto" } },
        }}
      />

      {payError && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          ⚠ {payError}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={paying}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-400 border border-gray-700
                     hover:border-gray-600 hover:text-gray-200 transition-all duration-200 disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={paying || !stripe}
          className="flex-[2] py-3 rounded-xl text-sm font-bold text-white
                     bg-gradient-to-r from-purple-600 to-pink-600
                     hover:from-purple-500 hover:to-pink-500
                     shadow-lg shadow-purple-900/40 transition-all duration-200
                     disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {paying ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing…
            </>
          ) : (
            `Complete Payment · ${fmt(total)}`
          )}
        </button>
      </div>
    </form>
  );
}

// ── ReceiptDeliveryModal ──────────────────────────────────────────────────────
interface ReceiptDeliveryModalProps {
  total: number;
  onSelect: (delivery: ReceiptDelivery) => void;
}

type ModalMode = "choose" | "email" | "sms";

function ReceiptDeliveryModal({ total, onSelect }: ReceiptDeliveryModalProps) {
  const [mode, setMode] = useState<ModalMode>("choose");
  const [contact, setContact] = useState("");
  const [contactError, setContactError] = useState("");

  function handleEmailSubmit() {
    const trimmed = contact.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setContactError("Enter a valid email address.");
      return;
    }
    onSelect({ type: "email", contact: trimmed });
  }

  function handleSmsSubmit() {
    const trimmed = contact.trim();
    if (!/^\+?[\d\s\-().]{7,}$/.test(trimmed)) {
      setContactError("Enter a valid phone number.");
      return;
    }
    onSelect({ type: "sms", contact: trimmed });
  }

  function handleModeChange(m: ModalMode) {
    setMode(m);
    setContact("");
    setContactError("");
  }

  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    >
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-5 text-center border-b border-gray-800">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Payment Approved</h2>
          <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            {fmt(total)}
          </p>
        </div>

        <div className="px-6 pb-6 pt-5">
          {mode === "choose" && (
            <>
              <p className="text-sm text-gray-400 text-center mb-5">How would you like to send the receipt?</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Print",
                    icon: (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2m-2 0v4H8v-4h8z" />
                      </svg>
                    ),
                    action: () => onSelect({ type: "print" }),
                  },
                  {
                    label: "Email",
                    icon: (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ),
                    action: () => handleModeChange("email"),
                  },
                  {
                    label: "SMS",
                    icon: (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    ),
                    action: () => handleModeChange("sms"),
                  },
                  {
                    label: "No Receipt",
                    icon: (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ),
                    action: () => onSelect({ type: "none" }),
                  },
                ].map(({ label, icon, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl
                               bg-gray-800/60 border border-gray-700 text-gray-300
                               hover:bg-gray-700/60 hover:border-gray-600 hover:text-white
                               transition-all duration-200 group"
                  >
                    <span className="text-gray-400 group-hover:text-purple-400 transition-colors">{icon}</span>
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {(mode === "email" || mode === "sms") && (
            <div className="space-y-4">
              <button
                onClick={() => handleModeChange("choose")}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div>
                <FieldLabel>{mode === "email" ? "Email Address" : "Phone Number"}</FieldLabel>
                <input
                  type={mode === "email" ? "email" : "tel"}
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                    setContactError("");
                  }}
                  placeholder={mode === "email" ? "customer@email.com" : "+1 (555) 000-0000"}
                  className={inputCls}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      mode === "email" ? handleEmailSubmit() : handleSmsSubmit();
                    }
                  }}
                />
                <ErrorMsg msg={contactError} />
              </div>

              <button
                onClick={mode === "email" ? handleEmailSubmit : handleSmsSubmit}
                className="w-full py-3 rounded-xl text-sm font-bold text-white
                           bg-gradient-to-r from-purple-600 to-pink-600
                           hover:from-purple-500 hover:to-pink-500
                           shadow-lg shadow-purple-900/40 transition-all duration-200"
              >
                Send Receipt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Receipt Success View ───────────────────────────────────────────────────────
interface ReceiptViewProps {
  txn: TransactionResult;
  onNewSale: () => void;
}

function ReceiptView({ txn, onNewSale }: ReceiptViewProps) {
  const receiptMsg =
    txn.receipt.type === "print"
      ? "Receipt printed"
      : txn.receipt.type === "email"
      ? `Receipt emailed to ${txn.receipt.contact}`
      : txn.receipt.type === "sms"
      ? `Receipt sent via SMS to ${txn.receipt.contact}`
      : "No receipt sent";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Green success header */}
          <div className="px-6 py-8 text-center border-b border-gray-800">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/40
                            flex items-center justify-center mb-5 shadow-lg shadow-green-500/10">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-1">Transaction Complete</h1>
            <p className="text-sm text-gray-500 font-mono">{txn.transactionId}</p>
          </div>

          {/* Items */}
          <div className="px-6 py-4 border-b border-gray-800 space-y-2">
            {txn.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-300">
                  {item.name}{" "}
                  <span className="text-gray-600">×{item.quantity}</span>
                </span>
                <span className="text-gray-300 tabular-nums">
                  {fmt(item.quantity * item.unitPrice)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals breakdown */}
          <div className="px-6 py-4 space-y-2 border-b border-gray-800">
            {[
              { label: "Subtotal", value: txn.subtotal },
              { label: `Tax (${(txn.taxRate * 100).toFixed(1)}%)`, value: txn.taxAmount },
              { label: "Processing Fee", value: txn.processingFee },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-400 tabular-nums">{fmt(value)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-gray-800">
              <span className="font-bold text-white">Total</span>
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 tabular-nums text-lg">
                {fmt(txn.total)}
              </span>
            </div>
          </div>

          {/* Receipt confirmation */}
          <div className="px-6 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2 text-sm text-green-400">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {receiptMsg}
            </div>
          </div>

          {/* New sale */}
          <div className="px-6 py-5">
            <button
              onClick={onNewSale}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white
                         bg-gradient-to-r from-purple-600 to-pink-600
                         hover:from-purple-500 hover:to-pink-500
                         shadow-lg shadow-purple-900/40 transition-all duration-200
                         hover:-translate-y-px"
            >
              ⚡ New Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main POS Page ─────────────────────────────────────────────────────────────
export default function POSPage() {
  // ── Form state
  const [merchantId, setMerchantId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");
  const [formError, setFormError] = useState("");

  // ── Cart
  const [items, setItems] = useState<LineItem[]>([]);
  const [taxRate, setTaxRate] = useState("8");

  // ── Payment
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // ── Receipt flow
  const [pendingTxn, setPendingTxn] = useState<Omit<TransactionResult, "receipt"> | null>(null);
  const [completed, setCompleted] = useState<TransactionResult | null>(null);

  const itemNameRef = useRef<HTMLInputElement>(null);

  // ── Calculations
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [items]
  );

  const taxRateDecimal = useMemo(() => {
    const parsed = parseFloat(taxRate);
    return isNaN(parsed) ? 0 : parsed / 100;
  }, [taxRate]);

  const taxAmount = useMemo(() => subtotal * taxRateDecimal, [subtotal, taxRateDecimal]);
  const grandTotal = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);
  const processingFee = useMemo(() => calcProcessingFee(grandTotal), [grandTotal]);
  const chargeTotal = useMemo(() => grandTotal, [grandTotal]);

  // ── Add item to cart
  function handleAddItem(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    const name = itemName.trim();
    const qty = parseInt(itemQty, 10);
    const price = parseFloat(itemPrice);

    if (!name) { setFormError("Item name is required."); return; }
    if (isNaN(qty) || qty < 1) { setFormError("Quantity must be at least 1."); return; }
    if (isNaN(price) || price <= 0) { setFormError("Enter a valid unit price."); return; }

    setItems((prev) => {
      const existing = prev.find(
        (i) => i.name.toLowerCase() === name.toLowerCase() && i.unitPrice === price
      );
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { id: uid(), name, quantity: qty, unitPrice: price }];
    });

    setItemName("");
    setItemQty("1");
    setItemPrice("");
    itemNameRef.current?.focus();
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // ── Initiate checkout
  async function handleCharge() {
    if (!merchantId.trim()) {
      setCheckoutError("Merchant ID is required before charging.");
      return;
    }
    if (items.length === 0) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    const description = items.map((i) => `${i.quantity}× ${i.name}`).join(", ");
    const amountCents = Math.round(chargeTotal * 100);

    try {
      const res = await fetch("/api/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: merchantId.trim(),
          amount: amountCents,
          description,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Server error ${res.status}`);
      }

      const { clientSecret: cs } = await res.json();
      if (!cs) throw new Error("No client secret returned from server.");
      setClientSecret(cs);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Failed to initiate payment.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  // ── Payment succeeded
  function handlePaymentSuccess(txnId: string) {
    setPendingTxn({
      transactionId: txnId,
      amount: chargeTotal,
      items: [...items],
      subtotal,
      taxRate: taxRateDecimal,
      taxAmount,
      total: chargeTotal,
      processingFee,
    });
    setClientSecret(null);
  }

  // ── Cancel payment
  function handleCancelPayment() {
    setClientSecret(null);
    setCheckoutError(null);
  }

  // ── Receipt selected
  function handleReceiptSelect(delivery: ReceiptDelivery) {
    if (!pendingTxn) return;

    const fullTxn: TransactionResult = { ...pendingTxn, receipt: delivery };
    setCompleted(fullTxn);
    setPendingTxn(null);

    if (delivery.type === "print") {
      setTimeout(() => window.print(), 250);
    }
  }

  // ── Reset
  function handleNewSale() {
    setMerchantId("");
    setItemName("");
    setItemQty("1");
    setItemPrice("");
    setFormError("");
    setItems([]);
    setTaxRate("8");
    setClientSecret(null);
    setCheckoutLoading(false);
    setCheckoutError(null);
    setPendingTxn(null);
    setCompleted(null);
  }

  // ── Keyboard shortcut: Enter on item form
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "F1") {
        e.preventDefault();
        itemNameRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const canCharge = items.length > 0 && merchantId.trim().length > 0 && !checkoutLoading;

  // ── Completed receipt view
  if (completed) {
    return <ReceiptView txn={completed} onNewSale={handleNewSale} />;
  }

  return (
    <>
      {/* Receipt delivery modal (after payment succeeds, before receipt choice) */}
      {pendingTxn && (
        <ReceiptDeliveryModal total={pendingTxn.total} onSelect={handleReceiptSelect} />
      )}

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
        {/* ── Header ── */}
        <header className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600
                            flex items-center justify-center shadow-lg shadow-purple-900/40 shrink-0"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight text-white">Circuit POS</div>
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Terminal v1</div>
              </div>
            </div>

            {/* Merchant ID field in header */}
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <label className="text-xs text-gray-500 uppercase tracking-widest shrink-0 hidden sm:block">
                Merchant ID
              </label>
              <input
                type="text"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                placeholder="Enter Merchant ID…"
                className="flex-1 bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2
                           text-white text-xs placeholder-gray-600 outline-none
                           focus:ring-2 focus:ring-purple-500 focus:border-purple-500/60
                           transition-all duration-200 font-mono"
              />
              {merchantId && (
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0 shadow shadow-green-400/50" />
              )}
            </div>

            <div className="text-xs text-gray-600 font-mono hidden lg:block shrink-0">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
        </header>

        {/* ── Main layout ── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left: Item entry + Cart (spans 2 cols on desktop) ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Item Entry Form */}
              <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl p-5">
                <h2 className="text-sm font-bold text-gray-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </h2>

                <form onSubmit={handleAddItem} className="space-y-4">
                  <div>
                    <FieldLabel>Item Name</FieldLabel>
                    <input
                      ref={itemNameRef}
                      type="text"
                      value={itemName}
                      onChange={(e) => { setItemName(e.target.value); setFormError(""); }}
                      placeholder="e.g. Cold Brew Coffee"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Quantity</FieldLabel>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={itemQty}
                        onChange={(e) => { setItemQty(e.target.value); setFormError(""); }}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <FieldLabel>Unit Price</FieldLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">$</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={itemPrice}
                          onChange={(e) => { setItemPrice(e.target.value); setFormError(""); }}
                          placeholder="0.00"
                          className={`${inputCls} pl-7`}
                        />
                      </div>
                    </div>
                  </div>

                  <ErrorMsg msg={formError} />

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white
                               bg-gradient-to-r from-purple-600 to-pink-600
                               hover:from-purple-500 hover:to-pink-500
                               shadow-lg shadow-purple-900/40 transition-all duration-200"
                  >
                    Add to Cart
                  </button>
                </form>
              </div>

              {/* Cart */}
              <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6" />
                    </svg>
                    Cart
                  </h2>
                  {items.length > 0 && (
                    <span className="text-xs text-gray-500 font-mono">
                      {items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <svg className="w-10 h-10 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6" />
                    </svg>
                    <p className="text-sm text-gray-600">No items added yet.</p>
                    <p className="text-xs text-gray-700 mt-1">Use the form above to add items to the cart.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800/60">
                    {items.map((item) => (
                      <div key={item.id} className="px-5 py-3.5 flex items-center gap-3 group hover:bg-gray-800/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{item.name}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">
                            {item.quantity} × {fmt(item.unitPrice)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-bold text-gray-200 tabular-nums">
                            {fmt(item.quantity * item.unitPrice)}
                          </span>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center
                                       text-gray-600 hover:text-red-400 hover:bg-red-500/10
                                       transition-all duration-200 opacity-0 group-hover:opacity-100"
                            aria-label={`Remove ${item.name}`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Totals + Checkout Panel ── */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
              <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Totals */}
                <div className="px-5 py-4 border-b border-gray-800">
                  <h2 className="text-sm font-bold text-gray-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Order Total
                  </h2>

                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Subtotal</span>
                      <span className="text-gray-200 tabular-nums font-mono">{fmt(subtotal)}</span>
                    </div>

                    {/* Tax rate input */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-400 text-sm shrink-0">Tax</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={taxRate}
                          onChange={(e) => setTaxRate(e.target.value)}
                          className="w-16 bg-gray-950/50 border border-gray-800 rounded-md px-2 py-1
                                     text-white text-xs text-right font-mono outline-none
                                     focus:ring-1 focus:ring-purple-500 focus:border-purple-500/60
                                     transition-all duration-200"
                        />
                        <span className="text-gray-500 text-xs">%</span>
                        <span className="text-gray-200 tabular-nums font-mono text-sm ml-1">
                          {fmt(taxAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs pt-1 border-t border-gray-800/60">
                      <span className="text-gray-600">Processing fee (est.)</span>
                      <span className="text-gray-600 tabular-nums font-mono">{fmt(processingFee)}</span>
                    </div>
                  </div>

                  {/* Grand total */}
                  <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-white">Grand Total</span>
                    <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 tabular-nums">
                      {fmt(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Checkout */}
                <div className="px-5 py-4">
                  {!clientSecret ? (
                    <>
                      {checkoutError && (
                        <div className="mb-3 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2.5 text-xs text-red-400">
                          ⚠ {checkoutError}
                        </div>
                      )}
                      <button
                        onClick={handleCharge}
                        disabled={!canCharge}
                        className="w-full py-3.5 rounded-xl text-sm font-bold text-white
                                   bg-gradient-to-r from-purple-600 to-pink-600
                                   hover:from-purple-500 hover:to-pink-500
                                   shadow-lg shadow-purple-900/40 transition-all duration-200
                                   disabled:opacity-40 disabled:cursor-not-allowed
                                   hover:enabled:-translate-y-px
                                   flex items-center justify-center gap-2"
                      >
                        {checkoutLoading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Preparing…
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Charge {items.length > 0 ? fmt(grandTotal) : "—"}
                          </>
                        )}
                      </button>

                      {!merchantId.trim() && (
                        <p className="text-[11px] text-gray-600 text-center mt-2">
                          Enter Merchant ID above to enable charging
                        </p>
                      )}
                      {items.length === 0 && merchantId.trim() && (
                        <p className="text-[11px] text-gray-600 text-center mt-2">
                          Add items to the cart to enable charging
                        </p>
                      )}
                    </>
                  ) : (
                    <Elements
                      stripe={stripePromise}
                      options={{ clientSecret, appearance: stripeAppearance }}
                    >
                      <PaymentForm
                        clientSecret={clientSecret}
                        total={grandTotal}
                        onSuccess={handlePaymentSuccess}
                        onCancel={handleCancelPayment}
                      />
                    </Elements>
                  )}
                </div>
              </div>

              {/* Keyboard hint */}
              <p className="text-[11px] text-gray-700 text-center font-mono">
                Press F1 to focus item name field
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

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
