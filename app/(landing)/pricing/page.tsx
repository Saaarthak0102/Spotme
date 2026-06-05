"use client";

import { useEffect, useState } from "react";
import Header from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import MobileNav from "@/components/landing/mobile-nav";
import Link from "next/link";

// ── Plan data ────────────────────────────────────────────────────────────────

const PERSONAL_PLANS = [
  {
    id: "free",
    name: "Starter",
    price: "₹0",
    period: "forever free",
    badge: null,
    desc: "Perfect for trying out Spotme at your first event.",
    features: [
      "1 Active Event",
      "10 GB Cloud Storage",
      "AI Face Matching",
      "Dynamic QR Event Access",
      "Public Event Gallery",
      "Guest Selfie Upload",
    ],
    cta: "Start Free",
    href: "/login",
    highlight: false,
  },
  {
    id: "pro",
    name: "Personal Pro",
    price: "₹999",
    period: "/month",
    badge: "Most Popular",
    desc: "For full-time freelance photographers handling multiple events.",
    features: [
      "Up to 10 Active Events",
      "100 GB Cloud Storage",
      "AI Face Matching",
      "Privacy Mode (selfie-only access)",
      "High-Resolution Downloads",
      "Priority AI Processing",
      "Custom Event Branding",
      "Guest WhatsApp Alerts",
      "7-Day Photo Archive",
    ],
    cta: "Get Personal Pro",
    href: "/login?plan=pro",
    highlight: true,
  },
];

const STUDIO_PLANS = [
  {
    id: "unlimited",
    name: "Studio",
    price: "₹2,499",
    period: "/month",
    badge: "Best Value",
    desc: "For growing photography studios managing high-volume events.",
    features: [
      "Unlimited Active Events",
      "500 GB Cloud Storage",
      "AI Face Matching",
      "Privacy & Watermark Controls",
      "High-Resolution Downloads",
      "Branded Guest Galleries",
      "Priority AI + Support",
      "Guest WhatsApp Alerts",
      "Multi-Photographer Workflows",
    ],
    cta: "Start Studio Plan",
    href: "/login?plan=unlimited",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    badge: null,
    desc: "For large agencies and event management companies at scale.",
    features: [
      "Everything in Studio",
      "Dedicated Storage Quota",
      "SLA & Uptime Guarantee",
      "Custom Domain Galleries",
      "API Access",
      "Dedicated Account Manager",
      "White-Label Options",
      "Custom AI Thresholds",
      "Invoice Billing",
    ],
    cta: "Contact Sales",
    href: "/contact",
    highlight: false,
  },
];

const FAQS = [
  {
    question: "How does AI photo matching work?",
    answer:
      "Guests scan the event QR code, upload a selfie, and Spotme's AI (InsightFace ArcFace) automatically finds all event photos featuring their face — with no manual tagging needed.",
  },
  {
    question: "What is Privacy Mode?",
    answer:
      "When Privacy Mode is on, the general gallery is hidden. Guests can only see photos of themselves after uploading their selfie — ideal for weddings and private events.",
  },
  {
    question: "Do guests need an account?",
    answer:
      "No. Guests access event photos using the event QR code and a phone number verification. Zero app download or account required.",
  },
  {
    question: "Can I upgrade or downgrade at any time?",
    answer:
      "Yes. You can change plans from your Account settings at any time. Upgrades take effect immediately.",
  },
  {
    question: "What happens to my photos if I downgrade?",
    answer:
      "Your photos remain safely stored. If your storage exceeds the new plan limit, new uploads will be paused until you free up space or upgrade again.",
  },
  {
    question: "Is there a per-event fee or per-guest fee?",
    answer:
      "No. All plans are flat monthly subscriptions — no per-event or per-guest charges. Unlimited guests on every plan.",
  },
];

// ── Comparison table ──────────────────────────────────────────────────────────

