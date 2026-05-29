"use client";

import { useEffect, useId, useState } from "react";

/* ─────────────────────────────────────────────
   Shared keyframe styles injected once
   ───────────────────────────────────────────── */

const KEYFRAMES = `
@keyframes charts-fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes charts-scaleIn {
  from { transform: scale(0.92); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
@keyframes charts-pulseOnce {
  0%   { opacity: 0.6; }
  50%  { opacity: 1; }
  100% { opacity: 0.85; }
}
`;

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  stylesInjected = true;
}

/* ═════════════════════════════════════════════
   1. DONUT CHART
   ═════════════════════════════════════════════ */

interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  size?: number;
  title?: string;
}

export function DonutChart({ data, size = 200, title }: DonutChartProps) {
  const uid = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    injectStyles();
    // small raf delay so the initial dashoffset is painted first
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div style={{ width: size, textAlign: "center", color: "#827970", fontSize: 13 }}>
        No data
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);
  const strokeWidth = size * 0.13;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Build segment offsets
  let accumulated = 0;
  const segments = data.map((d) => {
    const pct = total === 0 ? 0 : d.value / total;
    const dashLen = pct * circumference;
    const gap = circumference - dashLen;
    const offset = -accumulated * circumference; // rotate to correct position
    accumulated += pct;
    return { ...d, dashLen, gap, offset, pct };
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        animation: "charts-scaleIn 0.5s ease-out both",
      }}
    >
      {title && (
        <span style={{ color: "#827970", fontSize: 12, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {title}
        </span>
      )}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
        {/* Track ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(45, 45, 45, 0.06)"
          strokeWidth={strokeWidth}
        />

        {/* Data segments */}
        {segments.map((seg, i) => (
          <circle
            key={`${uid}-seg-${i}`}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.dashLen} ${seg.gap}`}
            strokeDashoffset={mounted ? seg.offset : circumference}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{
              transition: `stroke-dashoffset 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.12}s`,
              filter: `drop-shadow(0 0 6px ${seg.color}44)`,
            }}
          />
        ))}

        {/* Center total */}
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#2D2D2D"
          fontSize={size * 0.17}
          fontWeight={700}
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.4s" }}
        >
          {total.toLocaleString()}
        </text>
        <text
          x={center}
          y={center + size * 0.1}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#827970"
          fontSize={size * 0.065}
          fontWeight={500}
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.5s" }}
        >
          TOTAL
        </text>
      </svg>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "8px 16px",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.5s ease 0.6s",
        }}
      >
        {data.map((d, i) => (
          <div key={`${uid}-leg-${i}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: d.color,
                boxShadow: `0 0 6px ${d.color}66`,
                flexShrink: 0,
              }}
            />
            <span style={{ color: "#827970", fontSize: 12, fontFamily: "system-ui, sans-serif" }}>
              {d.label}
            </span>
            <span style={{ color: "#2D2D2D", fontSize: 12, fontWeight: 600, fontFamily: "system-ui, sans-serif" }}>
              {d.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   2. AREA LINE CHART
   ═════════════════════════════════════════════ */

interface AreaLineDatum {
  month: string;
  events: number;
  photos: number;
  guests: number;
}

interface AreaLineChartProps {
  data: AreaLineDatum[];
  height?: number;
}

/** Attempt a monotone-ish cubic bezier through ordered points. */
function smoothPath(points: [number, number][], close?: { baseline: number; x0: number; x1: number }): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const [x, y] = points[0];
    return close
      ? `M${x},${close.baseline} L${x},${y} L${x},${close.baseline} Z`
      : `M${x},${y}`;
  }

  let d = `M${points[0][0]},${points[0][1]}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev[0] + curr[0]) / 2;
    d += ` C${cpx},${prev[1]} ${cpx},${curr[1]} ${curr[0]},${curr[1]}`;
  }

  if (close) {
    d += ` L${close.x1},${close.baseline} L${close.x0},${close.baseline} Z`;
  }

  return d;
}

export function AreaLineChart({ data, height = 260 }: AreaLineChartProps) {
  const uid = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    injectStyles();
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#827970", fontSize: 13 }}>
        No data
      </div>
    );
  }

  const pad = { top: 20, right: 20, bottom: 40, left: 46 };
  const svgWidth = 700;
  const plotW = svgWidth - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const series = [
    { key: "events" as const, color: "#D67D5C", label: "Events" },
    { key: "photos" as const, color: "#5B8DEF", label: "Photos" },
    { key: "guests" as const, color: "#60D9A0", label: "Guests" },
  ];

  const allVals = data.flatMap((d) => [d.events, d.photos, d.guests]);
  const maxVal = Math.max(...allVals, 1);
  // nice ceiling
  const niceMax = Math.ceil(maxVal / 5) * 5 || 5;

  const xStep = data.length > 1 ? plotW / (data.length - 1) : 0;

  function toPoint(index: number, value: number): [number, number] {
    return [
      pad.left + index * xStep,
      pad.top + plotH - (value / niceMax) * plotH,
    ];
  }

  // Grid lines (5 lines)
  const gridCount = 5;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const val = Math.round((niceMax / gridCount) * i);
    const y = pad.top + plotH - (val / niceMax) * plotH;
    return { val, y };
  });

  return (
    <div style={{ animation: "charts-fadeIn 0.5s ease-out both" }}>
      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 12,
          justifyContent: "flex-end",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.4s ease 0.3s",
        }}
      >
        {series.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: s.color,
                boxShadow: `0 0 6px ${s.color}55`,
              }}
            />
            <span style={{ color: "#827970", fontSize: 12, fontFamily: "system-ui, sans-serif" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ overflow: "visible" }}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={`${uid}-grad-${s.key}`} id={`${uid}-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {gridLines.map((g, i) => (
          <g key={`${uid}-grid-${i}`}>
            <line
              x1={pad.left}
              y1={g.y}
              x2={pad.left + plotW}
              y2={g.y}
              stroke="rgba(45, 45, 45, 0.06)"
              strokeDasharray={i === 0 ? "none" : "4 4"}
            />
            <text
              x={pad.left - 10}
              y={g.y}
              textAnchor="end"
              dominantBaseline="central"
              fill="#827970"
              fontSize={10}
              fontFamily="system-ui, sans-serif"
            >
              {g.val}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={`${uid}-xlbl-${i}`}
            x={pad.left + i * xStep}
            y={height - 10}
            textAnchor="middle"
            fill="#827970"
            fontSize={10}
            fontFamily="system-ui, sans-serif"
          >
            {d.month}
          </text>
        ))}

        {/* Series – area fills + lines */}
        {series.map((s) => {
          const pts: [number, number][] = data.map((d, i) => toPoint(i, d[s.key]));
          const areaPath = smoothPath(pts, {
            baseline: pad.top + plotH,
            x0: pts[0][0],
            x1: pts[pts.length - 1][0],
          });
          const linePath = smoothPath(pts);

          return (
            <g
              key={s.key}
              style={{
                opacity: mounted ? 1 : 0,
                transition: `opacity 0.7s ease ${series.indexOf(s) * 0.15 + 0.2}s`,
              }}
            >
              <path d={areaPath} fill={`url(#${uid}-grad-${s.key})`} />
              <path
                d={linePath}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 4px ${s.color}55)` }}
              />
              {/* Data dots */}
              {pts.map(([x, y], i) => (
                <circle
                  key={`${uid}-dot-${s.key}-${i}`}
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill="white"
                  stroke={s.color}
                  strokeWidth={2}
                  style={{
                    opacity: mounted ? 1 : 0,
                    transition: `opacity 0.4s ease ${0.4 + i * 0.06}s`,
                  }}
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ═════════════════════════════════════════════
   3. HORIZONTAL BAR CHART
   ═════════════════════════════════════════════ */

interface BarDatum {
  name: string;
  value: number;
  secondary?: string;
}

interface HorizontalBarChartProps {
  data: BarDatum[];
  title?: string;
}

export function HorizontalBarChart({ data, title }: HorizontalBarChartProps) {
  const uid = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    injectStyles();
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "#827970", fontSize: 13, padding: 20 }}>
        No data
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barH = 28;
  const gap = 14;
  const labelW = 170;
  const valueW = 60;
  const rankW = 28;
  const svgWidth = 500;
  const barAreaW = svgWidth - labelW - valueW - rankW;
  const totalH = data.length * (barH + gap) - gap + 12;

  return (
    <div style={{ animation: "charts-fadeIn 0.45s ease-out both" }}>
      {title && (
        <div
          style={{
            color: "#827970",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          {title}
        </div>
      )}

      <svg
        width="100%"
        height={totalH}
        viewBox={`0 0 ${svgWidth} ${totalH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`${uid}-barGrad`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D67D5C" />
            <stop offset="100%" stopColor="#F4A261" />
          </linearGradient>
          <linearGradient id={`${uid}-barGradGlow`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D67D5C" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#F4A261" stopOpacity={0.1} />
          </linearGradient>
        </defs>

        {data.map((d, i) => {
          const y = i * (barH + gap);
          const pct = d.value / maxVal;
          const barWidth = mounted ? pct * barAreaW : 0;

          return (
            <g
              key={`${uid}-bar-${i}`}
              style={{
                opacity: mounted ? 1 : 0,
                transition: `opacity 0.4s ease ${i * 0.06}s`,
              }}
            >
              {/* Rank number */}
              <text
                x={rankW / 2}
                y={y + barH / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(45, 45, 45, 0.2)"
                fontSize={11}
                fontWeight={600}
                fontFamily="system-ui, sans-serif"
              >
                {i + 1}
              </text>

              {/* Name + secondary */}
              <text
                x={rankW + 4}
                y={d.secondary ? y + barH / 2 - 5 : y + barH / 2}
                dominantBaseline="central"
                fill="#2D2D2D"
                fontSize={13}
                fontWeight={500}
                fontFamily="system-ui, sans-serif"
              >
                {d.name}
              </text>
              {d.secondary !== undefined && (
                <text
                  x={rankW + 4}
                  y={y + barH / 2 + 10}
                  dominantBaseline="central"
                  fill="#827970"
                  fontSize={10}
                  fontFamily="system-ui, sans-serif"
                >
                  {d.secondary}
                </text>
              )}

              {/* Bar track */}
              <rect
                x={rankW + labelW}
                y={y + 4}
                width={barAreaW}
                height={barH - 8}
                rx={6}
                fill="rgba(45, 45, 45, 0.04)"
              />

              {/* Glow layer */}
              <rect
                x={rankW + labelW}
                y={y + 4}
                width={barWidth}
                height={barH - 8}
                rx={6}
                fill={`url(#${uid}-barGradGlow)`}
                style={{
                  transition: `width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.07}s`,
                }}
              />

              {/* Bar */}
              <rect
                x={rankW + labelW}
                y={y + 6}
                width={barWidth}
                height={barH - 12}
                rx={5}
                fill={`url(#${uid}-barGrad)`}
                style={{
                  transition: `width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.07}s`,
                  filter: "drop-shadow(0 0 8px rgba(214,125,92,0.25))",
                }}
              />

              {/* Value text */}
              <text
                x={svgWidth - 4}
                y={y + barH / 2}
                textAnchor="end"
                dominantBaseline="central"
                fill="#2D2D2D"
                fontSize={13}
                fontWeight={600}
                fontFamily="system-ui, sans-serif"
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: `opacity 0.4s ease ${0.5 + i * 0.06}s`,
                }}
              >
                {d.value.toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ═════════════════════════════════════════════
   4. MINI SPARKLINE
   ═════════════════════════════════════════════ */

interface MiniSparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function MiniSparkline({
  data,
  color = "#D67D5C",
  width = 120,
  height = 36,
}: MiniSparklineProps) {
  const uid = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    injectStyles();
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!data || data.length < 2) {
    return <div style={{ width, height }} />;
  }

  const padY = 4;
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const points: [number, number][] = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    padY + (1 - (v - minVal) / range) * (height - padY * 2),
  ]);

  const polyline = points.map((p) => p.join(",")).join(" ");

  // Area polygon: same points + bottom-right + bottom-left
  const areaPoints =
    polyline + ` ${width},${height} 0,${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        overflow: "visible",
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.5s ease",
      }}
    >
      <defs>
        <linearGradient id={`${uid}-sparkGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <polygon
        points={areaPoints}
        fill={`url(#${uid}-sparkGrad)`}
      />

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}44)` }}
      />

      {/* End dot */}
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={2.5}
        fill={color}
        style={{
          filter: `drop-shadow(0 0 4px ${color}88)`,
          animation: mounted ? "charts-pulseOnce 1.2s ease-out" : "none",
        }}
      />
    </svg>
  );
}
