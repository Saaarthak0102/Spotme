"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import Link from "next/link";

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    // Setup Scroll Reveal Observer
    const observerOptions = {
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-10");
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll(".reveal-section");
    elements.forEach((el) => {
      el.classList.add("opacity-0", "translate-y-10", "transition-all", "duration-1000", "quint-ease");
      observer.observe(el);
    });

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const faqs = [
    {
      question: "How does the per-event pricing work?",
      answer: "Our \"Moment\" tier is billed per distinct celebration. You receive a unique gallery and access code for that specific event, with no time limits on how long the gallery remains active for viewing and downloads."
    },
    {
      question: "Can I upgrade from Moment to Legacy later?",
      answer: "Absolutely. We credit your previous event purchases towards the Legacy lifetime license, ensuring you only pay the difference to unlock unlimited access for all your future milestones."
    },
    {
      question: "What happens if a guest uploads inappropriate content?",
      answer: "Every Moment and Legacy gallery includes intelligent moderation tools. You have the ability to review, hide, or delete any image from the guest feed instantly through your host dashboard."
    },
    {
      question: "Is there a limit on how many guests can participate?",
      answer: "No. Whether it is an intimate elopement or a grand gala for thousands, our infrastructure scales seamlessly to accommodate every guest and every upload without extra fees."
    }
  ];

  return (
    <div className="bg-background text-on-background font-sans selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-12 bg-warm-bg reveal-section">
          <div className="max-w-container-max mx-auto px-margin-desktop text-center relative z-10">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-primary mb-6">Investment in Memories</h1>
            <p className="text-base md:text-lg font-sans text-on-surface-variant max-w-2xl mx-auto mb-12 leading-relaxed">
              Preserve your most cherished milestones with a digital experience as timeless as your memories. Choose the path that suits your journey.
            </p>
          </div>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[400px] h-[400px] bg-secondary-fixed/20 rounded-full blur-3xl"></div>
        </section>

        {/* Pricing Tiers */}
        <section className="pb-24 bg-warm-bg relative z-10 reveal-section">
          <div className="max-w-container-max mx-auto px-margin-desktop">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              
              {/* Essentials Tier */}
              <div className="bg-surface-container-lowest rounded-[32px] p-10 soft-lift border border-outline-variant/20 flex flex-col justify-between">
                <div>
                  <div className="mb-8">
                    <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">The Beginning</span>
                    <h2 className="text-3xl font-serif font-bold text-tertiary">Essentials</h2>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-4xl font-serif font-bold text-primary">Free</span>
                    </div>
                  </div>
                  <p className="text-sm font-sans text-on-surface-variant mb-8 leading-relaxed">
                    A refined introduction to the Revela ecosystem for private storage and personal viewing.
                  </p>
                  <ul className="space-y-4 mb-10">
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                      <span className="text-on-surface">Up to 2GB secure storage</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                      <span className="text-on-surface">Standard web gallery resolution</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                      <span className="text-on-surface">Private link sharing</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                      <span className="text-on-surface">1 month archive duration</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/inquire"
                  className="w-full py-4 border-2 border-primary text-primary rounded-xl font-sans font-semibold text-sm hover:bg-primary/5 transition-all duration-300 text-center block"
                >
                  Start Your Journey
                </Link>
              </div>

              {/* Moment Tier (Highlighted) */}
              <div className="bg-primary text-on-primary rounded-[32px] p-10 soft-lift shadow-2xl relative overflow-hidden flex flex-col justify-between lg:scale-105 z-20">
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-on-primary/70 mb-2 block">Most Popular</span>
                      <h2 className="text-3xl font-serif font-bold">Moment</h2>
                    </div>
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Per Event</span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl md:text-5xl font-serif font-bold">$49</span>
                    <span className="text-sm font-sans opacity-80">/ event</span>
                  </div>
                  <p className="text-sm font-sans text-on-primary/95 mb-8 mt-6 leading-relaxed">
                    The definitive choice for weddings and milestones. Immersive, AI-enhanced sharing for every guest.
                  </p>
                  <ul className="space-y-4 mb-10">
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-secondary-fixed text-[20px]">auto_awesome</span>
                      <span>Unlimited event storage</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-secondary-fixed text-[20px]">auto_awesome</span>
                      <span>4K Original quality downloads</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-secondary-fixed text-[20px]">auto_awesome</span>
                      <span>AI Facial recognition for guests</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-secondary-fixed text-[20px]">auto_awesome</span>
                      <span>Collaborative live guest feed</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-secondary-fixed text-[20px]">auto_awesome</span>
                      <span>Custom branded gallery portal</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/inquire"
                  className="w-full py-4 bg-white text-primary rounded-xl font-sans font-semibold text-sm hover:scale-105 active:scale-95 transition-all duration-300 relative z-10 text-center block"
                >
                  Select Moment
                </Link>
              </div>

              {/* Heritage / Legacy Tier */}
              <div className="bg-surface-container-lowest rounded-[32px] p-10 soft-lift border border-outline-variant/20 flex flex-col justify-between">
                <div>
                  <div className="mb-8">
                    <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">The Legacy</span>
                    <h2 className="text-3xl font-serif font-bold text-tertiary">Legacy</h2>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-4xl font-serif font-bold text-primary">$199</span>
                      <span className="text-sm font-sans text-on-surface-variant ml-2">Lifetime</span>
                    </div>
                  </div>
                  <p className="text-sm font-sans text-on-surface-variant mb-8 leading-relaxed">
                    A one-time investment for a lifetime of stories. Complete access to every future innovation.
                  </p>
                  <ul className="space-y-4 mb-10">
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-primary text-[20px]">all_inclusive</span>
                      <span className="text-on-surface">Unlimited events &amp; storage</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-primary text-[20px]">all_inclusive</span>
                      <span className="text-on-surface">Priority AI processing</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-primary text-[20px]">all_inclusive</span>
                      <span className="text-on-surface">Concierge archive migration</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-primary text-[20px]">all_inclusive</span>
                      <span className="text-on-surface">Early access to beta features</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                      <span className="material-symbols-outlined text-primary text-[20px]">all_inclusive</span>
                      <span className="text-on-surface">Custom domain support</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/inquire"
                  className="w-full py-4 border-2 border-primary text-primary rounded-xl font-sans font-semibold text-sm hover:bg-primary/5 transition-all duration-300 text-center block"
                >
                  Secure Your Legacy
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* Bento Grid Comparison (Detail) */}
        <section className="py-24 bg-surface-container-low reveal-section">
          <div className="max-w-container-max mx-auto px-margin-desktop">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-serif font-bold text-primary">Every Detail Considered</h2>
              <p className="text-sm font-sans text-on-surface-variant mt-4">A closer look at how we preserve your history.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
              {/* Feature 1: Image */}
              <div className="col-span-12 md:col-span-8 h-[400px] rounded-[32px] overflow-hidden relative group shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)]">
                <img
                  alt="Elegant wedding reception"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEh5H04dcNqeghxEMpDa8bLT6M1aS2bPvdvQe63t6zY6iS6xq2-96-Ff-MNmRU7a4Kc0XC1dBh-mxprL5hZ-Q18bLT9Zp_MXHfiAkDhlxa9U6oCP0fci-sP5KVbE64WmW5R0G4ayAkf55hZo-zN3qBsB2gLVi-CSZTB2rIqBi-lzzJEgu_sc_UJZExidpW4QhAJaQ1aF9Cx0iQAkwKZ-BSgD2WtA8y6qLeZrXnyeq2zAKdK5IbakDDKAQhST-Mp5iV4CxM4TBTbw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-10">
                  <div className="text-on-primary">
                    <h3 className="text-2xl font-serif font-bold mb-2">Cinematic Galleries</h3>
                    <p className="text-sm font-sans max-w-md opacity-90 leading-relaxed">
                      Designed to evoke the same emotions as the day itself, with fluid layouts and immersive transitions.
                    </p>
                  </div>
                </div>
              </div>
              {/* Feature 2: Stats */}
              <div className="col-span-12 md:col-span-4 bg-tertiary-fixed rounded-[32px] p-10 flex flex-col justify-center items-center text-center shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)]">
                <span className="material-symbols-outlined text-primary text-5xl mb-6">verified_user</span>
                <h3 className="text-xl font-serif font-bold text-on-tertiary-fixed mb-4">Unrivaled Privacy</h3>
                <p className="text-sm font-sans text-on-tertiary-fixed-variant leading-relaxed">
                  Military-grade encryption for every heirloom. Your memories are yours alone, forever.
                </p>
              </div>
              {/* Feature 3: Contrast Card */}
              <div className="col-span-12 md:col-span-4 bg-secondary-container rounded-[32px] p-10 flex flex-col justify-between group cursor-pointer shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)] min-h-[300px]">
                <div className="material-symbols-outlined text-on-secondary-container text-4xl">cloud_sync</div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-on-secondary-container mb-2">Instant Sync</h3>
                  <p className="text-sm font-sans text-on-secondary-container/85 leading-relaxed">
                    Every photo uploaded by guests appears in real-time on your master gallery.
                  </p>
                </div>
              </div>
              {/* Feature 4: Detail Image */}
              <div className="col-span-12 md:col-span-8 h-[300px] rounded-[32px] overflow-hidden relative group shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)]">
                <img
                  alt="Family archive"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2Gh0y-RIJjZo56CpbuTkwJ3Q_Cgf7ws5xUapgvg5cbgXlTznfsPOMaAbtzRspCUsWzIRTtY1LWRM_aeyUj2KO9T9X9paQaLcSiVkcb0PRJJ0yv9vVtRk72rS2uAZWfvunOjtRNw_ajGuozPUovXPzSmmzL2CucevrFpMHMX-qcu7oVQ0Z3hq3s82CX9TWiGG0PhAeCoj8w6LNnoTEjOxiTvz-iOinYWLmDHbxM8bxtUvY18rFRWYdeZ-cv2-Wx9aZaArHWeyAnw"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"></div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-background reveal-section">
          <div className="max-w-3xl mx-auto px-margin-desktop">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-serif font-bold text-primary">Inquiries</h2>
              <p className="text-sm font-sans text-on-surface-variant mt-2">Answers to common questions about our heritage service.</p>
            </div>
            <div className="space-y-6">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 quint-ease hover:border-primary/50 cursor-pointer transition-all duration-300"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-base font-sans font-semibold text-on-surface">{faq.question}</h4>
                      <span className="material-symbols-outlined text-on-surface-variant">
                        {isOpen ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                    <div
                      className={`overflow-hidden transition-all duration-500 ease-in-out ${
                        isOpen ? "max-h-[200px] mt-4 opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <p className="text-sm font-sans text-on-surface-variant leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary-container/20 reveal-section">
          <div className="max-w-container-max mx-auto px-margin-desktop text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary mb-8">Ready to Preserve Your Story?</h2>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Link
                href="/inquire"
                className="bg-primary text-on-primary px-10 py-4 rounded-xl font-sans font-semibold text-sm hover:scale-105 transition-all duration-300"
              >
                Create Your First Gallery
              </Link>
              <Link
                href="/inquire"
                className="text-primary font-sans font-semibold text-sm flex items-center gap-2 group"
              >
                Schedule a Consultation
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
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
