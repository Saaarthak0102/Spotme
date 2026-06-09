"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import MobileNav from "@/components/landing/mobile-nav";

// Import custom PNGs
import catCameraManPointing from "../cat_camera_man_pointing.png";
import holdingPhone from "../holding_phone.png";
import showcasingPrivatePhotos from "../Showcasing_private_photos.png";

const carouselImages = [
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop", // Wedding
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop", // Concert
  "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=800&auto=format&fit=crop", // Birthday
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop", // Corporate
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop", // Awards (Gala Hall)
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=800&auto=format&fit=crop"  // Anniversary (Couple in garden)
];

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
        <section className="relative flex flex-col items-center justify-center overflow-hidden bg-background pt-24 pb-24 md:pb-32">
          {/* Decorative ambient gradients */}
          <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-primary/5 rounded-full blur-3xl float-anim"></div>
          <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-secondary-container/10 rounded-full blur-3xl float-anim" style={{ animationDelay: "2s" }}></div>

          {/* Text and CTAs Container */}
          <div className="relative z-10 max-w-container-max mx-auto px-margin-desktop w-full flex flex-col items-center text-center">
            {/* Dynamic Rotating Title */}
            <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-on-surface leading-[1.15] mb-6 stagger-in max-w-4xl">
              Your Event Photos, <br />
              Delivered Instantly for <br />
              <span key={wordIndex} className="animate-fade-up-word inline-block bg-gradient-to-r from-primary via-primary-container to-secondary bg-clip-text text-transparent italic px-2">
                {slideWords[wordIndex]}
              </span>
            </h1>

            {/* Centered Tagline */}
            <p className="font-sans text-base md:text-lg text-on-surface-variant mb-10 stagger-in max-w-2xl leading-relaxed">
              Connect standard cameras directly to your guests&apos; phones. No app downloads, no logins. Just scan a custom QR code, match with a selfie, and instantly get your private high-res memories.
            </p>

            {/* CTA Buttons */}
            <div className="stagger-in flex flex-col sm:flex-row items-center gap-4 w-full justify-center max-w-md">
              <Link
                href="/inquire"
                className="w-full sm:w-auto bg-primary text-on-primary font-sans font-semibold text-sm px-8 py-4 rounded-full hover:scale-[1.03] active:scale-95 duration-200 shadow-md transition-all text-center inline-block"
              >
                Create Event
              </Link>
              <Link
                href="/inquire"
                className="w-full sm:w-auto bg-surface-container-lowest border border-outline-variant/30 text-primary font-sans font-semibold text-sm px-8 py-4 rounded-full hover:bg-surface-container-low active:scale-95 transition-all text-center inline-block"
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </section>

        {/* How Spotme Works (Explained by Cats 🐱) */}
        <section className="py-24 bg-gradient-to-b from-background via-surface-container-low to-background overflow-hidden border-b border-outline-variant/10 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="max-w-container-max mx-auto px-margin-desktop relative z-10">
            <div className="text-center mb-20">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3 block">
                How It Works
              </span>
              <h2 className="font-serif text-4xl md:text-6xl text-on-surface font-bold mb-4 tracking-tight">
                Memories, Delivered Instantly
              </h2>
              <p className="font-sans text-base md:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                We connect the photographer&apos;s camera to your guests&apos; phones in real-time. Here&apos;s the flow, explained by our friendly felines.
              </p>
            </div>

            <div className="flex flex-col gap-24 md:gap-32">
              {/* Step 1: Cat Cameraman */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center reveal transition-all duration-1000 ease-out">
                {/* Image (Shown on top on mobile, blends organically with no box border) */}
                <div className="relative group flex justify-center">
                  <div className="absolute -inset-4 bg-primary/5 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  <div className="relative hover:scale-105 transition-transform duration-500 max-w-[320px] md:max-w-[380px]">
                    <Image
                      src={catCameraManPointing}
                      alt="Cat cameraman pointing at the text"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
                {/* Text */}
                <div className="flex flex-col justify-center text-left">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mb-6 text-lg border border-primary/20">
                    01
                  </div>
                  <h3 className="font-serif text-3xl font-bold text-on-surface mb-4">
                    1. Shoot &amp; Sync
                  </h3>
                  <p className="font-sans text-base text-on-surface-variant leading-relaxed mb-6">
                    Our professional feline photographer snaps candid shots during your event. The moment a photo is captured, it is instantly uploaded to our secure cloud via real-time backdrop sync.
                  </p>
                  <ul className="space-y-3 font-sans text-sm text-on-surface-variant/80">
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                      Instant camera-to-cloud upload
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                      No manual memory card transfers
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 2: Holding Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center reveal transition-all duration-1000 ease-out">
                {/* Image (First in DOM so it shows first on mobile, md:order-2 shifts it to the right on desktop) */}
                <div className="relative group flex justify-center md:order-2">
                  <div className="absolute -inset-4 bg-secondary/5 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  <div className="relative hover:scale-105 transition-transform duration-500 max-w-[280px] md:max-w-[320px]">
                    <Image
                      src={holdingPhone}
                      alt="Cat holding phone showing QR scanner"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
                {/* Text (Second in DOM, but md:order-1 shifts it to the left on desktop) */}
                <div className="flex flex-col justify-center text-left md:order-1">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary font-bold flex items-center justify-center mb-6 text-lg border border-secondary/20">
                    02
                  </div>
                  <h3 className="font-serif text-3xl font-bold text-on-surface mb-4">
                    2. Frictionless QR Scan
                  </h3>
                  <p className="font-sans text-base text-on-surface-variant leading-relaxed mb-6">
                    Guests scan a custom event QR code displayed at the venue. There are no heavy apps to download, no app stores to visit, and absolutely no passwords to remember. Access is instant.
                  </p>
                  <ul className="space-y-3 font-sans text-sm text-on-surface-variant/80">
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
                      Works on any smartphone browser
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary text-lg">check_circle</span>
                      Safe, secure, and private access
                    </li>
                  </ul>
                </div>
              </div>

              {/* Step 3: Showcasing Private Photos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center reveal transition-all duration-1000 ease-out">
                {/* Image */}
                <div className="relative group flex justify-center">
                  <div className="absolute -inset-4 bg-tertiary/5 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  <div className="relative hover:scale-105 transition-transform duration-500 max-w-[320px] md:max-w-[380px]">
                    <Image
                      src={showcasingPrivatePhotos}
                      alt="Cat showcasing private photos in first-person POV"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
                {/* Text */}
                <div className="flex flex-col justify-center text-left">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mb-6 text-lg border border-primary/20">
                    03
                  </div>
                  <h3 className="font-serif text-3xl font-bold text-on-surface mb-4">
                    3. Personal AI Gallery
                  </h3>
                  <p className="font-sans text-base text-on-surface-variant leading-relaxed mb-6">
                    Take a quick secure selfie, and our AI scans the event&apos;s photo pool. Within seconds, guests get their own private, curated gallery of photos they appear in, ready to download and share in first-person POV!
                  </p>
                  <ul className="space-y-3 font-sans text-sm text-on-surface-variant/80">
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                      Facial recognition matching in seconds
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                      Download high-resolution print files
                    </li>
                  </ul>
                </div>
              </div>
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
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop"
                  />
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
              <div className="feature-card md:col-span-12 bg-surface-container-highest rounded-[32px] p-10 flex flex-col md:flex-row items-center gap-8 soft-lift overflow-hidden group">
                <div className="flex-1">
                  <h3 className="font-serif text-2xl text-on-surface mb-4 font-bold text-zoom-hover">Uncompromising Quality</h3>
                  <p className="font-sans text-sm text-on-surface-variant leading-relaxed">
                    We preserve every pixel. Download original high-resolution files suitable for large-format printing and family heirlooms.
                  </p>
                </div>
                <div className="flex-1 hidden md:block overflow-hidden rounded-2xl">
                  <img
                    className="w-full h-64 object-cover rounded-2xl shadow-lg transition-transform duration-1000 group-hover:scale-105 group-hover:rotate-2"
                    alt="A macro photograph of high-quality printed wedding photos."
                    src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop"
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
                    src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop"
                  />
                </div>
              </div>
              <div className="w-full md:w-2/3">
                <span className="material-symbols-outlined text-primary text-6xl mb-8 opacity-20">format_quote</span>
                <blockquote className="font-serif text-2xl md:text-3xl text-on-surface italic mb-8 leading-relaxed">
                  &quot;Spotme turned our wedding night into a shared experience. Seeing our friends receive their photos the moment they were taken felt like magic—it kept the celebration alive for weeks.&quot;
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


