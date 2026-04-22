'use client'

import { useState, useEffect } from 'react'

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
  totalLabel:      "text-gray-900",
  totalAmt:        "text-blue-700",
  tapIcon:         "bg-blue-700",
  ctaPrimary:      "bg-blue-700 hover:bg-blue-600 active:bg-blue-800 shadow-xl shadow-blue-700/25",
  backBtn:         "text-blue-700",
  successIconBg:   "bg-emerald-50 border-emerald-200",
  savingsAmt:      "text-emerald-600",
  tierBg:          "bg-blue-50 border-blue-200",
  tierLabel:       "text-blue-700",
  tierName:        "text-gray-900",
  tierSub:         "text-gray-500",
  selectBg:        "bg-white border-gray-200 text-gray-900 focus:ring-blue-700/10 focus:border-blue-700",
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
  totalLabel:      "text-slate-100",
  totalAmt:        "text-blue-400",
  tapIcon:         "bg-blue-600",
  ctaPrimary:      "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-xl shadow-blue-900/40",
  backBtn:         "text-blue-400",
  successIconBg:   "bg-emerald-900/30 border-emerald-700",
  savingsAmt:      "text-emerald-400",
  tierBg:          "bg-blue-900/20 border-blue-700/50",
  tierLabel:       "text-blue-400",
  tierName:        "text-slate-100",
  tierSub:         "text-slate-400",
  selectBg:        "bg-[#0f1623] border-slate-600 text-slate-100 focus:ring-blue-400/15 focus:border-blue-400",
};

