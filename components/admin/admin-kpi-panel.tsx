"use client";

import { useState, useEffect, useId, useRef } from "react";
import type { ExtendedKPIData } from "@/lib/admin-data";
import { DonutChart, HorizontalBarChart } from "@/components/admin/charts";

/* ──────────────────────────────────────────────────────────
   SURVEY DATA TYPES
   ────────────────────────────────────────────────────────── */

interface SurveyData {
  totalResponses: number;
  foundPhotosEasily: number;
  triedAndFailed: number;
  notTried: number;
  wouldBuyAlbum: number;
  maybeBuyAlbum: number;
  wontBuyAlbum: number;
  avgRating: number;
  ratingsDistribution: { stars: number; count: number }[];
  featureRequests: { name: string; value: number }[];
  merchandiseInterest: { name: string; value: number }[];
  eventName?: string;
  eventDate?: string;
}

/** Default first-event survey data (N=20, June 15–16, 2026) */
const DEFAULT_SURVEY: SurveyData = {
  totalResponses: 20,
  foundPhotosEasily: 7,
  triedAndFailed: 9,
  notTried: 2,
  wouldBuyAlbum: 9,
  maybeBuyAlbum: 6,
  wontBuyAlbum: 4,
  avgRating: 3.25,
  eventName: "First Live Event",
  eventDate: "June 15–16, 2026",
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

/* ──────────────────────────────────────────────────────────
   CSV PARSER
   Expected columns (case-insensitive):
   rating, found_photos (yes/no/tried), buy_album (yes/maybe/no),
   feature_request, merch_interest, event_name, event_date
   ────────────────────────────────────────────────────────── */

function parseSurveyCSV(csvText: string): SurveyData {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));

  const col = (name: string) => headers.indexOf(name);

  const rows = lines.slice(1).map(line => {
    // Handle quoted fields
    const fields: string[] = [];
    let current = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { fields.push(current.trim()); current = ""; }
      else current += ch;
    }
    fields.push(current.trim());
    return fields;
  });

  // Rating
  const ratingCol = col("rating") >= 0 ? col("rating") : col("overall_rating");
  const ratingsMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRating = 0;
  let ratingCount = 0;
  if (ratingCol >= 0) {
    rows.forEach(r => {
      const v = parseFloat(r[ratingCol] ?? "");
      if (!isNaN(v) && v >= 1 && v <= 5) {
        const star = Math.round(v) as 1 | 2 | 3 | 4 | 5;
        ratingsMap[star] = (ratingsMap[star] || 0) + 1;
        totalRating += v;
        ratingCount++;
      }
    });
  }

  // Photo discovery
  const photoCol = col("found_photos") >= 0 ? col("found_photos") : col("photo_discovery");
  let foundPhotosEasily = 0, triedAndFailed = 0, notTried = 0;
  if (photoCol >= 0) {
    rows.forEach(r => {
      const v = (r[photoCol] ?? "").toLowerCase();
      if (v === "yes" || v === "found" || v === "easily") foundPhotosEasily++;
      else if (v === "tried" || v === "failed" || v === "no" || v === "tried_failed") triedAndFailed++;
      else if (v === "not_tried" || v === "didn't try" || v === "didnt_try" || v === "na") notTried++;
    });
  }

  // Album purchase intent
  const buyCol = col("buy_album") >= 0 ? col("buy_album") : col("purchase_intent");
  let wouldBuyAlbum = 0, maybeBuyAlbum = 0, wontBuyAlbum = 0;
  if (buyCol >= 0) {
    rows.forEach(r => {
      const v = (r[buyCol] ?? "").toLowerCase();
      if (v === "yes" || v === "definitely" || v === "would buy") wouldBuyAlbum++;
      else if (v === "maybe" || v === "perhaps" || v === "possibly") maybeBuyAlbum++;
      else if (v === "no" || v === "won't" || v === "wont") wontBuyAlbum++;
    });
  }

  // Feature requests (can be comma-separated within quoted field or single col)
  const featureCol = col("feature_request") >= 0 ? col("feature_request") : col("feature");
  const featureCounts: Record<string, number> = {};
  if (featureCol >= 0) {
    rows.forEach(r => {
      const raw = r[featureCol] ?? "";
      // may be semicolon-separated inside the field
      raw.split(/[;|]/).forEach(f => {
        const name = f.trim();
        if (name) featureCounts[name] = (featureCounts[name] || 0) + 1;
      });
    });
  }

  // Merch interest
  const merchCol = col("merch_interest") >= 0 ? col("merch_interest") : col("merchandise");
  const merchCounts: Record<string, number> = {};
  if (merchCol >= 0) {
    rows.forEach(r => {
      const raw = r[merchCol] ?? "";
      raw.split(/[;|]/).forEach(m => {
        const name = m.trim();
        if (name) merchCounts[name] = (merchCounts[name] || 0) + 1;
      });
    });
  }

  // Event metadata (read from first data row if columns exist)
  const eventNameCol = col("event_name");
  const eventDateCol = col("event_date");
  const eventName = eventNameCol >= 0 ? (rows[0]?.[eventNameCol] || undefined) : undefined;
  const eventDate = eventDateCol >= 0 ? (rows[0]?.[eventDateCol] || undefined) : undefined;

  const featureRequests = Object.entries(featureCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const merchandiseInterest = Object.entries(merchCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Fallback: if no discovery/album data found, use row counts
  const totalResponses = rows.length;
  if (foundPhotosEasily === 0 && triedAndFailed === 0 && notTried === 0) {
    // No discovery column — leave as zeros
  }

  return {
    totalResponses,
    foundPhotosEasily: foundPhotosEasily || DEFAULT_SURVEY.foundPhotosEasily,
    triedAndFailed: triedAndFailed || DEFAULT_SURVEY.triedAndFailed,
    notTried: notTried || DEFAULT_SURVEY.notTried,
    wouldBuyAlbum: wouldBuyAlbum || DEFAULT_SURVEY.wouldBuyAlbum,
    maybeBuyAlbum: maybeBuyAlbum || DEFAULT_SURVEY.maybeBuyAlbum,
    wontBuyAlbum: wontBuyAlbum || DEFAULT_SURVEY.wontBuyAlbum,
    avgRating: ratingCount > 0 ? totalRating / ratingCount : DEFAULT_SURVEY.avgRating,
    ratingsDistribution: [1, 2, 3, 4, 5].map(s => ({ stars: s, count: ratingsMap[s] || 0 })),
    featureRequests: featureRequests.length > 0 ? featureRequests : DEFAULT_SURVEY.featureRequests,
    merchandiseInterest: merchandiseInterest.length > 0 ? merchandiseInterest : DEFAULT_SURVEY.merchandiseInterest,
    eventName,
    eventDate,
  };
}

/* ──────────────────────────────────────────────────────────
   12-MONTH MRR ROADMAP
   ────────────────────────────────────────────────────────── */

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
    <div className="flex items-start gap-3 mb-5">
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 shrink-0">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Live
    </span>
  );
}

function StrategyBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 shrink-0">
      <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
      Strategy
    </span>
  );
}

