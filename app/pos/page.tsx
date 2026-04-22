'use client';

import { useState, useMemo, useEffect, FormEvent } from 'react';
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

function buildStripeAppearance(dark: boolean) {
  return {
    theme: (dark ? "night" : "flat") as "night" | "flat",
    variables: {
      colorPrimary: dark ? "#60a5fa" : "#1d4ed8",
      colorBackground: dark ? "#1e2530" : "#ffffff",
      colorText: dark ? "#f1f5f9" : "#111827",
      colorDanger: dark ? "#f87171" : "#dc2626",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      borderRadius: "10px",
      spacingUnit: "5px",
    },
    rules: (dark
      ? {
          ".Input": {
            border: "1.5px solid #334155",
            boxShadow: "none",
            padding: "14px 16px",
            fontSize: "15px",
            backgroundColor: "#0f1623",
            color: "#f1f5f9",
          },
          ".Input:focus": {
            border: "1.5px solid #60a5fa",
            boxShadow: "0 0 0 3px rgba(96,165,250,0.15)",
          },
          ".Label": {
            fontSize: "11px",
            fontWeight: "600",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            color: "#94a3b8",
            marginBottom: "6px",
          },
        }
      : {
          ".Input": {
            border: "1.5px solid #e5e7eb",
            boxShadow: "none",
            padding: "14px 16px",
            fontSize: "15px",
          },
          ".Input:focus": {
            border: "1.5px solid #1d4ed8",
            boxShadow: "0 0 0 3px rgba(29,78,216,0.12)",
          },
          ".Label": {
            fontSize: "11px",
            fontWeight: "600",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            color: "#6b7280",
            marginBottom: "6px",
          },
        }
    ) as any,
  };
}

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
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const uid = () => Math.random().toString(36).slice(2, 10);

function calcProcessingFee(total: number) {
  return total * 0.029 + 0.3;
}

// ── Theme token maps ──────────────────────────────────────────────────────────
const LIGHT = {
  page:            "bg-gray-50 text-gray-900",
  header:          "bg-white border-gray-100",
  card:            "bg-white border-gray-200 shadow-sm",
  cardHdr:         "border-gray-100",
  cardHdrTxt:      "text-gray-400",
  input:           "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-700/10 focus:border-blue-700",
  label:           "text-gray-500",
  rowBorder:       "border-gray-100",
  subtleText:      "text-gray-500",
  mutedText:       "text-gray-300",
  itemBadge:       "bg-gray-100 text-gray-400",
  emptyBg:         "bg-gray-100",
  removeBtn:       "bg-red-50 text-red-400 hover:bg-red-100 active:bg-red-200",
  totalLabel:      "text-gray-900",
  totalAmt:        "text-blue-700",
  pillActive:      "bg-blue-700 border-blue-700 text-white shadow-md shadow-blue-700/20",
  pillInactive:    "bg-white border-gray-200 text-gray-600 hover:border-gray-300 active:bg-gray-50",
  tapCard:         "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100",
  tapIcon:         "bg-blue-700",
  tapBadge:        "text-blue-700 bg-blue-100",
  tapTitle:        "text-gray-900",
  tapBody:         "text-gray-500",
  tapSub:          "text-gray-700",
  tapDivider:      "border-blue-100",
  tapFooter:       "text-blue-600",
  stickyPanel:     "bg-white border-gray-200",
  stickyTotal:     "text-blue-700",
  stickyLabel:     "text-gray-500",
  ctaPrimary:      "bg-blue-700 hover:bg-blue-600 active:bg-blue-800 shadow-xl shadow-blue-700/25",
  ctaPrimaryMob:   "bg-blue-700 hover:bg-blue-600 active:bg-blue-800 shadow-lg shadow-blue-700/25",
  cancelBtn:       "border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100",
  addItemBtn:      "bg-gray-900 hover:bg-gray-800 active:bg-gray-950 text-white",
  backBtn:         "text-blue-700",
  merchantInput:   "bg-gray-50 border-gray-200 text-gray-700 placeholder-gray-400 focus:ring-blue-700/10 focus:border-blue-700",
  summaryFooterBg: "bg-gray-50 border-gray-100",
  successTitle:    "text-gray-900",
  successIconBg:   "bg-emerald-50 border-emerald-200",
  successTotalColor: "text-gray-900",
};

