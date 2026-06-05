"use client";

import { useEffect, useState } from "react";
import Header from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import MobileNav from "@/components/landing/mobile-nav";
import Link from "next/link";

const carouselImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBn5FsaKun7q735gOMqpvLayxlOSympyj5TQJO2IJhF0MkumJRKaT3qQjE3yIyjeSGKTVV1VlK0qxuimXPMAJfIjLwTyF90JwbeyEv1XaH7DgXwHnSsAtNOU_d5Hn_ZGaXrMYO7kZjUXhhNDK99ezumdxzD0Jfga0R_ZN2eOd43Rv_KhmwJ8xx-tM-LLoRnjwBVdpYTGikJw3t2SR0D8GFjxgBIEiJ4TlOKuhxjZPYZu2v0QLh4PpKUVoY1epMEJhZxjvIk_puP6g",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDo_tHwHpwmmngREgsXXR-UcQOEiUy-YS2lmZwFqoyTyBnYxoxwLz3FgUYV5FPzyj9If9twcmJWPi5qY_QnsBpS4KOHyp2RchCMoV4yPiZOr1W6JXGEsXY6eMwm3D2qkOzqlYOc-FbIi2-vmf1fThrhQ48tu-IUfGoOiyP3uYMy78wZL8mqdF3MzJ62mWGccOV-t5TdGFCC70-kwbqwNgKinuwFlGSJqxWi-edhAhT7U7TbRBFI4HVvk__e_NS25CsqYT6-9tAIxQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBYPzyeCWzALGKBeC7ftt-QzhfOmHPfH5GKk11Vw7qwhZZg5e5cmQ240MgodGXBegcgvqLjNiur4lORi7hDWMvrrwly3h2-MqQHeTmSA95Rdb9J5oTgurBh8uLWBQMvOfAuRNukRgXBs9Z6kt0aGsJu-Iupqiuakv8puJ2Tf5uCQ55p5sZZmybkt_tINYdkeWyS46t2wIpAvUFtRWVWeh8YGmp52boAMCDs3qxM08pZree1vytCdFzcAU2bd6OEAD94yyoCSaxYZg",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCM4TonIt_suRFPy6TzaUJ9KDq6D9i4d3GKox5lpQhpzFtCOuae9buNPLF1w-Bv48Cx2bbg5cesNxqhOHA-0QCLJigecUP5pH_4PugEsLE2yLj7q7MnuaOC-Fp99DZy3Et3N4QhVH3UD0c6SumdG81VJwmGnWv8L-YjIVUBRq_dK9cWaJV-qbB656zFkHnz7QybohZtGmn5PVFcOu0-Cerx2bX0yBHxokESCQh0nblMG48cJz0cmQEQ6axbfwBiD4_nf0quHmMLuw",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDzPNfxYw2QEQS7EgEef3LiJYX6UQG82x_645VY4hurieNKY_akwtndQpeQ9WDom59YVDMlUnlyNMSljgLRmwCkQ8HGDB5USCpfcRuN-_TqHkXro2o5oRaVqlxsStbhgHjwoAbebUYtLGQ7b3b6GtlXlOmccsg5SAms_yd7wiSWr7evtDFnjyMh4h6VljBDoutcr3E_hNKy4qnDfI0YgT42iNdI8JVD6Ivp-oktP-WEyVsxb9qi1CHWK-IfSymtbFzAJpLnBACyMw",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC-lFjhS-Z4spcxekB7LTFAZ0KLKVWkMWL8BVeUpYXIU4ZEHoQdq35ltjR17pvUYjVTWa6etrxP5CoP1rZj-pj6eCQ--B8aA8EaRNmJHHn5gc5YEiCm7b-rWQrdl3-uAFtKsaU9kY126Txt7QJpXVit9nSDvtrf5bMUy7SixQMy7Nfh6KliTDNNdsHl-GJnfcjld8bvk1hPN8unxDalJipuysILmaLbINvph-hhXS0x9XKGDhRrB0IfeaKyhRpUpFaxZsgXxM7CZA"
];

