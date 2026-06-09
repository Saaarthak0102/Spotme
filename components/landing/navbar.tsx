"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Pricing", href: "/pricing" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="w-full sticky top-0 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10 transition-all duration-300 z-[101]">
      {/* Increased shadow to shadow-lg, and set z-[101] for strong elevation on z axis */}
      <nav className="flex justify-between items-center px-margin-desktop py-4 max-w-container-max mx-auto">

        {/* Left side: Logo */}
        <div className="flex-shrink-0">
          <Link href="/" className="font-serif text-3xl font-bold text-primary italic tracking-tight">
            Spotme
          </Link>
        </div>

        {/* Middle: Nav links */}
        <div className="hidden md:flex gap-8 items-center justify-center flex-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`font-sans text-[15px] font-medium transition-colors duration-200 nav-underline pb-1 ${isActive
                    ? "text-primary font-semibold border-b-2 border-primary"
                    : "text-on-surface-variant hover:text-primary"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side: Buttons */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-on-surface-variant font-sans font-semibold text-sm hover:text-primary transition-all px-4 py-2"
          >
            Login
          </Link>
          <Link
            href="/inquire"
            className="bg-primary text-on-primary font-sans font-semibold text-sm px-6 py-2.5 rounded-xl hover:scale-[1.05] active:scale-95 duration-200 shadow-sm transition-all text-center inline-block"
          >
            Inquire
          </Link>
        </div>
      </nav>
    </header>
  );
}
