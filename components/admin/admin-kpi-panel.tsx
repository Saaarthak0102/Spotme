"use client";

import { useState, useEffect, useId } from "react";
import type { ExtendedKPIData } from "@/lib/admin-data";
import { DonutChart, HorizontalBarChart, MiniSparkline } from "@/components/admin/charts";

/* ──────────────────────────────────────────────────────────
   STATIC STRATEGY CONSTANTS (from spotme_growth_strategy.md)
   ────────────────────────────────────────────────────────── */

/** First-event survey data — N=20 — June 15-16, 2026 */
const SURVEY = {
  totalResponses: 20,
  foundPhotosEasily: 7,
  triedAndFailed: 9,
  notTried: 2,
  wouldBuyAlbum: 9,
  maybeBuyAlbum: 6,
  wontBuyAlbum: 4,
  avgRating: 3.25,
  ratingsDistribution: [
    { stars: 5, count: 3 },
    { stars: 4, count: 6 },
    { stars: 3, count: 7 },
    { stars: 2, count: 2 },
    { stars: 1, count: 2 },
  ],
  featureRequests: [
    { name: "WhatsApp Notifications", value: 9 },
    { name: "Cloud Photo Vault", value: 5 },
    { name: "Instant Digital Albums", value: 3 },
    { name: "AI Best-Shot Selection", value: 3 },
  ],
  merchandiseInterest: [
    { name: "Custom T-Shirts", value: 9 },
    { name: "Keychain", value: 8 },
    { name: "Printed Photo Album", value: 8 },
    { name: "Custom Mug", value: 5 },
    { name: "Framed Photos", value: 5 },
    { name: "Photo Magnets", value: 5 },
  ],
};

/** 12-month MRR growth roadmap targets */
const MRR_ROADMAP = [
  { month: "M1", target: 0, photographers: 5 },
  { month: "M2", target: 20000, photographers: 10 },
  { month: "M3", target: 50000, photographers: 25 },
  { month: "M4", target: 80000, photographers: 40 },
  { month: "M5", target: 120000, photographers: 60 },
  { month: "M6", target: 160000, photographers: 80 },
  { month: "M7", target: 200000, photographers: 100 },
  { month: "M8", target: 225000, photographers: 120 },
  { month: "M9", target: 300000, photographers: 150 },
  { month: "M10", target: 380000, photographers: 200 },
  { month: "M11", target: 480000, photographers: 220 },
  { month: "M12", target: 600000, photographers: 250 },
];

/** KPI targets from strategy doc */
const TARGETS = {
  photoDiscoveryRate: 70, // target %, currently 35%
  qrScanRate: 50, // > 50%
  timeToFirstEvent: 7, // < 7 days
  monthlyChurn: 5, // < 5%
  ltvCacRatio: 10, // > 10:1
  virality: 1, // k-factor > 1
  instagram: { month3: 10000, month6: 5000 },
  trialToPaid: 20, // > 20%
  cacOrganic: 3000, // < ₹3,000
};

/* ──────────────────────────────────────────────────────────
   HELPER COMPONENTS
   ────────────────────────────────────────────────────────── */

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#D67D5C] to-[#B36144] text-white shadow-sm">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </span>
      <div>
        <h2 className="text-sm font-bold text-[#2D2D2D] tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-[#827970] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Live
    </span>
  );
}

function StrategyBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
      <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
      Strategy
    </span>
  );
}

