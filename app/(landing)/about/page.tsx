"use client";

import { useEffect } from "react";
import Header from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import MobileNav from "@/components/landing/mobile-nav";
import Link from "next/link";

export default function About() {
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
    <div className="bg-background text-on-background font-sans selection:bg-primary/20 min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative w-full h-[600px] md:h-[700px] flex items-center overflow-hidden reveal-section">
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover"
              alt="A cinematic, wide-angle shot of a sun-drenched Tuscan estate in Florence during the golden hour."
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVBU932pXauwK2crhanijrBq8Cd5jJKvQII579omF-A47qUEajfOTMoDtnWFnilsSg0F1-RjDrl32m6UrQ3vBa2vQ1vMKx2Ti7z8VnvbjZyqXj9wBHPtayj7FzCoJieD0KKWf8aQL_JZkUdle5IN83wxUrz8rFjuDWw-YO1bE_ehw55NMtio-LmVhjxPhi7jqzELYGLv-vfZoJmTBCGEPip1_tuQXC1wcYlozKSPnH9ylyvrj43qyvaxHE_pkCVwsLciRIaaH9RQ"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/50 to-transparent"></div>
          </div>
          <div className="relative z-10 w-full px-margin-desktop max-w-container-max mx-auto">
            <div className="max-w-2xl">
              <p className="text-primary font-sans text-xs font-semibold uppercase tracking-[0.2em] mb-4">
                Established in Florence
              </p>
              <h1 className="font-serif text-4xl md:text-6xl text-on-background mb-8 leading-tight font-bold">
                Preserving Life&apos;s Most Intimate <span className="italic font-normal">Milestones</span>.
              </h1>
              <p className="font-sans text-base md:text-lg text-on-surface-variant max-w-lg mb-10 leading-relaxed">
                We believe that every story deserves to be told with the grace of a physical heirloom and the brilliance of modern legacy.
              </p>
              <div className="flex gap-6">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined">history_edu</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Legacy Focused</span>
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined">auto_awesome</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Artisanal AI</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Journey Section - Bento Layout */}
        <section className="py-24 px-margin-desktop max-w-container-max mx-auto reveal-section">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Left Text Content */}
            <div className="col-span-12 lg:col-span-5 flex flex-col justify-center">
              <h2 className="font-serif text-3xl md:text-4xl text-on-background mb-6 font-bold">
                Our Florentine Genesis
              </h2>
              <div className="space-y-6 text-sm md:text-base text-on-surface-variant leading-relaxed">
                <p>
                  Spotme was born amidst the cobbled streets and Renaissance air of Florence, Italy. It began not as a company, but as a realization: that in our digital age, we were losing the tactile permanence of our most cherished memories.
                </p>
                <p>
                  Inspired by the master archivists of the Uffizi and the timeless quality of Italian craftsmanship, we set out to bridge the gap between ephemeral data and everlasting art.
                </p>
              </div>
              <div className="mt-10 p-8 bg-surface-container-low rounded-[32px] border border-outline-variant/30">
                <span className="material-symbols-outlined text-primary text-4xl mb-4">format_quote</span>
                <p className="font-serif text-lg md:text-xl italic text-primary leading-relaxed">
                  &quot;We don&apos;t just capture moments; we architect the vessels through which your grandchildren will know your story.&quot;
                </p>
              </div>
            </div>

            {/* Right Bento Grid */}
            <div className="col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-gutter">
              <div className="sm:col-span-2 overflow-hidden rounded-[32px] shadow-[0_10px_30px_-5px_rgba(148,73,44,0.05)] hover:-translate-y-2 transition-all duration-500 ease-out h-[250px]">
                <img
                  className="w-full h-full object-cover"
                  alt="An overhead flat-lay of professional photography gear, antique fountain pens, and handmade leather journals."
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDEB1ASyyMcPVctdflLdZ8e1G4SyF2Ihy-THA8p6XDv9ApZ_uttt8dal_yR0t_4UCIYFI1tUXuq9DTA1b0j_ypDs0Uat4z8x_J52Dr57T9ESKt__uc2uqaGfN4dsqulITDJ4uO8mmv04WlLVOt95is5VteuForCGs3ztQENzewjnIQOjjla4HNqaEGICH803Q-wUS2PiY91su-VXpk6YaSFUPyKa5Eb2zOZMYaR5MeliWXZLglbGZhOUaBFg4mjJb0drSBRduNBw"
                />
              </div>
              <div className="overflow-hidden rounded-[32px] shadow-[0_10px_30px_-5px_rgba(148,73,44,0.05)] hover:-translate-y-2 transition-all duration-500 ease-out h-[200px]">
                <img
                  className="w-full h-full object-cover"
                  alt="Hands carefully handling a thick, high-quality archival paper print."
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_A8EvdCmnpp3nZ1ezIwyUMN_jIVvfqvtiYCEy6st45nbYRyynUlilYJFjRJlABq5IMmMsgw8Xnhv3NqOi8ypKizYR_1W75HgT_9kK_4kp9AkJwH-Cj8m-wjRSlvPurK8TuImJTGoUQ3euAcF3vStrhAfOEvd3C7-v-7I5mEm1Err8s84TX-gbrtVba7TTz72G8_9ydqTtnMQffk_Y1qwMbR-iVCMbcWxpvfn26hqhdiM5kdIo6kZseA54yo2SjykwksLNRNKUkA"
                />
              </div>
              <div className="bg-primary p-8 rounded-[32px] flex flex-col justify-end text-on-primary group hover:bg-secondary transition-colors duration-500 h-[200px]">
                <h3 className="font-serif text-3xl md:text-4xl font-bold mb-2">12,000+</h3>
                <p className="font-sans text-xs font-semibold uppercase tracking-widest opacity-80">
                  Chapters Preserved
                </p>
                <div className="mt-4 flex justify-end">
                  <span className="material-symbols-outlined text-3xl group-hover:translate-x-2 transition-transform duration-300">
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Founders Section */}
        <section className="bg-surface-container-low py-24 reveal-section">
          <div className="px-margin-desktop max-w-container-max mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-20">
              <h2 className="font-serif text-3xl md:text-4xl mb-4 text-on-background font-bold">The Visionaries</h2>
              <p className="font-sans text-sm md:text-base text-on-surface-variant">
                Bringing together decades of experience in fine art photography and neural engineering.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-start">
              {/* Founder 1: Julian */}
              <div className="flex flex-col gap-8">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-primary/5 rounded-[40px] scale-95 group-hover:scale-100 transition-transform duration-500 ease-out"></div>
                  <img
                    className="relative z-10 w-full aspect-[4/5] object-cover rounded-[32px] shadow-lg"
                    alt="Portrait of Julian Vance"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBaWBp81P6KWCBcLuD508q4ur-qKnkVwd6_NqcJcqowCF7cwZHPuubhiFTqlrWGOuqY6JVbAe9XZJL6M6UxIJchZWgmA0zKblathKIpF2iXRVs3LInXBmGjxII6sdK1K4gJMMFiZnkp8nQVWqhrQSu786YxsHMOE6nORqfsp_rznt6AYyeC6OM1WkCzWM3U-ruW1EV8deFKnQqLF1OKGYYZNheRG1kK2EQPQws1hCjChUf6-Fw6qV479yoCj6W7MY5BFdKqNTmBew"
                  />
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-on-background font-bold">Julian Vance</h3>
                  <p className="text-primary font-sans text-sm font-semibold mb-4">Co-Founder &amp; Chief Creative</p>
                  <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">
                    With a background in traditional silver-gelatin printing and a career spanning the luxury fashion houses of Milan, Julian ensures that every digital asset we produce carries the weight and soul of a physical photograph.
                  </p>
                </div>
              </div>

              {/* Founder 2: Elena */}
              <div className="flex flex-col gap-8 md:mt-32">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-primary/5 rounded-[40px] scale-95 group-hover:scale-100 transition-transform duration-500 ease-out"></div>
                  <img
                    className="relative z-10 w-full aspect-[4/5] object-cover rounded-[32px] shadow-lg"
                    alt="Portrait of Elena Rossi"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVbelXKMKtmP55WzjDDQlzdoqv3-UDUFCDNfAIyK4Qcbb7MELJhxrke5lwvlghCUjthPUBg41HIGmhcWQsPcitdIeN8pPTbhqGe077XstWNNoZe1fbANNYymN0TSG0ctOXln06PEwmNUH6LRTuBxQZxnrVMy0fo0DR4EnaO-37AdlHInNXdS5x_-gMytaMjzj70qZQbmflIMPPELpNRdgxUN-374J24EWJe8ZgyLc9nk0Nas9onVMPwk-xqTHdaIJqm_hLBL1UeQ"
                  />
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-on-background font-bold">Elena Rossi</h3>
                  <p className="text-primary font-sans text-sm font-semibold mb-4">Co-Founder &amp; Head of Innovation</p>
                  <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">
                    An MIT fellow in Neural Engineering, Elena&apos;s vision for &quot;Artisanal Intelligence&quot; is the engine behind our heritage preservation technology. She believes tech should be invisible, serving only to amplify human emotion.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Values */}
        <section className="py-24 px-margin-desktop max-w-container-max mx-auto reveal-section">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="p-10 bg-surface rounded-[32px] border border-outline-variant/20 hover:border-primary/30 transition-all duration-500 group">
              <div className="w-14 h-14 bg-primary-container/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-primary text-3xl">shrine</span>
              </div>
              <h4 className="font-serif text-xl font-bold mb-4">Quiet Reverence</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                We treat every milestone with the respect it deserves, understanding that we are the custodians of your most personal history.
              </p>
            </div>
            <div className="p-10 bg-surface rounded-[32px] border border-outline-variant/20 hover:border-primary/30 transition-all duration-500 group">
              <div className="w-14 h-14 bg-primary-container/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-primary text-3xl">architecture</span>
              </div>
              <h4 className="font-serif text-xl font-bold mb-4">Artisanal Precision</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Every pixel and every page is curated by human eyes, ensuring that our technology serves your aesthetic, not the other way around.
              </p>
            </div>
            <div className="p-10 bg-surface rounded-[32px] border border-outline-variant/20 hover:border-primary/30 transition-all duration-500 group">
              <div className="w-14 h-14 bg-primary-container/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-primary text-3xl">all_inclusive</span>
              </div>
              <h4 className="font-serif text-xl font-bold mb-4">Eternal Legacy</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Our formats are designed to outlast the platforms of today, built on archival standards that will remain accessible for decades.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="mb-20 px-margin-desktop max-w-container-max mx-auto reveal-section">
          <div className="relative rounded-[40px] overflow-hidden py-24 px-8 text-center">
            <div className="absolute inset-0 z-0">
              <img
                className="w-full h-full object-cover"
                alt="A soft-focus wind-blown curtain background."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIRyxXQdTASjKMYxmMGSTvOnVsNBUEm8tN1QrfoBPR7vVmmu04YH1L9SOZL2MwVc4dAOmlQYeVgVmptB25ot68h0qG0CRwE_brov8fYJlCZFad96x1NKewXmShyqc1db88MePmc6bi9F1G1ZSliBMkNfh1N5rDHu0JOWW9w7AScDbx28KIVt4Cg1WYhTQFkWyeMjmumgrLqF3__Lk30KxTK8n1Alai4fjal_3raw7b1yLD_FPE1nnsoI1lodWNOUJAQHo_59L6mA"
              />
              <div className="absolute inset-0 bg-primary/45 backdrop-blur-[2px]"></div>
            </div>
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="font-serif text-3xl md:text-5xl text-on-primary mb-8 font-bold">Begin Your Chapter</h2>
              <p className="text-on-primary/90 font-sans text-base md:text-lg mb-10 leading-relaxed">
                We invite you to experience a new standard of memory preservation. Let us help you craft your digital heirloom.
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                <Link
                  href="/inquire"
                  className="bg-on-primary text-primary px-10 py-4 rounded-xl font-sans font-semibold text-sm hover:scale-105 transition-all duration-300 shadow-lg text-center"
                >
                  Inquire Now
                </Link>
                <Link
                  href="/#features"
                  className="border-2 border-on-primary text-on-primary px-10 py-4 rounded-xl font-sans font-semibold text-sm hover:bg-on-primary hover:text-primary transition-all duration-300 text-center"
                >
                  Explore Features
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