const DARK = {
  page:            "bg-[#0b0f18] text-slate-100",
  header:          "bg-[#111827] border-slate-700/60",
  card:            "bg-[#161d2b] border-slate-700/50 shadow-none",
  cardHdr:         "border-slate-700/50",
  cardHdrTxt:      "text-slate-500",
  input:           "bg-[#0f1623] border-slate-600 text-slate-100 placeholder-slate-600 focus:ring-blue-400/15 focus:border-blue-400",
  label:           "text-slate-400",
  rowBorder:       "border-slate-700/40",
  subtleText:      "text-slate-400",
  mutedText:       "text-slate-600",
  itemBadge:       "bg-slate-700 text-slate-400",
  emptyBg:         "bg-slate-800",
  removeBtn:       "bg-red-900/30 text-red-400 hover:bg-red-900/60 active:bg-red-900/80",
  totalLabel:      "text-slate-100",
  totalAmt:        "text-blue-400",
  pillActive:      "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-900/30",
  pillInactive:    "bg-[#0f1623] border-slate-600 text-slate-400 hover:border-slate-500 active:bg-slate-800",
  tapCard:         "bg-[#111d35] border-blue-800/50",
  tapIcon:         "bg-blue-600",
  tapBadge:        "text-blue-300 bg-blue-900/50",
  tapTitle:        "text-slate-100",
  tapBody:         "text-slate-400",
  tapSub:          "text-slate-200",
  tapDivider:      "border-blue-800/40",
  tapFooter:       "text-blue-400",
  stickyPanel:     "bg-[#111827] border-slate-700/60",
  stickyTotal:     "text-blue-400",
  stickyLabel:     "text-slate-400",
  ctaPrimary:      "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-xl shadow-blue-900/40",
  ctaPrimaryMob:   "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-900/40",
  cancelBtn:       "border-slate-600 text-slate-300 hover:bg-slate-800 active:bg-slate-700",
  addItemBtn:      "bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-100",
  backBtn:         "text-blue-400",
  merchantInput:   "bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-600 focus:ring-blue-400/10 focus:border-blue-400",
  summaryFooterBg: "bg-[#0f1623] border-slate-700/50",
  successTitle:    "text-slate-100",
  successIconBg:   "bg-emerald-900/30 border-emerald-700",
  successTotalColor: "text-slate-100",
};

type Tokens = typeof LIGHT;

// ── Receipt icon helpers ──────────────────────────────────────────────────────
const receiptIcons: Record<string, React.ReactNode> = {
  none: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  print: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4H9v4a1 1 0 001 1zm2-13V3H9v4" />
    </svg>
  ),
  email: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  sms: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
};

const receiptLabels: Record<string, string> = {
  none:  "No Receipt",
  print: "Print",
  email: "Email",
  sms:   "Text / SMS",
};

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}

// ── Theme Toggle ──────────────────────────────────────────────────────────────
function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative w-[52px] h-[28px] rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 shrink-0
        ${dark
          ? "bg-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
          : "bg-gray-200 focus:ring-blue-700 focus:ring-offset-white"
        }`}
    >
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] leading-none select-none pointer-events-none">🌙</span>
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] leading-none select-none pointer-events-none">☀️</span>
      <span
        className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-sm transition-all duration-300
          ${dark ? "left-[26px]" : "left-[3px]"}`}
      />
    </button>
  );
}

