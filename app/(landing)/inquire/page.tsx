"use client";

import { useState, useRef, FormEvent } from "react";
import Header from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";
import MobileNav from "@/components/landing/mobile-nav";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function Inquire() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("wedding");
  const [guestCount, setGuestCount] = useState("100-250");
  const [story, setStory] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    date?: string;
    location?: string;
    story?: string;
  }>({});

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const storyRef = useRef<HTMLTextAreaElement>(null);

  const focusFirstError = (errs: typeof errors) => {
    if (errs.name && nameRef.current) {
      nameRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      nameRef.current.focus();
    } else if (errs.email && emailRef.current) {
      emailRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      emailRef.current.focus();
    } else if (errs.phone && phoneRef.current) {
      phoneRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      phoneRef.current.focus();
    } else if (errs.date && dateRef.current) {
      dateRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      dateRef.current.focus();
    } else if (errs.location && locationRef.current) {
      locationRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      locationRef.current.focus();
    } else if (errs.story && storyRef.current) {
      storyRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      storyRef.current.focus();
    }
  };

  const clearError = (field: keyof typeof errors) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      newErrors.name = "Please enter your name.";
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email is required.";
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (phone && phone.replace(/\D/g, "").length < 7) {
      newErrors.phone = "Please enter a valid phone number.";
    }

    if (date) {
      const today = todayISODate();
      if (date < today) {
        newErrors.date = "Please select a future date.";
      }
    }

    setErrors(newErrors);
    setSubmitError(null);

    if (Object.keys(newErrors).length > 0) {
      focusFirstError(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          date,
          location,
          eventType,
          guestCount,
          story,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error("Failed to submit inquiry:", err);
      setSubmitError("Inquiry submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-background font-sans selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col pb-16 md:pb-0">
      <Header />

      <main className="flex-grow">
        {/* Banner Section */}
        <section className="relative py-20 bg-surface-container-low border-b border-outline-variant/15 overflow-hidden">
          <div className="max-w-container-max mx-auto px-margin-desktop text-center relative z-10">
            <span className="text-primary font-sans text-xs font-semibold tracking-widest uppercase mb-4 block">
              Consultation
            </span>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-primary mb-6">Start a Conversation</h1>
            <p className="text-base md:text-lg font-sans text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              We invite you to share the details of your upcoming event. Let us help you craft a digital heirloom that lasts forever.
            </p>
          </div>
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"></div>
        </section>

        {/* Detailed Form & Timeline Grid */}
        <section className="py-20">
          <div className="w-full px-margin-desktop max-w-container-max mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
              
              {/* Form Section */}
              <div className="lg:col-span-8 bg-surface-container-lowest p-8 md:p-16 rounded-[32px] soft-lift border border-outline-variant/10">
                {isSubmitted ? (
                  <div className="text-center py-20 flex flex-col items-center justify-center animate-fade-in">
                    <span className="material-symbols-outlined text-green-600 text-6xl mb-4">check_circle</span>
                    <h3 className="text-2xl font-serif font-bold text-on-surface mb-2">Inquiry Submitted</h3>
                    <p className="text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed font-sans">
                      Thank you, {name}. We have received your event details. One of our memory archivists will contact you shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                    <h2 className="font-serif text-2xl font-bold text-on-surface mb-6 border-b border-outline-variant/10 pb-4">
                      Event Details
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">Name</label>
                        <input
                          ref={nameRef}
                          required
                          type="text"
                          maxLength={200}
                          minLength={2}
                          value={name}
                          onChange={(e) => { setName(e.target.value); clearError("name"); }}
                          className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-6 py-4 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                          placeholder="Your full name"
                        />
                        {errors.name && (
                          <p className="text-xs text-red-600 font-medium px-1">{errors.name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">Email</label>
                        <input
                          ref={emailRef}
                          required
                          type="email"
                          maxLength={320}
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                          className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-6 py-4 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                          placeholder="hello@domain.com"
                        />
                        {errors.email && (
                          <p className="text-xs text-red-600 font-medium px-1">{errors.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">Phone Number</label>
                        <input
                          ref={phoneRef}
                          type="tel"
                          inputMode="numeric"
                          maxLength={12}
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 12)); clearError("phone"); }}
                          className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-6 py-4 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                          placeholder="+91 xxxxxxxx"
                        />
                        {errors.phone && (
                          <p className="text-xs text-red-600 font-medium px-1">{errors.phone}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">Event Date</label>
                        <input
                          ref={dateRef}
                          type="date"
                          value={date}
                          min={todayISODate()}
                          onChange={(e) => { setDate(e.target.value); clearError("date"); }}
                          className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-6 py-4 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                        />
                        {errors.date && (
                          <p className="text-xs text-red-600 font-medium px-1">{errors.date}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">Event Location</label>
                        <input
                          ref={locationRef}
                          type="text"
                          maxLength={200}
                          value={location}
                          onChange={(e) => { setLocation(e.target.value); clearError("location"); }}
                          className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-6 py-4 focus:ring-2 focus:ring-primary quint-ease outline-none text-sm font-sans"
                          placeholder="City, Country"
                        />
                        {errors.location && (
                          <p className="text-xs text-red-600 font-medium px-1">{errors.location}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">Event Type</label>
                        <select
                          value={eventType}
                          onChange={(e) => setEventType(e.target.value)}
                          className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-6 py-4 focus:ring-2 focus:ring-primary focus:ring-offset-0 focus:outline-none text-sm font-sans text-on-surface"
                        >
                          <option value="wedding">Wedding / Elopement</option>
                          <option value="reunion">Family Reunion</option>
                          <option value="gala">Metropolitan Gala / Social</option>
                          <option value="baptism">Kensington Baptism / Religious</option>
                          <option value="corporate">Corporate Gala</option>
                          <option value="other">Other Celebration</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">Estimated Guest Count</label>
                      <div className="flex flex-wrap gap-4 pt-1">
                        {["under-50", "50-100", "100-250", "250-500", "500+"].map((count) => {
                          const isSelected = guestCount === count;
                          return (
                            <button
                              key={count}
                              type="button"
                              onClick={() => setGuestCount(count)}
                              className={`px-5 py-2.5 rounded-full font-sans text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-primary text-on-primary shadow-sm"
                                  : "bg-surface-bright text-on-surface-variant ring-1 ring-outline-variant/30 hover:ring-primary"
                              }`}
                            >
                              {count.replace("-", " to ").replace("+", "+ guests").replace("under", "Under ")}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-sans font-semibold text-xs text-on-surface-variant px-1">
                        Share your event story
                      </label>
                      <textarea
                        ref={storyRef}
                        maxLength={2000}
                        value={story}
                        onChange={(e) => { setStory(e.target.value); clearError("story"); }}
                        className="w-full bg-surface-bright border-none ring-1 ring-outline-variant/30 rounded-xl px-6 py-4 focus:ring-2 focus:ring-primary quint-ease outline-none resize-none text-sm font-sans"
                        placeholder="Tell us about the atmosphere, the photography style, and the keepsakes you value most..."
                        rows={5}
                      ></textarea>
                      {story.length > 0 && (
                        <p className="text-xs text-on-surface-variant px-1 font-sans">
                          {story.length} / 2000
                        </p>
                      )}
                    </div>

                    {submitError && (
                      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-medium">
                        {submitError}
                      </div>
                    )}

                    <button
                      disabled={isSubmitting}
                      className="w-full md:w-auto bg-primary text-on-primary px-12 py-5 rounded-xl font-sans font-semibold text-sm quint-ease hover:scale-105 active:scale-95 shadow-md flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                      type="submit"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                          Sending…
                        </>
                      ) : (
                        <>
                          Submit Event Inquiry
                          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Response Timeline details */}
              <div className="lg:col-span-4 space-y-gutter lg:pl-8">
                <div className="bg-surface-container p-10 rounded-[32px] border border-outline-variant/15 shadow-sm space-y-8">
                  <h3 className="font-serif text-xl font-bold text-primary">The Spotme Process</h3>
                  <div className="space-y-8 relative pl-6 border-l border-outline-variant/30">
                    <div className="relative">
                      <div className="absolute -left-[35px] top-0.5 w-[18px] h-[18px] rounded-full bg-primary ring-4 ring-background"></div>
                      <h4 className="font-sans font-bold text-sm text-on-surface">1. Submit Inquiry</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        Share your date, location, and details using our secure form.
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[35px] top-0.5 w-[18px] h-[18px] rounded-full bg-primary-container ring-4 ring-background"></div>
                      <h4 className="font-sans font-bold text-sm text-on-surface">2. Initial Consultation</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        Our archivists schedule a discovery call to align with your creative vision.
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[35px] top-0.5 w-[18px] h-[18px] rounded-full bg-outline-variant ring-4 ring-background"></div>
                      <h4 className="font-sans font-bold text-sm text-on-surface">3. Gallery Archiving</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        Secure your custom domain, set guest parameters, and prime the AI models.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-8 rounded-[32px] overflow-hidden relative shadow-sm h-[250px] group">
                  <img
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt="Archival print display"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFXdzfJestLipUmYKofaHA4AFASCaoLcdFJ7WNHyFjfRQ-NeXEztXXAuZNW5B1LlY66ZYP3Yv4dblaHMz3pXU8TtYLhoB3FchiGSHAzS-1VbwSrWDX2P-N72ZkWwLFU2A7ssNAppIiOOk2hJU0kDCg4uvilyf7OqcZGALLMmoTR79e8lhFN1zo7K8nG4pMkgtRYJ1EUUFaWxgCmAuL2nAxzWgB9Kf3vMIz-LMFaeQTJgOHuU3j1y8q_5lfhXiAB5oSC2ay5GOvBA"
                  />
                  <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/10 transition-colors duration-300"></div>
                </div>
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