const COMPARISON = [
  { feature: "Active Events", starter: "1", pro: "10", studio: "Unlimited", enterprise: "Unlimited" },
  { feature: "Cloud Storage", starter: "10 GB", pro: "100 GB", studio: "500 GB", enterprise: "Custom" },
  { feature: "AI Face Matching", starter: true, pro: true, studio: true, enterprise: true },
  { feature: "Guest QR Access", starter: true, pro: true, studio: true, enterprise: true },
  { feature: "Privacy Mode", starter: false, pro: true, studio: true, enterprise: true },
  { feature: "Custom Branding", starter: false, pro: true, studio: true, enterprise: true },
  { feature: "Priority AI Processing", starter: false, pro: true, studio: true, enterprise: true },
  { feature: "WhatsApp Guest Alerts", starter: false, pro: true, studio: true, enterprise: true },
  { feature: "Branded Galleries", starter: false, pro: false, studio: true, enterprise: true },
  { feature: "API Access", starter: false, pro: false, studio: false, enterprise: true },
  { feature: "White-Label", starter: false, pro: false, studio: false, enterprise: true },
  { feature: "Support", starter: "Community", pro: "Email", studio: "Priority", enterprise: "Dedicated" },
];

// ── Components ────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
      <span className="material-symbols-outlined text-[14px] text-primary">check</span>
    </span>
  );
}

function CrossIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-outline-variant/20">
      <span className="material-symbols-outlined text-[14px] text-on-surface-variant/40">remove</span>
    </span>
  );
}

