"use client";

import { useEffect, useState } from "react";

export function CollabTriggerButton() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.count === "number") setCount(detail.count);
    };
    window.addEventListener("collab-count-update", handler);
    return () => window.removeEventListener("collab-count-update", handler);
  }, []);

  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("open-collab-modal"))}
      className="flex items-center gap-1.5 rounded-xl border border-[#2D2D2D]/8 bg-white/60 px-3.5 py-3 text-sm font-semibold text-[#B36144] hover:bg-[#FFF3EB] hover:border-[#D67D5C]/35 hover:shadow-[0_8px_24px_rgba(214,125,92,0.06)] transition"
    >
      <span className="material-symbols-outlined text-[18px]">groups</span>
      Manage Collaborators {count > 0 && `(${count}/3)`}
    </button>
  );
}