function KpiCard({
  title, value, icon, sub, accent, target, current, unit = "%",
}: {
  title: string;
  value: string | number;
  icon: string;
  sub?: string;
  accent?: string;
  target?: number;
  current?: number;
  unit?: string;
}) {
  const pct = target && current != null ? Math.min(100, (current / target) * 100) : null;
  const isGood = pct != null && pct >= 80;
  const isWarning = pct != null && pct >= 50 && pct < 80;

  return (
    <div className="rounded-2xl border border-[#EFE6DD] bg-white p-5 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)] hover:shadow-[0_8px_30px_rgba(148,73,44,0.08)] transition-all duration-300 flex flex-col justify-between min-h-[172px]">
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent || "from-[#D67D5C] to-[#B36144] text-white"}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        {sub && <span className="text-[10px] font-semibold uppercase tracking-wider text-[#827970] bg-stone-100 px-2 py-1 rounded-md max-w-[120px] text-right leading-tight">{sub}</span>}
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-bold text-[#827970] uppercase tracking-widest">{title}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-[#2D2D2D]">{value}</p>
        {pct != null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-[#827970] mb-1">
              <span>Progress to target ({target}{unit})</span>
              <span className={`font-bold ${isGood ? "text-emerald-600" : isWarning ? "text-amber-600" : "text-red-500"}`}>{pct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${isGood ? "bg-emerald-500" : isWarning ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceholderCard({ title, icon, reason }: { title: string; icon: string; reason: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#EFE6DD] bg-[#FAF5EF]/30 p-5 shadow-sm flex flex-col items-center text-center justify-center min-h-[172px]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-400 mb-3">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      <h3 className="text-xs font-bold text-[#2D2D2D] mb-1">{title}</h3>
      <p className="text-[10px] text-[#827970] leading-relaxed max-w-[200px]">{reason}</p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   STAR RATING CHART — animated bars
   ────────────────────────────────────────────────────────── */

function StarRatingChart({ ratings }: { ratings: { stars: number; count: number }[] }) {
  const uid = useId();
  const [mounted, setMounted] = useState(false);
  const total = ratings.reduce((s, r) => s + r.count, 0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#D67D5C"];

  return (
    <div className="space-y-2.5">
      {[...ratings].reverse().map((r, i) => {
        const pct = total > 0 ? (r.count / total) * 100 : 0;
        const color = colors[r.stars - 1];
        return (
          <div key={`${uid}-star-${r.stars}`} className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 w-16 shrink-0">
              {Array.from({ length: 5 }).map((_, si) => (
                <span key={si} className="material-symbols-outlined text-[13px]" style={{ color: si < r.stars ? color : "#e5e7eb" }}>
                  star
                </span>
              ))}
            </div>
            <div className="flex-1 h-5 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-1000"
                style={{
                  width: mounted ? `${Math.max(pct, 4)}%` : "0%",
                  backgroundColor: color,
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            </div>
            <div className="text-xs font-bold text-[#2D2D2D] w-8 text-right">{r.count}</div>
            <div className="text-[10px] text-[#827970] w-8">{pct.toFixed(0)}%</div>
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   MRR PROJECTION CHART — smooth area SVG
   ────────────────────────────────────────────────────────── */

function MRRProjectionChart({ currentMrr }: { currentMrr: number }) {
  const uid = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const svgW = 700, svgH = 220;
  const pad = { top: 20, right: 20, bottom: 40, left: 60 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  const maxMrr = Math.max(...MRR_ROADMAP.map(m => m.target), currentMrr) * 1.1;
  const niceMax = Math.ceil(maxMrr / 100000) * 100000 || 100000;

  const xStep = plotW / (MRR_ROADMAP.length - 1);

  const targetPts: [number, number][] = MRR_ROADMAP.map((m, i) => [
    pad.left + i * xStep,
    pad.top + plotH - (m.target / niceMax) * plotH,
  ]);

  function smoothPath(pts: [number, number][], close?: { baseline: number; x0: number; x1: number }): string {
    if (pts.length === 0) return "";
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i];
      const cpx = (prev[0] + curr[0]) / 2;
      d += ` C${cpx},${prev[1]} ${cpx},${curr[1]} ${curr[0]},${curr[1]}`;
    }
    if (close) d += ` L${close.x1},${close.baseline} L${close.x0},${close.baseline} Z`;
    return d;
  }

  const areaPath = smoothPath(targetPts, { baseline: pad.top + plotH, x0: targetPts[0][0], x1: targetPts[targetPts.length - 1][0] });
  const linePath = smoothPath(targetPts);

  // Current MRR horizontal line
  const currentY = pad.top + plotH - (currentMrr / niceMax) * plotH;

  const gridVals = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="h-2 w-8 rounded-full bg-gradient-to-r from-[#D67D5C] to-[#F4A261]" />
          <span className="text-xs text-[#827970]">Target MRR Roadmap</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-8 border-t-2 border-dashed border-blue-400" />
          <span className="text-xs text-[#827970]">Current MRR</span>
        </div>
      </div>
      <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`${uid}-mrrGrad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D67D5C" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#D67D5C" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Grid */}
        {gridVals.map((v, i) => {
          const gy = pad.top + plotH - (v / niceMax) * plotH;
          return (
            <g key={i}>
              <line x1={pad.left} y1={gy} x2={pad.left + plotW} y2={gy} stroke="rgba(45,45,45,0.06)" strokeDasharray={i === 0 ? "none" : "4 4"} />
              <text x={pad.left - 8} y={gy} textAnchor="end" dominantBaseline="central" fill="#827970" fontSize={9} fontFamily="system-ui">
                {v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : v > 0 ? `₹${(v / 1000).toFixed(0)}K` : "₹0"}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {MRR_ROADMAP.map((m, i) => (
          <text key={i} x={pad.left + i * xStep} y={svgH - 8} textAnchor="middle" fill="#827970" fontSize={9} fontFamily="system-ui">
            {m.month}
          </text>
        ))}

        {/* Area + line */}
        <path d={areaPath} fill={`url(#${uid}-mrrGrad)`} style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.8s ease 0.2s" }} />
        <path d={linePath} fill="none" stroke="#D67D5C" strokeWidth={2.5} strokeLinecap="round" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.8s ease 0.3s", filter: "drop-shadow(0 0 6px rgba(214,125,92,0.4))" }} />

        {/* Dots */}
        {targetPts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3.5} fill="white" stroke="#D67D5C" strokeWidth={2} style={{ opacity: mounted ? 1 : 0, transition: `opacity 0.4s ease ${0.4 + i * 0.05}s` }} />
        ))}

        {/* Current MRR line */}
        {currentMrr > 0 && (
          <g>
            <line x1={pad.left} y1={currentY} x2={pad.left + plotW} y2={currentY} stroke="#5B8DEF" strokeWidth={1.5} strokeDasharray="6 4" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.6s" }} />
            <text x={pad.left + plotW + 4} y={currentY} dominantBaseline="central" fill="#5B8DEF" fontSize={9} fontWeight={600} fontFamily="system-ui" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.7s" }}>
              Now
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   PHOTO DISCOVERY GAUGE
   ────────────────────────────────────────────────────────── */

function DiscoveryGauge({ value, target }: { value: number; target: number }) {
  const uid = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const size = 160;
  const strokeW = 18;
  const r = (size - strokeW) / 2;
  const center = size / 2;
  // Half-circle (180deg arc)
  const circumference = Math.PI * r;

  const valuePct = Math.min(value / 100, 1);
  const targetPct = Math.min(target / 100, 1);

  // strokeDasharray for half-circle
  const valueDash = valuePct * circumference;
  const targetDash = targetPct * circumference;

  const isGood = value >= target * 0.8;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`${uid}-gaugeGrad`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={isGood ? "#22c55e" : "#ef4444"} />
            <stop offset="100%" stopColor={isGood ? "#86efac" : "#fca5a5"} />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d={`M ${strokeW / 2},${center} A ${r},${r} 0 0 1 ${size - strokeW / 2},${center}`}
          fill="none"
          stroke="#EFE6DD"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Target marker */}
        <path
          d={`M ${strokeW / 2},${center} A ${r},${r} 0 0 1 ${size - strokeW / 2},${center}`}
          fill="none"
          stroke="#D67D5C"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${targetDash} ${circumference - targetDash}`}
          style={{ opacity: 0.2 }}
        />
        {/* Value */}
        <path
          d={`M ${strokeW / 2},${center} A ${r},${r} 0 0 1 ${size - strokeW / 2},${center}`}
          fill="none"
          stroke={`url(#${uid}-gaugeGrad)`}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${mounted ? valueDash : 0} ${circumference}`}
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1) 0.2s", filter: "drop-shadow(0 0 8px rgba(34,197,94,0.3))" }}
        />

        {/* Value text */}
        <text x={center} y={center - 8} textAnchor="middle" fill="#2D2D2D" fontSize={28} fontWeight={700} fontFamily="system-ui">
          {value}%
        </text>
        <text x={center} y={center + 14} textAnchor="middle" fill="#827970" fontSize={10} fontFamily="system-ui">
          Photo Discovery
        </text>
      </svg>
      <div className="flex items-center gap-4 mt-1 text-[11px]">
        <span className="flex items-center gap-1 text-[#827970]">
          <span className="h-2 w-2 rounded-full bg-[#D67D5C]/30 border border-[#D67D5C]/50" />
          Target: {target}%
        </span>
        <span className={`flex items-center gap-1 font-semibold ${isGood ? "text-emerald-600" : "text-red-500"}`}>
          <span className="material-symbols-outlined text-[13px]">{isGood ? "check_circle" : "warning"}</span>
          {isGood ? "On Track" : "Needs Work"}
        </span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   FUNNEL CHART
   ────────────────────────────────────────────────────────── */

function FunnelChart({ stages }: { stages: { label: string; value: number; color: string }[] }) {
  const [mounted, setMounted] = useState(false);
  const maxVal = stages[0]?.value || 1;

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = (s.value / maxVal) * 100;
        const convFrom = i > 0 ? ((s.value / stages[i - 1].value) * 100).toFixed(0) : null;
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-[#2D2D2D]">{s.label}</span>
              <div className="flex items-center gap-2">
                {convFrom && (
                  <span className="text-[10px] text-[#827970] bg-stone-100 px-1.5 py-0.5 rounded-md">↓ {convFrom}%</span>
                )}
                <span className="font-bold text-[#2D2D2D]">{s.value.toLocaleString()}</span>
              </div>
            </div>
            <div className="h-8 rounded-lg bg-stone-100 overflow-hidden">
              <div
                className="h-full rounded-lg flex items-center pl-3 transition-all duration-1000"
                style={{
                  width: mounted ? `${pct}%` : "0%",
                  backgroundColor: s.color,
                  transitionDelay: `${i * 100}ms`,
                  filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.08))",
                }}
              >
                {pct > 20 && <span className="text-[10px] font-bold text-white">{pct.toFixed(0)}%</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   TAB BAR
   ────────────────────────────────────────────────────────── */

const TABS = [
  { id: "overview", label: "Overview", icon: "space_dashboard" },
  { id: "survey", label: "Survey Insights", icon: "poll" },
  { id: "acquisition", label: "Acquisition", icon: "person_add" },
  { id: "product", label: "Product Health", icon: "health_and_safety" },
  { id: "revenue", label: "Revenue", icon: "payments" },
  { id: "growth", label: "Growth Roadmap", icon: "rocket_launch" },
] as const;

type TabId = typeof TABS[number]["id"];

/* ──────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────── */

export function AdminKPIsPanel() {
  const [data, setData] = useState<ExtendedKPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("overview");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const r = await fetch("/api/admin/kpis");
      const d = await r.json();
      setData(d);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-[#827970]">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-[#D67D5C]" />
        <span className="text-sm">Loading KPI data...</span>
      </div>
    );
  }

  const mrr = data ? data.mrr / 100 : 0; // in rupees
  const currentMonth = MRR_ROADMAP[0]; // Month 1 target

  // Derived live numbers
  const photoDiscoveryLive = 35; // from first event — we track this as the current baseline
  const qrScanRateLive = data ? Math.min(100, ((data.photoSearchCount || 0) / Math.max(data.totalVisitors || 1, 1)) * 100) : 0;

  // Funnel data
  const funnelStages = data
    ? [
        { label: "Total Visitors", value: data.totalVisitors, color: "#D67D5C" },
        { label: "Pricing Page Views", value: Math.round(data.totalVisitors * (data.homepageToPricingRate / 100)), color: "#F4A261" },
        { label: "Inquiries / Leads", value: data.totalInquiries, color: "#60D9A0" },
        { label: "Paying Customers", value: data.payingCustomers, color: "#5B8DEF" },
      ]
    : [];

  // Donut: Photo discovery breakdown
  const discoveryDonut = [
    { label: "Found Easily", value: SURVEY.foundPhotosEasily, color: "#22c55e" },
    { label: "Tried & Failed", value: SURVEY.triedAndFailed, color: "#ef4444" },
    { label: "Didn't Try", value: SURVEY.notTried, color: "#e5e7eb" },
  ];

  // Merch interest donut
  const merchDonut = [
    { label: "Would Buy", value: SURVEY.wouldBuyAlbum, color: "#D67D5C" },
    { label: "Maybe", value: SURVEY.maybeBuyAlbum, color: "#F4A261" },
    { label: "Won't Buy", value: SURVEY.wontBuyAlbum, color: "#e5e7eb" },
  ];

  return (
    <div className="space-y-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#D67D5C]">Admin</p>
            <LiveBadge />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#2D2D2D] tracking-tight">Growth KPI Dashboard</h1>
          <p className="mt-1 text-xs sm:text-sm text-[#827970] hidden sm:block">
            Powered by real-event data (N=20, June 15–16, 2026) + live platform metrics.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-[#EFE6DD] bg-white px-4 py-2.5 text-xs font-semibold text-[#574F49] hover:bg-stone-50 transition active:scale-95 disabled:opacity-50 shadow-sm self-start sm:self-auto"
        >
          <span className={`material-symbols-outlined text-[16px] ${refreshing ? "animate-spin" : ""}`}>refresh</span>
          Refresh
        </button>
      </div>

      {/* North Star Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#2D1A0E] via-[#3D2210] to-[#2D1A0E] p-5 sm:p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #D67D5C 0%, transparent 60%), radial-gradient(circle at 70% 50%, #F4A261 0%, transparent 60%)" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#D67D5C] mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">star</span>
              North Star Metric
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-white">Photos Successfully Delivered / Month</h2>
            <p className="mt-1 text-xs text-stone-400 max-w-md">Captures product value (delivery works), photographer value (events run), and guest value (photos found).</p>
          </div>
          <div className="flex items-center gap-6 sm:text-right">
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wider">Avg Rating</p>
              <p className="text-3xl font-black text-white">{SURVEY.avgRating}<span className="text-base text-stone-400">/5</span></p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wider">Photo Discovery</p>
              <p className="text-3xl font-black text-[#D67D5C]">35%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              tab === t.id
                ? "bg-[#D67D5C] text-white shadow-md shadow-[#D67D5C]/25"
                : "bg-white border border-[#EFE6DD] text-[#827970] hover:text-[#2D2D2D] hover:border-[#D67D5C]/30"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && data && (
        <div className="space-y-6 animate-fade-in">
          {/* Top KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Monthly Recurring Revenue" value={`₹${mrr.toLocaleString()}`} icon="account_balance_wallet" accent="from-green-500 to-emerald-600 text-white" sub="MRR" target={20000} current={mrr} unit="₹" />
            <KpiCard title="Paying Photographers" value={data.payingCustomers} icon="photo_camera" accent="from-blue-500 to-indigo-600 text-white" target={10} current={data.payingCustomers} unit="" />
            <KpiCard title="Active Photographers" value={data.activePhotographers} icon="linked_camera" sub="Last 30 Days" target={10} current={data.activePhotographers} unit="" />
            <KpiCard title="Total Inquiries" value={data.totalInquiries} icon="inbox" accent="from-stone-500 to-stone-600 text-white" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Acquisition funnel */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader icon="filter_alt" title="Conversion Funnel" subtitle="Visitor → Customer journey" />
                <LiveBadge />
              </div>
              {funnelStages.length > 0 ? (
                <FunnelChart stages={funnelStages} />
              ) : (
                <p className="text-sm text-[#827970] text-center py-8">No funnel data yet.</p>
              )}
              <div className="mt-4 pt-4 border-t border-[#EFE6DD] grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-[#827970]">Home → Pricing</p>
                  <p className="text-lg font-bold text-[#2D2D2D]">{data.homepageToPricingRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-[#827970]">Pricing → Inquiry</p>
                  <p className="text-lg font-bold text-[#2D2D2D]">{data.pricingToInquiryRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-[#827970]">Visitor → Customer</p>
                  <p className="text-lg font-bold text-[#2D2D2D]">{data.visitorToCustomerRate.toFixed(2)}%</p>
                </div>
              </div>
            </div>

            {/* Photo discovery gauge + survey */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader icon="face" title="Photo Discovery Rate" subtitle="From first live event (N=20)" />
                <StrategyBadge />
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <DiscoveryGauge value={photoDiscoveryLive} target={TARGETS.photoDiscoveryRate} />
                <div className="flex-1 space-y-3 w-full">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#827970]">Breakdown (N=20)</p>
                  {discoveryDonut.map((d) => (
                    <div key={d.label} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-[#2D2D2D] flex-1">{d.label}</span>
                      <span className="text-xs font-bold text-[#2D2D2D]">{d.value}</span>
                      <span className="text-[10px] text-[#827970]">{((d.value / 20) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                  <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">⚠️ Critical Insight</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">45% of users tried and failed to find their photos. This is Priority #1 product problem before scaling marketing.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Traffic & Engagement row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total Unique Visitors" value={data.totalVisitors.toLocaleString()} icon="group" />
            <KpiCard title="Visitor Growth Rate" value={data.visitorGrowthRate !== null ? `${data.visitorGrowthRate.toFixed(1)}%` : "N/A"} icon="trending_up" sub="vs Last Week" />
            <KpiCard title="Returning Visitors" value={`${data.returningVisitorRate.toFixed(1)}%`} icon="assignment_return" />
            <KpiCard title="Avg Session Duration" value={data.avgSessionDurationSec != null ? formatDuration(data.avgSessionDurationSec) : "N/A"} icon="timer" sub="Approximate" />
          </div>

          {/* Feature engagement */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="CTA Click Rate" value={data.ctaClickRate != null ? `${data.ctaClickRate.toFixed(1)}%` : "N/A"} icon="ads_click" sub="Visitors who clicked" />
            <KpiCard title="Photo Search Rate" value={data.photoSearchRate != null ? `${data.photoSearchRate.toFixed(1)}%` : "N/A"} icon="search" sub={`${data.photoSearchCount || 0} searches`} />
            <KpiCard title="Photo Download Rate" value={data.photoDownloadRate != null ? `${data.photoDownloadRate.toFixed(1)}%` : "N/A"} icon="download" sub={`${data.photoDownloadCount || 0} downloads`} />
            <KpiCard title="Zero-Result Searches" value={data.zeroResultSearches != null ? data.zeroResultSearches.toLocaleString() : "N/A"} icon="search_off" accent="from-red-400 to-rose-500 text-white" sub={data.photoSearchCount > 0 ? `of ${data.photoSearchCount} searches` : undefined} />
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Sources */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white overflow-hidden shadow-sm">
              <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#2D2D2D]">Traffic by Source</h3>
                  <p className="text-xs text-[#827970] mt-0.5">Visits and Conversions by UTM</p>
                </div>
                <LiveBadge />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-t border-[#EFE6DD] bg-[#FAF5EF]/50">
                      <th className="text-left px-6 py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Source</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Visits</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Signups</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Conv%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE6DD]">
                    {data.topSources.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-[#827970] text-sm">No data yet.</td></tr>
                    ) : (
                      data.topSources.map((s, i) => {
                        const signupData = data.signupsBySource.find(x => x.source === s.source);
                        const signups = signupData ? signupData.signups : 0;
                        const rateData = data.conversionRateBySource.find(x => x.source === s.source);
                        const rate = rateData ? rateData.rate : 0;
                        return (
                          <tr key={i} className="hover:bg-stone-50/50 transition">
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#D67D5C]/10 text-[10px] font-bold text-[#94492c]">{i + 1}</span>
                                <span className="font-medium text-[#2D2D2D] text-xs">{s.source}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-[#2D2D2D] text-xs">{s.visits.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-bold text-blue-500 text-xs">{signups}</td>
                            <td className="px-6 py-3 text-right font-bold text-emerald-500 text-xs">{rate.toFixed(1)}%</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Page Visits */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white overflow-hidden shadow-sm">
              <div className="px-6 pt-5 pb-3">
                <h3 className="text-sm font-bold text-[#2D2D2D]">Top Pages</h3>
                <p className="text-xs text-[#827970] mt-0.5">Most visited URLs</p>
              </div>
              <div className="overflow-x-auto max-h-[260px]">
                <table className="w-full text-sm relative">
                  <thead className="sticky top-0 bg-[#FAF5EF]/95 backdrop-blur-sm border-b border-[#EFE6DD]">
                    <tr>
                      <th className="text-left px-6 py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Page Path</th>
                      <th className="text-right px-6 py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Visits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE6DD]">
                    {data.pageVisits.length === 0 ? (
                      <tr><td colSpan={2} className="px-6 py-8 text-center text-[#827970] text-sm">No visits tracked yet.</td></tr>
                    ) : (
                      data.pageVisits.map((p, i) => (
                        <tr key={i} className="hover:bg-stone-50/50 transition">
                          <td className="px-6 py-3 font-medium text-[#2D2D2D] truncate max-w-[200px] text-xs">{p.page}</td>
                          <td className="px-6 py-3 text-right font-bold text-[#2D2D2D] text-xs">{p.visits.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SURVEY INSIGHTS TAB ── */}
      {tab === "survey" && (
        <div className="space-y-6 animate-fade-in">
          {/* Survey header */}
          <div className="rounded-2xl bg-gradient-to-br from-[#FDF8F1] to-[#FFF5EE] border border-[#EFE6DD] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <StrategyBadge />
                <h2 className="mt-2 text-base font-bold text-[#2D2D2D]">First Event Survey Analysis</h2>
                <p className="text-xs text-[#827970] mt-1">N=20 real guest responses · June 15–16, 2026 · Spotme's first live event</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center sm:text-right">
                <div>
                  <p className="text-xs text-[#827970]">Avg Rating</p>
                  <p className="text-3xl font-black text-[#D67D5C]">{SURVEY.avgRating}</p>
                  <p className="text-[10px] text-[#827970]">out of 5.0</p>
                </div>
                <div>
                  <p className="text-xs text-[#827970]">Phone Numbers</p>
                  <p className="text-3xl font-black text-emerald-600">75%</p>
                  <p className="text-[10px] text-[#827970]">submitted (trust signal)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Star ratings */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="star" title="Rating Distribution" subtitle="From 20 first-event respondents" />
              <StarRatingChart ratings={SURVEY.ratingsDistribution} />
              <div className="mt-4 pt-4 border-t border-[#EFE6DD] flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 p-3">
                <span className="material-symbols-outlined text-amber-500 text-[20px]">info</span>
                <p className="text-[11px] text-amber-800 leading-relaxed"><strong>Insight:</strong> Rating skews 3 stars. Product works but isn't delightful yet. Target: 4.5+ avg rating before scaling.</p>
              </div>
            </div>

            {/* Photo discovery donuts */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="face" title="Photo Discovery Split" subtitle="Did guests find their photos?" />
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <DonutChart data={discoveryDonut} size={160} />
                <div className="flex-1 space-y-3">
                  {discoveryDonut.map((d) => (
                    <div key={d.label} className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-[#2D2D2D]">{d.label}</span>
                          <span className="font-bold">{d.value}/20</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-stone-100">
                          <div className="h-full rounded-full" style={{ width: `${(d.value / 20) * 100}%`, backgroundColor: d.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-[#827970] pt-2">Current target: <strong className="text-[#D67D5C]">70%+</strong> discovery rate (Month 3 goal)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature requests */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="add_box" title="Feature Request Votes" subtitle="What users want next" />
              <HorizontalBarChart data={SURVEY.featureRequests} />
              <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                <p className="text-[11px] text-emerald-800 leading-relaxed"><strong>#1 Request:</strong> WhatsApp Notifications (9 votes) — this is table stakes, not a bonus. Ship first.</p>
              </div>
            </div>

            {/* Merchandise interest */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="shopping_bag" title="Merchandise Interest" subtitle="Physical product demand" />
              <HorizontalBarChart data={SURVEY.merchandiseInterest} />
              <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3">
                <p className="text-[11px] text-blue-800 leading-relaxed"><strong>Revenue opportunity:</strong> 75% want physical merch. At 100 photographers × 5 events × ₹500 avg merch = <strong>₹2.5L/month</strong> additional.</p>
              </div>
            </div>
          </div>

          {/* Merch purchase intent */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <SectionHeader icon="local_shipping" title="Photo Album Purchase Intent" subtitle="Would you buy a printed album from Spotme?" />
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <DonutChart data={merchDonut} size={160} />
              <div className="flex-1 grid grid-cols-3 gap-4 text-center">
                <div className="rounded-xl bg-[#FDF8F1] p-4">
                  <p className="text-3xl font-black text-[#D67D5C]">45%</p>
                  <p className="text-xs text-[#827970] mt-1 font-medium">Would Buy</p>
                  <p className="text-[10px] text-[#827970]">9 users</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-3xl font-black text-amber-500">30%</p>
                  <p className="text-xs text-[#827970] mt-1 font-medium">Maybe Buy</p>
                  <p className="text-[10px] text-[#827970]">6 users</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-3xl font-black text-stone-400">20%</p>
                  <p className="text-xs text-[#827970] mt-1 font-medium">Won't Buy</p>
                  <p className="text-[10px] text-[#827970]">4 users</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ACQUISITION TAB ── */}
      {tab === "acquisition" && data && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total Visitors" value={data.totalVisitors.toLocaleString()} icon="group" target={2000} current={data.totalVisitors} unit="" />
            <KpiCard title="Visitor Growth" value={data.visitorGrowthRate != null ? `${data.visitorGrowthRate.toFixed(1)}%` : "N/A"} icon="trending_up" sub="vs Last Week" />
            <KpiCard title="Inquiries (Leads)" value={data.totalInquiries} icon="mail" target={10} current={data.totalInquiries} unit="" />
            <PlaceholderCard title="CAC" icon="attach_money" reason="Feature to add: marketing spend input in Admin Settings to enable CAC calculation. Target: <₹3,000 organic." />
          </div>

          {/* Funnel deep dive */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <SectionHeader icon="filter_alt" title="Full Acquisition Funnel" subtitle="Visitor to paying customer conversion" />
              <LiveBadge />
            </div>
            {funnelStages.length > 0 ? (
              <>
                <FunnelChart stages={funnelStages} />
                <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-[#EFE6DD]">
                  <div className="text-center rounded-xl bg-[#FDF8F1] p-4">
                    <p className="text-[10px] text-[#827970] uppercase tracking-wider mb-1">Home → Pricing</p>
                    <p className="text-2xl font-bold text-[#D67D5C]">{data.homepageToPricingRate.toFixed(1)}%</p>
                    <p className="text-[10px] text-[#827970] mt-1">Target: &gt;5%</p>
                  </div>
                  <div className="text-center rounded-xl bg-[#FDF8F1] p-4">
                    <p className="text-[10px] text-[#827970] uppercase tracking-wider mb-1">Pricing → Inquiry</p>
                    <p className="text-2xl font-bold text-[#D67D5C]">{data.pricingToInquiryRate.toFixed(1)}%</p>
                    <p className="text-[10px] text-[#827970] mt-1">Target: &gt;8%</p>
                  </div>
                  <div className="text-center rounded-xl bg-[#FDF8F1] p-4">
                    <p className="text-[10px] text-[#827970] uppercase tracking-wider mb-1">Visitor → Customer</p>
                    <p className="text-2xl font-bold text-[#D67D5C]">{data.visitorToCustomerRate.toFixed(2)}%</p>
                    <p className="text-[10px] text-[#827970] mt-1">Target: &gt;0.5%</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#827970] text-center py-8">No visitor data yet.</p>
            )}
          </div>

          {/* Sources + Drop-off */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#EFE6DD] bg-white overflow-hidden shadow-sm">
              <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#2D2D2D]">Traffic Sources</h3>
                  <p className="text-xs text-[#827970]">UTM breakdown</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#EFE6DD] bg-[#FAF5EF]/50">
                    <th className="text-left px-6 py-2.5 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Source</th>
                    <th className="text-right px-6 py-2.5 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Visits</th>
                    <th className="text-right px-6 py-2.5 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Conv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE6DD]">
                  {data.topSources.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-[#827970] text-sm">No source data yet.</td></tr>
                  ) : (
                    data.topSources.slice(0, 6).map((s, i) => {
                      const rateData = data.conversionRateBySource.find(x => x.source === s.source);
                      return (
                        <tr key={i} className="hover:bg-stone-50/50 transition">
                          <td className="px-6 py-3 font-medium text-[#2D2D2D] text-xs">{s.source}</td>
                          <td className="px-6 py-3 text-right font-bold text-[#2D2D2D] text-xs">{s.visits}</td>
                          <td className="px-6 py-3 text-right font-bold text-emerald-500 text-xs">{rateData ? `${rateData.rate.toFixed(1)}%` : "—"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Drop-off insights */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="filter_alt_off" title="Drop-off Intelligence" subtitle="Where users are leaving" />
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5">block</span>
                  <div>
                    <p className="text-xs font-bold text-red-700">Highest Drop-off Page</p>
                    <p className="text-sm font-bold text-[#2D2D2D] mt-0.5">{data.highestDropOffPage || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5">filter_alt_off</span>
                  <div>
                    <p className="text-xs font-bold text-amber-700">Funnel Drop-off Step</p>
                    <p className="text-sm font-bold text-[#2D2D2D] mt-0.5">{data.funnelDropOffStep || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5">touch_app</span>
                  <div>
                    <p className="text-xs font-bold text-blue-700">Most Clicked CTA</p>
                    <p className="text-sm font-bold text-[#2D2D2D] mt-0.5">{data.mostClickedButton || "N/A"}</p>
                    {data.mostClickedButtonCount > 0 && <p className="text-[10px] text-[#827970]">{data.mostClickedButtonCount} clicks</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCT HEALTH TAB ── */}
      {tab === "product" && data && (
        <div className="space-y-6 animate-fade-in">
          {/* Photo discovery hero */}
          <div className="rounded-2xl border-2 border-[#D67D5C]/20 bg-gradient-to-br from-[#FDF8F1] to-white p-6">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="text-center">
                <DiscoveryGauge value={photoDiscoveryLive} target={TARGETS.photoDiscoveryRate} />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-[#2D2D2D] mb-1">Photo Discovery Rate — Priority #1</h2>
                <p className="text-xs text-[#827970] leading-relaxed mb-4">Only 35% of guests found photos easily at the first event. 45% tried and failed. The strategy target is 70%+ by Month 3. This is the single most important product metric before any marketing spend.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                    <p className="text-2xl font-black text-red-500">65%</p>
                    <p className="text-[10px] text-[#827970]">Failed or didn't try</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                    <p className="text-2xl font-black text-emerald-500">70%</p>
                    <p className="text-[10px] text-[#827970]">Month 3 target</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Avg Events / Photographer" value={data.avgEventsPerPhotographer.toFixed(1)} icon="library_add" target={4} current={data.avgEventsPerPhotographer} unit="" />
            <KpiCard title="Repeat Event Rate" value={`${data.repeatPhotographerRate.toFixed(1)}%`} icon="replay" target={60} current={data.repeatPhotographerRate} />
            <KpiCard title="Photo Searches" value={data.photoSearchCount || 0} icon="search" sub="Total selfie uploads" />
            <KpiCard title="Downloads" value={data.photoDownloadCount || 0} icon="download" sub="Photos saved" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature usage */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="star" title="Feature Usage" subtitle="Most and least used platform features" />
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="material-symbols-outlined text-emerald-500 text-[18px]">star</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Most Used Feature</p>
                    <p className="text-sm font-bold text-[#2D2D2D]">{data.mostUsedFeature || "No data yet"}</p>
                    {data.mostUsedFeatureCount > 0 && <p className="text-[10px] text-[#827970]">{data.mostUsedFeatureCount} uses</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <span className="material-symbols-outlined text-red-400 text-[18px]">visibility_off</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Least Used Feature</p>
                    <p className="text-sm font-bold text-[#2D2D2D]">{data.leastUsedFeature || "No data yet"}</p>
                    {data.leastUsedFeatureCount > 0 && <p className="text-[10px] text-[#827970]">{data.leastUsedFeatureCount} uses</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Retention */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="event_repeat" title="Retention & Engagement" />
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#827970]">User Retention (WoW)</span>
                    <span className="font-bold text-[#2D2D2D]">{data.userRetentionRate != null ? `${data.userRetentionRate.toFixed(1)}%` : "Need 2+ weeks"}</span>
                  </div>
                  {data.userRetentionRate != null && (
                    <div className="h-2 rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-blue-400" style={{ width: `${data.userRetentionRate}%` }} />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#827970]">Returning Visitors</span>
                    <span className="font-bold text-[#2D2D2D]">{data.returningVisitorRate.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-[#D67D5C]" style={{ width: `${data.returningVisitorRate}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#827970]">Avg Pages / Session</span>
                    <span className="font-bold text-[#2D2D2D]">{data.avgPagesPerSession.toFixed(1)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, (data.avgPagesPerSession / 8) * 100)}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#EFE6DD] rounded-xl bg-[#FDF8F1] p-3">
                <p className="text-[10px] text-[#827970]"><strong className="text-[#D67D5C]">Target:</strong> DAU/MAU &gt;40% · Events/Photographer/Month &gt;4 · Churn &lt;5%/month</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <PlaceholderCard title="Monthly Churn" icon="person_remove" reason="Feature to add: subscription start/cancel tracking. Target: <5%/month." />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REVENUE TAB ── */}
      {tab === "revenue" && data && (
        <div className="space-y-6 animate-fade-in">
          {/* MRR chart */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <SectionHeader icon="show_chart" title="MRR Growth Roadmap" subtitle="12-month strategy targets vs current performance" />
              <StrategyBadge />
            </div>
            <MRRProjectionChart currentMrr={mrr} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Current MRR" value={`₹${mrr.toLocaleString()}`} icon="account_balance_wallet" accent="from-green-500 to-emerald-600 text-white" target={20000} current={mrr} unit="₹" />
            <KpiCard title="Avg Revenue / User" value={`₹${(data.avgRevenuePerCustomer / 100).toLocaleString()}`} icon="query_stats" />
            <PlaceholderCard title="LTV" icon="diamond" reason="Feature to add: payments table with timestamps. Target: ₹25,000+ per customer (at 4% churn)." />
            <PlaceholderCard title="LTV:CAC Ratio" icon="balance" reason="Feature to add: combine LTV computation with CAC tracking. Target: >10:1." />
          </div>

          {/* Pricing tiers */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <SectionHeader icon="workspace_premium" title="Pricing Strategy Tiers" subtitle="From growth strategy document" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { plan: "Starter", price: "₹999/mo", target: "Part-time photographer, <5 events/month", color: "from-stone-400 to-stone-500" },
                { plan: "Pro", price: "₹2,499/mo", target: "Full-time photographer, 10–20 events/month", color: "from-[#D67D5C] to-[#B36144]" },
                { plan: "Studio", price: "₹5,999/mo", target: "Photography studio, white-label", color: "from-amber-500 to-orange-500" },
                { plan: "Enterprise", price: "₹15,000+/event", target: "Corporate agencies, annual contracts", color: "from-blue-500 to-indigo-600" },
              ].map((tier) => (
                <div key={tier.plan} className="rounded-2xl border border-[#EFE6DD] p-5 text-center">
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tier.color} text-white mb-3`}>
                    <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                  </span>
                  <p className="text-sm font-bold text-[#2D2D2D]">{tier.plan}</p>
                  <p className="text-lg font-black text-[#D67D5C] mt-1">{tier.price}</p>
                  <p className="text-[10px] text-[#827970] mt-2 leading-relaxed">{tier.target}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Merch revenue projection */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader icon="shopping_bag" title="Merch Revenue Potential" subtitle="Based on 75% survey interest" />
              <StrategyBadge />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="rounded-xl bg-[#FDF8F1] border border-[#EFE6DD] p-4 text-center">
                <p className="text-[10px] text-[#827970] uppercase tracking-wider mb-2">100 Photographers</p>
                <p className="text-2xl font-black text-[#D67D5C]">₹2.5L</p>
                <p className="text-[10px] text-[#827970] mt-1">per month (5 events × ₹500 merch)</p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
                <p className="text-[10px] text-[#827970] uppercase tracking-wider mb-2">500 Photographers</p>
                <p className="text-2xl font-black text-amber-600">₹12.5L</p>
                <p className="text-[10px] text-[#827970] mt-1">per month (5 events × ₹500 merch)</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                <p className="text-[10px] text-[#827970] uppercase tracking-wider mb-2">1,000 Photographers</p>
                <p className="text-2xl font-black text-emerald-600">₹1.5Cr</p>
                <p className="text-[10px] text-[#827970] mt-1">annually (30% take rate)</p>
              </div>
            </div>
            <p className="text-[11px] text-[#827970] mt-4 text-center">Top merch items by demand: T-Shirts (9 votes) · Keychains (8) · Photo Albums (8)</p>
          </div>
        </div>
      )}

      {/* ── GROWTH ROADMAP TAB ── */}
      {tab === "growth" && (
        <div className="space-y-6 animate-fade-in">
          {/* Market opportunity */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <SectionHeader icon="public" title="Market Opportunity" subtitle="TAM / SAM / SOM — India 2026" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "TAM", value: "$1.5B", sub: "Wedding + Event + Photography Market", color: "from-blue-500 to-indigo-600" },
                { label: "SAM", value: "₹108Cr", sub: "~30,000 tech-forward photographers × ₹3K/mo", color: "from-[#D67D5C] to-[#B36144]" },
                { label: "SOM (Year 1)", value: "₹1.2Cr", sub: "500 photographers × ₹2K/mo", color: "from-emerald-500 to-teal-600" },
              ].map((m) => (
                <div key={m.label} className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(135deg, #FDF8F1, #FFF5EE)" }}>
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.color} text-white text-xs font-black mb-3`}>{m.label}</span>
                  <p className="text-2xl font-black text-[#2D2D2D]">{m.value}</p>
                  <p className="text-[10px] text-[#827970] mt-1 leading-relaxed">{m.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 12-month roadmap timeline */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <SectionHeader icon="rocket_launch" title="12-Month MRR Roadmap" subtitle="Photographer count and revenue targets" />
              <StrategyBadge />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-[#EFE6DD] bg-[#FAF5EF]/50">
                    <th className="text-left px-4 py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Month</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Target Photographers</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Target MRR</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider">MRR Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE6DD]">
                  {MRR_ROADMAP.map((row, i) => {
                    const isCurrentMonth = i === 0;
                    const actualMrr = isCurrentMonth ? mrr : null;
                    const progressPct = actualMrr != null && row.target > 0 ? Math.min(100, (actualMrr / row.target) * 100) : null;
                    return (
                      <tr key={row.month} className={`hover:bg-stone-50/50 transition ${isCurrentMonth ? "bg-[#FDF8F1]" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold ${isCurrentMonth ? "bg-[#D67D5C] text-white" : "bg-stone-100 text-stone-500"}`}>{row.month}</span>
                            {isCurrentMonth && <span className="text-[10px] font-bold text-[#D67D5C]">← Now</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#2D2D2D] text-xs">{row.photographers}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#2D2D2D] text-xs">{row.target === 0 ? "₹0" : `₹${(row.target / 1000).toFixed(0)}K`}</td>
                        <td className="px-4 py-3">
                          {progressPct != null ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-stone-100">
                                <div className="h-full rounded-full bg-[#D67D5C]" style={{ width: `${progressPct}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-[#D67D5C] w-8">{progressPct.toFixed(0)}%</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#827970]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strategy KPI targets */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <SectionHeader icon="flag" title="90-Day Strategy KPI Targets" subtitle="From growth strategy document — Month 3 goals" />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Photo Discovery Rate", target: "70%+", current: "35%", icon: "face", ok: false },
                { label: "Instagram Followers", target: "5,000", current: "0", icon: "instagram", ok: false },
                { label: "Trial → Paid Conv.", target: ">20%", current: "—", icon: "workspace_premium", ok: false },
                { label: "Organic Signups", target: ">60%", current: "—", icon: "nature", ok: false },
                { label: "CAC (Organic)", target: "<₹3,000", current: "—", icon: "attach_money", ok: false },
                { label: "Monthly Churn", target: "<5%", current: "—", icon: "person_remove", ok: false },
                { label: "QR Scan Rate", target: ">50%", current: "~35%", icon: "qr_code_2", ok: false },
                { label: "Events / Photographer", target: ">4/month", current: data?.avgEventsPerPhotographer.toFixed(1) ?? "—", icon: "library_add", ok: (data?.avgEventsPerPhotographer || 0) >= 4 },
                { label: "NPS Score", target: ">40", current: "—", icon: "speed", ok: false },
              ].map((kpi) => (
                <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.ok ? "border-emerald-200 bg-emerald-50" : "border-[#EFE6DD] bg-[#FAF5EF]/50"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-[18px] text-[#D67D5C]">{kpi.icon}</span>
                    <span className={`text-[9px] font-bold uppercase rounded-full px-1.5 py-0.5 ${kpi.ok ? "bg-emerald-200 text-emerald-700" : "bg-stone-200 text-stone-500"}`}>
                      {kpi.ok ? "On Track" : "Pending"}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-[#827970] uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-base font-black text-[#D67D5C] mt-1">{kpi.target}</p>
                  <p className="text-[10px] text-[#827970] mt-0.5">Current: <strong className="text-[#2D2D2D]">{kpi.current}</strong></p>
                </div>
              ))}
            </div>
          </div>

          {/* ROI Activity Ranking */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <SectionHeader icon="trending_up" title="Highest-ROI Growth Activities" subtitle="Ranked by impact for current stage" />
            <div className="space-y-3">
              {[
                { rank: 1, activity: "Fix Photo Discovery (35% → 70%)", cost: "₹0 (developer time)", roi: "2× retention", effort: "High", color: "bg-red-500" },
                { rank: 2, activity: "Ship WhatsApp Notifications", cost: "₹0 (developer time)", roi: "#1 feature request", effort: "Medium", color: "bg-orange-400" },
                { rank: 3, activity: "WhatsApp 15 survey respondents", cost: "₹0", roi: "2–3 warm referrals", effort: "Low", color: "bg-amber-400" },
                { rank: 4, activity: "DM 100 photographers on Instagram", cost: "₹0", roi: "10 demo calls", effort: "Low", color: "bg-yellow-400" },
                { rank: 5, activity: "Post survey data as viral content", cost: "₹0", roi: "500+ reach + credibility", effort: "Low", color: "bg-lime-400" },
                { rank: 6, activity: "Partner with college photography clubs", cost: "₹2,000/event", roi: "Free social proof events", effort: "Medium", color: "bg-green-400" },
                { rank: 7, activity: "Cold email 200 photographers", cost: "₹0", roi: "5–10 demo calls", effort: "Medium", color: "bg-teal-400" },
                { rank: 8, activity: "LinkedIn build-in-public posts", cost: "₹0", roi: "Organic leads", effort: "Low", color: "bg-blue-400" },
              ].map((item) => (
                <div key={item.rank} className="flex items-center gap-3 p-3 rounded-xl border border-[#EFE6DD] hover:bg-stone-50/50 transition">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.color} text-white text-[11px] font-black`}>{item.rank}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#2D2D2D] truncate">{item.activity}</p>
                    <p className="text-[10px] text-[#827970]">Cost: {item.cost}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-emerald-600">{item.roi}</p>
                    <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-bold ${item.effort === "Low" ? "bg-green-100 text-green-700" : item.effort === "Medium" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{item.effort} effort</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
