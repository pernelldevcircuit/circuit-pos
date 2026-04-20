"use client";

/**
 * CircuitRatesDashboard.tsx
 * Circuit POS — Competitor Rate Intelligence Dashboard
 *
 * Requirements:
 *   npm install @supabase/supabase-js
 *
 * Environment variables (add to .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
 *
 * Supabase schema expected:
 *
 *   competitor_rates
 *     id          uuid primary key
 *     name        text        -- e.g. "PayPal"
 *     rate        numeric     -- e.g. 2.99
 *     updated_at  timestamptz
 *
 *   pricing_tiers
 *     id          uuid primary key
 *     name        text        -- e.g. "Enterprise"
 *     rate        numeric     -- e.g. 2.40
 *     min_volume  numeric     -- e.g. 50000
 *     max_volume  numeric | null
 *     label       text        -- e.g. "50k+/mo"
 *     fill        integer     -- bar fill percent 0-100 (display only)
 */

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Head from "next/head";

// ── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Types ────────────────────────────────────────────────────────────────────
interface CompetitorRate {
  id: string;
  competitor_name: string;
  rate_percentage: number;
  updated_at?: string;
}

interface PricingTier {
  id: string;
  tier_name: string;
  rate_percentage: number;
  min_monthly_volume: number;
  max_monthly_volume: number | null;
  label: string;
  fill: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDollars = (n: number): string =>
  "$" + Math.round(n).toLocaleString("en-US");

function getCircuitTier(volume: number, tiers: PricingTier[]): PricingTier {
  const sorted = [...tiers].sort((a, b) => b.min_monthly_volume - a.min_monthly_volume);
  return sorted.find((t) => volume >= t.min_monthly_volume) ?? tiers[tiers.length - 1];
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Shimmer({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-[#141c2e] rounded-lg ${className}`} style={style} />;
}

interface BarChartProps {
  competitors: CompetitorRate[];
  circuitRate: number;
}

function BarChart({ competitors, circuitRate }: BarChartProps) {
  const allRates = [circuitRate, ...competitors.map((c) => c.rate_percentage)];
  const maxRate = Math.max(...allRates);
  const sorted = [...competitors].sort((a, b) => b.rate_percentage - a.rate_percentage);

  return (
    <div className="flex flex-col gap-3.5">
      {/* Circuit row */}
      <div className="flex items-center gap-3">
        <span className="w-32 shrink-0 font-mono text-xs text-[#00d4ff] font-medium">
          ⚡ Circuit POS
        </span>
        <div className="flex-1 h-8 bg-white/[0.04] rounded-md overflow-hidden">
          <div
            className="h-full rounded-md flex items-center justify-end pr-2.5
                       bg-gradient-to-r from-[rgba(0,212,255,0.15)] to-[rgba(0,212,255,0.35)]
                       border border-[rgba(0,212,255,0.3)] shadow-[inset_0_0_20px_rgba(0,212,255,0.1)]
                       transition-all duration-1000"
            style={{ width: `${(circuitRate / maxRate) * 100}%` }}
          >
            <span className="font-mono text-[11px] text-[rgba(0,212,255,0.8)]">
              {circuitRate.toFixed(2)}%
            </span>
          </div>
        </div>
        <span className="font-mono text-xs text-[#00d4ff] w-10 text-right shrink-0">
          {circuitRate.toFixed(2)}%
        </span>
      </div>

      {/* Competitor rows */}
      {sorted.map((c) => {
        const pct = (c.rate_percentage / maxRate) * 100;
        const diff = (c.rate_percentage - circuitRate).toFixed(2);
        return (
          <div key={c.id} className="flex items-center gap-3">
            <span className="w-32 shrink-0 font-mono text-xs text-[#7a8aaa]">
              {c.competitor_name}
            </span>
            <div className="flex-1 h-8 bg-white/[0.04] rounded-md overflow-hidden">
              <div
                className="h-full rounded-md bg-gradient-to-r from-[#1e2a42] to-[#243058]
                           transition-all duration-1000"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-xs text-[#7a8aaa] w-10 text-right shrink-0">
              {c.rate_percentage.toFixed(2)}%
            </span>
            <span className="text-[10px] bg-[rgba(0,255,157,0.12)] text-[#00ff9d] rounded px-1.5 py-0.5 font-mono shrink-0">
              +{diff}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface SavingsRowProps {
  competitor: CompetitorRate;
  circuitRate: number;
  volume: number;
}

function SavingsRow({ competitor, circuitRate, volume }: SavingsRowProps) {
  const monthlySaving = ((competitor.rate_percentage - circuitRate) / 100) * volume;
  const annualSaving = monthlySaving * 12;
  const isPositive = monthlySaving >= 0;
  const barWidth = Math.min(
    100,
    (Math.abs(monthlySaving) / Math.max(1, volume * 0.03)) * 100
  );

  return (
    <div className="bg-[#141c2e] border border-white/[0.07] rounded-xl px-3.5 py-3
                    flex items-center gap-2 hover:border-white/[0.12] transition-colors">
      <span className="text-[13px] text-[#7a8aaa] shrink-0 w-28">
        {competitor.competitor_name}
      </span>
      <div className="flex-1 h-[3px] bg-white/[0.07] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${barWidth}%`,
            background: isPositive ? "var(--accent-green)" : "var(--danger)",
          }}
        />
      </div>
      <div className="text-right shrink-0">
        <div
          className={`font-mono text-sm font-medium ${
            isPositive ? "text-[#00ff9d]" : "text-[#ff4f6e]"
          }`}
        >
          {isPositive ? "+" : ""}
          {fmtDollars(monthlySaving)}/mo
        </div>
        <div className="font-mono text-[11px] text-[#3d4f6e]">
          {fmtDollars(annualSaving)}/yr
        </div>
      </div>
    </div>
  );
}

interface TierCardProps {
  tier: PricingTier;
  isActive: boolean;
}

function TierCard({ tier, isActive }: TierCardProps) {
  return (
    <div
      className={`relative rounded-2xl p-5 border transition-all duration-200 cursor-default
        hover:-translate-y-0.5 hover:border-[rgba(0,212,255,0.25)]
        ${
          isActive
            ? "border-[rgba(0,212,255,0.4)] bg-gradient-to-br from-[rgba(0,212,255,0.08)] to-[#141c2e]"
            : "border-white/[0.07] bg-[#141c2e]"
        }`}
    >
      {isActive && (
        <span className="absolute top-3 right-3 font-mono text-[9px] text-[#00d4ff]
                         bg-[rgba(0,212,255,0.1)] px-1.5 py-0.5 rounded tracking-widest">
          YOUR TIER
        </span>
      )}
      <div className="font-display text-base font-bold text-[#f0f4ff] mb-1">
        {tier.tier_name}
      </div>
      <div className="font-mono text-3xl font-medium text-[#00d4ff] leading-none mb-1.5">
        {tier.rate_percentage.toFixed(2)}%
      </div>
      <div className="font-mono text-[11px] text-[#3d4f6e] tracking-wider">
        {tier.label}
      </div>
      <div className="mt-3 h-[3px] bg-white/[0.07] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#00d4ff] to-[rgba(0,212,255,0.4)] rounded-full"
          style={{ width: `${tier.fill}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function CircuitRatesDashboard() {
  const [competitors, setCompetitors] = useState<CompetitorRate[]>([]);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(25000);

  // Derived state
  const activeTier = tiers.length > 0 ? getCircuitTier(volume, tiers) : null;
  const circuitBestRate =
    tiers.length > 0
      ? Math.min(...tiers.map((t) => t.rate_percentage))
      : 2.4;
  const avgCompetitorRate =
    competitors.length > 0
      ? competitors.reduce((s, c) => s + c.rate_percentage, 0) / competitors.length
      : 0;

  const maxAnnualSavings =
    competitors.length > 0
      ? ((Math.max(...competitors.map((c) => c.rate_percentage)) - circuitBestRate) /
          100) *
        100000 *
        12
      : 0;

  const maxMonthlySaving =
    activeTier && competitors.length > 0
      ? Math.max(
          ...competitors.map(
            (c) => ((c.rate_percentage - activeTier.rate_percentage) / 100) * volume
          )
        )
      : 0;

  const bestCompetitorName =
    activeTier && competitors.length > 0
      ? competitors.reduce((best, c) =>
          c.rate_percentage > best.rate_percentage ? c : best
        ).competitor_name
      : "";

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: compData, error: compErr }, { data: tierData, error: tierErr }] =
        await Promise.all([
          supabase.from("competitor_rates").select("*").order("rate", { ascending: false }),
          supabase.from("pricing_tiers").select("*").order("min_volume", { ascending: true }),
        ]);

      if (compErr) throw new Error(compErr.message);
      if (tierErr) throw new Error(tierErr.message);

      setCompetitors(compData ?? []);
      setTiers(tierData ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedTiers = [...tiers].sort((a, b) => a.min_monthly_volume - b.min_monthly_volume);

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className="min-h-screen text-[#f0f4ff]"
        style={{
          background: "#080c12",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-6 flex-wrap px-10 pt-10 pb-0">
          <div className="flex items-center gap-3">
            <div
              className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-xl"
              style={{
                background: "#00d4ff",
                boxShadow: "0 0 24px rgba(0,212,255,0.4)",
              }}
            >
              ⚡
            </div>
            <div>
              <div
                className="text-[22px] font-extrabold tracking-tight"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Circuit POS
              </div>
              <div className="font-mono text-[11px] text-[#00d4ff] tracking-[2px] uppercase">
                Rate Intelligence Dashboard
              </div>
            </div>
          </div>
          <div
            className="rounded-full px-[18px] py-2 text-xs font-mono tracking-[1px] text-[#00ff9d] whitespace-nowrap"
            style={{
              background: "rgba(0,255,157,0.12)",
              border: "1px solid rgba(0,255,157,0.25)",
            }}
          >
            ● LIVE RATES — Q2 2026
          </div>
        </div>

        {/* ── ERROR BANNER ── */}
        {error && (
          <div className="mx-10 mt-6 bg-[rgba(255,79,110,0.1)] border border-[rgba(255,79,110,0.3)] rounded-xl px-5 py-4 text-sm text-[#ff4f6e] flex items-center justify-between gap-4">
            <span>⚠ {error}</span>
            <button
              onClick={fetchData}
              className="font-mono text-xs bg-[rgba(255,79,110,0.15)] hover:bg-[rgba(255,79,110,0.25)] px-3 py-1.5 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── HERO STATS ── */}
        <div className="grid gap-4 px-10 py-8 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {/* Circuit Best Rate */}
          <div
            className="rounded-2xl p-6 relative overflow-hidden border"
            style={{
              background: "linear-gradient(135deg, rgba(0,212,255,0.06) 0%, #0e1420 60%)",
              borderColor: "rgba(0,212,255,0.3)",
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: "linear-gradient(90deg, transparent, #00d4ff, transparent)",
              }}
            />
            <div className="font-mono text-[11px] text-[#7a8aaa] tracking-[1.5px] uppercase mb-2.5">
              Circuit Best Rate
            </div>
            <div
              className="text-[36px] font-extrabold leading-none text-[#00d4ff]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {loading ? <Shimmer className="h-9 w-20" /> : `${circuitBestRate.toFixed(2)}%`}
            </div>
            <div className="text-xs text-[#3d4f6e] mt-1.5">Enterprise tier · 50k+/mo</div>
          </div>

          {/* Competitor Avg */}
          <div className="rounded-2xl p-6 bg-[#0e1420] border border-white/[0.07]">
            <div className="font-mono text-[11px] text-[#7a8aaa] tracking-[1.5px] uppercase mb-2.5">
              Competitor Avg Rate
            </div>
            <div
              className="text-[36px] font-extrabold leading-none text-[#ff4f6e]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {loading ? <Shimmer className="h-9 w-20" /> : `${avgCompetitorRate.toFixed(2)}%`}
            </div>
            <div className="text-xs text-[#3d4f6e] mt-1.5">Across {competitors.length} major providers</div>
          </div>

          {/* Max Annual Savings */}
          <div className="rounded-2xl p-6 bg-[#0e1420] border border-white/[0.07]">
            <div className="font-mono text-[11px] text-[#7a8aaa] tracking-[1.5px] uppercase mb-2.5">
              Max Annual Savings
            </div>
            <div
              className="text-[36px] font-extrabold leading-none text-[#00ff9d]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {loading ? <Shimmer className="h-9 w-24" /> : fmtDollars(maxAnnualSavings)}
            </div>
            <div className="text-xs text-[#3d4f6e] mt-1.5">vs. highest rate at $100k/mo</div>
          </div>

          {/* Providers */}
          <div className="rounded-2xl p-6 bg-[#0e1420] border border-white/[0.07]">
            <div className="font-mono text-[11px] text-[#7a8aaa] tracking-[1.5px] uppercase mb-2.5">
              Providers Compared
            </div>
            <div
              className="text-[36px] font-extrabold leading-none text-[#ffd166]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              {loading ? <Shimmer className="h-9 w-12" /> : competitors.length}
            </div>
            <div className="text-xs text-[#3d4f6e] mt-1.5">Updated quarterly</div>
          </div>
        </div>

        {/* ── SECTION LABEL ── */}
        <div className="px-10 pt-0 pb-0 font-bold text-[#3d4f6e] tracking-[2px] uppercase text-[13px]"
          style={{ fontFamily: "'Syne', sans-serif" }}>
          Rate Comparison
        </div>

        {/* ── MAIN GRID ── */}
        <div className="px-10 pt-5 pb-10 grid gap-5 [grid-template-columns:1fr_380px] max-[900px]:[grid-template-columns:1fr]">
          {/* Bar Chart Panel */}
          <div className="bg-[#0e1420] border border-white/[0.07] rounded-2xl p-7 overflow-hidden">
            <div
              className="text-[15px] font-bold text-[#f0f4ff] tracking-tight flex items-center gap-2.5 mb-1.5"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              <span className="text-[#00d4ff]">▐</span>
              Processing Rate vs. Competitors
            </div>
            <div className="text-xs text-[#7a8aaa] mb-6">
              Lower is better · Circuit shown at Enterprise rate ({circuitBestRate.toFixed(2)}%)
            </div>

            {loading ? (
              <div className="flex flex-col gap-3.5">
                {[100, 90, 85, 95, 80, 88, 75].map((w, i) => (
                  <Shimmer key={i} className={`h-8`} style={{ width: `${w}%` } as React.CSSProperties} />
                ))}
              </div>
            ) : (
              <BarChart competitors={competitors} circuitRate={circuitBestRate} />
            )}
          </div>

          {/* Calculator Panel */}
          <div className="bg-[#0e1420] border border-white/[0.07] rounded-2xl p-7 flex flex-col gap-0">
            <div
              className="text-[15px] font-bold text-[#f0f4ff] tracking-tight flex items-center gap-2.5 mb-1.5"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              <span className="text-[#00ff9d]">◈</span>
              Savings Calculator
            </div>
            <div className="text-xs text-[#7a8aaa] mb-5">
              Enter your monthly volume to see your savings
            </div>

            {/* Volume Input */}
            <div className="mb-5">
              <label className="block font-mono text-[11px] text-[#7a8aaa] tracking-[1.2px] uppercase mb-2.5">
                Monthly Processing Volume
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#00d4ff] font-mono text-base font-medium pointer-events-none">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  placeholder="25,000"
                  className="w-full bg-[#141c2e] rounded-xl py-3.5 pl-8 pr-3.5 text-[#f0f4ff]
                             font-mono text-[22px] font-medium tracking-tight outline-none
                             transition-all duration-200
                             focus:shadow-[0_0_0_3px_rgba(0,212,255,0.1)]"
                  style={{
                    border: "1px solid rgba(0,212,255,0.2)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#00d4ff")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "rgba(0,212,255,0.2)")
                  }
                />
              </div>
              {activeTier && (
                <div
                  className="mt-2.5 inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-md text-[#00d4ff]"
                  style={{
                    background: "rgba(0,212,255,0.08)",
                    border: "1px solid rgba(0,212,255,0.2)",
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "#00d4ff",
                      boxShadow: "0 0 6px #00d4ff",
                    }}
                  />
                  {activetier.tier_name} Tier · {activeTier.rate_percentage.toFixed(2)}% · {activeTier.label}
                </div>
              )}
            </div>

            {/* Savings List */}
            <div className="flex flex-col gap-2.5 flex-1">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Shimmer key={i} className="h-14 rounded-xl" />
                  ))
                : competitors
                    .slice()
                    .sort((a, b) => b.rate_percentage - a.rate_percentage)
                    .map((c) => (
                      <SavingsRow
                        key={c.id}
                        competitor={c}
                        circuitRate={activeTier?.rate_percentage ?? circuitBestRate}
                        volume={volume}
                      />
                    ))}
            </div>

            {/* Annual Spotlight */}
            <div
              className="mt-4 rounded-2xl p-[18px] text-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,255,157,0.08) 0%, rgba(0,212,255,0.05) 100%)",
                border: "1px solid rgba(0,255,157,0.2)",
              }}
            >
              <div className="font-mono text-[11px] text-[#00ff9d] tracking-[2px] uppercase mb-1.5">
                ⬆ Total Annual Savings
              </div>
              <div
                className="text-[32px] font-extrabold text-[#00ff9d] leading-none"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  textShadow: "0 0 30px rgba(0,255,157,0.4)",
                }}
              >
                {loading ? (
                  <Shimmer className="h-8 w-32 mx-auto" />
                ) : (
                  fmtDollars(Math.max(0, maxMonthlySaving) * 12)
                )}
              </div>
              <div className="text-xs text-[#7a8aaa] mt-1">
                vs. {bestCompetitorName} at {fmtDollars(volume)}/mo volume
              </div>
            </div>
          </div>
        </div>

        {/* ── PRICING TIERS ── */}
        <div className="px-10 pb-2 font-bold text-[#3d4f6e] tracking-[2px] uppercase text-[13px]"
          style={{ fontFamily: "'Syne', sans-serif" }}>
          Pricing Tiers
        </div>

        <div className="px-10 pb-10 pt-5">
          <div className="bg-[#0e1420] border border-white/[0.07] rounded-2xl p-7">
            <div
              className="text-[15px] font-bold text-[#f0f4ff] tracking-tight flex items-center gap-2.5 mb-1.5"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              <span className="text-[#ffd166]">◆</span>
              Circuit Pricing Tiers
            </div>
            <div className="text-xs text-[#7a8aaa] mb-6">
              Rates scale down as your volume grows — no contracts, no surprises
            </div>

            <div className="grid grid-cols-4 gap-3 max-[700px]:grid-cols-2">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Shimmer key={i} className="h-32 rounded-2xl" />
                  ))
                : sortedTiers.map((tier) => (
                    <TierCard
                      key={tier.id}
                      tier={tier}
                      isActive={activeTier?.name === tier.tier_name}
                    />
                  ))}
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="px-10 pb-10 flex gap-3 flex-wrap">
          <button
            className="px-7 py-3.5 rounded-xl font-bold text-sm tracking-wide
                       text-[#080c12] bg-[#00d4ff] transition-all duration-200
                       hover:bg-[#33ddff] hover:-translate-y-px"
            style={{
              fontFamily: "'Syne', sans-serif",
              boxShadow: "0 0 24px rgba(0,212,255,0.3)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 0 36px rgba(0,212,255,0.5)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow =
                "0 0 24px rgba(0,212,255,0.3)")
            }
          >
            Get Started with Circuit →
          </button>
          <button
            className="px-7 py-3.5 rounded-xl font-bold text-sm tracking-wide
                       text-[#7a8aaa] bg-transparent border border-white/[0.07]
                       hover:border-white/[0.15] hover:text-[#f0f4ff] transition-all duration-200"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Talk to Sales
          </button>
          <button
            className="px-7 py-3.5 rounded-xl font-bold text-sm tracking-wide
                       text-[#7a8aaa] bg-transparent border border-white/[0.07]
                       hover:border-white/[0.15] hover:text-[#f0f4ff] transition-all duration-200"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Download Rate Sheet
          </button>
        </div>
      </div>
    </>
  );
}
