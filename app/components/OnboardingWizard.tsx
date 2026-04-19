"use client";

/**
 * OnboardingWizard.tsx
 * Circuit POS — Merchant Onboarding Wizard
 *
 * Requirements:
 *   npm install @supabase/supabase-js
 *
 * Environment variables (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
 *
 * Supabase merchants table schema:
 *   id                        uuid primary key default gen_random_uuid()
 *   user_id                   uuid references auth.users
 *   business_name             text
 *   business_type             text
 *   email                     text
 *   phone                     text
 *   address                   jsonb
 *   current_processor         text
 *   current_rate_percentage   numeric
 *   current_per_transaction_fee numeric
 *   current_monthly_fee       numeric
 *   estimated_monthly_volume  numeric
 *   estimated_transaction_count integer
 *   circuit_rate_percentage   numeric
 *   circuit_per_transaction_fee numeric
 *   estimated_monthly_savings numeric
 *   stripe_account_id         text
 *   stripe_onboarding_complete boolean default false
 *   created_at                timestamptz default now()
 *   updated_at                timestamptz default now()
 *
 * Usage:
 *   import OnboardingWizard from "@/components/OnboardingWizard";
 *   // Pass userId from your auth session
 *   <OnboardingWizard userId="auth-user-uuid" onComplete={(merchantId) => router.push('/dashboard')} />
 */

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Circuit pricing constants ─────────────────────────────────────────────────
const CIRCUIT_RATE_PERCENTAGE = 2.4;          // %
const CIRCUIT_PER_TRANSACTION_FEE = 0.1;      // $0.10

// ── Types ────────────────────────────────────────────────────────────────────
interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

interface MerchantData {
  // Step 2
  business_name: string;
  business_type: string;
  email: string;
  phone: string;
  address: Address;
  // Step 3
  current_processor: string;
  current_rate_percentage: string;
  current_per_transaction_fee: string;
  current_monthly_fee: string;
  // Step 4
  estimated_monthly_volume: string;
  estimated_transaction_count: string;
  // Stripe
  stripe_account_id: string;
  stripe_onboarding_complete: boolean;
}

interface SavingsCalc {
  currentMonthlyCost: number;
  circuitMonthlyCost: number;
  monthlySavings: number;
  annualSavings: number;
  savingsPercent: number;
}

interface OnboardingWizardProps {
  userId?: string;
  onComplete?: (merchantId: string) => void;
}

type StepKey = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// ── Validation ───────────────────────────────────────────────────────────────
type ValidationErrors = Partial<Record<string, string>>;

function validateStep(step: StepKey, data: MerchantData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (step === 2) {
    if (!data.business_name.trim()) errors.business_name = "Business name is required";
    if (!data.business_type) errors.business_type = "Please select a business type";
    if (!data.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      errors.email = "Enter a valid email address";
    if (!data.phone.trim()) errors.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-().]{7,}$/.test(data.phone))
      errors.phone = "Enter a valid phone number";
    if (!data.address.line1.trim()) errors["address.line1"] = "Street address is required";
    if (!data.address.city.trim()) errors["address.city"] = "City is required";
    if (!data.address.state.trim()) errors["address.state"] = "State is required";
    if (!data.address.zip.trim()) errors["address.zip"] = "ZIP code is required";
    else if (!/^\d{5}(-\d{4})?$/.test(data.address.zip))
      errors["address.zip"] = "Enter a valid ZIP code";
  }

  if (step === 3) {
    if (!data.current_processor.trim())
      errors.current_processor = "Processor name is required";
    if (!data.current_rate_percentage)
      errors.current_rate_percentage = "Current rate is required";
    else if (
      isNaN(Number(data.current_rate_percentage)) ||
      Number(data.current_rate_percentage) < 0 ||
      Number(data.current_rate_percentage) > 10
    )
      errors.current_rate_percentage = "Enter a valid rate (0–10%)";
  }

  if (step === 4) {
    if (!data.estimated_monthly_volume)
      errors.estimated_monthly_volume = "Monthly volume is required";
    else if (isNaN(Number(data.estimated_monthly_volume)) || Number(data.estimated_monthly_volume) < 0)
      errors.estimated_monthly_volume = "Enter a valid amount";
    if (!data.estimated_transaction_count)
      errors.estimated_transaction_count = "Transaction count is required";
    else if (isNaN(Number(data.estimated_transaction_count)) || Number(data.estimated_transaction_count) < 0)
      errors.estimated_transaction_count = "Enter a valid count";
  }

  return errors;
}

