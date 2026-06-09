"use client";

import Link from "next/link";

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description: string;
}

export function PlanLimitModal({
  isOpen,
  onClose,
  title = "Upgrade your plan",
  description,
}: PlanLimitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#2D2D2D]/40 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-[32px] border border-[#2D2D2D]/6 bg-white p-7 text-center shadow-2xl backdrop-blur-2xl animate-page-enter">
        {/* Close button cross */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-[#827970] hover:bg-[#FDF8F1] transition"
          aria-label="Close modal"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Lock icon container */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF3EB] text-[#D67D5C]">
          <span className="material-symbols-outlined text-[26px] font-light">lock</span>
        </div>

        {/* Plan Limit Reached Tag */}
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B36144]">
          Plan Limit Reached
        </p>

        {/* Header Title */}
        <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-[#2D2D2D]">
          {title}
        </h2>

        {/* Description Body */}
        <p className="mt-3.5 text-xs text-[#625D58] leading-relaxed max-w-[320px] mx-auto">
          {description}
        </p>

        {/* Upgrade Plan CTA Button */}
        <Link
          href="/dashboard/account?upgrade=true"
          onClick={onClose}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D67D5C] py-3.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(214,125,92,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(214,125,92,0.28)] active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[16px] font-bold">workspace_premium</span>
          Upgrade Plan
        </Link>

        {/* Cancel Action Button */}
        <button
          onClick={onClose}
          className="mt-2.5 w-full rounded-xl bg-transparent py-3 text-xs font-bold text-[#625D58] hover:bg-[#FDF8F1] transition active:scale-[0.98]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