type Plan = {
  id: string;
  name: string;
  price: string;
  period: string;
  badge: string | null;
  desc: string;
  features: string[];
  cta: string;
  href: string;
  highlight: boolean;
};

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-7 transition-all duration-300 ${
        plan.highlight
          ? "border-primary bg-primary text-on-primary shadow-xl shadow-primary/20 scale-[1.02]"
          : "border-outline-variant/15 bg-surface-container-lowest text-on-surface shadow-sm hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {plan.badge && (
        <div
          className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-widest ${
            plan.highlight ? "bg-white text-primary" : "bg-primary text-on-primary"
          }`}
        >
          {plan.badge}
        </div>
      )}

      <h2 className={`text-lg font-bold font-sans ${plan.highlight ? "text-on-primary" : "text-on-surface"}`}>
        {plan.name}
      </h2>
      <p className={`mt-1 text-xs leading-relaxed ${plan.highlight ? "text-on-primary/75" : "text-on-surface-variant"}`}>
        {plan.desc}
      </p>

      <div className="mt-5 flex items-baseline gap-1">
        <span className={`text-4xl font-extrabold tracking-tight ${plan.highlight ? "text-on-primary" : "text-primary"}`}>
          {plan.price}
        </span>
        {plan.period && (
          <span className={`text-sm font-medium ${plan.highlight ? "text-on-primary/70" : "text-on-surface-variant"}`}>
            {plan.period}
          </span>
        )}
      </div>

      <ul className={`mt-6 space-y-2.5 flex-1 text-sm ${plan.highlight ? "text-on-primary/85" : "text-on-surface-variant"}`}>
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span
              className={`material-symbols-outlined shrink-0 text-[16px] mt-0.5 ${
                plan.highlight ? "text-white/80" : "text-primary"
              }`}
            >
              check_circle
            </span>
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={plan.href}
        className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all duration-200 ${
          plan.highlight
            ? "bg-white text-primary hover:bg-white/90 shadow-sm"
            : plan.id === "enterprise"
            ? "border border-outline-variant/20 bg-transparent text-on-surface hover:bg-surface-container hover:border-primary/30"
            : "bg-primary text-on-primary hover:bg-primary/90"
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Pricing() {
  const [tab, setTab] = useState<"personal" | "studio">("personal");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const observerOptions = { threshold: 0.08 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-8");
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll(".reveal-section");
    elements.forEach((el) => {
      el.classList.add("opacity-0", "translate-y-8", "transition-all", "duration-700");
      observer.observe(el);
    });

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const plans = tab === "personal" ? PERSONAL_PLANS : STUDIO_PLANS;

  return (
    <div className="bg-background text-on-background font-sans selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-grow">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden pt-24 pb-6 reveal-section">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary mb-6">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              Simple, transparent pricing
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-on-surface mb-5 tracking-tight font-sans leading-tight">
              The right plan for{" "}
              <span className="text-primary">every photographer</span>
            </h1>
            <p className="text-base md:text-lg text-on-surface-variant max-w-xl mx-auto">
              From solo weekend shooters to high-volume studios — choose the plan that matches your scale. Cancel anytime.
            </p>
          </div>
        </section>

        {/* ── Segment Toggle ── */}
        <section className="py-8 reveal-section">
          <div className="flex justify-center">
            <div className="inline-flex rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-1.5 gap-1 shadow-sm">
              <button
                onClick={() => setTab("personal")}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  tab === "personal"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                Personal
              </button>
              <button
                onClick={() => setTab("studio")}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  tab === "studio"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">business</span>
                Studio
              </button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-on-surface-variant">
            {tab === "personal"
              ? "For individual photographers & freelancers"
              : "For studios, agencies & event companies"}
          </p>
        </section>

        {/* ── Plan Cards ── */}
        <section className="pb-16 reveal-section">
          <div className="max-w-4xl mx-auto px-6">
            <div className={`grid gap-6 ${tab === "personal" ? "md:grid-cols-2" : "md:grid-cols-2"}`}>
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>

            {/* Satisfaction note */}
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-on-surface-variant">
              {["No setup fees", "Cancel anytime", "Unlimited guests on all plans", "Indian payment methods supported"].map((note) => (
                <span key={note} className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[13px] text-primary">verified</span>
                  {note}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Full Comparison Table ── */}
        <section className="py-16 bg-surface-container-lowest/50 border-t border-b border-outline-variant/10 reveal-section">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface mb-2 font-sans">Full Plan Comparison</h2>
              <p className="text-sm text-on-surface-variant">Every feature, every plan — no surprises.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-outline-variant/15 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/10 bg-surface-container-lowest">
                    <th className="px-5 py-4 text-left font-semibold text-on-surface w-[40%]">Feature</th>
                    <th className="px-4 py-4 text-center font-semibold text-on-surface-variant">Starter</th>
                    <th className="px-4 py-4 text-center font-bold text-primary">Personal Pro</th>
                    <th className="px-4 py-4 text-center font-semibold text-on-surface">Studio</th>
                    <th className="px-4 py-4 text-center font-semibold text-on-surface-variant">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/8">
                  {COMPARISON.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-white/30" : ""}>
                      <td className="px-5 py-3.5 text-on-surface font-medium">{row.feature}</td>
                      <td className="px-4 py-3.5 text-center">
                        {typeof row.starter === "boolean" ? (
                          row.starter ? <CheckIcon /> : <CrossIcon />
                        ) : (
                          <span className="text-on-surface-variant">{row.starter}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center bg-primary/3">
                        {typeof row.pro === "boolean" ? (
                          row.pro ? <CheckIcon /> : <CrossIcon />
                        ) : (
                          <span className="font-medium text-primary">{row.pro}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {typeof row.studio === "boolean" ? (
                          row.studio ? <CheckIcon /> : <CrossIcon />
                        ) : (
                          <span className="text-on-surface">{row.studio}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {typeof row.enterprise === "boolean" ? (
                          row.enterprise ? <CheckIcon /> : <CrossIcon />
                        ) : (
                          <span className="text-on-surface-variant">{row.enterprise}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="py-16 reveal-section">
          <div className="max-w-2xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface font-sans mb-2">
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-on-surface-variant">
                Everything you need to know before getting started.
              </p>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className={`rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isOpen
                        ? "border-primary/30 bg-primary/5"
                        : "border-outline-variant/15 bg-surface-container-lowest hover:border-primary/20"
                    }`}
                  >
                    <div className="flex items-center justify-between p-5">
                      <h4 className="text-sm font-semibold text-on-surface pr-4">{faq.question}</h4>
                      <span className={`material-symbols-outlined text-[20px] shrink-0 transition-transform duration-200 ${isOpen ? "text-primary rotate-180" : "text-on-surface-variant"}`}>
                        expand_more
                      </span>
                    </div>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isOpen ? "max-h-[200px] pb-5 px-5 opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <p className="text-sm text-on-surface-variant leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 bg-primary reveal-section">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <span className="material-symbols-outlined text-4xl text-white/30 mb-3 block">photo_camera</span>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 font-sans">
              Ready to transform your events?
            </h2>
            <p className="text-on-primary/80 mb-8 text-sm md:text-base">
              Join photographers across India using Spotme to deliver stunning AI-powered galleries.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/login"
                className="bg-white text-primary px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-white/95 transition-all duration-200 shadow-sm"
              >
                Start Free — No Credit Card
              </Link>
              <Link
                href="/contact"
                className="border border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-white/10 transition-all duration-200"
              >
                Talk to Sales
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