function KpiCard({ title, value, icon, sub, accent, target, current, unit = "%" }: {
  title: string; value: string | number; icon: string; sub?: string; accent?: string;
  target?: number; current?: number; unit?: string;
}) {
  const pct = target && current != null ? Math.min(100, (current / target) * 100) : null;
  const isGood = pct != null && pct >= 80;
  const isWarning = pct != null && pct >= 50 && pct < 80;

  return (
    <div className="rounded-2xl border border-[#EFE6DD] bg-white p-5 shadow-[0_4px_20px_-4px_rgba(148,73,44,0.03)] hover:shadow-[0_8px_30px_rgba(148,73,44,0.08)] transition-all duration-300 flex flex-col justify-between min-h-[160px]">
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent || "from-[#D67D5C] to-[#B36144] text-white"}`}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        {sub && <span className="text-[10px] font-semibold uppercase tracking-wider text-[#827970] bg-stone-100 px-2 py-1 rounded-md text-right leading-tight">{sub}</span>}
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-bold text-[#827970] uppercase tracking-widest">{title}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-[#2D2D2D]">{value}</p>
        {pct != null && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-[#827970] mb-1">
              <span>vs target ({target}{unit})</span>
              <span className={`font-bold ${isGood ? "text-emerald-600" : isWarning ? "text-amber-600" : "text-red-500"}`}>{pct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${isGood ? "bg-emerald-500" : isWarning ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceholderCard({ title, icon, reason }: { title: string; icon: string; reason: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#EFE6DD] bg-[#FAF5EF]/30 p-5 shadow-sm flex flex-col items-center text-center justify-center min-h-[160px]">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-400 mb-2.5">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </span>
      <h3 className="text-xs font-bold text-[#2D2D2D] mb-1">{title}</h3>
      <p className="text-[10px] text-[#827970] leading-relaxed">{reason}</p>
    </div>
  );
}

/* ── Star Rating Chart ── */
function StarRatingChart({ ratings }: { ratings: { stars: number; count: number }[] }) {
  const uid = useId();
  const [mounted, setMounted] = useState(false);
  const total = ratings.reduce((s, r) => s + r.count, 0);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
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
                <span key={si} className="material-symbols-outlined text-[13px]" style={{ color: si < r.stars ? color : "#e5e7eb" }}>star</span>
              ))}
            </div>
            <div className="flex-1 h-5 rounded-full bg-stone-100 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: mounted ? `${Math.max(pct, 4)}%` : "0%", backgroundColor: color, transitionDelay: `${i * 80}ms` }} />
            </div>
            <div className="text-xs font-bold text-[#2D2D2D] w-6 text-right">{r.count}</div>
            <div className="text-[10px] text-[#827970] w-8">{pct.toFixed(0)}%</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── MRR Projection Chart ── */
function MRRProjectionChart({ currentMrr }: { currentMrr: number }) {
  const uid = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);

  const svgW = 700, svgH = 220;
  const pad = { top: 20, right: 24, bottom: 40, left: 60 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;
  const maxMrr = Math.max(...MRR_ROADMAP.map(m => m.target), currentMrr) * 1.1;
  const niceMax = Math.ceil(maxMrr / 100000) * 100000 || 100000;
  const xStep = plotW / (MRR_ROADMAP.length - 1);
  const pts: [number, number][] = MRR_ROADMAP.map((m, i) => [pad.left + i * xStep, pad.top + plotH - (m.target / niceMax) * plotH]);

  function sp(points: [number, number][], close?: { b: number; x0: number; x1: number }): string {
    if (!points.length) return "";
    let d = `M${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1], c = points[i], cx = (p[0] + c[0]) / 2;
      d += ` C${cx},${p[1]} ${cx},${c[1]} ${c[0]},${c[1]}`;
    }
    if (close) d += ` L${close.x1},${close.b} L${close.x0},${close.b} Z`;
    return d;
  }

  const currentY = pad.top + plotH - (currentMrr / niceMax) * plotH;
  const gridVals = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 flex-wrap text-xs">
        <span className="flex items-center gap-2 text-[#827970]"><span className="h-2 w-7 rounded-full bg-gradient-to-r from-[#D67D5C] to-[#F4A261]" />Target Roadmap</span>
        <span className="flex items-center gap-2 text-[#827970]"><span className="inline-block w-7 border-t-2 border-dashed border-blue-400" />Current MRR</span>
      </div>
      <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D67D5C" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#D67D5C" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {gridVals.map((v, i) => { const gy = pad.top + plotH - (v / niceMax) * plotH; return (
          <g key={i}>
            <line x1={pad.left} y1={gy} x2={pad.left + plotW} y2={gy} stroke="rgba(45,45,45,0.06)" strokeDasharray={i === 0 ? "none" : "4 4"} />
            <text x={pad.left - 6} y={gy} textAnchor="end" dominantBaseline="central" fill="#827970" fontSize={9} fontFamily="system-ui">
              {v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : v > 0 ? `₹${(v / 1000).toFixed(0)}K` : "₹0"}
            </text>
          </g>
        ); })}
        {MRR_ROADMAP.map((m, i) => (
          <text key={i} x={pad.left + i * xStep} y={svgH - 6} textAnchor="middle" fill="#827970" fontSize={9} fontFamily="system-ui">{m.month}</text>
        ))}
        <path d={sp(pts, { b: pad.top + plotH, x0: pts[0][0], x1: pts[pts.length - 1][0] })} fill={`url(#${uid}-g)`} style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.8s ease 0.2s" }} />
        <path d={sp(pts)} fill="none" stroke="#D67D5C" strokeWidth={2.5} strokeLinecap="round" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.8s ease 0.3s", filter: "drop-shadow(0 0 6px rgba(214,125,92,0.4))" }} />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill="white" stroke="#D67D5C" strokeWidth={2} style={{ opacity: mounted ? 1 : 0, transition: `opacity 0.4s ease ${0.4 + i * 0.05}s` }} />)}
        {currentMrr > 0 && (
          <g>
            <line x1={pad.left} y1={currentY} x2={pad.left + plotW} y2={currentY} stroke="#5B8DEF" strokeWidth={1.5} strokeDasharray="6 4" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.6s" }} />
            <text x={pad.left + plotW + 4} y={currentY} dominantBaseline="central" fill="#5B8DEF" fontSize={9} fontWeight={600} fontFamily="system-ui" style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.7s" }}>Now</text>
          </g>
        )}
      </svg>
    </div>
  );
}