interface AlbumType {
  type: string;
  title: string;
  location: string;
  mainImage: string;
  accent: string;
  badgeBg: string;
  stats: string;
  thumbnails: string[];
}

const appAlbums: AlbumType[] = [
  {
    type: "Wedding",
    title: "Elena & James",
    location: "Villa d'Este, Lake Como",
    mainImage: carouselImages[0],
    accent: "bg-primary text-on-primary",
    badgeBg: "bg-primary-fixed text-on-primary-fixed-variant",
    stats: "1,248 photos • 142 guests",
    thumbnails: [
      carouselImages[5],
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCSk-Y565POM4N4AFCot84EiVnh7Z3vdu93Ym2VRW0wUmbebsHj0PjEJPcpJVrz0mWjkvtM5wfSofPybq8GdjdssEMITQzqqdnYRljikGls_9BSpyTemr2HbKYLNmiApX0PbnPSzFy6v1ZLn8ExJpi1Y2_GfcxdbIjEqCZnWb1th58y0w-8d3mdGSH34oPs7Jnt_6A9PS7S7WgIqteH9SKHzpBs4uG3inxUbOqOTAR946OFvvZXaM1ORKwnrF8NparOiWlnvZTFHw"
    ]
  },
  {
    type: "Concert",
    title: "Echo Stage Fest",
    location: "Arena West, Chicago",
    mainImage: carouselImages[1],
    accent: "bg-secondary text-on-secondary",
    badgeBg: "bg-secondary-fixed text-on-secondary-fixed-variant",
    stats: "3,420 photos • 2.5k guests",
    thumbnails: [
      carouselImages[4],
      carouselImages[2]
    ]
  },
  {
    type: "Birthday",
    title: "Leo's 5th Party",
    location: "Rooftop Playgrounds",
    mainImage: carouselImages[2],
    accent: "bg-primary/95 text-on-primary",
    badgeBg: "bg-primary-fixed-dim text-on-primary-fixed",
    stats: "580 photos • 48 guests",
    thumbnails: [
      carouselImages[0],
      carouselImages[3]
    ]
  },
  {
    type: "Corporate",
    title: "Tech Summit '26",
    location: "Innovation Hub, SF",
    mainImage: carouselImages[3],
    accent: "bg-tertiary text-on-tertiary",
    badgeBg: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
    stats: "1,150 photos • 320 guests",
    thumbnails: [
      carouselImages[1],
      carouselImages[4]
    ]
  },
  {
    type: "Awards",
    title: "Excellence Night",
    location: "Metropolitan Hall, NY",
    mainImage: carouselImages[4],
    accent: "bg-primary text-on-primary",
    badgeBg: "bg-primary-fixed text-on-primary-fixed-variant",
    stats: "840 photos • 150 guests",
    thumbnails: [
      carouselImages[3],
      carouselImages[5]
    ]
  },
  {
    type: "Anniversary",
    title: "Sophia & David",
    location: "The Rose Gardens",
    mainImage: carouselImages[5],
    accent: "bg-secondary text-on-secondary",
    badgeBg: "bg-secondary-fixed text-on-secondary-fixed-variant",
    stats: "960 photos • 80 guests",
    thumbnails: [
      carouselImages[0],
      carouselImages[2]
    ]
  }
];

