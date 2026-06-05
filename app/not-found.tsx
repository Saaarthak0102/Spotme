"use client";

import Link from "next/link";
import { useState } from "react";

export default function NotFound() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <main className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden bg-pulse-anim gradient-mesh px-6 py-12">
      {/* Dynamic ambient background glow lights */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[#D67D5C] opacity-10 blur-[100px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-amber-500 opacity-[0.06] blur-[120px] pointer-events-none animate-pulse duration-[12000ms]" />

      <div className="relative z-10 w-full max-w-md text-center flex flex-col items-center">
        
        {/* Interactive Camera Viewfinder widget */}
        <div 
          className="relative group w-64 h-44 sm:w-72 sm:h-48 rounded-[24px] border border-[#2D2D2D]/8 bg-white/40 p-2 shadow-lg backdrop-blur-md mb-8 overflow-hidden transition-all duration-500 hover:border-[#D67D5C]/30 hover:shadow-xl cursor-pointer"
          onMouseEnter={() => setIsFocused(true)}
          onMouseLeave={() => setIsFocused(false)}
          onClick={() => setIsFocused(!isFocused)}
        >
          {/* Out of focus background mockup (dynamic blur based on hover/state) */}
          <div 
            className={`absolute inset-2 rounded-[18px] bg-gradient-to-br from-[#EFE6DD] via-[#FDF8F1] to-[#FFF3EB] transition-all duration-700 ease-out flex items-center justify-center overflow-hidden ${
              isFocused ? "blur-none" : "blur-[5px]"
            }`}
          >
            {/* Abstract visual art representing camera focusing ring */}
            <div className="absolute w-24 h-24 rounded-full border border-[#D67D5C]/15 flex items-center justify-center animate-spin duration-[20s] linear infinite">
              <div className="w-16 h-16 rounded-full border border-dashed border-[#C46A4A]/25" />
            </div>
            
            <span className="font-serif text-6xl font-bold text-[#D67D5C]/20 select-none transition-transform duration-700 group-hover:scale-110">
              404
            </span>
          </div>

          {/* Viewfinder brackets */}
          <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-[#766D66]/40 rounded-tl-[4px]" />
          <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-[#766D66]/40 rounded-tr-[4px]" />
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-[#766D66]/40 rounded-bl-[4px]" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-[#766D66]/40 rounded-br-[4px]" />

          {/* AF Indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#2D2D2D]/5 px-2 py-0.5 rounded-full backdrop-blur-sm">
            <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${isFocused ? "bg-emerald-500" : "bg-[#D67D5C] animate-pulse"}`} />
            <span className="text-[9px] font-mono font-bold tracking-wider text-[#766D66]/80 uppercase">
              {isFocused ? "AF-Lock" : "Searching"}
            </span>
          </div>

          {/* Focus hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <span className="text-[10px] font-sans font-semibold text-[#766D66]/70 transition-opacity duration-300 group-hover:opacity-0 whitespace-nowrap">
              Hover / Tap to Focus
            </span>
          </div>
        </div>

        {/* Text Area */}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#B36144] mb-3">
          Lost in the Moment
        </p>
        <h1 className="font-serif text-3xl font-bold text-[#2D2D2D] leading-tight mb-4 tracking-tight sm:text-4xl">
          This page is out of focus
        </h1>
        <p className="text-sm text-[#766D66] max-w-sm mb-8 leading-relaxed">
          The memory you are looking for has faded, changed addresses, or was never captured in our database.
        </p>

        {/* Navigation CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link
            href="/"
            className="flex h-12 px-6 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D67D5C] to-[#C46A4A] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(214,125,92,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(214,125,92,0.25)] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="flex h-12 px-6 items-center justify-center gap-2 rounded-2xl border border-[#2D2D2D]/8 bg-white/60 text-sm font-semibold text-[#574F49] hover:bg-[#FDF8F1] transition-all duration-200 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">space_dashboard</span>
            My Dashboard
          </Link>
        </div>
        
      </div>
    </main>
  );
}