/* ── Discovery Gauge ── */
function DiscoveryGauge({ value, target }: { value: number; target: number }) {
  const uid = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);

  const size = 160, strokeW = 18, r = (size - strokeW) / 2, center = size / 2;
  const circ = Math.PI * r;
  const valueDash = Math.min(value / 100, 1) * circ;
  const targetDash = Math.min(target / 100, 1) * circ;
  const isGood = value >= target * 0.8;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`${uid}-gg`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={isGood ? "#22c55e" : "#ef4444"} />
            <stop offset="100%" stopColor={isGood ? "#86efac" : "#fca5a5"} />
          </linearGradient>
        </defs>
        <path d={`M ${strokeW / 2},${center} A ${r},${r} 0 0 1 ${size - strokeW / 2},${center}`} fill="none" stroke="#EFE6DD" strokeWidth={strokeW} strokeLinecap="round" />
        <path d={`M ${strokeW / 2},${center} A ${r},${r} 0 0 1 ${size - strokeW / 2},${center}`} fill="none" stroke="#D67D5C" strokeWidth={strokeW} strokeLinecap="round" strokeDasharray={`${targetDash} ${circ - targetDash}`} style={{ opacity: 0.2 }} />
        <path d={`M ${strokeW / 2},${center} A ${r},${r} 0 0 1 ${size - strokeW / 2},${center}`} fill="none" stroke={`url(#${uid}-gg)`} strokeWidth={strokeW} strokeLinecap="round" strokeDasharray={`${mounted ? valueDash : 0} ${circ}`} style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1) 0.2s", filter: "drop-shadow(0 0 8px rgba(34,197,94,0.3))" }} />
        <text x={center} y={center - 8} textAnchor="middle" fill="#2D2D2D" fontSize={28} fontWeight={700} fontFamily="system-ui">{value}%</text>
        <text x={center} y={center + 14} textAnchor="middle" fill="#827970" fontSize={10} fontFamily="system-ui">Photo Discovery</text>
      </svg>
      <div className="flex items-center gap-3 mt-1 text-[11px]">
        <span className="text-[#827970]">Target: {target}%</span>
        <span className={`flex items-center gap-1 font-semibold ${isGood ? "text-emerald-600" : "text-red-500"}`}>
          <span className="material-symbols-outlined text-[13px]">{isGood ? "check_circle" : "warning"}</span>
          {isGood ? "On Track" : "Needs Work"}
        </span>
      </div>
    </div>
  );
}