type Tokens = typeof LIGHT;

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

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ tk, children, className = "" }: { tk: Tokens; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border overflow-hidden ${tk.card} ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ tk, title }: { tk: Tokens; title: string }) {
  return (
    <div className={`px-5 py-4 flex items-center border-b ${tk.cardHdr}`}>
      <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${tk.cardHdrTxt}`}>{title}</span>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}

// ── Main Sales Tool Component ─────────────────────────────────────────────────
export default function SalesToolPage() {
  // ── Theme ──────────────────────────────────────────────────────────────────
  const [dark, setDark] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('circuit-theme');
    if (stored === 'light' || stored === 'dark') {
      setDark(stored === 'dark');
    } else if (window.matchMedia) {
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('circuit-theme', dark ? 'dark' : 'light');
  }, [dark]);

  function toggleTheme() {
    setDark(d => !d);
  }
  const tk: Tokens = dark ? DARK : LIGHT;

  // ── State ──────────────────────────────────────────────────────────────────
  const [inputs, setInputs] = useState({
    monthlyVolume:    50000,
    currentRate:      2.9,
    averageTicket:    45,
    currentProcessor: 'Square',
  });

  const [quote, setQuote]     = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ── Logic ──────────────────────────────────────────────────────────────────
  const handleCalculate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pricing/quote', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(inputs),
      });
      const data = await response.json();
      setQuote(data.quote);
    } catch (error) {
      console.error('Quote error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Shared style strings ───────────────────────────────────────────────────
  const inputCls  = `w-full rounded-xl px-4 py-4 text-[15px] border-[1.5px] outline-none transition-all duration-150 min-h-[52px] focus:ring-[3px] ${tk.input}`;
  const selectCls = `w-full rounded-xl px-4 py-4 text-[15px] border-[1.5px] outline-none transition-all duration-150 min-h-[52px] focus:ring-[3px] appearance-none ${tk.selectBg}`;
  const labelCls  = `block text-[11px] font-semibold uppercase tracking-[0.08em] mb-2 ${tk.label}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen transition-colors duration-300 ${tk.page}`}>

      {/* ── Header ── */}
      <header className={`border-b sticky top-0 z-20 transition-colors duration-300 ${tk.header}`}>
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">

          {/* ── Brand / Logo ── */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="https://assets.cdn.filesafe.space/cZKbxiE0isWncXg1MywT/media/69e8c50638e07b34846b1d97.png"
              alt="Circuit"
              className="h-14 w-auto object-contain py-1"
            />
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/"
              className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors duration-150 ${tk.backBtn}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </a>
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8">

        {/* Page title */}
        <div className="mb-7">
          <h1 className={`text-[26px] font-bold tracking-tight leading-tight ${tk.totalLabel}`}>
            Merchant Savings Calculator
          </h1>
          <p className={`text-[14px] mt-1 ${tk.subtleText}`}>
            Show merchants exactly how much they'll save with Circuit
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

          {/* ── INPUT PANEL ── */}
          <Card tk={tk}>
            <CardHeader tk={tk} title="Merchant Information" />
            <div className="p-5 space-y-5">

              {/* Monthly Volume */}
              <div>
                <label htmlFor="monthly-volume" className={labelCls}>Monthly Card Volume ($)</label>
                <input
                  id="monthly-volume"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={inputs.monthlyVolume}
                  onChange={(e) => setInputs({ ...inputs, monthlyVolume: parseFloat(e.target.value) || 0 })}
                  className={inputCls}
                />
              </div>

              {/* Current Processor */}
              <div>
                <label htmlFor="current-processor" className={labelCls}>Current Processor</label>
                <div className="relative">
                  <select
                    id="current-processor"
                    value={inputs.currentProcessor}
                    onChange={(e) => setInputs({ ...inputs, currentProcessor: e.target.value })}
                    className={selectCls}
                  >
                    <option>Square</option>
                    <option>Clover</option>
                    <option>Toast</option>
                    <option>Shopify POS</option>
                    <option>PayPal</option>
                    <option>Stripe Terminal</option>
                  </select>
                  <svg
                    className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 ${tk.subtleText}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Current Rate */}
              <div>
                <label htmlFor="current-rate" className={labelCls}>Current Rate (%)</label>
                <div className="relative">
                  <input
                    id="current-rate"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max="100"
                    value={inputs.currentRate}
                    onChange={(e) => setInputs({ ...inputs, currentRate: parseFloat(e.target.value) || 0 })}
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

              {/* Average Ticket */}
              <div>
                <label htmlFor="average-ticket" className={labelCls}>Average Transaction ($)</label>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-[15px] ${tk.subtleText}`}
                  >
                    $
                  </span>
                  <input
                    id="average-ticket"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={inputs.averageTicket}
                    onChange={(e) => setInputs({ ...inputs, averageTicket: parseFloat(e.target.value) || 0 })}
                    className={`${inputCls} pl-8`}
                  />
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleCalculate}
                disabled={loading}
                className={`w-full h-14 rounded-xl text-white text-[15px] font-bold flex items-center justify-center gap-2.5
                  transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${tk.ctaPrimary}`}
              >
                {loading ? (
                  <>
                    <Spinner />
                    Calculating…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Calculate Savings
                  </>
                )}
              </button>

            </div>
          </Card>

          {/* ── RESULTS PANEL ── */}
          <div className="space-y-4">
            {quote ? (
              <>
                {/* Savings Headline */}
                <Card tk={tk}>
                  <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
                  <div className="p-6 text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border-2 ${tk.successIconBg}`}>
                      <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.1em] mb-1 ${tk.subtleText}`}>Monthly Savings</p>
                    <p className={`text-[44px] font-bold tracking-tight leading-none ${tk.savingsAmt}`}>
                      {quote.savingsVsCurrent > 0 ? '+' : ''}${quote.savingsVsCurrent?.toFixed(2) || '0.00'}
                    </p>
                    <p className={`text-[13px] mt-2 ${tk.subtleText}`}>
                      ${((quote.savingsVsCurrent || 0) * 12).toFixed(2)} saved per year
                    </p>
                  </div>
                </Card>

                {/* Recommended Plan */}
                <Card tk={tk}>
                  <CardHeader tk={tk} title="Recommended Plan" />
                  <div className="p-5">
                    <div className={`rounded-xl border p-4 ${tk.tierBg}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-[0.1em] mb-1 ${tk.tierLabel}`}>Circuit Plan</p>
                      <p className={`text-[22px] font-bold ${tk.tierName}`}>{quote.recommendedTier.displayName}</p>
                      <p className={`text-[13px] mt-1 ${tk.tierSub}`}>
                        {quote.recommendedTier.rate}% + ${quote.recommendedTier.perTransaction} per transaction
                      </p>
                      <p className={`text-[13px] mt-0.5 ${tk.tierSub}`}>
                        ${quote.recommendedTier.monthlyFee}/month platform fee
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Cost Breakdown */}
                <Card tk={tk}>
                  <CardHeader tk={tk} title="Cost Breakdown" />
                  <div className="px-5 py-1">
                    <div className={`flex justify-between items-center py-4 border-b ${tk.rowBorder}`}>
                      <span className={`text-[13px] ${tk.subtleText}`}>Current Monthly Cost</span>
                      <span className={`text-[14px] font-semibold ${tk.totalLabel}`}>${quote.currentCost?.toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between items-center py-4 border-b ${tk.rowBorder}`}>
                      <span className={`text-[13px] ${tk.subtleText}`}>Circuit Monthly Cost</span>
                      <span className={`text-[14px] font-semibold ${tk.totalLabel}`}>${quote.circuitCost.total?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-4">
                      <span className={`text-[15px] font-bold ${tk.totalLabel}`}>You Save</span>
                      <span className={`text-[22px] font-bold ${tk.savingsAmt}`}>${quote.savingsVsCurrent?.toFixed(2)}</span>
                    </div>
                  </div>
                </Card>

                {/* Transaction Details */}
                <Card tk={tk}>
                  <CardHeader tk={tk} title="Transaction Details" />
                  <div className="px-5 py-1">
                    <div className={`flex justify-between items-center py-4 border-b ${tk.rowBorder}`}>
                      <span className={`text-[13px] ${tk.subtleText}`}>Estimated Transactions / Month</span>
                      <span className={`text-[13px] font-semibold ${tk.totalLabel}`}>{quote.estimatedTransactions}</span>
                    </div>
                    <div className="flex justify-between items-center py-4">
                      <span className={`text-[13px] ${tk.subtleText}`}>Average Ticket Size</span>
                      <span className={`text-[13px] font-semibold ${tk.totalLabel}`}>${quote.averageTicket}</span>
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card tk={tk}>
                <div className="py-24 px-5 text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${dark ? "bg-slate-800" : "bg-gray-100"}`}>
                    <svg className={`w-7 h-7 ${tk.mutedText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className={`text-[15px] font-semibold ${tk.totalLabel}`}>No results yet</p>
                  <p className={`text-[13px] mt-1 ${tk.mutedText}`}>Enter merchant details and click Calculate Savings</p>
                </div>
              </Card>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