function PhoneMockup({ album }: { album: AlbumType }) {
  return (
    <div className="w-[290px] h-[520px] rounded-[40px] border-[12px] border-neutral-950 bg-surface-container-lowest shadow-2xl relative flex-shrink-0 flex flex-col justify-between overflow-hidden select-none border-b-[14px]">
      {/* Dynamic Notch / Island */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-neutral-950 rounded-full z-30"></div>
      
      {/* Screen Glass Light Reflection */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none z-20"></div>
      
      {/* Top Status Bar */}
      <div className="flex justify-between items-center px-6 pt-3 select-none w-full z-10 text-neutral-800">
        <span className="text-[10px] font-bold">9:41</span>
        <div className="flex items-center gap-1 text-[10px]">
          <span className="material-symbols-outlined text-[12px] font-bold">signal_cellular_alt</span>
          <span className="material-symbols-outlined text-[12px] font-bold">wifi</span>
          <span className="material-symbols-outlined text-[14px] font-bold">battery_full</span>
        </div>
      </div>

      {/* App Content */}
      <div className="flex-grow flex flex-col justify-between px-4 pb-4 pt-2">
        {/* App Header inside Phone */}
        <div className="flex justify-between items-center border-b border-outline-variant/10 pb-2">
          <span className="font-serif italic font-bold text-sm text-primary tracking-wide">Revela</span>
          <div className="flex items-center gap-1.5 bg-green-50 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-green-700 tracking-wide uppercase text-[8px]">Live Sync</span>
          </div>
        </div>

        {/* Event Details */}
        <div className="mt-2 text-left">
          <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded ${album.badgeBg}`}>
            {album.type}
          </span>
          <h4 className="font-serif font-bold text-lg text-on-surface mt-1 leading-tight">
            {album.title}
          </h4>
          <p className="text-[10px] text-on-surface-variant/70 flex items-center gap-0.5 mt-0.5">
            <span className="material-symbols-outlined text-[10px]">location_on</span>
            {album.location}
          </p>
        </div>

        {/* Main Cover Image */}
        <div className="relative flex-grow my-3 rounded-xl overflow-hidden shadow-inner group/phone-img">
          <img
            src={album.mainImage}
            alt={album.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover/phone-img:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
          <span className="absolute bottom-2 left-2 text-[9px] text-white font-medium bg-black/35 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {album.stats}
          </span>
        </div>

        {/* Mini Grid Thumbnails */}
        <div className="flex gap-2 mb-3">
          {album.thumbnails.map((thumb, idx) => (
            <div key={idx} className="flex-1 aspect-[4/3] rounded-lg overflow-hidden relative shadow-sm border border-outline-variant/15">
              <img src={thumb} className="w-full h-full object-cover" alt="grid photo" />
            </div>
          ))}
          <div className="flex-1 aspect-[4/3] rounded-lg bg-surface-container flex items-center justify-center border border-dashed border-outline-variant/30">
            <span className="material-symbols-outlined text-neutral-400 text-lg">add</span>
          </div>
        </div>

        {/* Primary Action Button */}
        <button className={`w-full py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${album.accent}`}>
          Upload Photo
        </button>
      </div>
    </div>
  );
}

const slideWords = ["Weddings", "Events", "Concerts", "Birthdays", "Awards", "Parties"];

export default function Home() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prevIndex) => (prevIndex + 1) % slideWords.length);
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Setup Scroll Reveal Observer
    const revealOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px",
    };

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
        }
      });
    }, revealOptions);

    const revealElements = document.querySelectorAll(".reveal");
    revealElements.forEach((el) => revealObserver.observe(el));

    // Cleanup
    return () => {
      revealElements.forEach((el) => revealObserver.unobserve(el));
    };
  }, []);

  return (
    <div className="bg-pulse-anim text-on-surface font-sans overflow-x-hidden min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Centered Hero Section */}
        <section className="relative min-h-[750px] flex items-center justify-center overflow-hidden bg-background">
          {/* Decorative ambient gradients */}
          <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-primary/5 rounded-full blur-3xl float-anim"></div>
          <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-secondary-container/10 rounded-full blur-3xl float-anim" style={{ animationDelay: "2s" }}></div>

          <div className="relative z-10 max-w-container-max mx-auto px-margin-desktop w-full py-16 flex flex-col items-center text-center">
            {/* Dynamic Rotating Title */}
            <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-on-surface leading-[1.15] mb-8 stagger-in max-w-4xl">
               Photo Sharing App <br />
              for <br />
              <span key={wordIndex} className="animate-fade-up-word inline-block bg-gradient-to-r from-primary via-primary-container to-secondary bg-clip-text text-transparent italic px-2">
                {slideWords[wordIndex]}
              </span>
            </h1>

            {/* Centered Features Tagline */}
            <p className="font-sans text-sm md:text-base text-on-surface-variant mb-12 stagger-in max-w-2xl leading-relaxed tracking-wide">
              Camera2Cloud &bull; AI Photo-editing &bull; Media Asset Management &bull; Portfolio Galleries
            </p>

            {/* Vertical CTA Buttons */}
            <div className="stagger-in flex flex-col items-center gap-4 w-full max-w-xs">
              <Link
                href="/inquire"
                className="w-full bg-primary text-on-primary font-sans font-semibold text-sm py-4 rounded-xl hover:scale-[1.03] active:scale-95 duration-200 soft-lift transition-all text-center inline-block"
              >
                Book a Demo
              </Link>
              <Link
                href="/login"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 text-primary font-sans font-semibold text-sm py-4 rounded-xl hover:bg-surface-container-low active:scale-95 transition-all text-center inline-block"
              >
                Business Login
              </Link>
            </div>
          </div>
        </section>

        {/* Sliding Phone Showcase Section */}
        <section className="py-20 bg-background overflow-hidden reveal transition-all duration-1000 ease-out border-b border-outline-variant/10">
          <div className="max-w-container-max mx-auto px-margin-desktop text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3 block">
              Live Experience
            </span>
            <h2 className="font-serif text-3xl md:text-5xl text-on-surface font-bold mb-4">
              Explore Live Event Albums
            </h2>
            <p className="font-sans text-base text-on-surface-variant max-w-xl mx-auto">
              How guests capture, share, and experience memories in real time across different celebrations.
            </p>
          </div>

          <div className="relative w-full overflow-hidden py-4">
            <div className="animate-marquee flex gap-10 hover:[animation-play-state:paused] cursor-grab active:cursor-grabbing">
              {/* First set of phones */}
              {appAlbums.map((album, i) => (
                <PhoneMockup key={i} album={album} />
              ))}
              {/* Duplicate set for infinite loop */}
              {appAlbums.map((album, i) => (
                <PhoneMockup key={`dup-${i}`} album={album} />
              ))}
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="py-24 bg-surface-container-low reveal transition-all duration-1000 ease-out">
          <div className="max-w-container-max mx-auto px-margin-desktop">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl text-on-surface mb-4 font-bold text-zoom-pulse">
                Crafted for Emotional Connection
              </h2>
              <p className="font-sans text-base text-on-surface-variant max-w-xl mx-auto">
                We&apos;ve removed the technical friction so you can focus on the feeling of the moment.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter h-auto">
              
              {/* Feature 1: AI Matching */}
              <div className="feature-card md:col-span-8 bg-surface-container-lowest rounded-[32px] p-10 flex flex-col justify-between soft-lift overflow-hidden group">
                <div>
                  <div className="w-14 h-14 bg-primary-container/10 rounded-2xl flex items-center justify-center mb-8">
                    <span className="material-symbols-outlined text-primary text-3xl">auto_awesome</span>
                  </div>
                  <h3 className="font-serif text-2xl text-on-surface mb-4 font-bold text-zoom-hover">Seamless AI Matching</h3>
                  <p className="font-sans text-sm text-on-surface-variant max-w-md leading-relaxed">
                    Our private facial recognition identifies guests instantly, curating a personalized gallery for every single attendee without manual sorting.
                  </p>
                </div>
                <div className="mt-8 relative h-48 md:h-64 overflow-hidden rounded-2xl">
                  <img
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt="A clean, minimalist UI mockup showing a facial recognition interface."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSk-Y565POM4N4AFCot84EiVnh7Z3vdu93Ym2VRW0wUmbebsHj0PjEJPcpJVrz0mWjkvtM5wfSofPybq8GdjdssEMITQzqqdnYRljikGls_9BSpyTemr2HbKYLNmiApX0PbnPSzFy6v1ZLn8ExJpi1Y2_GfcxdbIjEqCZnWb1th58y0w-8d3mdGSH34oPs7Jnt_6A9PS7S7WgIqteH9SKHzpBs4uG3inxUbOqOTAR946OFvvZXaM1ORKwnrF8NparOiWlnvZTFHw"
                  />
                </div>
              </div>

              {/* Feature 2: WhatsApp */}
              <div className="feature-card md:col-span-4 bg-primary text-on-primary rounded-[32px] p-10 flex flex-col justify-between hover:bg-primary/95 transition-all">
                <div>
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-8">
                    <span className="material-symbols-outlined text-white text-3xl">chat_bubble</span>
                  </div>
                  <h3 className="font-serif text-2xl mb-4 font-bold text-zoom-hover">Instant WhatsApp Delivery</h3>
                  <p className="font-sans text-sm opacity-90 leading-relaxed">
                    No apps to download. No accounts to create. Guests receive their photos directly through the app they already use and love.
                  </p>
                </div>
                <div className="mt-12 flex justify-center">
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl w-full border border-white/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span className="text-xs font-semibold uppercase tracking-wider">Active Now</span>
                    </div>
                    <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-white/20 rounded w-1/2"></div>
                  </div>
                </div>
              </div>

              {/* Feature 3: Privacy */}
              <div className="feature-card md:col-span-4 bg-tertiary-fixed text-on-tertiary-fixed rounded-[32px] p-10 flex flex-col justify-between hover:bg-tertiary-fixed-dim transition-all">
                <div>
                  <div className="w-14 h-14 bg-on-tertiary-fixed/5 rounded-2xl flex items-center justify-center mb-8">
                    <span className="material-symbols-outlined text-on-tertiary-fixed text-3xl">lock</span>
                  </div>
                  <h3 className="font-serif text-2xl mb-4 font-bold text-zoom-hover">Privacy First</h3>
                  <p className="font-sans text-sm text-on-tertiary-fixed-variant leading-relaxed">
                    End-to-end encryption for your galleries. You control exactly who sees what, ensuring memories stay within the inner circle.
                  </p>
                </div>
              </div>

              {/* Feature 4: High Res */}
              <div className="feature-card md:col-span-8 bg-surface-container-highest rounded-[32px] p-10 flex flex-col md:flex-row items-center gap-8 soft-lift overflow-hidden group">
                <div className="flex-1">
                  <h3 className="font-serif text-2xl text-on-surface mb-4 font-bold text-zoom-hover">Uncompromising Quality</h3>
                  <p className="font-sans text-sm text-on-surface-variant leading-relaxed">
                    We preserve every pixel. Download original high-resolution files suitable for large-format printing and family heirlooms.
                  </p>
                </div>
                <div className="flex-1 hidden md:block overflow-hidden rounded-2xl">
                  <img
                    className="w-full h-48 object-cover rounded-2xl shadow-lg transition-transform duration-1000 group-hover:scale-105 group-hover:rotate-2"
                    alt="A macro photograph of high-quality printed wedding photos."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFXdzfJestLipUmYKofaHA4AFASCaoLcdFJ7WNHyFjfRQ-NeXEztXXAuZNW5B1LlY66ZYP3Yv4dblaHMz3pXU8TtYLhoB3FchiGSHAzS-1VbwSrWDX2P-N72ZkWwLFU2A7ssNAppIiOOk2hJU0kDCg4uvilyf7OqcZGALLMmoTR79e8lhFN1zo7K8nG4pMkgtRYJ1EUUFaWxgCmAuL2nAxzWgB9Kf3vMIz-LMFaeQTJgOHuU3j1y8q_5lfhXiAB5oSC2ay5GOvBA"
                  />
                </div>
              </div>

            </div>

            {/* Sliding Image Marquee row */}
            <div className="mt-16 overflow-hidden w-full relative py-6 bg-surface-container-low rounded-[32px] border border-outline-variant/10">
              <div className="animate-marquee flex gap-6">
                {/* First set of images */}
                {carouselImages.map((img, i) => (
                  <div key={i} className="w-[320px] h-[220px] flex-shrink-0 overflow-hidden rounded-2xl group shadow-sm relative">
                    <img
                      src={img}
                      alt={`Event visual ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300"></div>
                  </div>
                ))}
                {/* Duplicate set for infinite loop */}
                {carouselImages.map((img, i) => (
                  <div key={`dup-${i}`} className="w-[320px] h-[220px] flex-shrink-0 overflow-hidden rounded-2xl group shadow-sm relative">
                    <img
                      src={img}
                      alt={`Event visual duplicate ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300"></div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Testimonial Section */}
        <section className="py-32 bg-surface reveal transition-all duration-1000 ease-out">
          <div className="max-w-container-max mx-auto px-margin-desktop">
            <div className="bg-surface-container-low rounded-[48px] p-10 md:p-24 relative overflow-hidden flex flex-col md:flex-row items-center gap-16">
              <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
              <div className="w-full md:w-1/3">
                <div className="aspect-[4/5] rounded-[32px] overflow-hidden soft-lift transition-transform duration-700 hover:scale-[1.02]">
                  <img
                    className="w-full h-full object-cover"
                    alt="A warm, candid portrait of a wedding couple."
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-lFjhS-Z4spcxekB7LTFAZ0KLKVWkMWL8BVeUpYXIU4ZEHoQdq35ltjR17pvUYjVTWa6etrxP5CoP1rZj-pj6eCQ--B8aA8EaRNmJHHn5gc5YEiCm7b-rWQrdl3-uAFtKsaU9kY126Txt7QJpXVit9nSDvtrf5bMUy7SixQMy7Nfh6KliTDNNdsHl-GJnfcjld8bvk1hPN8unxDalJipuysILmaLbINvph-hhXS0x9XKGDhRrB0IfeaKyhRpUpFaxZsgXxM7CZA"
                  />
                </div>
              </div>
              <div className="w-full md:w-2/3">
                <span className="material-symbols-outlined text-primary text-6xl mb-8 opacity-20">format_quote</span>
                <blockquote className="font-serif text-2xl md:text-3xl text-on-surface italic mb-8 leading-relaxed">
                  &quot;Revela turned our wedding night into a shared experience. Seeing our friends receive their photos the moment they were taken felt like magic—it kept the celebration alive for weeks.&quot;
                </blockquote>
                <div>
                  <p className="font-sans font-semibold text-sm text-on-surface">Elena &amp; James Richardson</p>
                  <p className="font-sans text-sm text-on-surface-variant">Wedding Hosts, October 2023</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 reveal transition-all duration-1000 ease-out">
          <div className="max-w-container-max mx-auto px-margin-desktop text-center">
            <h2 className="font-serif text-4xl md:text-5xl text-on-surface mb-8 font-bold">
              Ready to frame your next event?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                href="/inquire"
                className="bg-primary text-on-primary font-sans font-semibold text-sm px-12 py-5 rounded-xl scale-100 hover:scale-[1.05] active:scale-95 duration-200 soft-lift transition-all inline-block text-center"
              >
                Create Event
              </Link>
              <Link
                href="/inquire"
                className="border-2 border-primary text-primary font-sans font-semibold text-sm px-12 py-5 rounded-xl hover:bg-primary/5 transition-colors inline-block text-center"
              >
                Speak with our team
              </Link>
            </div>
            <p className="font-sans text-xs text-on-surface-variant mt-8 opacity-60 uppercase tracking-[0.2em]">
              No credit card required to start
            </p>
          </div>
        </section>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
