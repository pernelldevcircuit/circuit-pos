'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

/* ─────────────────────────────────────────────
   Inline ThemeToggle — no external import risk
───────────────────────────────────────────── */
function ThemeToggle({
  isDark,
  onToggle,
}: {
  isDark: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
        isDark
          ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {isDark ? (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          Light
        </>
      ) : (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          Dark
        </>
      )}
    </button>
  )
}

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type Tier = {
  id: string | number
  name?: string | null
  tier_name?: string | null
  rate?: number | string | null
  base_rate?: number | string | null
  per_transaction_fee?: number | string | null
}

type Transaction = {
  id: string
  amount?: number | null
  net_amount?: number | null
  status?: string | null
  created_at: string
}

type Merchant = {
  id: string
  name?: string | null
  business_name?: string | null
}

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const CIRCUIT_LOGO_URL =
  'https://assets.cdn.filesafe.space/cZKbxiE0isWncXg1MywT/media/69e8c50638e07b34846b1d97.png'

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function Home() {
  const [pricingTiers, setPricingTiers] = useState<Tier[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  /* ── Theme persistence ── */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('circuit-theme')
    if (stored === 'light' || stored === 'dark') {
      setIsDark(stored === 'dark')
    } else if (window.matchMedia) {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('circuit-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  /* ── Data loading ── */
  useEffect(() => {
    async function loadData() {
      try {
        const [tiersRes, merchantsRes, transactionsRes] = await Promise.all([
          supabase.from('pricing_tiers').select('*'),
          supabase.from('merchants').select('*').limit(5),
          supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30),
        ])
        setPricingTiers((tiersRes.data as Tier[]) ?? [])
        setMerchants((merchantsRes.data as Merchant[]) ?? [])
        setTransactions((transactionsRes.data as Transaction[]) ?? [])
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  /* ── Derived stats ── */
  const totalRevenue = useMemo(
    () =>
      transactions.reduce((sum, t) => sum + (Number(t.net_amount) || 0), 0) / 100,
    [transactions]
  )
  const totalVolume = useMemo(
    () =>
      transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) / 100,
    [transactions]
  )
  const avgTicket = useMemo(
    () => (transactions.length === 0 ? 0 : totalVolume / transactions.length),
    [totalVolume, transactions.length]
  )
  const volumeSeries = useMemo(() => {
    const days = 7
    const buckets: number[] = Array(days).fill(0)
    const now = new Date()
    now.setHours(23, 59, 59, 999)
    for (const txn of transactions) {
      const diff = Math.floor(
        (now.getTime() - new Date(txn.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      if (diff >= 0 && diff < days) {
        buckets[days - 1 - diff] += (Number(txn.amount) || 0) / 100
      }
    }
    return buckets
  }, [transactions])

  /* ── Design tokens ── */
  const tk = {
    pageBg:        isDark ? 'bg-[#0b0f18]'                              : 'bg-gray-50',
    pageText:      isDark ? 'text-gray-100'                             : 'text-gray-900',
    headerBg:      isDark ? 'bg-[#0b0f18]/90 border-slate-700/50'       : 'bg-white/90 border-gray-200',
    card:          isDark ? 'bg-[#161d2b] border-slate-700/50'          : 'bg-white border-gray-200',
    cardInner:     isDark ? 'bg-[#0f1420] border-slate-700/40'          : 'bg-gray-50 border-gray-200',
    muted:         isDark ? 'text-slate-400'                            : 'text-gray-500',
    subtle:        isDark ? 'text-slate-300'                            : 'text-gray-600',
    accent:        isDark ? 'text-blue-400'                             : 'text-blue-700',
    accentBg:      isDark ? 'bg-blue-500/10'                            : 'bg-blue-50',
    ctaPrimary:    isDark
      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25'
      : 'bg-blue-700 hover:bg-blue-600 text-white shadow-lg shadow-blue-700/20',
    ctaSecondary:  isDark
      ? 'bg-[#1f2836] hover:bg-[#252f41] text-gray-100 border border-slate-700/50'
      : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200',
    navLink:       isDark ? 'text-slate-300 hover:text-white'           : 'text-gray-600 hover:text-gray-900',
    navActive:     isDark ? 'bg-blue-500/10 text-blue-400'              : 'bg-blue-50 text-blue-700',
    divider:       isDark ? 'border-slate-700/50'                       : 'border-gray-200',
    tableHead:     isDark ? 'text-slate-400'                            : 'text-gray-500',
    row:           isDark ? 'border-slate-700/50'                       : 'border-gray-200',
    statusOk:      isDark
      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
      : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    logoTile:      isDark
      ? 'bg-gradient-to-br from-blue-500/20 to-blue-700/10 border border-blue-500/30'
      : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200',
    hoverRow:      isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50',
  }

  /* ── Formatters ── */
  const toNum = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null
    const n = typeof v === 'number' ? v : parseFloat(String(v))
    return Number.isFinite(n) ? n : null
  }
  const formatRate = (v: unknown): string => {
    const n = toNum(v)
    return n === null ? '—' : `${n.toFixed(2)}%`
  }
  const formatFee = (v: unknown): string => `$${(toNum(v) ?? 0).toFixed(2)}`
  const formatCurrency = (cents: number | null | undefined): string => {
    const n = Number(cents) || 0
    return `$${(n / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  /* ── Sparkline ── */
  const Sparkline = ({ data }: { data: number[] }) => {
    const w = 280
    const h = 64
    const pad = 4
    const max = Math.max(...data, 1)
    const stepX = (w - pad * 2) / Math.max(data.length - 1, 1)
    const pts = data.map((v, i) => {
      const x = pad + i * stepX
      const y = h - pad - (v / max) * (h - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    const linePath  = `M ${pts.join(' L ')}`
    const areaPath  = `${linePath} L ${(pad + (data.length - 1) * stepX).toFixed(1)},${h - pad} L ${pad},${h - pad} Z`
    const stroke    = isDark ? '#60a5fa' : '#1d4ed8'
    const fill      = isDark ? 'rgba(96,165,250,0.15)' : 'rgba(29,78,216,0.10)'
    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-16"
        preserveAspectRatio="none"
        aria-label="7-day processing volume trend"
      >
        <path d={areaPath} fill={fill} />
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  /* ── KPI card helper ── */
  const KpiCard = ({
    label,
    value,
    sub,
    valueClass = '',
    icon,
  }: {
    label: string
    value: string
    sub: string
    valueClass?: string
    icon: React.ReactNode
  }) => (
    <div className={`${tk.card} border rounded-2xl p-4 sm:p-5`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-medium ${tk.muted}`}>{label}</p>
        <div className={`p-1.5 rounded-lg ${tk.accentBg} ${tk.accent}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${valueClass}`}>
        {value}
      </p>
      <p className={`text-[11px] mt-1 ${tk.muted}`}>{sub}</p>
    </div>
  )

  /* ── Render ── */
  return (
    <div className={`min-h-screen ${tk.pageBg} ${tk.pageText} transition-colors duration-200`}>

      {/* ════ HEADER ════ */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${tk.headerBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className={`w-10 h-10 rounded-xl ${tk.logoTile} flex items-center justify-center p-1.5 transition-transform group-hover:scale-105`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CIRCUIT_LOGO_URL} alt="Circuit" className="w-full h-full object-contain" />
              </div>
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-base font-bold tracking-tight">Circuit</span>
                <span className={`text-[10px] uppercase tracking-wider ${tk.muted}`}>POS Platform</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/"           className={`px-3 py-2 text-sm font-medium rounded-lg ${tk.navActive}`}>Dashboard</Link>
              <Link href="/pos"         className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${tk.navLink}`}>POS Terminal</Link>
              <Link href="/sales-tool"  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${tk.navLink}`}>Sales Tool</Link>
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* ★ Inline ThemeToggle — always visible ★ */}
              <ThemeToggle isDark={isDark} onToggle={() => setIsDark((d) => !d)} />

              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileNavOpen((o) => !o)}
                className={`md:hidden p-2 rounded-lg ${tk.ctaSecondary}`}
                aria-label="Toggle navigation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {mobileNavOpen ? (
                    <><line x1="18" y1="6"  x2="6"  y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                  ) : (
                    <><line x1="3" y1="6"  x2="21" y2="6"  /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile nav drawer */}
          {mobileNavOpen && (
            <div className={`md:hidden py-3 border-t ${tk.divider}`}>
              <nav className="flex flex-col gap-1">
                <Link href="/"          onClick={() => setMobileNavOpen(false)} className={`px-3 py-2.5 text-sm font-medium rounded-lg ${tk.navActive}`}>Dashboard</Link>
                <Link href="/pos"        onClick={() => setMobileNavOpen(false)} className={`px-3 py-2.5 text-sm font-medium rounded-lg ${tk.navLink}`}>POS Terminal</Link>
                <Link href="/sales-tool" onClick={() => setMobileNavOpen(false)} className={`px-3 py-2.5 text-sm font-medium rounded-lg ${tk.navLink}`}>Sales Tool</Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* ════ MAIN ════ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Page title row */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-10">
          <div>
            <p className={`text-xs uppercase tracking-[0.18em] font-semibold ${tk.accent} mb-2`}>Overview</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className={`mt-1.5 text-sm sm:text-base ${tk.muted}`}>
              Welcome back — here&apos;s how Circuit is performing today.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link href="/sales-tool" className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tk.ctaSecondary}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="12" y2="14" />
              </svg>
              Sales Calculator
            </Link>
            <Link href="/pos" className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tk.ctaPrimary}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Transaction
            </Link>
          </div>
        </div>

        {/* ── Loading state ── */}
        {loading ? (
          <div className={`text-center py-24 ${tk.muted}`}>
            <div className={`inline-block w-10 h-10 border-2 rounded-full animate-spin ${isDark ? 'border-slate-700 border-t-blue-400' : 'border-gray-200 border-t-blue-700'}`} />
            <p className="mt-4 text-sm">Loading dashboard…</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">

            {/* ── KPI Cards ── */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard
                label="Net Revenue"
                value={`$${totalRevenue.toFixed(2)}`}
                sub={`From last ${transactions.length} txns`}
                valueClass="text-emerald-500"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                }
              />
              <KpiCard
                label="Volume"
                value={`$${totalVolume.toFixed(2)}`}
                sub="Gross processed"
                valueClass={tk.accent}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                }
              />
              <KpiCard
                label="Avg Ticket"
                value={`$${avgTicket.toFixed(2)}`}
                sub="Per transaction"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
                  </svg>
                }
              />
              <KpiCard
                label="Merchants"
                value={String(merchants.length)}
                sub="Active accounts"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l1-5h16l1 5" /><path d="M4 9h16v11H4z" /><path d="M9 22V12h6v10" />
                  </svg>
                }
              />
            </section>

            {/* ── Sparkline + Pricing Tiers ── */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Sparkline */}
              <div className={`${tk.card} border rounded-2xl p-5 sm:p-6 lg:col-span-1`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className={`text-xs uppercase tracking-wider font-semibold ${tk.muted}`}>Last 7 days</p>
                    <h3 className="text-lg font-bold mt-0.5">Processing Volume</h3>
                  </div>
                </div>
                <div className="py-2">
                  <Sparkline data={volumeSeries} />
                </div>
                <div className={`mt-3 pt-3 border-t ${tk.divider}`}>
                  <p className={`text-xs ${tk.muted}`}>Peak day</p>
                  <p className="text-lg font-semibold mt-0.5">
                    ${Math.max(...volumeSeries, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Pricing tiers */}
              <div className={`${tk.card} border rounded-2xl p-5 sm:p-6 lg:col-span-2`}>
                <div className="flex items-start justify-between mb-4 sm:mb-5">
                  <div>
                    <p className={`text-xs uppercase tracking-wider font-semibold ${tk.muted}`}>Merchant plans</p>
                    <h3 className="text-lg font-bold mt-0.5">Pricing Tiers</h3>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tk.accentBg} ${tk.accent}`}>
                    {pricingTiers.length} active
                  </span>
                </div>
                {pricingTiers.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {pricingTiers.map((tier) => (
                      <div key={tier.id} className={`${tk.cardInner} border rounded-xl p-4 hover:border-blue-500/40 transition-colors`}>
                        <h4 className={`text-xs font-semibold ${tk.accent} uppercase tracking-wide truncate`}>
                          {tier.name ?? tier.tier_name ?? 'Unnamed'}
                        </h4>
                        <p className="text-2xl font-bold tracking-tight mt-2">
                          {formatRate(tier.rate ?? tier.base_rate)}
                        </p>
                        <p className={`text-xs ${tk.muted} mt-1`}>
                          + {formatFee(tier.per_transaction_fee)} per txn
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${tk.cardInner} border rounded-xl py-10 text-center`}>
                    <p className={`text-sm ${tk.muted}`}>No pricing tiers configured</p>
                  </div>
                )}
              </div>
            </section>

            {/* ── Recent Transactions ── */}
            <section className={`${tk.card} border rounded-2xl p-5 sm:p-6`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className={`text-xs uppercase tracking-wider font-semibold ${tk.muted}`}>Activity</p>
                  <h3 className="text-lg font-bold mt-0.5">Recent Transactions</h3>
                </div>
                <Link href="/pos" className={`hidden sm:inline-flex items-center gap-1 text-sm font-semibold ${tk.accent} hover:underline`}>
                  New transaction
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>

              {transactions.length > 0 ? (
                <>
                  {/* Mobile */}
                  <div className="sm:hidden space-y-2">
                    {transactions.slice(0, 10).map((txn) => (
                      <div key={txn.id} className={`${tk.cardInner} border rounded-xl p-3.5 flex items-center justify-between`}>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs truncate">{txn.id?.slice(0, 10)}…</p>
                          <p className={`text-xs ${tk.muted} mt-0.5`}>{new Date(txn.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <p className="font-semibold">{formatCurrency(txn.amount)}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${tk.statusOk}`}>
                            {txn.status ?? 'completed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`border-b ${tk.row}`}>
                          {['ID', 'Amount', 'Status', 'Date'].map((h) => (
                            <th key={h} className={`text-left py-3 text-[11px] font-semibold uppercase tracking-wider ${tk.tableHead}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 10).map((txn) => (
                          <tr key={txn.id} className={`border-b ${tk.row} last:border-0 transition-colors ${tk.hoverRow}`}>
                            <td className="py-3.5 font-mono text-sm">{txn.id?.slice(0, 10)}…</td>
                            <td className="py-3.5 font-semibold">{formatCurrency(txn.amount)}</td>
                            <td className="py-3.5">
                              <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${tk.statusOk}`}>
                                {txn.status ?? 'completed'}
                              </span>
                            </td>
                            <td className={`py-3.5 text-sm ${tk.subtle}`}>
                              {new Date(txn.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className={`${tk.cardInner} border rounded-xl py-12 text-center`}>
                  <p className={`text-sm ${tk.muted}`}>No transactions yet</p>
                  <Link href="/pos" className={`inline-flex items-center gap-1.5 mt-3 text-sm font-semibold ${tk.accent} hover:underline`}>
                    Process your first payment →
                  </Link>
                </div>
              )}
            </section>

          </div>
        )}

        {/* ── Footer ── */}
        <footer className={`mt-12 sm:mt-16 pt-6 border-t ${tk.divider} flex flex-col sm:flex-row items-center justify-between gap-3`}>
          <p className={`text-xs ${tk.muted}`}>© {new Date().getFullYear()} Circuit POS — All rights reserved</p>
          <div className="flex items-center gap-4">
            <Link href="/pos"        className={`text-xs font-medium ${tk.navLink} transition-colors`}>POS Terminal</Link>
            <Link href="/sales-tool" className={`text-xs font-medium ${tk.navLink} transition-colors`}>Sales Tool</Link>
          </div>
        </footer>
      </main>
    </div>
  )
}