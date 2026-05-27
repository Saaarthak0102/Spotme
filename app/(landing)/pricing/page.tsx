"use client";

import { useEffect, useState } from "react";
import Header from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import MobileNav from "@/components/landing/mobile-nav";
import Link from "next/link";

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-6");
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll(".reveal-section");
    elements.forEach((el) => {
      el.classList.add("opacity-0", "translate-y-6", "transition-all", "duration-700");
      observer.observe(el);
    });

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const faqs = [
    {
      question: "How does AI photo matching work?",
      answer: "Guests upload a selfie and Revela automatically finds matching event photos using facial recognition."
    },
    {
      question: "What happens if photos are uploaded later?",
      answer: "Guests receive a WhatsApp notification when new matching photos become available."
    },
    {
      question: "Do guests need an account?",
      answer: "No. Guests can access event photos using QR codes and WhatsApp verification."
    },
    {
      question: "Can photographers create multiple events?",
      answer: "Yes. Pro and Studio plans support multiple active events simultaneously."
    }
  ];

  return (
    <div className="bg-background text-on-background font-sans selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-10 bg-white reveal-section border-b border-outline-variant/10">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-primary mb-6 tracking-tight font-sans">
              AI-Powered Event Photo Sharing
            </h1>
            <p className="text-base md:text-lg text-on-surface-variant mb-10">
              Guests scan a QR code, upload a selfie, and instantly find their event photos using AI.
            </p>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-surface-container-lowest rounded-md flex items-center justify-center text-on-surface-variant border border-outline-variant/20 text-3xl">
                <span className="material-symbols-outlined text-[32px]">qr_code</span>
              </div>
            </div>
            <div className="flex justify-center mt-2 gap-3">
              <span className="inline-flex items-center px-3 py-1.5 rounded bg-background text-on-surface text-xs border border-outline-variant/10">QR Event Access</span>
              <span className="inline-flex items-center px-3 py-1.5 rounded bg-background text-on-surface text-xs border border-outline-variant/10">WhatsApp Notifications</span>
            </div>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="py-16 bg-background reveal-section">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Free Plan */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 flex flex-col p-7 items-start shadow-sm">
                <h2 className="text-lg font-bold mb-2 text-on-surface font-sans">Starter</h2>
                <div className="text-3xl font-bold mb-1 font-sans text-primary">₹0</div>
                <ul className="mb-7 mt-3 text-sm text-on-surface-variant space-y-2 font-sans">
                  <li>• 1 Active Event</li>
                  <li>• 10GB Cloud Storage</li>
                  <li>• AI Face Matching</li>
                  <li>• Dynamic QR Event Access</li>
                  <li>• WhatsApp Guest Notifications</li>
                  <li>• Public Event Gallery</li>
                  <li>• 7-Day Archive</li>
                </ul>
                <Link
                  href="/login"
                  className="mt-auto bg-primary text-on-primary px-5 py-2 rounded-md font-semibold text-sm hover:bg-primary/90 w-full text-center transition"
                >
                  Start Free
                </Link>
              </div>

              {/* Pro Plan */}
              <div className="bg-primary text-on-primary rounded-xl border-2 border-primary flex flex-col p-7 items-start shadow-lg relative z-10">
                <div className="absolute right-6 top-6 text-xs font-bold bg-white/10 px-2 py-1 rounded uppercase tracking-wide hidden md:block pointer-events-none">Most Popular</div>
                <h2 className="text-lg font-bold mb-2 font-sans">Pro</h2>
                <div className="text-3xl font-bold mb-1 font-sans">₹1,699<span className="text-base font-medium ml-1">/month</span></div>
                <ul className="mb-7 mt-3 text-sm text-on-primary/85 space-y-2 font-sans">
                  <li>• Up to 5 Events</li>
                  <li>• 100GB Cloud Storage</li>
                  <li>• AI Face Matching</li>
                  <li>• WhatsApp Guest Notifications</li>
                  <li>• High Resolution Downloads</li>
                  <li>• Event QR Access</li>
                  <li>• Priority AI Processing</li>
                  <li>• Custom Branding</li>
                </ul>
                <Link
                  href="/login?plan=pro"
                  className="mt-auto bg-white text-primary px-5 py-2 rounded-md font-semibold text-sm hover:bg-primary/95 hover:text-on-primary w-full text-center transition"
                >
                  Upgrade to Pro
                </Link>
              </div>

              {/* Unlimited Plan */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/15 flex flex-col p-7 items-start shadow-sm">
                <h2 className="text-lg font-bold mb-2 font-sans">Unlimited</h2>
                <div className="text-3xl font-bold mb-1 font-sans">₹4,199<span className="text-base font-medium ml-1">/month</span></div>
                <ul className="mb-7 mt-3 text-sm text-on-surface-variant space-y-2 font-sans">
                  <li>• Unlimited Events</li>
                  <li>• 1TB Cloud Storage</li>
                  <li>• Team Access</li>
                  <li>• Advanced AI Matching</li>
                  <li>• Priority Support</li>
                  <li>• Unlimited Guests</li>
                  <li>• Branded Galleries</li>
                  <li>• Custom Domains</li>
                </ul>
                <Link
                  href="/login?plan=unlimited"
                  className="mt-auto bg-secondary-container text-on-secondary-container px-5 py-2 rounded-md font-semibold text-sm hover:bg-secondary-container/90 w-full text-center transition"
                >
                  Go Unlimited
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 bg-background reveal-section border-t border-outline-variant/10">
          <div className="max-w-2xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-primary font-sans mb-2">Frequently Asked Questions</h2>
              <p className="text-sm text-on-surface-variant font-sans">
                Need more info? Here’s how Revela uses AI to automate discovery for every event.
              </p>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="bg-surface-container-lowest rounded-lg p-5 border border-outline-variant/20 hover:border-primary/50 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-base font-semibold text-on-surface font-sans">
                        {faq.question}
                      </h4>
                      <span className="material-symbols-outlined text-on-surface-variant">
                        {isOpen ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isOpen ? "max-h-[200px] mt-3 opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <p className="text-sm text-on-surface-variant leading-relaxed font-sans">{faq.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary-container/10 reveal-section border-t border-outline-variant/10">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-7 font-sans">Ready to Launch Your Next Event?</h2>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-5">
              <Link
                href="/login"
                className="bg-primary text-on-primary px-8 py-3 rounded-md font-semibold text-sm hover:bg-primary/95 transition-all duration-200"
              >
                Create Your First Event
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
