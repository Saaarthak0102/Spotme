"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const pathname = usePathname();

  const items = [
    { label: "Home", href: "/", icon: "auto_awesome" },
    { label: "Galleries", href: "/galleries", icon: "photo_library" },
    { label: "Book", href: "/inquire", icon: "calendar_today", primary: true },
    { label: "Pricing", href: "/pricing", icon: "menu_book" },
    { label: "Account", href: "#", icon: "person" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-2 pb-safe border-t border-outline-variant/30 md:hidden bg-surface-bright dark:bg-surface-dim shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] z-50 py-3">
      {items.map((item) => {
        const isActive = pathname === item.href;
        
        if (item.primary) {
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center justify-center bg-primary text-on-primary rounded-xl px-4 py-1.5 active:scale-95 transition-transform duration-200"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold mt-0.5">{item.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-lg transition-colors ${
              isActive
                ? "text-primary font-bold"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="text-[10px] font-semibold mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
