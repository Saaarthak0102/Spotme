import Link from "next/link";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FEFCFB] font-sans text-[#2D2D2D]">
      {/* Minimal top branding bar */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-center bg-white/70 backdrop-blur-xl border-b border-[#2D2D2D]/5 sm:h-16">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#D67D5C] to-[#C46A4A] text-white shadow-sm transition-transform group-hover:scale-105">
            <span className="material-symbols-outlined text-[16px]">camera</span>
          </span>
          <span className="text-base font-semibold tracking-[-0.03em] text-[#2D2D2D]">Revela</span>
        </Link>
      </header>

      {/* Page content with top padding for fixed header */}
      <main className="pt-14 sm:pt-16">
        {children}
      </main>
    </div>
  );
}
