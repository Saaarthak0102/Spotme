"use client";

import { useEffect, useState, FormEvent } from "react";
import Header from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import MobileNav from "@/components/landing/mobile-nav";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [story, setStory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  return (
    <div className="bg-background text-on-background font-sans selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative h-[450px] md:h-[550px] flex items-center overflow-hidden reveal-section">
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover"
              alt="A cinematic, warm-toned wide shot of a luxury outdoor wedding reception at dusk."
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBG9DL21MfehLkpD5Rsqc3Cl3ErkiBWvAII2USxpg6tZbAu-lL9FEVejahjb0ZaM-XSQDM-_M-9vDLYjLOjo5KpteG_dHW-PkV_9Q-wBkIupUoT6efK3KzkZPLZTOOx7AmBWV67stPDLBe4YJonZzZB6kFlIEunrpIH6zZ7NX3uWjc9H1g-35cPcEUDCc0EPs3oFXZm7_OQTq_5rSbU0iDxT2UlduqMELVKbNPS701rpPNO7ZaF9Ub9Tp57yuCOTmhdCYLzbJcRWA"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/45 to-transparent"></div>
          </div>
          <div className="relative z-10 w-full px-margin-desktop max-w-container-max mx-auto">
            <div className="max-w-2xl text-on-primary">
              <span className="font-sans text-xs font-semibold tracking-widest uppercase mb-4 block">
                Begin the Journey
              </span>
              <h1 className="font-serif text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Preserving Your Most <br />
                <span className="italic font-light">Intimate Milestones</span>
              </h1>
              <p className="font-sans text-base md:text-lg opacity-90 max-w-lg leading-relaxed">
                We believe every legacy starts with a conversation. Share your vision with us, and let’s craft something timeless together.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-24 bg-warm-bg reveal-section">
          <div className="w-full px-margin-desktop max-w-container-max mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">

              {/* Contact Form Column */}
              <div className="lg:col-span-7 bg-surface-container-lowest p-8 md:p-16 rounded-[32px] soft-lift border border-outline-variant/10">
                <h2 className="font-serif text-3xl font-bold text-primary mb-2">Send an Inquiry</h2>
                <p className="text-on-surface-variant mb-2 font-sans text-sm">
                  Tell us about your upcoming event or milestone.
                </p>
                <p className="text-on-surface-variant mb-10 font-sans text-sm">
                  <span className="font-semibold text-primary">Custom pricing:</span> All of our services are tailored to your unique story and needs. For custom pricing based on your requirements and vision, please fill out the form below or reach out directly—we&apos;ll provide a detailed quote after discussing your event.
                </p>

                {isSubmitted ? (
                  <div className="text-center py-16 flex flex-col items-center justify-center animate-fade-in">
                    <span className="material-symbols-outlined text-green-600 text-6xl mb-4">check_circle</span>
                    <h3 className="text-2xl font-serif font-bold text-on-surface mb-2">Inquiry Sent Successfully</h3>
                    <p className="text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
                      Thank you for sharing your story with us. Our team will review your inquiry and reach out within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">Name</label>
                        <input
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-6 py-4 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                          placeholder="Your full name"
                          type="text"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">Email</label>
                        <input
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-6 py-4 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                          placeholder="hello@domain.com"
                          type="email"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">Event Date</label>
                        <input
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-6 py-4 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                          placeholder="MM / DD / YYYY"
                          type="text"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">Location</label>
                        <input
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-6 py-4 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                          placeholder="City, Country"
                          type="text"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">
                        Tell us your story
                      </label>
                      <textarea
                        value={story}
                        onChange={(e) => setStory(e.target.value)}
                        className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-6 py-4 focus:ring-2 focus:ring-primary quint-ease outline-none resize-none text-sm font-sans"
                        placeholder="Share your vision, the mood, and the moments you want to capture..."
                        rows={5}
                      ></textarea>
                    </div>
                    <button
                      disabled={isSubmitting}
                      className="w-full md:w-auto bg-primary text-on-primary px-12 py-5 rounded-xl font-sans font-semibold text-sm quint-ease hover:scale-105 active:scale-95 shadow-md flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      type="submit"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                          Sending...
                        </>
                      ) : (
                        <>
                          Submit Inquiry
                          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Contact Details Column */}
              <div className="lg:col-span-5 lg:pl-12">
                <div className="bg-surface-container-high p-10 rounded-[32px] soft-lift space-y-10 border border-outline-variant/20">
                  <div>
                    <h4 className="font-sans font-bold text-xs text-primary uppercase tracking-wider mb-4">
                      Direct Contact
                    </h4>
                    <div className="space-y-4">
                      <a
                        className="flex items-center gap-4 text-on-surface font-serif text-lg font-semibold hover:text-primary transition-colors break-all"
                        href="mailto:bharathvarmatony@gmail.com"
                      >
                        <span className="material-symbols-outlined opacity-60">mail</span>
                        bharathvarmatony@gmail.com
                      </a>
                      <a
                        className="flex items-center gap-4 text-on-surface font-serif text-lg font-semibold hover:text-primary transition-colors"
                        href="tel:+918919885401"
                      >
                        <span className="material-symbols-outlined opacity-60">call</span>
                        +91 89198 85401
                      </a>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-xs text-primary uppercase tracking-wider mb-4">
                      Office
                    </h4>
                    <p className="text-on-surface-variant font-sans text-sm leading-relaxed">
                      Bahadurpully
                      <br />
                      Hyderabad
                      <br />
                      India
                    </p>
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-xs text-primary uppercase tracking-wider mb-4">
                      Connect With Us
                    </h4>
                    <div className="flex gap-6">
                      <a
                        className="w-12 h-12 rounded-full bg-surface-bright flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors duration-300 shadow-sm"
                        href="#"
                      >
                        <span className="material-symbols-outlined text-[20px]">camera_alt</span>
                      </a>
                      <a
                        className="w-12 h-12 rounded-full bg-surface-bright flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors duration-300 shadow-sm"
                        href="#"
                      >
                        <span className="material-symbols-outlined text-[20px]">videocam</span>
                      </a>
                      <a
                        className="w-12 h-12 rounded-full bg-surface-bright flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors duration-300 shadow-sm"
                        href="#"
                      >
                        <span className="material-symbols-outlined text-[20px]">share</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Map Section / Aesthetic visual */}
        <section className="h-[400px] relative w-full overflow-hidden reveal-section">
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover"
              alt="Charleston coastline at sunrise."
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTuJFVDXKZIhexMoGzeznplHGl_O5IULgCTK76O4jCAlw7Cv1gGtbK1qpMdjMJgAJJDQ_YQt2WMlAEuY95tGrW_y7vZgSIRQokEY9hzKsAiedN9QosM7NELEyrG7h0xGolDjeeonHReaS7HrtwlsgYNjVKoV_zUhyfyQ3RW1VAS9TyJ_6q3GwuCtQBaO_eONCfDnKnh2BlOccM3uKMpMkfMDlUEHiBgpzUBG4rnQrABWUF_maY5mzqyBg0zmjBNbi_Fp_0SOimPg"
            />
            <div className="absolute inset-0 bg-primary/10 mix-blend-multiply"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
            <div className="bg-surface-bright/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-outline-variant/20 flex flex-col items-center text-center">
              <span
                className="material-symbols-outlined text-primary text-[40px] mb-2"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                location_on
              </span>
              <span className="font-serif text-xl font-bold text-primary">Hyderabad, India</span>
              <p className="text-[11px] font-sans text-on-surface-variant uppercase tracking-widest mt-1">
                Our Base of Operations
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