/* ── Funnel Chart ── */
function FunnelChart({ stages }: { stages: { label: string; value: number; color: string }[] }) {
  const [mounted, setMounted] = useState(false);
  const maxVal = stages[0]?.value || 1;
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = (s.value / maxVal) * 100;
        const convFrom = i > 0 ? ((s.value / (stages[i - 1].value || 1)) * 100).toFixed(0) : null;
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-[#2D2D2D]">{s.label}</span>
              <div className="flex items-center gap-2">
                {convFrom && <span className="text-[10px] text-[#827970] bg-stone-100 px-1.5 py-0.5 rounded-md">↓ {convFrom}%</span>}
                <span className="font-bold text-[#2D2D2D]">{s.value.toLocaleString()}</span>
              </div>
            </div>
            <div className="h-7 rounded-lg bg-stone-100 overflow-hidden">
              <div className="h-full rounded-lg flex items-center pl-3 transition-all duration-1000" style={{ width: mounted ? `${pct}%` : "0%", backgroundColor: s.color, transitionDelay: `${i * 100}ms` }}>
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
   CSV UPLOAD BUTTON
   ────────────────────────────────────────────────────────── */

function CSVUploadButton({ onUpload }: { onUpload: (data: SurveyData) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = parseSurveyCSV(text);
        onUpload(parsed);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV.");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    };
    reader.onerror = () => { setError("Could not read file."); setUploading(false); };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-1">
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} id="csv-survey-upload" />
      <label
        htmlFor="csv-survey-upload"
        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all active:scale-95 ${
          success
            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
            : "bg-white border-[#EFE6DD] text-[#574F49] hover:bg-stone-50 hover:border-[#D67D5C]/40"
        }`}
      >
        {uploading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-[#D67D5C]" />
        ) : success ? (
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
        ) : (
          <span className="material-symbols-outlined text-[16px]">upload_file</span>
        )}
        {success ? "CSV Loaded!" : uploading ? "Loading…" : "Upload Survey CSV"}
      </label>
      {error && (
        <p className="text-[10px] text-red-500 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 max-w-xs">
          {error}
        </p>
      )}
      <button
        onClick={() => {
          const template = `event_name,event_date,rating,found_photos,buy_album,feature_request,merch_interest
"Diwali Shoot","2026-10-15",5,"yes","yes","WhatsApp Notifications|Cloud Photo Vault","Custom T-Shirts|Keychain"
"Diwali Shoot","2026-10-15",3,"tried_failed","maybe","AI Best-Shot Selection","Printed Photo Album"
"Diwali Shoot","2026-10-15",4,"yes","no","WhatsApp Notifications","Custom Mug"`;
          const blob = new Blob([template], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "survey_template.csv"; a.click();
          URL.revokeObjectURL(url);
        }}
        className="flex items-center gap-1.5 text-[10px] text-[#827970] hover:text-[#D67D5C] transition mt-0.5"
      >
        <span className="material-symbols-outlined text-[12px]">download</span>
        Download CSV template
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   TABS
   ────────────────────────────────────────────────────────── */

const TABS = [
  { id: "overview", label: "Overview", icon: "space_dashboard" },
  { id: "survey", label: "Survey Insights", icon: "poll" },
  { id: "traffic", label: "Traffic & Marketing", icon: "campaign" },
  { id: "sales", label: "Sales & Conversion", icon: "storefront" },
  { id: "product", label: "Product Health", icon: "health_and_safety" },
  { id: "business", label: "Business Metrics", icon: "payments" },
  { id: "growth", label: "Growth Roadmap", icon: "rocket_launch" },
] as const;
type TabId = typeof TABS[number]["id"];

/* ──────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────── */

export function AdminKPIsPanel() {
  const [data, setData] = useState<ExtendedKPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [survey, setSurvey] = useState<SurveyData>(DEFAULT_SURVEY);

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

  const mrr = data ? data.mrr / 100 : 0;
  const photoDiscoveryLive = survey.foundPhotosEasily > 0 || survey.triedAndFailed > 0
    ? Math.round((survey.foundPhotosEasily / Math.max(survey.totalResponses, 1)) * 100)
    : 35;

  const funnelStages = data ? [
    { label: "Total Visitors", value: data.totalVisitors, color: "#D67D5C" },
    { label: "Pricing Page Views", value: Math.round(data.totalVisitors * (data.homepageToPricingRate / 100)), color: "#F4A261" },
    { label: "Inquiries / Leads", value: data.totalInquiries, color: "#60D9A0" },
    { label: "Paying Customers", value: data.payingCustomers, color: "#5B8DEF" },
  ] : [];

  const discoveryDonut = [
    { label: "Found Easily", value: survey.foundPhotosEasily, color: "#22c55e" },
    { label: "Tried & Failed", value: survey.triedAndFailed, color: "#ef4444" },
    { label: "Didn't Try", value: survey.notTried, color: "#e5e7eb" },
  ];
  const merchDonut = [
    { label: "Would Buy", value: survey.wouldBuyAlbum, color: "#D67D5C" },
    { label: "Maybe", value: survey.maybeBuyAlbum, color: "#F4A261" },
    { label: "Won't Buy", value: survey.wontBuyAlbum, color: "#e5e7eb" },
  ];

  return (
    <div className="space-y-0">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#D67D5C]">Admin</p>
            <LiveBadge />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#2D2D2D] tracking-tight">Growth KPI Dashboard</h1>
          <p className="mt-1 text-xs sm:text-sm text-[#827970] hidden sm:block">
            Live platform metrics + survey data (N={survey.totalResponses}{survey.eventDate ? `, ${survey.eventDate}` : ""}).
          </p>
        </div>
        <button onClick={loadData} disabled={refreshing} className="flex items-center gap-2 rounded-xl border border-[#EFE6DD] bg-white px-4 py-2.5 text-xs font-semibold text-[#574F49] hover:bg-stone-50 transition active:scale-95 disabled:opacity-50 shadow-sm self-start sm:self-auto">
          <span className={`material-symbols-outlined text-[16px] ${refreshing ? "animate-spin" : ""}`}>refresh</span>
          Refresh
        </button>
      </div>

      {/* ── North Star Banner ── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#2D1A0E] via-[#3D2210] to-[#2D1A0E] p-5 sm:p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #D67D5C 0%, transparent 60%), radial-gradient(circle at 70% 50%, #F4A261 0%, transparent 60%)" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#D67D5C] mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">star</span>North Star Metric
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-white">Photos Successfully Delivered / Month</h2>
            <p className="mt-1 text-xs text-stone-400 max-w-md">Captures product value, photographer value, and guest satisfaction all in one metric.</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-stone-400 uppercase tracking-wider">Avg Rating</p>
              <p className="text-3xl font-black text-white">{survey.avgRating.toFixed(2)}<span className="text-base text-stone-400">/5</span></p>
            </div>
            <div className="text-center">
              <p className="text-xs text-stone-400 uppercase tracking-wider">Photo Discovery</p>
              <p className="text-3xl font-black text-[#D67D5C]">{photoDiscoveryLive}%</p>
            </div>
            {data && <div className="text-center">
              <p className="text-xs text-stone-400 uppercase tracking-wider">MRR</p>
              <p className="text-3xl font-black text-emerald-400">₹{mrr.toLocaleString()}</p>
            </div>}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              tab === t.id ? "bg-[#D67D5C] text-white shadow-md shadow-[#D67D5C]/25" : "bg-white border border-[#EFE6DD] text-[#827970] hover:text-[#2D2D2D] hover:border-[#D67D5C]/30"
            }`}>
            <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          OVERVIEW TAB
         ══════════════════════════════════════════ */}
      {tab === "overview" && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="MRR" value={`₹${mrr.toLocaleString()}`} icon="account_balance_wallet" accent="from-green-500 to-emerald-600 text-white" target={20000} current={mrr} unit="₹" />
            <KpiCard title="Paying Photographers" value={data.payingCustomers} icon="photo_camera" accent="from-blue-500 to-indigo-600 text-white" target={10} current={data.payingCustomers} unit="" />
            <KpiCard title="Active Photographers" value={data.activePhotographers} icon="linked_camera" sub="Last 30 Days" target={10} current={data.activePhotographers} unit="" />
            <KpiCard title="Total Inquiries" value={data.totalInquiries} icon="inbox" accent="from-stone-500 to-stone-600 text-white" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4"><SectionHeader icon="filter_alt" title="Conversion Funnel" subtitle="Visitor → Customer journey" /><LiveBadge /></div>
              {funnelStages.length > 0 ? <FunnelChart stages={funnelStages} /> : <p className="text-sm text-[#827970] text-center py-8">No funnel data yet.</p>}
              <div className="mt-4 pt-4 border-t border-[#EFE6DD] grid grid-cols-3 gap-3 text-center">
                {[
                  { l: "Home → Pricing", v: `${data.homepageToPricingRate.toFixed(1)}%` },
                  { l: "Pricing → Inquiry", v: `${data.pricingToInquiryRate.toFixed(1)}%` },
                  { l: "Visitor → Customer", v: `${data.visitorToCustomerRate.toFixed(2)}%` },
                ].map(x => <div key={x.l}><p className="text-xs text-[#827970]">{x.l}</p><p className="text-lg font-bold text-[#2D2D2D]">{x.v}</p></div>)}
              </div>
            </div>
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4"><SectionHeader icon="face" title="Photo Discovery Rate" subtitle={`Survey N=${survey.totalResponses}`} /><StrategyBadge /></div>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <DiscoveryGauge value={photoDiscoveryLive} target={70} />
                <div className="flex-1 space-y-3 w-full">
                  {discoveryDonut.map(d => (
                    <div key={d.label} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-[#2D2D2D] flex-1">{d.label}</span>
                      <span className="text-xs font-bold">{d.value}</span>
                      <span className="text-[10px] text-[#827970]">{((d.value / survey.totalResponses) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">⚠️ Critical Insight</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">{survey.triedAndFailed} of {survey.totalResponses} users tried and failed — Priority #1 product fix before scaling.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total Unique Visitors" value={data.totalVisitors.toLocaleString()} icon="group" />
            <KpiCard title="Visitor Growth" value={data.visitorGrowthRate !== null ? `${data.visitorGrowthRate.toFixed(1)}%` : "N/A"} icon="trending_up" sub="vs Last Week" />
            <KpiCard title="Returning Visitors" value={`${data.returningVisitorRate.toFixed(1)}%`} icon="assignment_return" />
            <KpiCard title="Avg Session Duration" value={data.avgSessionDurationSec != null ? formatDuration(data.avgSessionDurationSec) : "N/A"} icon="timer" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="CTA Click Rate" value={data.ctaClickRate != null ? `${data.ctaClickRate.toFixed(1)}%` : "N/A"} icon="ads_click" sub="Visitors who clicked" />
            <KpiCard title="Photo Search Rate" value={data.photoSearchRate != null ? `${data.photoSearchRate.toFixed(1)}%` : "N/A"} icon="search" sub={`${data.photoSearchCount || 0} searches`} />
            <KpiCard title="Photo Download Rate" value={data.photoDownloadRate != null ? `${data.photoDownloadRate.toFixed(1)}%` : "N/A"} icon="download" sub={`${data.photoDownloadCount || 0} downloads`} />
            <KpiCard title="Zero-Result Searches" value={data.zeroResultSearches != null ? data.zeroResultSearches.toLocaleString() : "N/A"} icon="search_off" accent="from-red-400 to-rose-500 text-white" />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SURVEY INSIGHTS TAB
         ══════════════════════════════════════════ */}
      {tab === "survey" && (
        <div className="space-y-6">
          {/* Header with CSV upload */}
          <div className="rounded-2xl bg-gradient-to-br from-[#FDF8F1] to-[#FFF5EE] border border-[#EFE6DD] p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <StrategyBadge />
                <h2 className="mt-2 text-base font-bold text-[#2D2D2D]">
                  {survey.eventName || "First Event"} Survey Analysis
                </h2>
                <p className="text-xs text-[#827970] mt-1">
                  N={survey.totalResponses} real guest responses{survey.eventDate ? ` · ${survey.eventDate}` : ""}
                </p>
                <p className="text-[11px] text-[#827970] mt-2 leading-relaxed max-w-sm">
                  Upload a new CSV to update survey data dynamically. Download the template below to see the expected format.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:items-end">
                <CSVUploadButton onUpload={setSurvey} />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-[#827970]">Avg Rating</p>
                    <p className="text-3xl font-black text-[#D67D5C]">{survey.avgRating.toFixed(2)}</p>
                    <p className="text-[10px] text-[#827970]">out of 5.0</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#827970]">Responses</p>
                    <p className="text-3xl font-black text-emerald-600">{survey.totalResponses}</p>
                    <p className="text-[10px] text-[#827970]">total submissions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CSV format guide */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-400 text-[20px] shrink-0 mt-0.5">info</span>
            <div>
              <p className="text-xs font-bold text-blue-700 mb-1">CSV Column Guide</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-0.5 text-[10px] text-blue-800">
                {[
                  ["event_name", "Name of the event"],
                  ["event_date", "Date of the event"],
                  ["rating", "1–5 star rating"],
                  ["found_photos", "yes / tried_failed / not_tried"],
                  ["buy_album", "yes / maybe / no"],
                  ["feature_request", "Feature names (use | to separate multiple)"],
                  ["merch_interest", "Merch items (use | to separate multiple)"],
                ].map(([col, desc]) => (
                  <div key={col}><span className="font-mono font-bold">{col}</span> — {desc}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Star ratings */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="star" title="Rating Distribution" subtitle={`From ${survey.totalResponses} respondents`} />
              <StarRatingChart ratings={survey.ratingsDistribution} />
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3 flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-500 text-[18px]">info</span>
                <p className="text-[11px] text-amber-800 leading-relaxed"><strong>Insight:</strong> Rating avg {survey.avgRating.toFixed(2)}/5. Target: 4.5+ avg before scaling marketing.</p>
              </div>
            </div>

            {/* Photo discovery */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="face" title="Photo Discovery Split" subtitle="Did guests find their photos?" />
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <DonutChart data={discoveryDonut} size={150} />
                <div className="flex-1 space-y-3">
                  {discoveryDonut.map(d => (
                    <div key={d.label} className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs"><span className="font-medium text-[#2D2D2D]">{d.label}</span><span className="font-bold">{d.value}/{survey.totalResponses}</span></div>
                        <div className="mt-1 h-1.5 rounded-full bg-stone-100"><div className="h-full rounded-full" style={{ width: `${(d.value / survey.totalResponses) * 100}%`, backgroundColor: d.color }} /></div>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-[#827970] pt-1">Target: <strong className="text-[#D67D5C]">70%+</strong> discovery (Month 3 goal)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="add_box" title="Feature Request Votes" subtitle="What users want next" />
              <HorizontalBarChart data={survey.featureRequests.slice(0, 8)} />
              {survey.featureRequests[0] && (
                <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                  <p className="text-[11px] text-emerald-800"><strong>#1 Request:</strong> {survey.featureRequests[0].name} ({survey.featureRequests[0].value} votes) — Ship first.</p>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="shopping_bag" title="Merchandise Interest" subtitle="Physical product demand" />
              <HorizontalBarChart data={survey.merchandiseInterest.slice(0, 8)} />
              <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3">
                <p className="text-[11px] text-blue-800 leading-relaxed"><strong>Revenue opportunity:</strong> {Math.round(((survey.wouldBuyAlbum + survey.maybeBuyAlbum) / survey.totalResponses) * 100)}% show merch interest. At 100 photographers × 5 events × ₹500 = <strong>₹2.5L/month</strong>.</p>
              </div>
            </div>
          </div>

          {/* Album purchase intent */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <SectionHeader icon="local_shipping" title="Photo Album Purchase Intent" subtitle="Would you buy a printed album from Spotme?" />
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <DonutChart data={merchDonut} size={150} />
              <div className="flex-1 grid grid-cols-3 gap-4 text-center">
                <div className="rounded-xl bg-[#FDF8F1] p-4">
                  <p className="text-3xl font-black text-[#D67D5C]">{((survey.wouldBuyAlbum / survey.totalResponses) * 100).toFixed(0)}%</p>
                  <p className="text-xs text-[#827970] mt-1 font-medium">Would Buy</p>
                  <p className="text-[10px] text-[#827970]">{survey.wouldBuyAlbum} users</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-3xl font-black text-amber-500">{((survey.maybeBuyAlbum / survey.totalResponses) * 100).toFixed(0)}%</p>
                  <p className="text-xs text-[#827970] mt-1 font-medium">Maybe</p>
                  <p className="text-[10px] text-[#827970]">{survey.maybeBuyAlbum} users</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-3xl font-black text-stone-400">{((survey.wontBuyAlbum / survey.totalResponses) * 100).toFixed(0)}%</p>
                  <p className="text-xs text-[#827970] mt-1 font-medium">Won't Buy</p>
                  <p className="text-[10px] text-[#827970]">{survey.wontBuyAlbum} users</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TRAFFIC & MARKETING TAB
         ══════════════════════════════════════════ */}
      {tab === "traffic" && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total Website Visitors" value={data.totalVisitors.toLocaleString()} icon="group" target={2000} current={data.totalVisitors} unit="" />
            <KpiCard title="Visitor Growth Rate" value={data.visitorGrowthRate != null ? `${data.visitorGrowthRate.toFixed(1)}%` : "N/A"} icon="trending_up" sub="vs Last Week" />
            <KpiCard title="Returning Visitor Rate" value={`${data.returningVisitorRate.toFixed(1)}%`} icon="assignment_return" />
            <KpiCard title="Avg Session Duration" value={data.avgSessionDurationSec != null ? formatDuration(data.avgSessionDurationSec) : "N/A"} icon="timer" sub="Approximate" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <PlaceholderCard title="Bounce Rate" icon="exit_to_app" reason="Track via page_visits: sessions with only 1 page view. Requires tagging single-page sessions." />
            <PlaceholderCard title="Cost Per Inquiry" icon="request_quote" reason="Add a marketing spend field in Admin Settings. CAC = Spend ÷ Inquiries in period." />
            <PlaceholderCard title="Cost Per Customer" icon="attach_money" reason="Add marketing spend tracking. CAC = Total Spend ÷ New Paying Customers." />
            <KpiCard title="Avg Pages / Session" value={data.avgPagesPerSession.toFixed(1)} icon="layers" />
          </div>

          {/* Traffic source table + source performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#EFE6DD] bg-white overflow-hidden shadow-sm">
              <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#2D2D2D]">Traffic Source Performance</h3>
                  <p className="text-xs text-[#827970] mt-0.5">Visits, signups & conversion by UTM source</p>
                </div>
                <LiveBadge />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#EFE6DD] bg-[#FAF5EF]/50">
                      {["Source", "Visits", "Signups", "Conv%"].map(h => (
                        <th key={h} className={`py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider ${h === "Source" ? "text-left px-5" : "text-right px-4"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE6DD]">
                    {data.topSources.length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-[#827970] text-sm">No data yet.</td></tr>
                    ) : data.topSources.map((s, i) => {
                      const sd = data.signupsBySource.find(x => x.source === s.source);
                      const rd = data.conversionRateBySource.find(x => x.source === s.source);
                      return (
                        <tr key={i} className="hover:bg-stone-50/50 transition">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#D67D5C]/10 text-[10px] font-bold text-[#94492c]">{i + 1}</span>
                              <span className="font-medium text-[#2D2D2D] text-xs">{s.source}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#2D2D2D] text-xs">{s.visits.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-500 text-xs">{sd?.signups ?? 0}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-500 text-xs">{rd ? `${rd.rate.toFixed(1)}%` : "0.0%"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[#EFE6DD] bg-white overflow-hidden shadow-sm">
              <div className="px-6 pt-5 pb-3">
                <h3 className="text-sm font-bold text-[#2D2D2D]">Top Pages by Visits</h3>
                <p className="text-xs text-[#827970] mt-0.5">Most visited page paths</p>
              </div>
              <div className="overflow-x-auto max-h-[280px]">
                <table className="w-full text-sm relative">
                  <thead className="sticky top-0 bg-[#FAF5EF]/95 backdrop-blur-sm border-b border-[#EFE6DD]">
                    <tr>
                      <th className="text-left px-5 py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Page Path</th>
                      <th className="text-right px-5 py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider">Visits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE6DD]">
                    {data.pageVisits.length === 0 ? (
                      <tr><td colSpan={2} className="px-5 py-8 text-center text-[#827970] text-sm">No visits tracked yet.</td></tr>
                    ) : data.pageVisits.map((p, i) => (
                      <tr key={i} className="hover:bg-stone-50/50 transition">
                        <td className="px-5 py-3 font-medium text-[#2D2D2D] truncate max-w-[220px] text-xs">{p.page}</td>
                        <td className="px-5 py-3 text-right font-bold text-[#2D2D2D] text-xs">{p.visits.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Data collected breakdown */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <SectionHeader icon="database" title="Data Collected per Session" subtitle="Structured event tracking fields" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { field: "User ID", icon: "person", status: "live" },
                { field: "Traffic Source (UTM)", icon: "share", status: "live" },
                { field: "Page Visited", icon: "web", status: "live" },
                { field: "Button Clicked", icon: "ads_click", status: "live" },
                { field: "Search Query", icon: "search", status: "live" },
                { field: "Download Action", icon: "download", status: "live" },
                { field: "Inquiry Submitted", icon: "mail", status: "live" },
                { field: "Photographer ID", icon: "camera", status: "live" },
                { field: "Device Type", icon: "devices", status: "pending" },
                { field: "Browser", icon: "language", status: "pending" },
                { field: "Time on Page", icon: "timer", status: "partial" },
                { field: "Share Action", icon: "share", status: "pending" },
                { field: "Demo Booked", icon: "event", status: "pending" },
              ].map(f => (
                <div key={f.field} className={`rounded-xl border p-3 flex items-center gap-2 ${f.status === "live" ? "border-emerald-200 bg-emerald-50" : f.status === "partial" ? "border-amber-200 bg-amber-50" : "border-dashed border-[#EFE6DD] bg-stone-50"}`}>
                  <span className={`material-symbols-outlined text-[16px] ${f.status === "live" ? "text-emerald-500" : f.status === "partial" ? "text-amber-500" : "text-stone-400"}`}>{f.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold text-[#2D2D2D]">{f.field}</p>
                    <p className={`text-[9px] font-semibold uppercase ${f.status === "live" ? "text-emerald-600" : f.status === "partial" ? "text-amber-600" : "text-stone-400"}`}>{f.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SALES & CONVERSION TAB
         ══════════════════════════════════════════ */}
      {tab === "sales" && data && (
        <div className="space-y-6">
          {/* Full funnel */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5"><SectionHeader icon="filter_alt" title="Full Conversion Funnel" subtitle="End-to-end visitor to customer journey" /><LiveBadge /></div>
            {funnelStages.length > 0 ? (
              <>
                <FunnelChart stages={funnelStages} />
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-[#EFE6DD]">
                  {[
                    { l: "Homepage → Pricing", v: `${data.homepageToPricingRate.toFixed(1)}%`, target: ">5%" },
                    { l: "Pricing → Inquiry", v: `${data.pricingToInquiryRate.toFixed(1)}%`, target: ">8%" },
                    { l: "Visitor → Customer", v: `${data.visitorToCustomerRate.toFixed(2)}%`, target: ">0.5%" },
                  ].map(x => (
                    <div key={x.l} className="text-center rounded-xl bg-[#FDF8F1] border border-[#EFE6DD] p-4">
                      <p className="text-[10px] text-[#827970] uppercase tracking-wider mb-1">{x.l}</p>
                      <p className="text-2xl font-bold text-[#D67D5C]">{x.v}</p>
                      <p className="text-[10px] text-[#827970] mt-1">Target: {x.target}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-sm text-[#827970] text-center py-8">No visitor data yet.</p>}
          </div>

          {/* Conversion stages — all defined */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Homepage → Pricing" value={`${data.homepageToPricingRate.toFixed(1)}%`} icon="ads_click" />
            <KpiCard title="Pricing → Inquiry" value={`${data.pricingToInquiryRate.toFixed(1)}%`} icon="shopping_cart_checkout" />
            <KpiCard title="Visitor → Customer" value={`${data.visitorToCustomerRate.toFixed(2)}%`} icon="workspace_premium" />
            <PlaceholderCard title="Inquiry → Demo Conv." icon="event_available" reason="Track demo bookings separately in Inquiries table. Need a 'demo_booked' status column." />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <PlaceholderCard title="Demo → Customer Conv." icon="how_to_reg" reason="Requires demo tracking + paid customer linkage. Add 'demo_outcome' field to inquiries." />
            <KpiCard title="Total Inquiries" value={data.totalInquiries} icon="mail" />
            <PlaceholderCard title="Qualified Inquiries" icon="verified" reason="Add a qualification field to inquiries table (e.g. 'qualified: boolean') to filter hot leads." />
            <PlaceholderCard title="Demo Requests" icon="calendar_month" reason="Add 'wants_demo: boolean' column to inquiries table and track separately." />
          </div>

          {/* Drop-off intelligence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="filter_alt_off" title="Drop-off Intelligence" subtitle="Where users leave the funnel" />
              <div className="space-y-3">
                {[
                  { label: "Highest Drop-off Page", value: data.highestDropOffPage || "N/A", icon: "block", color: "red" },
                  { label: "Funnel Drop-off Step", value: data.funnelDropOffStep || "N/A", icon: "filter_alt_off", color: "amber" },
                  { label: "Most Clicked CTA", value: data.mostClickedButton || "N/A", icon: "touch_app", color: "blue", count: data.mostClickedButtonCount },
                ].map(item => (
                  <div key={item.label} className={`flex items-start gap-3 p-3 rounded-xl bg-${item.color}-50 border border-${item.color}-100`}>
                    <span className={`material-symbols-outlined text-${item.color}-500 text-[18px] mt-0.5`}>{item.icon}</span>
                    <div>
                      <p className={`text-xs font-bold text-${item.color}-700`}>{item.label}</p>
                      <p className="text-sm font-bold text-[#2D2D2D] mt-0.5">{item.value}</p>
                      {item.count && item.count > 0 && <p className="text-[10px] text-[#827970]">{item.count} clicks</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User engagement */}
            <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
              <SectionHeader icon="touch_app" title="User Engagement" subtitle="Behavioral metrics" />
              <div className="space-y-4">
                {[
                  { l: "Returning Visitor Rate", v: `${data.returningVisitorRate.toFixed(1)}%`, pct: data.returningVisitorRate, color: "#D67D5C" },
                  { l: "Avg Pages / Session", v: data.avgPagesPerSession.toFixed(1), pct: Math.min(100, (data.avgPagesPerSession / 8) * 100), color: "#5B8DEF" },
                  { l: "CTA Click Rate", v: data.ctaClickRate != null ? `${data.ctaClickRate.toFixed(1)}%` : "N/A", pct: data.ctaClickRate ?? 0, color: "#60D9A0" },
                  { l: "Photo Search Rate", v: data.photoSearchRate != null ? `${data.photoSearchRate.toFixed(1)}%` : "N/A", pct: data.photoSearchRate ?? 0, color: "#F4A261" },
                  { l: "Photo Download Rate", v: data.photoDownloadRate != null ? `${data.photoDownloadRate.toFixed(1)}%` : "N/A", pct: data.photoDownloadRate ?? 0, color: "#a855f7" },
                  { l: "User Retention (WoW)", v: data.userRetentionRate != null ? `${data.userRetentionRate.toFixed(1)}%` : "Need 2+ weeks", pct: data.userRetentionRate ?? 0, color: "#22c55e" },
                ].map(m => (
                  <div key={m.l}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#827970]">{m.l}</span>
                      <span className="font-bold text-[#2D2D2D]">{m.v}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-100">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, m.pct)}%`, backgroundColor: m.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <PlaceholderCard title="Photo Sharing Rate" icon="share" reason="Add share events via Web Share API or copy-link tracking." />
                <PlaceholderCard title="Bounce Rate" icon="exit_to_app" reason="Sessions with only 1 page view. Flag in page_visits processing." />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          PRODUCT HEALTH TAB
         ══════════════════════════════════════════ */}
      {tab === "product" && data && (
        <div className="space-y-6">
          {/* Discovery hero */}
          <div className="rounded-2xl border-2 border-[#D67D5C]/20 bg-gradient-to-br from-[#FDF8F1] to-white p-6">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <DiscoveryGauge value={photoDiscoveryLive} target={70} />
              <div className="flex-1">
                <h2 className="text-base font-bold text-[#2D2D2D] mb-1">Photo Discovery Rate — Priority #1</h2>
                <p className="text-xs text-[#827970] leading-relaxed mb-3">Only {photoDiscoveryLive}% of guests found photos easily. {((survey.triedAndFailed / survey.totalResponses) * 100).toFixed(0)}% tried and failed. Target is 70%+ by Month 3.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                    <p className="text-2xl font-black text-red-500">{100 - photoDiscoveryLive}%</p>
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

          {/* Photographer success */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#2D2D2D] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#D67D5C] text-[16px]">photo_camera</span>Photographer Success
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="Active Photographers" value={data.activePhotographers} icon="linked_camera" sub="Last 30 Days" target={10} current={data.activePhotographers} unit="" />
              <KpiCard title="New Photographers" value={data.newPhotographersOnboarded} icon="person_add" sub="Last 30 Days" />
              <KpiCard title="Repeat Photographer Rate" value={`${data.repeatPhotographerRate.toFixed(1)}%`} icon="replay" target={60} current={data.repeatPhotographerRate} />
              <KpiCard title="Avg Events / Photographer" value={data.avgEventsPerPhotographer.toFixed(1)} icon="library_add" target={4} current={data.avgEventsPerPhotographer} unit="" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <PlaceholderCard title="Photographer CSAT" icon="sentiment_satisfied" reason="Add a post-event satisfaction survey for photographers (1–5 rating stored per event)." />
              <PlaceholderCard title="Photographer Churn Rate" icon="person_remove" reason="Define: no events in 30 days = churned. Add 'last_event_date' to profiles." />
              <KpiCard title="Photo Searches" value={data.photoSearchCount || 0} icon="search" sub="Selfie uploads" />
              <KpiCard title="Photo Downloads" value={data.photoDownloadCount || 0} icon="download" sub="Photos saved" />
            </div>
          </div>

          {/* Feature decision metrics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#2D2D2D] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#D67D5C] text-[16px]">model_training</span>Feature Decision Metrics
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="Most Clicked Button" value={data.mostClickedButton || "N/A"} icon="touch_app" sub={data.mostClickedButtonCount > 0 ? `${data.mostClickedButtonCount} clicks` : undefined} />
              <KpiCard title="Most Used Feature" value={data.mostUsedFeature || "No data"} icon="star" sub={data.mostUsedFeatureCount > 0 ? `${data.mostUsedFeatureCount} uses` : undefined} />
              <KpiCard title="Least Used Feature" value={data.leastUsedFeature || "No data"} icon="visibility_off" accent="from-stone-400 to-stone-500 text-white" sub={data.leastUsedFeatureCount > 0 ? `${data.leastUsedFeatureCount} uses` : undefined} />
              <KpiCard title="Zero-Result Searches" value={data.zeroResultSearches != null ? data.zeroResultSearches.toLocaleString() : "N/A"} icon="search_off" accent="from-red-400 to-rose-500 text-white" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <KpiCard title="Highest Drop-off Page" value={data.highestDropOffPage || "N/A"} icon="block" accent="from-red-500 to-rose-600 text-white" />
              <KpiCard title="Funnel Drop-off Step" value={data.funnelDropOffStep || "N/A"} icon="filter_alt_off" accent="from-red-500 to-rose-600 text-white" />
              <PlaceholderCard title="Feature Adoption Rate" icon="trending_up" reason="Track first-use per user per feature. Compute: users who used / total users." />
              <PlaceholderCard title="Feature Abandonment Rate" icon="trending_down" reason="Track multi-step feature funnels. Drop-off after starting a flow = abandonment." />
            </div>
          </div>

          {/* Customer feedback */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#2D2D2D] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#D67D5C] text-[16px]">support_agent</span>Customer Feedback
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <PlaceholderCard title="Net Promoter Score (NPS)" icon="speed" reason="Send 0–10 'would you recommend?' survey post-event. Store responses and compute (Promoters – Detractors) / Total." />
              <PlaceholderCard title="CSAT Score" icon="sentiment_satisfied" reason="Post-event satisfaction rating (1–5). Store per completed event and compute average." />
              <PlaceholderCard title="Most Requested Feature" icon="add_box" reason="Link to survey feature_request field above — already tracked via CSV upload." />
              <PlaceholderCard title="Most Common Complaint" icon="feedback" reason="Add a 'complaint category' field to a support/feedback table with predefined categories." />
              <PlaceholderCard title="Support Tickets Raised" icon="headset_mic" reason="Add a support_tickets table with user_id, created_at, category, status columns." />
              <PlaceholderCard title="Support Resolution Time" icon="timer" reason="Support tickets table: compute resolved_at – created_at per ticket." />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          BUSINESS METRICS TAB
         ══════════════════════════════════════════ */}
      {tab === "business" && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Monthly Recurring Revenue" value={`₹${mrr.toLocaleString()}`} icon="account_balance_wallet" accent="from-green-500 to-emerald-600 text-white" target={20000} current={mrr} unit="₹" />
            <KpiCard title="Paying Customers" value={data.payingCustomers} icon="loyalty" accent="from-blue-500 to-indigo-600 text-white" target={10} current={data.payingCustomers} unit="" />
            <KpiCard title="Avg Revenue / Customer" value={`₹${(data.avgRevenuePerCustomer / 100).toLocaleString()}`} icon="query_stats" />
            <KpiCard title="Total Inquiries" value={data.totalInquiries} icon="inbox" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <PlaceholderCard title="Qualified Inquiries" icon="verified" reason="Add 'qualified: boolean' column to inquiries table. Filter only warm/hot leads." />
            <PlaceholderCard title="Demo Requests" icon="calendar_month" reason="Add 'wants_demo: boolean' to inquiries. Count separately from general inquiries." />
            <PlaceholderCard title="Customer Acquisition Cost" icon="attach_money" reason="Add marketing spend input in Admin Settings. CAC = Spend ÷ New Paying Customers per period." />
            <PlaceholderCard title="Customer Lifetime Value" icon="diamond" reason="Requires payment history table. LTV = Avg Revenue × (1 / Monthly Churn Rate)." />
          </div>

          {/* MRR chart */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <SectionHeader icon="show_chart" title="MRR Growth Roadmap" subtitle="12-month strategy targets vs current" />
              <StrategyBadge />
            </div>
            <MRRProjectionChart currentMrr={mrr} />
          </div>

          {/* Pricing tiers */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <SectionHeader icon="workspace_premium" title="Active Pricing Tiers" subtitle="Plans with MRR contribution" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { plan: "Starter", price: "₹499/mo", color: "from-stone-400 to-stone-500" },
                { plan: "Pro", price: "₹999/mo", color: "from-[#D67D5C] to-[#B36144]" },
                { plan: "Studio Basic", price: "₹699/mo", color: "from-amber-500 to-orange-500" },
                { plan: "Studio Pro", price: "₹1,599/mo", color: "from-blue-500 to-indigo-600" },
              ].map(t => (
                <div key={t.plan} className="rounded-2xl border border-[#EFE6DD] p-5 text-center">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${t.color} text-white mb-3`}>
                    <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                  </span>
                  <p className="text-sm font-bold text-[#2D2D2D]">{t.plan}</p>
                  <p className="text-base font-black text-[#D67D5C] mt-1">{t.price}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Roadmap table */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader icon="rocket_launch" title="12-Month MRR Roadmap" subtitle="Targets by month" />
              <StrategyBadge />
            </div>
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="border-b border-[#EFE6DD] bg-[#FAF5EF]/50">
                  {["Month", "Target Photographers", "Target MRR", "Progress"].map(h => (
                    <th key={h} className={`py-3 text-[10px] font-bold text-[#827970] uppercase tracking-wider ${h === "Month" ? "text-left px-4" : h === "Progress" ? "px-4" : "text-right px-4"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE6DD]">
                {MRR_ROADMAP.map((row, i) => {
                  const isCurrent = i === 0;
                  const pct = isCurrent && row.target > 0 ? Math.min(100, (mrr / row.target) * 100) : null;
                  return (
                    <tr key={row.month} className={`hover:bg-stone-50/50 transition ${isCurrent ? "bg-[#FDF8F1]" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold ${isCurrent ? "bg-[#D67D5C] text-white" : "bg-stone-100 text-stone-500"}`}>{row.month}</span>
                          {isCurrent && <span className="text-[10px] font-bold text-[#D67D5C]">← Now</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#2D2D2D] text-xs">{row.photographers}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#2D2D2D] text-xs">{row.target === 0 ? "₹0" : `₹${(row.target / 1000).toFixed(0)}K`}</td>
                      <td className="px-4 py-3">
                        {pct != null ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-stone-100">
                              <div className="h-full rounded-full bg-[#D67D5C]" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-[#D67D5C] w-8">{pct.toFixed(0)}%</span>
                          </div>
                        ) : <span className="text-[10px] text-[#827970]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          GROWTH ROADMAP TAB
         ══════════════════════════════════════════ */}
      {tab === "growth" && (
        <div className="space-y-6">
          {/* Market opportunity */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <SectionHeader icon="public" title="Market Opportunity" subtitle="TAM / SAM / SOM — India 2026" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "TAM", value: "$1.5B", sub: "Wedding + Event + Photography Market", color: "from-blue-500 to-indigo-600" },
                { label: "SAM", value: "₹108Cr", sub: "~30,000 tech-forward photographers × ₹3K/mo", color: "from-[#D67D5C] to-[#B36144]" },
                { label: "SOM (Year 1)", value: "₹1.2Cr", sub: "500 photographers × ₹2K/mo", color: "from-emerald-500 to-teal-600" },
              ].map(m => (
                <div key={m.label} className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(135deg, #FDF8F1, #FFF5EE)" }}>
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.color} text-white text-xs font-black mb-3`}>{m.label}</span>
                  <p className="text-2xl font-black text-[#2D2D2D]">{m.value}</p>
                  <p className="text-[10px] text-[#827970] mt-1 leading-relaxed">{m.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 90-day KPI targets */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <SectionHeader icon="flag" title="90-Day Strategy KPI Targets" subtitle="Month 3 goals from growth strategy" />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Photo Discovery Rate", target: "70%+", current: `${photoDiscoveryLive}%`, icon: "face", ok: photoDiscoveryLive >= 70 },
                { label: "Instagram Followers", target: "5,000", current: "—", icon: "thumb_up", ok: false },
                { label: "Trial → Paid Conv.", target: ">20%", current: "—", icon: "workspace_premium", ok: false },
                { label: "Organic Signups", target: ">60%", current: "—", icon: "nature", ok: false },
                { label: "CAC (Organic)", target: "<₹3,000", current: "—", icon: "attach_money", ok: false },
                { label: "Monthly Churn", target: "<5%", current: "—", icon: "person_remove", ok: false },
                { label: "QR Scan Rate", target: ">50%", current: "~35%", icon: "qr_code_2", ok: false },
                { label: "Events / Photographer", target: ">4/month", current: data?.avgEventsPerPhotographer.toFixed(1) ?? "—", icon: "library_add", ok: (data?.avgEventsPerPhotographer || 0) >= 4 },
                { label: "NPS Score", target: ">40", current: "—", icon: "speed", ok: false },
              ].map(kpi => (
                <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.ok ? "border-emerald-200 bg-emerald-50" : "border-[#EFE6DD] bg-[#FAF5EF]/50"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="material-symbols-outlined text-[18px] text-[#D67D5C]">{kpi.icon}</span>
                    <span className={`text-[9px] font-bold uppercase rounded-full px-1.5 py-0.5 ${kpi.ok ? "bg-emerald-200 text-emerald-700" : "bg-stone-200 text-stone-500"}`}>{kpi.ok ? "On Track" : "Pending"}</span>
                  </div>
                  <p className="text-[10px] font-bold text-[#827970] uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-base font-black text-[#D67D5C] mt-1">{kpi.target}</p>
                  <p className="text-[10px] text-[#827970] mt-0.5">Current: <strong className="text-[#2D2D2D]">{kpi.current}</strong></p>
                </div>
              ))}
            </div>
          </div>

          {/* ROI activities */}
          <div className="rounded-2xl border border-[#EFE6DD] bg-white p-6 shadow-sm">
            <SectionHeader icon="trending_up" title="Highest-ROI Growth Activities" subtitle="Ranked by impact for current stage" />
            <div className="space-y-3">
              {[
                { rank: 1, activity: "Fix Photo Discovery (35% → 70%)", cost: "₹0 (dev time)", roi: "2× retention", effort: "High", color: "bg-red-500" },
                { rank: 2, activity: "Ship WhatsApp Notifications", cost: "₹0 (dev time)", roi: "#1 feature request", effort: "Medium", color: "bg-orange-400" },
                { rank: 3, activity: "WhatsApp 15 survey respondents", cost: "₹0", roi: "2–3 warm referrals", effort: "Low", color: "bg-amber-400" },
                { rank: 4, activity: "DM 100 photographers on Instagram", cost: "₹0", roi: "10 demo calls", effort: "Low", color: "bg-yellow-400" },
                { rank: 5, activity: "Post survey data as viral content", cost: "₹0", roi: "500+ reach + credibility", effort: "Low", color: "bg-lime-400" },
                { rank: 6, activity: "Partner with college photography clubs", cost: "₹2,000/event", roi: "Free social proof events", effort: "Medium", color: "bg-green-400" },
                { rank: 7, activity: "Cold email 200 photographers", cost: "₹0", roi: "5–10 demo calls", effort: "Medium", color: "bg-teal-400" },
                { rank: 8, activity: "LinkedIn build-in-public posts", cost: "₹0", roi: "Organic leads", effort: "Low", color: "bg-blue-400" },
              ].map(item => (
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