// ── Savings calculator ────────────────────────────────────────────────────────
function calcSavings(data: MerchantData): SavingsCalc {
  const volume = Number(data.estimated_monthly_volume) || 0;
  const txCount = Number(data.estimated_transaction_count) || 0;
  const currentRate = Number(data.current_rate_percentage) || 0;
  const currentPerTx = Number(data.current_per_transaction_fee) || 0;
  const currentMonthly = Number(data.current_monthly_fee) || 0;

  const currentMonthlyCost =
    (currentRate / 100) * volume +
    currentPerTx * txCount +
    currentMonthly;

  const circuitMonthlyCost =
    (CIRCUIT_RATE_PERCENTAGE / 100) * volume +
    CIRCUIT_PER_TRANSACTION_FEE * txCount;

  const monthlySavings = Math.max(0, currentMonthlyCost - circuitMonthlyCost);
  const annualSavings = monthlySavings * 12;
  const savingsPercent =
    currentMonthlyCost > 0 ? (monthlySavings / currentMonthlyCost) * 100 : 0;

  return { currentMonthlyCost, circuitMonthlyCost, monthlySavings, annualSavings, savingsPercent };
}

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt$ = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const fmtShort$ = (n: number) =>
  n >= 1000
    ? `$${(n / 1000).toFixed(1)}k`
    : n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });

// ── Step metadata ─────────────────────────────────────────────────────────────
const STEPS = [
  { key: 1, label: "Welcome" },
  { key: 2, label: "Business" },
  { key: 3, label: "Processor" },
  { key: 4, label: "Volume" },
  { key: 5, label: "Savings" },
  { key: 6, label: "Stripe" },
  { key: 7, label: "Complete" },
] as const;

const BUSINESS_TYPES = [
  "Retail",
  "Restaurant / Food & Beverage",
  "E-commerce",
  "Professional Services",
  "Health & Beauty",
  "Automotive",
  "Home Services",
  "Education",
  "Non-Profit",
  "Other",
];

const PROCESSORS = [
  "Square",
  "Stripe",
  "PayPal / Zettle",
  "Clover",
  "Shopify Payments",
  "Toast",
  "Heartland",
  "First Data / Fiserv",
  "Worldpay",
  "Other",
];

// ── UI primitives ─────────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
      {children}
      {required && <span className="text-purple-400 ml-1">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">⚠ {message}</p>;
}

const inputBase =
  "w-full bg-gray-900 border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-all duration-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/60";

const inputNormal = `${inputBase} border-gray-800 hover:border-gray-700`;
const inputError  = `${inputBase} border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20`;

function Input({
  label,
  required,
  error,
  prefix,
  suffix,
  ...props
}: {
  label?: string;
  required?: boolean;
  error?: string;
  prefix?: string;
  suffix?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          {...props}
          className={`${error ? inputError : inputNormal} ${prefix ? "pl-7" : ""} ${suffix ? "pr-10" : ""}`}
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      <FieldError message={error} />
    </div>
  );
}