// ── Error Banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth="2" />
        <path strokeLinecap="round" d="M12 8v4M12 16h.01" strokeWidth="2.5" />
      </svg>
      {msg}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ tk, children, className = "" }: { tk: Tokens; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border overflow-hidden ${tk.card} ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ tk, title, right }: { tk: Tokens; title: string; right?: React.ReactNode }) {
  return (
    <div className={`px-5 py-4 flex items-center justify-between border-b ${tk.cardHdr}`}>
      <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${tk.cardHdrTxt}`}>{title}</span>
      {right}
    </div>
  );
}

// ── Receipt Pills ─────────────────────────────────────────────────────────────
function ReceiptPills({
  tk, receiptType, onSelect, receiptContact, onContactChange,
}: {
  tk: Tokens;
  receiptType: "print" | "email" | "sms" | "none";
  onSelect: (t: "print" | "email" | "sms" | "none") => void;
  receiptContact: string;
  onContactChange: (v: string) => void;
}) {
  const labelCls = `block text-[11px] font-semibold uppercase tracking-[0.08em] mb-2 ${tk.label}`;
  const inputCls = `w-full rounded-xl px-4 py-4 text-[15px] border-[1.5px] outline-none transition-all duration-150 min-h-[52px] focus:ring-[3px] ${tk.input}`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        {(["none", "print", "email", "sms"] as const).map(type => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`flex items-center gap-2 px-3.5 py-3.5 rounded-xl text-[13px] font-semibold transition-all duration-150 border-[1.5px]
              ${receiptType === type ? tk.pillActive : tk.pillInactive}`}
          >
            {receiptIcons[type]}
            {receiptLabels[type]}
          </button>
        ))}
      </div>
      {(receiptType === "email" || receiptType === "sms") && (
        <div>
          <label htmlFor="receipt-contact" className={labelCls}>
            {receiptType === "email" ? "Email Address" : "Phone Number"}
          </label>
          <input
            id="receipt-contact"
            type={receiptType === "email" ? "email" : "tel"}
            inputMode={receiptType === "email" ? "email" : "tel"}
            value={receiptContact}
            onChange={(e) => onContactChange(e.target.value)}
            placeholder={receiptType === "email" ? "customer@email.com" : "+1 (555) 000-0000"}
            className={inputCls}
            autoComplete={receiptType === "email" ? "email" : "tel"}
          />
        </div>
      )}
    </div>
  );
}

// ── Tap to Pay Card ───────────────────────────────────────────────────────────
function TapToPayCard({ tk }: { tk: Tokens }) {
  return (
    <div className={`rounded-2xl border p-5 ${tk.tapCard}`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${tk.tapIcon}`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8.111 16.404a5.5 5.5 0 010-8.808M12 20a9 9 0 000-16M3.5 12a10.5 10.5 0 0117 0" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[15px] font-semibold ${tk.tapTitle}`}>Tap to Pay</span>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${tk.tapBadge}`}>
              Mobile Only
            </span>
          </div>
          <p className={`text-[13px] leading-relaxed ${tk.tapBody}`}>
            {"Available in "}
            <span className={`font-semibold ${tk.tapSub}`}>Circuit Mobile</span>
            {". Requires Circuit app on a supported iPhone."}
          </p>
        </div>
      </div>
      <div className={`mt-4 pt-4 border-t ${tk.tapDivider}`}>
        <p className={`text-[12px] font-medium ${tk.tapFooter}`}>
          Download the Circuit app → accept contactless cards, Apple Pay & Google Pay directly.
        </p>
      </div>
    </div>
  );
}

// ── Sticky Bottom Bar (mobile / tablet) ──────────────────────────────────────
function StickyBottomBar({
  tk, total, itemCount, loadingIntent, onCharge,
}: {
  tk: Tokens;
  total: number;
  itemCount: number;
  loadingIntent: boolean;
  onCharge: () => void;
}) {
  if (itemCount === 0) return null;
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 border-t px-4 pt-3 lg:hidden transition-colors duration-300 ${tk.stickyPanel}`}
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <div className="flex-1 min-w-0">
          <div className={`text-[11px] font-semibold uppercase tracking-wider ${tk.stickyLabel}`}>
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </div>
          <div className={`text-[20px] font-bold leading-tight ${tk.stickyTotal}`}>{fmt(total)}</div>
        </div>
        <button
          onClick={onCharge}
          disabled={loadingIntent || total <= 0}
          className={`h-12 px-6 rounded-xl text-white text-[15px] font-bold flex items-center gap-2 transition-all duration-150
            disabled:opacity-30 disabled:cursor-not-allowed ${tk.ctaPrimaryMob}`}
        >
          {loadingIntent ? (
            <Spinner />
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Charge
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Payment Form ──────────────────────────────────────────────────────────────
interface PaymentFormProps {
  clientSecret: string;
  total: number;
  tk: Tokens;
  onSuccess: (txnId: string) => void;
  onCancel: () => void;
}

function PaymentForm({ total, tk, onSuccess, onCancel }: PaymentFormProps) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying, setPaying]     = useState(false);
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className={`rounded-2xl border overflow-hidden ${tk.card}`}>
        <div className={`px-5 py-4 border-b ${tk.cardHdr}`}>
          <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${tk.cardHdrTxt}`}>Card Details</span>
        </div>
        <div className="p-5">
          <PaymentElement options={{ layout: "tabs" }} />
        </div>
      </div>

      {payError && <ErrorBanner msg={payError} />}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={paying}
          className={`flex-1 h-14 rounded-xl border-[1.5px] text-[15px] font-semibold transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed ${tk.cancelBtn}`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || paying}
          className={`flex-[2] h-14 rounded-xl text-white text-[15px] font-bold transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed ${tk.ctaPrimary}`}
        >
          {paying ? (
            <span className="flex items-center justify-center gap-2.5">
              <Spinner />
              Processing…
            </span>
          ) : (
            `Charge ${fmt(total)}`
          )}
        </button>
      </div>
    </form>
  );
}

