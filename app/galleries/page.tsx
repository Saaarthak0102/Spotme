"use client";

import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import Link from "next/link";

export default function Galleries() {
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

  return (
    <div className="bg-background text-on-surface font-sans selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-grow animate-fade-in">
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 overflow-hidden reveal-section">
          <div className="max-w-container-max mx-auto px-margin-desktop">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              <span className="text-primary font-sans text-xs font-semibold tracking-widest uppercase mb-4">
                The Collection
              </span>
              <h1 className="text-4xl md:text-6xl font-serif font-bold mb-8">Sample Galleries</h1>
              <p className="text-base md:text-lg font-sans text-on-surface-variant leading-relaxed">
                Explore our curated selection of milestones, captured with the precision of modern innovation and the warmth of a legacy heirloom.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Event Section */}
        <section className="pb-24 reveal-section">
          <div className="max-w-container-max mx-auto px-margin-desktop">
            <div className="relative group cursor-pointer overflow-hidden rounded-[32px] soft-lift transition-all duration-300">
              <div className="aspect-[21/9] w-full min-h-[350px] md:min-h-[450px] overflow-hidden">
                <img
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt="Featured wedding reception set against a classic European estate."
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBn5FsaKun7q735gOMqpvLayxlOSympyj5TQJO2IJhF0MkumJRKaT3qQjE3yIyjeSGKTVV1VlK0qxuimXPMAJfIjLwTyF90JwbeyEv1XaH7DgXwHnSsAtNOU_d5Hn_ZGaXrMYO7kZjUXhhNDK99ezumdxzD0Jfga0R_ZN2eOd43Rv_KhmwJ8xx-tM-LLoRnjwBVdpYTGikJw3t2SR0D8GFjxgBIEiJ4TlOKuhxjZPYZu2v0QLh4PpKUVoY1epMEJhZxjvIk_puP6g"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="text-white">
                    <span className="inline-block bg-primary text-on-primary px-4 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
                      Featured Event
                    </span>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold">The Sterling Wedding</h2>
                    <p className="text-sm opacity-80 mt-2 font-sans">Lake Como, Italy • Summer 2024</p>
                  </div>
                  <Link
                    href="/inquire"
                    className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-xl font-sans font-semibold text-sm hover:bg-white hover:text-primary transition-all duration-500 flex items-center gap-2 w-fit"
                  >
                    View Gallery <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Galleries */}
        <section className="bg-surface-container-low py-24 reveal-section">
          <div className="max-w-container-max mx-auto px-margin-desktop">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-12 gap-4">
              <div>
                <h2 className="text-3xl font-serif font-bold">Archived Moments</h2>
                <p className="text-on-surface-variant text-sm font-sans mt-2">
                  A testament to intimacy and celebration across the globe.
                </p>
              </div>
              <div className="flex gap-4">
                <button className="w-12 h-12 rounded-full border border-outline flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors duration-300 cursor-pointer">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button className="w-12 h-12 rounded-full border border-outline flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors duration-300 cursor-pointer">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              
              {/* Metropolitan Gala */}
              <div className="md:col-span-8 group cursor-pointer">
                <div className="bg-surface-container-lowest rounded-[32px] overflow-hidden feature-lift soft-lift">
                  <div className="aspect-video overflow-hidden max-h-[360px]">
                    <img
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      alt="Grand Metropolitan Gala Ballroom"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDo_tHwHpwmmngREgsXXR-UcQOEiUy-YS2lmZwFqoyTyBnYxoxwLz3FgUYV5FPzyj9If9twcmJWPi5qY_QnsBpS4KOHyp2RchCMoV4yPiZOr1W6JXGEsXY6eMwm3D2qkOzqlYOc-FbIi2-vmf1fThrhQ48tu-IUfGoOiyP3uYMy78wZL8mqdF3MzJ62mWGccOV-t5TdGFCC70-kwbqwNgKinuwFlGSJqxWi-edhAhT7U7TbRBFI4HVvk__e_NS25CsqYT6-9tAIxQ"
                    />
                  </div>
                  <div className="p-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl md:text-2xl font-serif font-bold text-on-surface">Metropolitan Gala</h3>
                        <p className="text-on-surface-variant text-sm font-sans mt-1">Lincoln Center, New York</p>
                      </div>
                      <span className="material-symbols-outlined text-primary text-[28px]">open_in_new</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alcott Reunion */}
              <div className="md:col-span-4 group cursor-pointer">
                <div className="h-full bg-surface-container-lowest rounded-[32px] overflow-hidden feature-lift soft-lift flex flex-col justify-between">
                  <div className="flex-grow overflow-hidden h-[240px]">
                    <img
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      alt="Intimate English Garden Reunion Dinner"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYPzyeCWzALGKBeC7ftt-QzhfOmHPfH5GKk11Vw7qwhZZg5e5cmQ240MgodGXBegcgvqLjNiur4lORi7hDWMvrrwly3h2-MqQHeTmSA95Rdb9J5oTgurBh8uLWBQMvOfAuRNukRgXBs9Z6kt0aGsJu-Iupqiuakv8puJ2Tf5uCQ55p5sZZmybkt_tINYdkeWyS46t2wIpAvUFtRWVWeh8YGmp52boAMCDs3qxM08pZree1vytCdFzcAU2bd6OEAD94yyoCSaxYZg"
                    />
                  </div>
                  <div className="p-8">
                    <h3 className="text-xl md:text-2xl font-serif font-bold text-on-surface">Alcott Reunion</h3>
                    <p className="text-on-surface-variant text-sm font-sans mt-1">Cotswolds, UK</p>
                  </div>
                </div>
              </div>

              {/* The Kensington Baptism */}
              <div className="md:col-span-4 group cursor-pointer">
                <div className="h-full bg-surface-container-lowest rounded-[32px] overflow-hidden feature-lift soft-lift flex flex-col justify-between">
                  <div className="flex-grow overflow-hidden h-[240px]">
                    <img
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      alt="Serene Church Interior Basin"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCM4TonIt_suRFPy6TzaUJ9KDq6D9i4d3GKox5lpQhpzFtCOuae9buNPLF1w-Bv48Cx2bbg5cesNxqhOHA-0QCLJigecUP5pH_4PugEsLE2yLj7q7MnuaOC-Fp99DZy3Et3N4QhVH3UD0c6SumdG81VJwmGnWv8L-YjIVUBRq_dK9cWaJV-qbB656zFkHnz7QybohZtGmn5PVFcOu0-Cerx2bX0yBHxokESCQh0nblMG48cJz0cmQEQ6axbfwBiD4_nf0quHmMLuw"
                    />
                  </div>
                  <div className="p-8">
                    <h3 className="text-xl md:text-2xl font-serif font-bold text-on-surface">Kensington Baptism</h3>
                    <p className="text-on-surface-variant text-sm font-sans mt-1">London, UK</p>
                  </div>
                </div>
              </div>

              {/* Estate Polo Cup */}
              <div className="md:col-span-8 group cursor-pointer">
                <div className="bg-surface-container-lowest rounded-[32px] overflow-hidden feature-lift soft-lift">
                  <div className="aspect-video overflow-hidden max-h-[360px]">
                    <img
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      alt="Estate Polo Cup Pavilion"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzPNfxYw2QEQS7EgEef3LiJYX6UQG82x_645VY4hurieNKY_akwtndQpeQ9WDom59YVDMlUnlyNMSljgLRmwCkQ8HGDB5USCpfcRuN-_TqHkXro2o5oRaVqlxsStbhgHjwoAbebUYtLGQ7b3b6GtlXlOmccsg5SAms_yd7wiSWr7evtDFnjyMh4h6VljBDoutcr3E_hNKy4qnDfI0YgT42iNdI8JVD6Ivp-oktP-WEyVsxb9qi1CHWK-IfSymtbFzAJpLnBACyMw"
                    />
                  </div>
                  <div className="p-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl md:text-2xl font-serif font-bold text-on-surface">Estate Polo Cup</h3>
                        <p className="text-on-surface-variant text-sm font-sans mt-1">Wellington, Florida</p>
                      </div>
                      <span className="material-symbols-outlined text-primary text-[28px]">open_in_new</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-warm-bg overflow-hidden relative reveal-section">
          <div className="max-w-container-max mx-auto px-margin-desktop text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6">Begin Your Archive</h2>
            <p className="text-base md:text-lg font-sans text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
              Your milestones deserve more than a digital folder. Experience the Revela standard of preservation for your next event.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/inquire"
                className="bg-primary text-on-primary px-10 py-4 rounded-xl font-sans font-semibold text-sm hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg text-center"
              >
                Book a Consultation
              </Link>
              <Link
                href="/pricing"
                className="border-2 border-primary text-primary px-10 py-4 rounded-xl font-sans font-semibold text-sm hover:bg-primary/5 active:scale-95 transition-all duration-300 text-center"
              >
                View Pricing Tiers
              </Link>
            </div>
          </div>
          {/* Decorative background elements */}
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        </section>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