function Select({
  label,
  required,
  error,
  options,
  placeholder,
  ...props
}: {
  label?: string;
  required?: boolean;
  error?: string;
  options: string[];
  placeholder?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <select
        {...props}
        className={`${error ? inputError : inputNormal} appearance-none cursor-pointer`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o} value={o} className="bg-gray-900">
            {o}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = ((current - 1) / (total - 1)) * 100;
  return (
    <div className="mb-8">
      <div className="flex justify-between mb-3">
        {STEPS.map((s) => {
          const done = s.key < current;
          const active = s.key === current;
          return (
            <div key={s.key} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${done ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30" : ""}
                  ${active ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white ring-2 ring-purple-400/40 ring-offset-2 ring-offset-gray-950 shadow-lg shadow-purple-500/40" : ""}
                  ${!done && !active ? "bg-gray-800 text-gray-600" : ""}
                `}
              >
                {done ? "✓" : s.key}
              </div>
              <span
                className={`text-[9px] font-semibold uppercase tracking-wider hidden sm:block
                  ${active ? "text-purple-400" : done ? "text-gray-500" : "text-gray-700"}`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Nav buttons ───────────────────────────────────────────────────────────────
function NavButtons({
  onBack,
  onNext,
  nextLabel = "Continue",
  loading = false,
  hideBack = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  loading?: boolean;
  hideBack?: boolean;
}) {
  return (
    <div className={`flex gap-3 mt-8 ${hideBack ? "justify-end" : "justify-between"}`}>
      {!hideBack && onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-400 border border-gray-800
                     hover:border-gray-700 hover:text-gray-300 transition-all duration-200 disabled:opacity-40"
        >
          ← Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={loading}
        className="px-8 py-3 rounded-xl text-sm font-bold text-white
                   bg-gradient-to-r from-purple-600 to-pink-600
                   hover:from-purple-500 hover:to-pink-500
                   shadow-lg shadow-purple-600/30 hover:shadow-purple-500/40
                   transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                   flex items-center gap-2"
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
        {nextLabel} {!loading && "→"}
      </button>
    </div>
  );
}

// ── Savings stat card ─────────────────────────────────────────────────────────
function SavingsStat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 border transition-all ${
        highlight
          ? "bg-gradient-to-br from-purple-950/60 to-pink-950/40 border-purple-500/30"
          : "bg-gray-900 border-gray-800"
      }`}
    >
      <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">{label}</div>
      <div
        className={`text-2xl font-extrabold tracking-tight ${
          highlight ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400" : "text-white"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

// ── Step components ───────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 text-4xl
                      bg-gradient-to-br from-purple-600/30 to-pink-600/20 border border-purple-500/30
                      shadow-2xl shadow-purple-600/20">
        ⚡
      </div>
      <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">
        Welcome to Circuit POS
      </h1>
      <p className="text-gray-400 text-base leading-relaxed max-w-md mx-auto mb-8">
        Let's get your merchant account set up in under 5 minutes. We'll show you exactly how
        much you'll save compared to your current processor.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8 text-left">
        {[
          { icon: "💰", title: "Save Up To 40%", desc: "Lower processing fees" },
          { icon: "⚡", title: "Same-Day Setup", desc: "Start accepting payments today" },
          { icon: "🔒", title: "Stripe Powered", desc: "Enterprise-grade security" },
        ].map((f) => (
          <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="text-sm font-bold text-white mb-0.5">{f.title}</div>
            <div className="text-xs text-gray-500">{f.desc}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="px-10 py-4 rounded-xl text-base font-bold text-white
                   bg-gradient-to-r from-purple-600 to-pink-600
                   hover:from-purple-500 hover:to-pink-500
                   shadow-2xl shadow-purple-600/40 hover:shadow-purple-500/50
                   transition-all duration-200 hover:-translate-y-0.5"
      >
        Get Started →
      </button>
      <p className="text-xs text-gray-600 mt-4">No credit card required to start</p>
    </div>
  );
}

function StepBusiness({
  data,
  errors,
  onChange,
  onBack,
  onNext,
  loading,
}: {
  data: MerchantData;
  errors: ValidationErrors;
  onChange: (field: string, value: string) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
}) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-white mb-1">Business Information</h2>
      <p className="text-gray-500 text-sm mb-6">Tell us about your business</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Business Name"
            required
            placeholder="Acme Coffee Co."
            value={data.business_name}
            onChange={(e) => onChange("business_name", e.target.value)}
            error={errors.business_name}
          />
        </div>

        <div className="sm:col-span-2">
          <Select
            label="Business Type"
            required
            options={BUSINESS_TYPES}
            placeholder="Select a category..."
            value={data.business_type}
            onChange={(e) => onChange("business_type", e.target.value)}
            error={errors.business_type}
          />
        </div>

        <Input
          label="Email Address"
          required
          type="email"
          placeholder="hello@yourbusiness.com"
          value={data.email}
          onChange={(e) => onChange("email", e.target.value)}
          error={errors.email}
        />

        <Input
          label="Phone Number"
          required
          type="tel"
          placeholder="(555) 000-0000"
          value={data.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          error={errors.phone}
        />

        <div className="sm:col-span-2">
          <Input
            label="Street Address"
            required
            placeholder="123 Main Street"
            value={data.address.line1}
            onChange={(e) => onChange("address.line1", e.target.value)}
            error={errors["address.line1"]}
          />
        </div>

        <Input
          label="Suite / Unit"
          placeholder="Apt 4B (optional)"
          value={data.address.line2}
          onChange={(e) => onChange("address.line2", e.target.value)}
        />

        <Input
          label="City"
          required
          placeholder="Philadelphia"
          value={data.address.city}
          onChange={(e) => onChange("address.city", e.target.value)}
          error={errors["address.city"]}
        />

        <Input
          label="State"
          required
          placeholder="PA"
          maxLength={2}
          value={data.address.state}
          onChange={(e) => onChange("address.state", e.target.value.toUpperCase())}
          error={errors["address.state"]}
        />

        <Input
          label="ZIP Code"
          required
          placeholder="19103"
          value={data.address.zip}
          onChange={(e) => onChange("address.zip", e.target.value)}
          error={errors["address.zip"]}
        />
      </div>

      <NavButtons onBack={onBack} onNext={onNext} loading={loading} />
    </div>
  );
}

function StepProcessor({
  data,
  errors,
  onChange,
  onBack,
  onNext,
  loading,
}: {
  data: MerchantData;
  errors: ValidationErrors;
  onChange: (field: string, value: string) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
}) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-white mb-1">Current Payment Processor</h2>
      <p className="text-gray-500 text-sm mb-6">
        We'll use this to calculate your exact savings with Circuit
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Select
            label="Current Processor"
            required
            options={PROCESSORS}
            placeholder="Select your processor..."
            value={data.current_processor}
            onChange={(e) => onChange("current_processor", e.target.value)}
            error={errors.current_processor}
          />
        </div>

        <Input
          label="Processing Rate"
          required
          type="number"
          step="0.01"
          min="0"
          max="10"
          placeholder="2.70"
          value={data.current_rate_percentage}
          onChange={(e) => onChange("current_rate_percentage", e.target.value)}
          error={errors.current_rate_percentage}
          suffix="%"
        />

        <Input
          label="Per-Transaction Fee"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.30"
          value={data.current_per_transaction_fee}
          onChange={(e) => onChange("current_per_transaction_fee", e.target.value)}
          prefix="$"
        />

        <div className="sm:col-span-2">
          <Input
            label="Monthly Fee (if any)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={data.current_monthly_fee}
            onChange={(e) => onChange("current_monthly_fee", e.target.value)}
            prefix="$"
          />
        </div>
      </div>

      <div className="mt-4 bg-blue-950/30 border border-blue-500/20 rounded-xl p-4">
        <p className="text-xs text-blue-400 leading-relaxed">
          💡 <strong>Where to find this:</strong> Check your processor's monthly statement or account
          dashboard. Your interchange rate is usually listed as "Processing Rate" or "Discount Rate."
        </p>
      </div>

      <NavButtons onBack={onBack} onNext={onNext} loading={loading} />
    </div>
  );
}

function StepVolume({
  data,
  errors,
  onChange,
  onBack,
  onNext,
  loading,
}: {
  data: MerchantData;
  errors: ValidationErrors;
  onChange: (field: string, value: string) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
}) {
  const volumePresets = [
    { label: "$5k", value: "5000" },
    { label: "$10k", value: "10000" },
    { label: "$25k", value: "25000" },
    { label: "$50k", value: "50000" },
    { label: "$100k", value: "100000" },
    { label: "$250k+", value: "250000" },
  ];

  const txPresets = [
    { label: "100", value: "100" },
    { label: "250", value: "250" },
    { label: "500", value: "500" },
    { label: "1,000", value: "1000" },
    { label: "2,500", value: "2500" },
    { label: "5,000+", value: "5000" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-white mb-1">Volume Estimation</h2>
      <p className="text-gray-500 text-sm mb-6">
        Estimates are fine — we'll refine this over time
      </p>

      <div className="space-y-6">
        <div>
          <Label required>Estimated Monthly Volume</Label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
            {volumePresets.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onChange("estimated_monthly_volume", p.value)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all duration-150
                  ${data.estimated_monthly_volume === p.value
                    ? "bg-purple-600/30 border-purple-500/60 text-purple-300"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min="0"
            placeholder="Or enter custom amount..."
            value={data.estimated_monthly_volume}
            onChange={(e) => onChange("estimated_monthly_volume", e.target.value)}
            error={errors.estimated_monthly_volume}
            prefix="$"
          />
        </div>

        <div>
          <Label required>Estimated Monthly Transactions</Label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
            {txPresets.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onChange("estimated_transaction_count", p.value)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all duration-150
                  ${data.estimated_transaction_count === p.value
                    ? "bg-purple-600/30 border-purple-500/60 text-purple-300"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min="0"
            placeholder="Or enter custom count..."
            value={data.estimated_transaction_count}
            onChange={(e) => onChange("estimated_transaction_count", e.target.value)}
            error={errors.estimated_transaction_count}
          />
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={onNext} loading={loading} />
    </div>
  );
}

function StepSavings({
  data,
  savings,
  onBack,
  onNext,
  loading,
}: {
  data: MerchantData;
  savings: SavingsCalc;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
}) {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-white mb-1">Your Savings Preview</h2>
      <p className="text-gray-500 text-sm mb-6">
        Here's what switching to Circuit saves you
      </p>

      {/* Hero savings banner */}
      <div className="relative rounded-2xl p-6 mb-5 overflow-hidden border border-purple-500/30
                      bg-gradient-to-br from-purple-950/80 via-gray-950 to-pink-950/40">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/5 pointer-events-none" />
        <div className="relative">
          <div className="text-xs text-purple-400 uppercase tracking-widest font-semibold mb-2">
            Estimated Annual Savings
          </div>
          <div className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text
                          bg-gradient-to-r from-purple-400 to-pink-400 mb-1">
            {fmt$(savings.annualSavings)}
          </div>
          <div className="text-sm text-gray-400">
            That's <span className="text-white font-semibold">{fmt$(savings.monthlySavings)}/month</span>
            {" "}back in your pocket — a{" "}
            <span className="text-purple-300 font-semibold">{savings.savingsPercent.toFixed(0)}% reduction</span>
            {" "}in processing costs
          </div>
        </div>
      </div>

      {/* Comparison grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <SavingsStat
          label={`${data.current_processor || "Current"} / mo`}
          value={fmtShort$(savings.currentMonthlyCost)}
          sub="Your current cost"
        />
        <SavingsStat
          label="Circuit / mo"
          value={fmtShort$(savings.circuitMonthlyCost)}
          sub="With Circuit POS"
        />
        <SavingsStat
          label="Monthly Savings"
          value={fmtShort$(savings.monthlySavings)}
          sub="Net difference"
          highlight
        />
        <SavingsStat
          label="Annual Savings"
          value={fmtShort$(savings.annualSavings)}
          sub="Over 12 months"
          highlight
        />
      </div>

      {/* Rate comparison */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-4">
          Rate Breakdown
        </div>
        <div className="space-y-3">
          {[
            {
              label: "Processing Rate",
              current: `${data.current_rate_percentage || "—"}%`,
              circuit: `${CIRCUIT_RATE_PERCENTAGE}%`,
            },
            {
              label: "Per-Transaction Fee",
              current: `$${Number(data.current_per_transaction_fee || 0).toFixed(2)}`,
              circuit: `$${CIRCUIT_PER_TRANSACTION_FEE.toFixed(2)}`,
            },
            {
              label: "Monthly Fee",
              current: `$${Number(data.current_monthly_fee || 0).toFixed(2)}`,
              circuit: "$0.00",
            },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-sm text-gray-500 flex-1">{row.label}</span>
              <span className="text-sm text-red-400 w-20 text-right font-mono">{row.current}</span>
              <span className="text-gray-700 text-xs">→</span>
              <span className="text-sm text-green-400 w-20 text-right font-mono font-semibold">
                {row.circuit}
              </span>
            </div>
          ))}
        </div>
      </div>

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel="Connect Stripe"
        loading={loading}
      />
    </div>
  );
}

function StepStripe({
  data,
  merchantId,
  onBack,
  onNext,
  loading,
}: {
  data: MerchantData;
  merchantId: string | null;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
}) {
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  async function handleStripeConnect() {
    setStripeLoading(true);
    setStripeError(null);
    try {
      /**
       * In production: call your API route to create a Stripe Connect account
       * and return an onboarding URL.
       *
       * Example:
       *   const res = await fetch("/api/stripe/create-account", {
       *     method: "POST",
       *     body: JSON.stringify({ merchantId, email: data.email }),
       *   });
       *   const { url } = await res.json();
       *   window.location.href = url;
       *
       * The Stripe onboarding flow redirects back to your app with
       * ?stripe_success=true, at which point you update stripe_onboarding_complete.
       */
      await new Promise((r) => setTimeout(r, 1500)); // simulated delay
      // For demo, skip to completion:
      onNext();
    } catch {
      setStripeError("Failed to initiate Stripe setup. Please try again.");
    } finally {
      setStripeLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-white mb-1">Connect Your Stripe Account</h2>
      <p className="text-gray-500 text-sm mb-6">
        Circuit uses Stripe Connect to securely process your payments
      </p>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 bg-[#635BFF]/20 rounded-2xl flex items-center justify-center text-2xl border border-[#635BFF]/30">
            💳
          </div>
          <div>
            <div className="text-white font-bold text-base">Stripe Connect</div>
            <div className="text-gray-500 text-xs mt-0.5">PCI-DSS compliant · Bank-grade encryption</div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {[
            "Securely link your bank account for payouts",
            "No credit card required — Stripe verification only",
            "Funds typically deposited within 2 business days",
            "Full fraud protection and dispute management",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <span className="text-green-400 text-sm mt-px">✓</span>
              <span className="text-gray-400 text-sm">{item}</span>
            </div>
          ))}
        </div>

        {stripeError && (
          <div className="mb-4 bg-red-950/40 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
            ⚠ {stripeError}
          </div>
        )}

        <button
          onClick={handleStripeConnect}
          disabled={stripeLoading || loading}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white
                     bg-[#635BFF] hover:bg-[#5851e8]
                     shadow-lg shadow-[#635BFF]/30
                     transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
        >
          {stripeLoading && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {stripeLoading ? "Redirecting to Stripe..." : "Connect with Stripe →"}
        </button>
      </div>

      <div className="bg-yellow-950/30 border border-yellow-500/20 rounded-xl p-4">
        <p className="text-xs text-yellow-400/80 leading-relaxed">
          🔒 <strong>Your data is safe.</strong> Circuit never stores your banking credentials.
          Stripe handles all sensitive financial data in a separate, secured environment.
        </p>
      </div>

      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={onBack}
          disabled={loading || stripeLoading}
          className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-400 border border-gray-800
                     hover:border-gray-700 hover:text-gray-300 transition-all duration-200 disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={loading || stripeLoading}
          className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-500 border border-gray-800
                     hover:border-gray-700 hover:text-gray-400 transition-all duration-200 disabled:opacity-40"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

function StepComplete({
  data,
  savings,
  merchantId,
  onComplete,
}: {
  data: MerchantData;
  savings: SavingsCalc;
  merchantId: string | null;
  onComplete?: (id: string) => void;
}) {
  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 text-4xl
                      bg-gradient-to-br from-green-500/30 to-emerald-500/20 border border-green-500/30
                      shadow-2xl shadow-green-500/20">
        🎉
      </div>

      <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
        You're all set, {data.business_name || "there"}!
      </h2>
      <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
        Your Circuit POS account is ready. Start accepting payments and watch the savings add up.
      </p>

      <div className="bg-gradient-to-br from-purple-950/60 to-pink-950/40 border border-purple-500/30
                      rounded-2xl p-6 mb-6 text-left">
        <div className="text-xs text-purple-400 uppercase tracking-widest font-semibold mb-3">
          Your Annual Savings Potential
        </div>
        <div className="text-4xl font-extrabold text-transparent bg-clip-text
                        bg-gradient-to-r from-purple-400 to-pink-400 mb-1">
          {fmt$(savings.annualSavings)}
        </div>
        <div className="text-sm text-gray-500">
          vs. {data.current_processor || "your current processor"}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
        {[
          { icon: "📊", title: "Dashboard Ready", desc: "View transactions and analytics" },
          { icon: "💳", title: "Accept Payments", desc: "Card, contactless, and mobile" },
          { icon: "📈", title: "Track Savings", desc: "See savings accumulate in real-time" },
        ].map((item) => (
          <div key={item.title} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xl mb-2">{item.icon}</div>
            <div className="text-sm font-bold text-white mb-0.5">{item.title}</div>
            <div className="text-xs text-gray-500">{item.desc}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => merchantId && onComplete?.(merchantId)}
        className="px-10 py-4 rounded-xl text-base font-bold text-white
                   bg-gradient-to-r from-purple-600 to-pink-600
                   hover:from-purple-500 hover:to-pink-500
                   shadow-2xl shadow-purple-600/40 hover:shadow-purple-500/50
                   transition-all duration-200 hover:-translate-y-0.5"
      >
        Go to Dashboard →
      </button>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────
export default function OnboardingWizard({ userId, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<StepKey>(1);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [data, setData] = useState<MerchantData>({
    business_name: "",
    business_type: "",
    email: "",
    phone: "",
    address: { line1: "", line2: "", city: "", state: "", zip: "" },
    current_processor: "",
    current_rate_percentage: "",
    current_per_transaction_fee: "",
    current_monthly_fee: "",
    estimated_monthly_volume: "",
    estimated_transaction_count: "",
    stripe_account_id: "",
    stripe_onboarding_complete: false,
  });

  const savings = calcSavings(data);

  // Field change handler — supports nested address.* fields
  const handleChange = useCallback((field: string, value: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    if (field.startsWith("address.")) {
      const key = field.split(".")[1] as keyof Address;
      setData((prev) => ({
        ...prev,
        address: { ...prev.address, [key]: value },
      }));
    } else {
      setData((prev) => ({ ...prev, [field]: value }));
    }
  }, []);

  // Persist to Supabase
  const persist = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);

    const payload = {
      user_id: userId ?? null,
      business_name: data.business_name || null,
      business_type: data.business_type || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address,
      current_processor: data.current_processor || null,
      current_rate_percentage: data.current_rate_percentage ? Number(data.current_rate_percentage) : null,
      current_per_transaction_fee: data.current_per_transaction_fee
        ? Number(data.current_per_transaction_fee)
        : null,
      current_monthly_fee: data.current_monthly_fee ? Number(data.current_monthly_fee) : null,
      estimated_monthly_volume: data.estimated_monthly_volume
        ? Number(data.estimated_monthly_volume)
        : null,
      estimated_transaction_count: data.estimated_transaction_count
        ? Number(data.estimated_transaction_count)
        : null,
      circuit_rate_percentage: CIRCUIT_RATE_PERCENTAGE,
      circuit_per_transaction_fee: CIRCUIT_PER_TRANSACTION_FEE,
      estimated_monthly_savings: savings.monthlySavings,
      stripe_account_id: data.stripe_account_id || null,
      stripe_onboarding_complete: data.stripe_onboarding_complete,
      updated_at: new Date().toISOString(),
    };

    try {
      if (merchantId) {
        const { error } = await supabase
          .from("merchants")
          .update(payload)
          .eq("id", merchantId);
        if (error) throw error;
      } else {
        const { data: row, error } = await supabase
          .from("merchants")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select("id")
          .single();
        if (error) throw error;
        setMerchantId(row.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save. Please try again.";
      setGlobalError(msg);
      setLoading(false);
      return false;
    }

    setLoading(false);
    return true;
  }, [data, merchantId, savings.monthlySavings, userId]);

  const goNext = useCallback(async () => {
    // Validate current step
    const stepErrors = validateStep(step, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    // Persist on data-entry steps
    if (step >= 2 && step <= 6) {
      const ok = await persist();
      if (!ok) return;
    }

    setStep((s) => (Math.min(s + 1, 7) as StepKey));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, data, persist]);

  const goBack = useCallback(() => {
    setErrors({});
    setGlobalError(null);
    setStep((s) => (Math.max(s - 1, 1) as StepKey));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const showProgress = step > 1;

  return (
    <div className="min-h-screen bg-gray-950 flex items-start justify-center p-4 sm:p-8">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full
                        bg-purple-600/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full
                        bg-pink-600/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-xl">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600
                          flex items-center justify-center text-sm shadow-lg shadow-purple-600/30">
            ⚡
          </div>
          <span className="text-white font-extrabold text-sm tracking-tight">Circuit POS</span>
        </div>

        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-3xl p-6 sm:p-8
                        shadow-2xl shadow-black/50">
          {showProgress && (
            <ProgressBar current={step} total={STEPS.length} />
          )}

          {/* Global error */}
          {globalError && (
            <div className="mb-5 bg-red-950/50 border border-red-500/30 rounded-xl px-4 py-3
                            text-sm text-red-400 flex items-start gap-2">
              <span className="mt-0.5">⚠</span>
              <span>{globalError}</span>
            </div>
          )}

          {/* Steps */}
          {step === 1 && <StepWelcome onNext={goNext} />}

          {step === 2 && (
            <StepBusiness
              data={data}
              errors={errors}
              onChange={handleChange}
              onBack={goBack}
              onNext={goNext}
              loading={loading}
            />
          )}

          {step === 3 && (
            <StepProcessor
              data={data}
              errors={errors}
              onChange={handleChange}
              onBack={goBack}
              onNext={goNext}
              loading={loading}
            />
          )}

          {step === 4 && (
            <StepVolume
              data={data}
              errors={errors}
              onChange={handleChange}
              onBack={goBack}
              onNext={goNext}
              loading={loading}
            />
          )}

          {step === 5 && (
            <StepSavings
              data={data}
              savings={savings}
              onBack={goBack}
              onNext={goNext}
              loading={loading}
            />
          )}

          {step === 6 && (
            <StepStripe
              data={data}
              merchantId={merchantId}
              onBack={goBack}
              onNext={goNext}
              loading={loading}
            />
          )}

          {step === 7 && (
            <StepComplete
              data={data}
              savings={savings}
              merchantId={merchantId}
              onComplete={onComplete}
            />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-700 mt-6">
          🔒 256-bit SSL encryption · SOC 2 compliant · PCI-DSS Level 1
        </p>
      </div>
    </div>
  );
}