// ── Main POS Component ────────────────────────────────────────────────────────
export default function CircuitPOS() {
  // ── Theme ──────────────────────────────────────────────────────────────────
  const [dark, setDark]               = useState(false);
  const [userOverride, setUserOverride] = useState(false);

  useEffect(() => {
    if (userOverride) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [userOverride]);

  function toggleTheme() {
    setDark(d => !d);
    setUserOverride(true);
  }

  const tk: Tokens = dark ? DARK : LIGHT;

  // ── POS state ──────────────────────────────────────────────────────────────
  const [merchantId, setMerchantId]         = useState("");
  const [items, setItems]                   = useState<LineItem[]>([]);
  const [itemName, setItemName]             = useState("");
  const [itemQty, setItemQty]               = useState("1");
  const [itemPrice, setItemPrice]           = useState("");
  const [taxRate, setTaxRate]               = useState("8.5");
  const [addError, setAddError]             = useState("");
  const [clientSecret, setClientSecret]     = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent]   = useState(false);
  const [intentError, setIntentError]       = useState("");
  const [result, setResult]                 = useState<TransactionResult | null>(null);
  const [receiptType, setReceiptType]       = useState<"print" | "email" | "sms" | "none">("none");
  const [receiptContact, setReceiptContact] = useState("");
  const [showPayment, setShowPayment]       = useState(false);

  const subtotal      = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [items]);
  const tax           = useMemo(() => subtotal * (parseFloat(taxRate) || 0) / 100, [subtotal, taxRate]);
  const total         = useMemo(() => subtotal + tax, [subtotal, tax]);
  const processingFee = useMemo(() => calcProcessingFee(total), [total]);

  const stripeAppearance = useMemo(() => buildStripeAppearance(dark), [dark]);

  const inputCls = `w-full rounded-xl px-4 py-4 text-[15px] border-[1.5px] outline-none transition-all duration-150 min-h-[52px] focus:ring-[3px] ${tk.input}`;
  const labelCls = `block text-[11px] font-semibold uppercase tracking-[0.08em] mb-2 ${tk.label}`;

  // ── Item actions ───────────────────────────────────────────────────────────
  function addItem() {
    setAddError("");
    const name  = itemName.trim();
    const qty   = parseInt(itemQty, 10);
    const price = parseFloat(itemPrice);
    if (!name)                      return setAddError("Item name is required.");
    if (!qty || qty < 1)            return setAddError("Quantity must be at least 1.");
    if (isNaN(price) || price <= 0) return setAddError("Enter a valid price greater than $0.");
    setItems(prev => [...prev, { id: uid(), name, quantity: qty, unitPrice: price }]);
    setItemName(""); setItemQty("1"); setItemPrice("");
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  // ── Checkout ───────────────────────────────────────────────────────────────
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
      setShowPayment(true);
    } catch (e: any) {
      setIntentError(e.message ?? "Something went wrong.");
    } finally {
      setLoadingIntent(false);
    }
  }

  function handleSuccess(txnId: string) {
    const receipt: ReceiptDelivery =
      receiptType === "print"  ? { type: "print" } :
      receiptType === "email"  ? { type: "email", contact: receiptContact } :
      receiptType === "sms"    ? { type: "sms",   contact: receiptContact } :
      { type: "none" };

    setResult({
      transactionId: txnId,
      amount:        total,
      items,
      subtotal,
      taxRate:       parseFloat(taxRate) || 0,
      taxAmount:     tax,
      total,
      processingFee,
      receipt,
    });
    setClientSecret(null);
    setShowPayment(false);
  }

  function reset() {
    setItems([]); setResult(null); setClientSecret(null); setShowPayment(false);
    setReceiptType("none"); setReceiptContact(""); setIntentError(""); setAddError("");
  }

  // ═══════════════════════════════════════════════════════════════════
  // ── SUCCESS VIEW ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (result) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-5 transition-colors duration-300 ${tk.page}`}>
        <div className="w-full max-w-sm">
          <Card tk={tk} className="mb-4">
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
            <div className="p-8 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border-2 ${tk.successIconBg}`}>
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className={`text-[22px] font-bold mb-1 ${tk.successTitle}`}>Payment Accepted</h1>
              <p className={`text-[14px] ${tk.subtleText}`}>Transaction complete</p>
              <div className={`mt-6 py-5 border-t border-b ${tk.rowBorder}`}>
                <div className={`text-[13px] font-medium mb-1 ${tk.subtleText}`}>Total Charged</div>
                <div className={`text-[40px] font-bold tracking-tight leading-none ${tk.successTotalColor}`}>
                  {fmt(result.total)}
                </div>
              </div>
            </div>
          </Card>

          <Card tk={tk} className="mb-4">
            <CardHeader tk={tk} title="Transaction Details" />
            <div className="px-5 py-1">
              {[
                ["ID",             result.transactionId.slice(0, 18) + "…"],
                ["Subtotal",       fmt(result.subtotal)],
                [`Tax (${result.taxRate}%)`, fmt(result.taxAmount)],
                ["Processing Fee", fmt(result.processingFee)],
                ["Receipt",
                  result.receipt.type === "none"  ? "None"  :
                  result.receipt.type === "print" ? "Print" :
                  `${result.receipt.type.toUpperCase()} · ${'contact' in result.receipt ? result.receipt.contact : ''}`
                ],
              ].map(([label, value], i, arr) => (
                <div
                  key={label}
                  className={`flex justify-between items-center py-4 ${i < arr.length - 1 ? `border-b ${tk.rowBorder}` : ""}`}
                >
                  <span className={`text-[13px] ${tk.subtleText}`}>{label}</span>
                  <span className={`text-[13px] font-semibold text-right max-w-[200px] truncate ${tk.successTitle}`}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          {result.items.length > 0 && (
            <Card tk={tk} className="mb-5">
              <CardHeader tk={tk} title={`Items · ${result.items.length}`} />
              <div className="px-5 py-1">
                {result.items.map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex justify-between items-center py-4 ${i < result.items.length - 1 ? `border-b ${tk.rowBorder}` : ""}`}
                  >
                    <div>
                      <div className={`text-[14px] font-medium ${tk.successTitle}`}>{item.name}</div>
                      <div className={`text-[12px] mt-0.5 ${tk.subtleText}`}>Qty {item.quantity} · {fmt(item.unitPrice)} ea.</div>
                    </div>
                    <span className={`text-[14px] font-semibold ${tk.successTitle}`}>
                      {fmt(item.quantity * item.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <button
            onClick={reset}
            className={`w-full h-14 rounded-2xl text-white text-[16px] font-bold transition-all duration-150 ${tk.ctaPrimary}`}
          >
            New Transaction
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ── PAYMENT / CHECKOUT VIEW ───────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (showPayment && clientSecret) {
    return (
      <div className={`min-h-screen flex flex-col transition-colors duration-300 ${tk.page}`}>
        <header className={`border-b px-5 h-16 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300 ${tk.header}`}>
          <button
            onClick={() => { setShowPayment(false); setClientSecret(null); }}
            className={`flex items-center gap-2 font-semibold text-[15px] h-12 px-1 ${tk.backBtn}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className={`text-[15px] font-bold ${tk.totalLabel}`}>Checkout</span>
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
            <Card tk={tk}>
              <CardHeader tk={tk} title="Order Summary" />
              <div className="px-5 py-1">
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    className={`flex justify-between items-center py-3.5 ${i < items.length - 1 ? `border-b ${tk.rowBorder}` : ""}`}
                  >
                    <div>
                      <div className={`text-[14px] font-medium ${tk.totalLabel}`}>{item.name}</div>
                      <div className={`text-[12px] mt-0.5 ${tk.subtleText}`}>×{item.quantity}</div>
                    </div>
                    <span className={`text-[14px] font-semibold ${tk.totalLabel}`}>
                      {fmt(item.quantity * item.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>
              <div className={`px-5 pt-3 pb-5 border-t space-y-2 ${tk.summaryFooterBg}`}>
                {[
                  ["Subtotal", fmt(subtotal)],
                  [`Tax (${parseFloat(taxRate) || 0}%)`, fmt(tax)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-[13px]">
                    <span className={tk.subtleText}>{l}</span>
                    <span className={`font-medium ${tk.subtleText}`}>{v}</span>
                  </div>
                ))}
                <div className={`flex justify-between text-[16px] font-bold pt-2 border-t mt-1 ${tk.rowBorder} ${tk.totalLabel}`}>
                  <span>Total</span>
                  <span>{fmt(total)}</span>
                </div>
              </div>
            </Card>

            <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
              <PaymentForm
                clientSecret={clientSecret}
                total={total}
                tk={tk}
                onSuccess={handleSuccess}
                onCancel={() => { setShowPayment(false); setClientSecret(null); }}
              />
            </Elements>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ── MAIN POS VIEW ────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen transition-colors duration-300 ${tk.page}`}>
      {/* ── Header ── */}
      <header className={`border-b sticky top-0 z-20 transition-colors duration-300 ${tk.header}`}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">

          {/* ── Brand / Logo ── */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="https://assets.cdn.filesafe.space/cZKbxiE0isWncXg1MywT/media/69e8c50638e07b34846b1d97.png"
              alt="Circuit"
              className="h-14 w-auto object-contain py-1"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="merchant-id"
                className={`text-[11px] font-semibold uppercase tracking-wider hidden sm:block ${tk.label}`}
              >
                Merchant
              </label>
              <input
                id="merchant-id"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                placeholder="MID-000000"
                className={`rounded-xl px-3.5 py-2.5 text-[13px] font-medium border-[1.5px] outline-none w-36 focus:ring-[3px] transition-all duration-150 ${tk.merchantInput}`}
              />
            </div>
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-4 py-5 lg:py-7">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-4 pb-28 lg:pb-0">

            {/* Add Item */}
            <Card tk={tk}>
              <CardHeader tk={tk} title="Add Item" />
              <div className="p-5 space-y-4">
                <div>
                  <label htmlFor="item-name" className={labelCls}>Item Name</label>
                  <input
                    id="item-name"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addItem()}
                    placeholder="Product or service description"
                    className={inputCls}
                    autoComplete="off"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="item-qty" className={labelCls}>Quantity</label>
                    <input
                      id="item-qty"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="item-price" className={labelCls}>Unit Price ($)</label>
                    <input
                      id="item-price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addItem()}
                      placeholder="0.00"
                      className={inputCls}
                    />
                  </div>
                </div>
                {addError && <ErrorBanner msg={addError} />}
                <button
                  onClick={addItem}
                  className={`w-full py-3.5 rounded-xl text-[15px] font-semibold transition-all duration-150 flex items-center justify-center gap-2 ${tk.addItemBtn}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add to Order
                </button>
              </div>
            </Card>

            {/* Cart */}
            <Card tk={tk}>
              <CardHeader
                tk={tk}
                title="Order"
                right={items.length > 0 ? (
                  <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full
                    ${dark ? "text-blue-300 bg-blue-900/40" : "text-blue-700 bg-blue-50"}`}>
                    {items.length} item{items.length !== 1 ? "s" : ""}
                  </span>
                ) : null}
              />
              {items.length === 0 ? (
                <div className="py-16 px-5 text-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${tk.emptyBg}`}>
                    <svg className={`w-6 h-6 ${tk.mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m5-9v9m4-9v9m5-9l2 9" />
                    </svg>
                  </div>
                  <p className={`text-[14px] ${tk.subtleText}`}>No items added yet</p>
                  <p className={`text-[12px] mt-1 ${tk.mutedText}`}>Use the form above to add items</p>
                </div>
              ) : (
                <div>
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 px-5 py-4 ${idx < items.length - 1 ? `border-b ${tk.rowBorder}` : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${tk.itemBadge}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[15px] font-semibold truncate ${tk.totalLabel}`}>{item.name}</div>
                        <div className={`text-[12px] mt-0.5 ${tk.subtleText}`}>{fmt(item.unitPrice)} × {item.quantity}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[15px] font-bold ${tk.totalLabel}`}>
                          {fmt(item.quantity * item.unitPrice)}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 ${tk.removeBtn}`}
                          aria-label={`Remove ${item.name}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Tap to Pay */}
            <TapToPayCard tk={tk} />

            {/* Mobile-only: tax + receipt */}
            <div className="lg:hidden space-y-4">
              <Card tk={tk}>
                <CardHeader tk={tk} title="Tax Rate" />
                <div className="p-5">
                  <div className="relative">
                    <label htmlFor="tax-rate-mobile" className="sr-only">Tax Rate</label>
                    <input
                      id="tax-rate-mobile"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.1"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className={`${inputCls} pr-10`}
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-[15px] ${tk.subtleText}`}
                    >
                      %
                    </span>
                  </div>
                </div>
              </Card>

              <Card tk={tk}>
                <CardHeader tk={tk} title="Receipt" />
                <div className="p-4">
                  <ReceiptPills
                    tk={tk}
                    receiptType={receiptType}
                    onSelect={setReceiptType}
                    receiptContact={receiptContact}
                    onContactChange={setReceiptContact}
                  />
                </div>
              </Card>

              {intentError && <ErrorBanner msg={intentError} />}
            </div>
          </div>

          {/* ── RIGHT COLUMN — sticky on lg ── */}
          <div className="hidden lg:block">
            <div className="sticky top-[80px] space-y-4">

              {/* Tax rate */}
              <Card tk={tk}>
                <CardHeader tk={tk} title="Tax Rate" />
                <div className="p-5">
                  <div className="relative">
                    <label htmlFor="tax-rate-desktop" className="sr-only">Tax Rate</label>
                    <input
                      id="tax-rate-desktop"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.1"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className={`${inputCls} pr-10`}
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-[15px] ${tk.subtleText}`}
                    >
                      %
                    </span>
                  </div>
                </div>
              </Card>

              {/* Order Summary */}
              <Card tk={tk}>
                <CardHeader tk={tk} title="Order Summary" />
                <div className="px-5 pt-2 pb-4">
                  {[
                    ["Subtotal",       fmt(subtotal)],
                    [`Tax (${parseFloat(taxRate) || 0}%)`, fmt(tax)],
                    ["Processing Fee", fmt(processingFee)],
                  ].map(([label, value]) => (
                    <div key={label} className={`flex justify-between items-center py-3 border-b ${tk.rowBorder}`}>
                      <span className={`text-[13px] ${tk.subtleText}`}>{label}</span>
                      <span className={`text-[13px] font-medium ${tk.subtleText}`}>{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 pb-1">
                    <span className={`text-[15px] font-bold ${tk.totalLabel}`}>Total</span>
                    <span className={`text-[28px] font-bold tracking-tight ${tk.totalAmt}`}>{fmt(total)}</span>
                  </div>
                </div>
              </Card>

              {/* Receipt */}
              <Card tk={tk}>
                <CardHeader tk={tk} title="Receipt" />
                <div className="p-4">
                  <ReceiptPills
                    tk={tk}
                    receiptType={receiptType}
                    onSelect={setReceiptType}
                    receiptContact={receiptContact}
                    onContactChange={setReceiptContact}
                  />
                </div>
              </Card>

              {/* Charge CTA */}
              <div className="space-y-3 pb-2">
                {intentError && <ErrorBanner msg={intentError} />}
                <button
                  onClick={startCheckout}
                  disabled={items.length === 0 || loadingIntent || total <= 0}
                  className={`w-full h-16 rounded-2xl text-white text-[17px] font-bold flex items-center justify-center gap-3
                    transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${tk.ctaPrimary}`}
                >
                  {loadingIntent ? (
                    <>
                      <Spinner />
                      Preparing…
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Charge {fmt(total)}
                    </>
                  )}
                </button>
                {items.length === 0 && (
                  <p className={`text-center text-[12px] ${tk.mutedText}`}>
                    Add at least one item to continue
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar: mobile/tablet only */}
      <StickyBottomBar
        tk={tk}
        total={total}
        itemCount={items.length}
        loadingIntent={loadingIntent}
        onCharge={startCheckout}
      />
    </div>
  );
}
