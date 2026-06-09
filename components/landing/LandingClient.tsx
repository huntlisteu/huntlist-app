"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";

// ── Types ─────────────────────────────────────────────────────────────────────

type Lang = "en" | "it";

// ── FaqItem ───────────────────────────────────────────────────────────────────

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "2px solid var(--hl-border)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          fontSize: 16,
          fontWeight: 500,
          padding: "20px 24px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "var(--hl-ink)",
          userSelect: "none",
          background: open ? "var(--hl-bg2)" : "var(--hl-card)",
          width: "100%",
          border: "none",
          textAlign: "left",
          transition: "background 0.15s",
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        }}
      >
        <span>{question}</span>
        <span
          style={{
            fontSize: 22,
            color: "var(--hl-orange)",
            fontWeight: 400,
            flexShrink: 0,
            marginLeft: 12,
            fontFamily: "var(--font-sora), 'Sora', sans-serif",
            display: "inline-block",
            transform: open ? "rotate(45deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          +
        </span>
      </button>
      <div
        style={{
          fontSize: 15,
          color: "var(--hl-ink-mid)",
          lineHeight: 1.65,
          overflow: "hidden",
          maxHeight: open ? 300 : 0,
          padding: open ? "20px 24px" : "0 24px",
          background: "var(--hl-bg)",
          transition: "max-height 0.3s ease, padding 0.2s",
        }}
      >
        {answer}
      </div>
    </div>
  );
}

// ── Hover helpers ─────────────────────────────────────────────────────────────

function pressIn(el: HTMLElement) {
  el.style.transform = "translate(2px,2px)";
  el.style.boxShadow = "2px 2px 0px var(--hl-border)";
}
function pressOut(el: HTMLElement, shadow = "4px 4px 0px var(--hl-border)") {
  el.style.transform = "";
  el.style.boxShadow = shadow;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LandingClient() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => setMounted(true), []);

  // Scroll reveal
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("reveal-ready");

    const els = document.querySelectorAll(".hl-reveal, .hl-reveal-stagger");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    const t = setTimeout(() => els.forEach((el) => el.classList.add("in")), 1600);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  const dark = mounted && resolvedTheme === "dark";
  const logoSrc = dark ? "/logo_dark.svg" : "/logo_light.svg";

  function setLang(l: Lang) {
    setLangState(l);
    document.documentElement.lang = l;
  }

  // ── FAQ data ───────────────────────────────────────────────────────────────

  const faqEn = [
    { q: "Is posting a want list free?", a: "Yes, always. Posting your want list as a collector is completely free. We charge a 5% commission only to the hunter when a deal is successfully closed." },
    { q: "Which countries will be available at launch?", a: "We're launching across Europe — Italy, Germany, France, Spain, and more. Join the waitlist to be among the first notified when your country goes live." },
    { q: "How does payment work?", a: "Payments are handled securely through the platform. The collector pays when accepting a bundle offer, and the hunter receives the funds once the delivery has been successfully completed." },
    { q: "Can I be both a collector and a hunter?", a: "Absolutely. Your account works both ways — post your want list and hunt other people's lists at the same time with the same profile." },
    { q: "Which TCGs are supported at launch?", a: "Pokémon, One Piece TCG, and Yu-Gi-Oh!. More categories will be added based on community demand." },
  ];
  const faqIt = [
    { q: "Pubblicare una mancalista è gratuito?", a: "Sì, sempre. Pubblicare la tua mancalista come collezionista è completamente gratuito. Applichiamo una commissione del 5% solo al venditore quando una trattativa viene conclusa con successo." },
    { q: "In quali paesi sarà disponibile al lancio?", a: "Lanciamo in tutta Europa — Italia, Germania, Francia, Spagna e altri. Iscriviti alla waitlist per essere tra i primi notificati quando il tuo paese è live." },
    { q: "Come funzionano i pagamenti?", a: "I pagamenti sono gestiti in modo sicuro tramite la piattaforma. Il collezionista paga quando accetta un'offerta bundle, e il venditore riceve i fondi una volta che la consegna è stata completata correttamente." },
    { q: "Posso essere sia collezionista che hunter?", a: "Assolutamente. Il tuo account funziona in entrambi i modi — pubblica la tua mancalista e caccia quelle degli altri con lo stesso profilo." },
    { q: "Quali TCG sono supportati al lancio?", a: "Pokémon, One Piece TCG e Yu-Gi-Oh!. Altre categorie verranno aggiunte in base alla domanda della community." },
  ];
  const faq = lang === "en" ? faqEn : faqIt;

  return (
    <>
      {/* ── Scoped CSS variables ──────────────────────────────────────────── */}
      <style>{`
        /* Light tokens — scoped to .hl-landing to avoid conflict with globals.css */
        .hl-landing {
          --hl-green:       #6DBE00;
          --hl-green-light: #8AD800;
          --hl-green-pale:  #EEF7CC;
          --hl-green-mid:   #C8E87A;
          --hl-orange:      #B84A1C;
          --hl-orange-l:    #D4602A;
          --hl-orange-pale: #FAE8DC;
          --hl-bg:          #F2EDE3;
          --hl-bg2:         #EAE2D4;
          --hl-ink:         #1A1A18;
          --hl-ink-mid:     #4A4A44;
          --hl-ink-light:   #8A8A82;
          --hl-border:      #1A1A18;
          --hl-card:        #F2EDE3;
          --hl-shadow:      7px 6px 0px #1A1A18;
          --hl-shadow-sm:   3px 2px 0px #1A1A18;
          --hl-shadow-sm-l: 4px 4px 0px #1A1A18;
        }
        /* Dark overrides — triggered by next-themes .dark on <html> */
        .dark .hl-landing {
          --hl-green:       #9ADE00;
          --hl-green-light: #C2F000;
          --hl-green-pale:  rgba(154,222,0,0.13);
          --hl-green-mid:   rgba(154,222,0,0.26);
          --hl-orange:      #FF6B2C;
          --hl-orange-l:    #FF8A56;
          --hl-orange-pale: rgba(255,107,44,0.13);
          --hl-bg:          #111210;
          --hl-bg2:         #1A1C19;
          --hl-ink:         #F0EFE8;
          --hl-ink-mid:     #B0AFA8;
          --hl-ink-light:   #5A5A54;
          --hl-border:      #3A3D38;
          --hl-card:        #1A1C19;
          --hl-shadow:      7px 6px 0px #3A3D38;
          --hl-shadow-sm:   3px 2px 0px #3A3D38;
          --hl-shadow-sm-l: 4px 4px 0px #3A3D38;
          --hl-brand-bg:    #1A1A18;
          --hl-brand-sub:   rgba(240,239,232,0.65);
          --hl-brand-sep:   rgba(255,255,255,0.1);
          --hl-brand-brd:   rgba(255,255,255,0.08);
        }

        /* Pulse animation */
        @keyframes hl-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .hl-dot { animation: hl-pulse 2s ease infinite; }

        /* Scroll reveal */
        .reveal-ready .hl-reveal { opacity:0; transform:translateY(28px); }
        .reveal-ready .hl-reveal.in {
          opacity:1; transform:translateY(0);
          transition: transform 0.42s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease;
        }
        .reveal-ready .hl-reveal-stagger > * { opacity:0; transform:translateY(28px); }
        .reveal-ready .hl-reveal-stagger.in > * {
          opacity:1; transform:translateY(0);
          transition: transform 0.42s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease;
        }
        .reveal-ready .hl-reveal-stagger.in > *:nth-child(1) { transition-delay:0.00s; }
        .reveal-ready .hl-reveal-stagger.in > *:nth-child(2) { transition-delay:0.08s; }
        .reveal-ready .hl-reveal-stagger.in > *:nth-child(3) { transition-delay:0.16s; }
        .reveal-ready .hl-reveal-stagger.in > *:nth-child(4) { transition-delay:0.24s; }
        @media (prefers-reduced-motion:reduce) {
          .reveal-ready .hl-reveal, .reveal-ready .hl-reveal-stagger > * { opacity:1; transform:none; }
        }

        /* Rotated pills */
        .hl-rpill { transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), background 0.2s; }
        .hl-rpill:nth-child(1) { transform: rotate(-3deg); }
        .hl-rpill:nth-child(2) { transform: rotate(2.5deg); }
        .hl-rpill:hover { transform: rotate(0deg) translateY(-2px) !important; }
        .hl-badge { transform: rotate(-1.5deg); transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1); }
        .hl-badge:hover { transform: rotate(0deg); }

        /* Dark overrides for block elements */
        .dark .hl-stat-box { background: var(--hl-brand-bg) !important; }
        .dark .hl-stat-num { color: var(--hl-green-light) !important; }
        .dark .hl-stat-num.hl-orange-num { color: var(--hl-orange-l) !important; }
        .dark .hl-stat-label { color: var(--hl-brand-sub) !important; }

        .dark .hl-hcard { background: var(--hl-brand-bg) !important; border-right-color: var(--hl-brand-brd) !important; }
        .dark .hl-hnum { opacity: 0.25; color: var(--hl-green-light) !important; }
        .dark .hl-hicon { border-color: var(--hl-border) !important; background: var(--hl-bg2) !important; }
        .dark .hl-hcard-title { color: var(--hl-orange-l) !important; }
        .dark .hl-hcard-p { color: var(--hl-ink-mid) !important; }

        .dark .hl-ccat { background: var(--hl-brand-bg) !important; border-right-color: var(--hl-brand-brd) !important; }
        .dark .hl-ccat-name { color: var(--hl-green-light) !important; }
        .dark .hl-ccat:nth-child(4) .hl-ccat-name { color: var(--hl-orange-l) !important; }
        .dark .hl-ccat-sub { color: var(--hl-ink-mid) !important; }
        .dark .hl-ccat:hover { filter: none !important; background: var(--hl-bg2) !important; }

        .dark .hl-fwb { background: var(--hl-brand-bg) !important; border-right-color: var(--hl-border) !important; }
        .dark .hl-fwb h3 { color: var(--hl-green-light) !important; }
        .dark .hl-fwb li { color: var(--hl-ink-mid) !important; border-bottom-color: var(--hl-brand-sep) !important; }
        .dark .hl-fwb li span { color: var(--hl-green) !important; }
        .dark .hl-fws { background: var(--hl-brand-bg) !important; }
        .dark .hl-fws h3 { color: var(--hl-orange-l) !important; }
        .dark .hl-fws li { color: var(--hl-ink-mid) !important; border-bottom-color: var(--hl-brand-sep) !important; }
        .dark .hl-fws li span { color: var(--hl-border) !important; }

        .dark .hl-cta-sec { background: #6B2200 !important; }

        /* Responsive */
        @media (max-width: 900px) {
          .hl-hero-grid { grid-template-columns: 1fr !important; }
          .hl-hero-right { border-left: none !important; border-top: 2px solid var(--hl-border) !important; padding-left: 0 !important; padding-top: 40px !important; margin-top: 40px !important; }
          .hl-hero-left { padding-right: 0 !important; }
          .hl-how-grid { grid-template-columns: 1fr !important; }
          .hl-hcard { border-right: none !important; border-bottom: 2px solid var(--hl-border) !important; }
          .hl-hcard:last-child { border-bottom: none !important; }
          .hl-cats-grid { grid-template-columns: 1fr 1fr !important; }
          .hl-ccat:nth-child(2) { border-right: none !important; }
          .hl-ccat:nth-child(3) { border-top: 2px solid var(--hl-border) !important; }
          .hl-ccat:nth-child(4) { border-top: 2px solid var(--hl-border) !important; border-right: none !important; }
          .hl-fw-grid { grid-template-columns: 1fr !important; }
          .hl-fwb { border-right: none !important; border-bottom: 2px solid var(--hl-border) !important; }
          .hl-cta-layout { grid-template-columns: 1fr !important; }
          .hl-cta-left { padding-right: 0 !important; border-right: none !important; border-bottom: 2px solid rgba(255,255,255,0.3) !important; padding-bottom: 40px !important; }
          .hl-cta-right { padding-left: 0 !important; padding-top: 40px !important; }
          .hl-nav { padding: 0 16px !important; }
          .hl-nav-cta { display: none !important; }
          .hl-sec { padding: 60px 20px !important; }
          .hl-hero { padding: 90px 20px 60px !important; }
        }
      `}</style>

      {/* ── Wrapper with scoped CSS variables ──────────────────────────────── */}
      <div
        className="hl-landing"
        style={{
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          background: "var(--hl-bg)",
          color: "var(--hl-ink)",
          overflowX: "hidden",
          transition: "background 0.2s, color 0.2s",
          minHeight: "100vh",
        }}
      >
        {/* ── NAV ─────────────────────────────────────────────────────────── */}
        <nav
          className="hl-nav"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 40px",
            height: 60,
            background: "var(--hl-bg)",
            borderBottom: "2px solid var(--hl-border)",
            transition: "background 0.2s",
          }}
        >
          <a
            href="#top"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
          >
            {mounted && (
              <Image src={logoSrc} alt="Huntlist" width={120} height={32} style={{ height: 32, width: "auto", filter: dark ? "drop-shadow(4px 4px 0px #3A3D38)" : "drop-shadow(4px 4px 0px #000000)" }} />
            )}
          </a>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Lang switch */}
            <div style={{ display: "flex", border: "2px solid var(--hl-border)", overflow: "hidden", borderRadius: 4 }}>
              {(["en", "it"] as Lang[]).map((l, i) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                    border: "none",
                    borderLeft: i > 0 ? "2px solid var(--hl-border)" : undefined,
                    background: lang === l ? "var(--hl-ink)" : "transparent",
                    cursor: "pointer",
                    color: lang === l ? "var(--hl-bg)" : "var(--hl-ink-mid)",
                    transition: "background 0.15s, color 0.15s",
                    letterSpacing: "0.5px",
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(dark ? "light" : "dark")}
              style={{
                width: 36, height: 36,
                border: "2px solid var(--hl-border)",
                background: "transparent",
                cursor: "pointer",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s, transform 0.15s",
                borderRadius: 4,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--hl-ink)";
                el.style.color = "var(--hl-bg)";
                el.style.transform = "rotate(20deg)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "transparent";
                el.style.color = "";
                el.style.transform = "";
              }}
            >
              {mounted ? (dark ? "🌙" : "☀️") : "☀️"}
            </button>

            {/* CTA */}
            <a
              href="/signup"
              className="hl-nav-cta"
              style={{
                background: "var(--hl-orange)",
                color: "#fff",
                border: "2px solid var(--hl-border)",
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                cursor: "pointer",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                boxShadow: "4px 4px 0px var(--hl-border)",
                transition: "all 0.15s ease",
                letterSpacing: "0.2px",
                borderRadius: 4,
              }}
              onMouseEnter={(e) => pressIn(e.currentTarget as HTMLElement)}
              onMouseLeave={(e) => pressOut(e.currentTarget as HTMLElement)}
            >
              {lang === "en" ? "Enter →" : "Entra →"}
            </a>
          </div>
        </nav>

        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <section
          id="top"
          className="hl-hero-grid hl-hero"
          style={{
            minHeight: "100vh",
            padding: "100px 40px 80px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            alignItems: "center",
            borderBottom: "2px solid var(--hl-border)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Left */}
          <div className="hl-hero-left" style={{ paddingRight: 60, position: "relative", zIndex: 1 }}>
            <div
              className="hl-badge"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--hl-green-pale)",
                border: "2px solid var(--hl-border)",
                padding: "5px 12px",
                fontSize: 12,
                color: "var(--hl-green)",
                fontWeight: 500,
                letterSpacing: "0.5px",
                marginBottom: 24,
                textTransform: "uppercase",
                borderRadius: 4,
              }}
            >
              <div className="hl-dot" style={{ width: 7, height: 7, background: "var(--hl-green)", flexShrink: 0, borderRadius: 1 }} />
              {lang === "en" ? "Launching soon across Europe" : "Presto disponibile in tutta Europa"}
            </div>

            <h1
              style={{
                fontFamily: "var(--font-sora), 'Sora', sans-serif",
                fontSize: "clamp(50px, 6.2vw, 82px)",
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: "-1.5px",
                color: "var(--hl-ink)",
                marginBottom: 28,
                fontVariantLigatures: "none",
              }}
            >
              {lang === "en" ? (
                <>Post your list.<br /><em style={{ color: "var(--hl-orange)", fontStyle: "normal" }}>Hunters find</em>{" "}<span style={{ color: "var(--hl-green)" }}>you.</span></>
              ) : (
                <>Pubblica la lista.<br /><em style={{ color: "var(--hl-orange)", fontStyle: "normal" }}>Gli hunter ti</em>{" "}<span style={{ color: "var(--hl-green)" }}>trovano.</span></>
              )}
            </h1>

            <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--hl-ink-mid)", maxWidth: 480, marginBottom: 40 }}>
              {lang === "en"
                ? "Collectors post the cards they need. Sellers hunt the lists and ship everything in one go. No more paying 6 shipments to complete a set."
                : "I collezionisti pubblicano le carte che cercano. I venditori cacciano le liste e spediscono tutto in una volta. Basta pagare 6 spedizioni per completare un set."}
            </p>

            <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
              {[
                { labelEn: "Learn more", labelIt: "Scopri di più", href: "#how-it-works", primary: true },
                { labelEn: "Join now", labelIt: "Entra subito", href: "#early-access", primary: false },
              ].map(({ labelEn, labelIt, href, primary }) => (
                <a
                  key={href}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  style={{
                    background: primary ? "var(--hl-orange)" : "transparent",
                    color: primary ? "#fff" : "var(--hl-ink)",
                    border: "2px solid var(--hl-border)",
                    padding: "13px 28px",
                    fontSize: 15,
                    fontWeight: 500,
                    fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                    textDecoration: "none",
                    boxShadow: "4px 4px 0px var(--hl-border)",
                    transition: "all 0.15s ease",
                    display: "inline-block",
                    borderRadius: 4,
                  }}
                  onMouseEnter={(e) => pressIn(e.currentTarget as HTMLElement)}
                  onMouseLeave={(e) => pressOut(e.currentTarget as HTMLElement)}
                >
                  {lang === "en" ? labelEn : labelIt}
                </a>
              ))}
            </div>
          </div>

          {/* Right — stat boxes */}
          <div
            className="hl-hero-right hl-reveal-stagger"
            style={{
              borderLeft: "2px solid var(--hl-border)",
              paddingLeft: 60,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              alignSelf: "stretch",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            {[
              { num: "0%", cls: "hl-orange-num", labelEn: "Commission for collectors. Always free to list.", labelIt: "Commissione per i collezionisti. Sempre gratis pubblicare." },
              { num: "1", cls: "", labelEn: "Shipment. However many cards you need.", labelIt: "Spedizione. Per quante carte vuoi." },
              { num: "🌍", cls: "", labelEn: "Europe-wide. Pokémon, One Piece, Yu-Gi-Oh! at launch.", labelIt: "Tutta Europa. Pokémon, One Piece, Yu-Gi-Oh! al lancio." },
            ].map(({ num, cls, labelEn, labelIt }) => (
              <div
                key={num}
                style={{
                  borderRadius: 6,
                  border: "2px solid var(--hl-border)",
                  boxShadow: "4px 4px 0px var(--hl-border)",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => pressIn(e.currentTarget as HTMLElement)}
                onMouseLeave={(e) => pressOut(e.currentTarget as HTMLElement)}
              >
                <div
                  className="hl-stat-box"
                  style={{ background: "var(--hl-bg)", padding: "20px 24px", borderRadius: 4, cursor: "default" }}
                >
                  <div className={`hl-stat-num ${cls}`} style={{ fontFamily: "var(--font-sora), 'Sora', sans-serif", fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: -2, color: "#1A1A18" }}>
                    {num}
                  </div>
                  <div className="hl-stat-label" style={{ fontSize: 13, color: "rgba(26,26,24,0.8)", marginTop: 4 }}>
                    {lang === "en" ? labelEn : labelIt}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {[
                { dot: "#6DBE00", en: "Collector", it: "Collezionista" },
                { dot: "#B84A1C", en: "Hunter", it: "Hunter" },
              ].map(({ dot, en, it }) => (
                <div
                  key={en}
                  className="hl-rpill"
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    border: "2px solid var(--hl-border)",
                    background: "var(--hl-card)",
                    padding: "7px 14px",
                    fontSize: 13,
                    color: "var(--hl-ink-mid)",
                    boxShadow: "var(--hl-shadow-sm)",
                    borderRadius: 4,
                  }}
                >
                  <div style={{ width: 8, height: 8, flexShrink: 0, borderRadius: 2, background: dot }} />
                  {lang === "en" ? en : it}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
        <section id="how-it-works" className="hl-sec" style={{ padding: "80px 40px", borderBottom: "2px solid var(--hl-border)", background: "var(--hl-bg)", transition: "background 0.2s" }}>
          <div className="hl-reveal" style={{ maxWidth: 1140, margin: "0 auto" }}>
            <SLabel>{lang === "en" ? "How it works" : "Come funziona"}</SLabel>
            <STitle orange={lang === "en" ? "One shipment." : "Una spedizione."}>
              {lang === "en" ? "One list." : "Una lista."}
            </STitle>
            <SSub>{lang === "en" ? "Stop paying a separate shipment for every card. Post your want list once — hunters across Europe respond with everything bundled together." : "Smetti di pagare una spedizione per ogni carta. Pubblica la tua mancalista una volta — i hunter di tutta Europa rispondono con tutto insieme."}</SSub>

            <div className="hl-how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0, border: "2px solid var(--hl-border)", borderRadius: 6, overflow: "hidden" }}>
              {[
                { num: "01", icon: "📋", titleEn: "Post your list", titleIt: "Pubblica la lista", descEn: "Write the cards you need, the condition and your budget. Takes 2 minutes. It's always free.", descIt: "Scrivi le carte che cerchi, la condizione e il tuo budget. Ci vogliono 2 minuti. È sempre gratuito." },
                { num: "02", icon: "🎯", titleEn: "Hunters find you", titleIt: "I hunter ti trovano", descEn: "Sellers across Europe hunt your list and make you a bundle offer — all the cards you need, one package.", descIt: "I venditori di tutta Europa cacciano la tua lista e ti fanno un'offerta bundle — tutte le carte che cerchi, un solo pacco." },
                { num: "03", icon: "📦", titleEn: "One shipment. Done.", titleIt: "Una spedizione. Fine.", descEn: "Compare offers, check hunter ratings, accept the best one. Pay once. Receive everything together.", descIt: "Confronta le offerte, controlla i rating, accetta la migliore. Paghi una volta. Ricevi tutto insieme." },
              ].map(({ num, icon, titleEn, titleIt, descEn, descIt }, i) => (
                <div
                  key={num}
                  className="hl-hcard"
                  style={{ padding: "36px 32px", borderRight: i < 2 ? "2px solid rgba(255,255,255,0.2)" : "none", position: "relative", background: "#B84A1C", transition: "background 0.2s" }}
                >
                  <div className="hl-hnum" style={{ fontFamily: "var(--font-sora), 'Sora', sans-serif", fontSize: 76, fontWeight: 800, lineHeight: 1, letterSpacing: -2, color: "rgba(255,255,255,0.15)", position: "absolute", top: 16, right: 20 }}>{num}</div>
                  <div className="hl-hicon" style={{ width: 48, height: 48, border: "2px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, fontSize: 22, background: "rgba(255,255,255,0.15)", borderRadius: 4 }}>{icon}</div>
                  <h3 className="hl-hcard-title" style={{ fontFamily: "var(--font-sora), 'Sora', sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: -0.5, marginBottom: 10, color: "#F0EFE8" }}>{lang === "en" ? titleEn : titleIt}</h3>
                  <p className="hl-hcard-p" style={{ fontSize: 14, color: "rgba(240,239,232,0.75)", lineHeight: 1.65, maxWidth: 260 }}>{lang === "en" ? descEn : descIt}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CATEGORIES ───────────────────────────────────────────────────── */}
        <section className="hl-sec" style={{ padding: "80px 40px", borderBottom: "2px solid var(--hl-border)", background: "var(--hl-bg2)", transition: "background 0.2s" }}>
          <div className="hl-reveal" style={{ maxWidth: 1140, margin: "0 auto" }}>
            <SLabel>{lang === "en" ? "Categories" : "Categorie"}</SLabel>
            <STitle orange={lang === "en" ? "list." : "lista."}>
              {lang === "en" ? "Every collector has a" : "Ogni collezionista ha la sua"}
            </STitle>
            <SSub>{lang === "en" ? "From vintage sealed to graded singles — post your want list and let hunters do the work." : "Dal sealed vintage ai graded singles — pubblica la tua mancalista e lascia che i hunter facciano il lavoro."}</SSub>

            <div className="hl-cats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, border: "2px solid var(--hl-border)", borderRadius: 6, overflow: "hidden" }}>
              {[
                { icon: "⚡", name: "Pokémon", subEn: "Vintage, sealed, PSA", subIt: "Vintage, sealed, PSA", accent: false },
                { icon: "☠️", name: "One Piece TCG", subEn: "Singles, sealed, rare alt art", subIt: "Singole, sealed, rare alt art", accent: false },
                { icon: "🎴", name: "Yu-Gi-Oh!", subEn: "Singles, sealed, graded", subIt: "Singole, sealed, graded", accent: false },
                { icon: "+", nameEn: "More coming", nameIt: "Altri in arrivo", subEn: "Based on community demand", subIt: "In base alla community", accent: true },
              ].map((cat, i) => (
                <div
                  key={i}
                  className="hl-ccat"
                  style={{
                    padding: "28px 24px",
                    borderRight: i < 3 ? "2px solid rgba(26,26,24,0.2)" : "none",
                    textAlign: "left",
                    transition: "filter 0.15s",
                    cursor: "default",
                    background: cat.accent ? "#B84A1C" : "var(--hl-bg)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = "brightness(1.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = ""; }}
                >
                  <span style={{ fontSize: 28, marginBottom: 12, display: "block" }}>{cat.icon}</span>
                  <div className="hl-ccat-name" style={{ fontFamily: "var(--font-sora), 'Sora', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: -0.5, color: cat.accent ? "#F0EFE8" : "#1A1A18" }}>
                    {"name" in cat ? cat.name : lang === "en" ? cat.nameEn : cat.nameIt}
                  </div>
                  <div className="hl-ccat-sub" style={{ fontSize: 12, color: cat.accent ? "rgba(240,239,232,0.7)" : "rgba(26,26,24,0.6)", marginTop: 4 }}>
                    {lang === "en" ? cat.subEn : cat.subIt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FOR WHO ──────────────────────────────────────────────────────── */}
        <section className="hl-sec" style={{ padding: "80px 40px", borderBottom: "2px solid var(--hl-border)", background: "var(--hl-bg)", transition: "background 0.2s" }}>
          <div className="hl-reveal" style={{ maxWidth: 1140, margin: "0 auto" }}>
            <SLabel>{lang === "en" ? "For who" : "Per chi"}</SLabel>
            <STitle orange={lang === "en" ? "Hunt it." : "Caccialo."}>
              {lang === "en" ? "List it." : "Listalo."}
            </STitle>
            <SSub>{lang === "en" ? "Whether you're completing a set or you have cards to sell — Huntlist works for both sides." : "Che tu stia completando un set o abbia carte da vendere — Huntlist funziona per entrambi."}</SSub>

            <div className="hl-fw-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "2px solid var(--hl-border)", borderRadius: 6, overflow: "hidden" }}>
              <div className="hl-fwb" style={{ padding: 40, background: "var(--hl-bg)", borderRight: "2px solid rgba(26,26,24,0.2)", transition: "background 0.2s" }}>
                <h3 style={{ fontFamily: "var(--font-sora), 'Sora', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: -1, marginBottom: 24, color: "#1A1A18" }}>
                  {lang === "en" ? "For collectors" : "Per i collezionisti"}
                </h3>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {(lang === "en" ? ["Post your want list in 2 minutes", "Receive bundle offers from hunters across Europe", "One shipment — no matter how many cards you need", "Always free to list"] : ["Pubblica la tua mancalista in 2 minuti", "Ricevi offerte bundle da hunter di tutta Europa", "Una spedizione — qualunque sia il numero di carte", "Sempre gratuito pubblicare"]).map((item) => (
                    <li key={item} style={{ fontSize: 15, color: "rgba(26,26,24,0.75)", padding: "10px 0", borderBottom: "1px solid rgba(26,26,24,0.15)", lineHeight: 1.5, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: "rgba(26,26,24,0.4)", fontWeight: 500, flexShrink: 0, marginTop: 1 }}>→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hl-fws" style={{ padding: 40, background: "#B84A1C", transition: "background 0.2s" }}>
                <h3 style={{ fontFamily: "var(--font-sora), 'Sora', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: -1, marginBottom: 24, color: "#F0EFE8" }}>
                  {lang === "en" ? "For hunters" : "Per i hunter"}
                </h3>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {(lang === "en" ? ["Browse real demand before offering anything", "Hunt the lists that match your stock", "Reach collectors across all of Europe", "Build reputation with verified ratings"] : ["Sfoglia la domanda reale prima di offrire", "Caccia le liste che corrispondono al tuo stock", "Raggiungi collezionisti in tutta Europa", "Costruisci reputazione con rating verificati"]).map((item) => (
                    <li key={item} style={{ fontSize: 15, color: "rgba(240,239,232,0.85)", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.2)", lineHeight: 1.5, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 500, flexShrink: 0, marginTop: 1 }}>→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="hl-sec" style={{ padding: "80px 40px", borderBottom: "2px solid var(--hl-border)", background: "var(--hl-bg2)", transition: "background 0.2s" }}>
          <div className="hl-reveal" style={{ maxWidth: 1140, margin: "0 auto" }}>
            <SLabel>{lang === "en" ? "FAQ" : "Domande frequenti"}</SLabel>
            <h2
              style={{
                fontFamily: "var(--font-sora), 'Sora', sans-serif",
                fontSize: "clamp(34px, 4vw, 54px)",
                fontWeight: 800,
                letterSpacing: -1.5,
                lineHeight: 1.05,
                color: "var(--hl-ink)",
                marginBottom: 56,
              }}
            >
              {lang === "en" ? <>Got <em style={{ color: "var(--hl-orange)", fontStyle: "normal" }}>questions?</em></> : <>Hai <em style={{ color: "var(--hl-orange)", fontStyle: "normal" }}>domande?</em></>}
            </h2>
            <div style={{ maxWidth: 740, border: "2px solid var(--hl-border)", borderRadius: 6, overflow: "hidden" }}>
              {faq.map(({ q, a }, i) => <FaqItem key={i} question={q} answer={a} />)}
            </div>
          </div>
        </section>

        {/* ── CTA / EARLY ACCESS ───────────────────────────────────────────── */}
        <section id="early-access" className="hl-cta-sec hl-sec" style={{ padding: "80px 40px", borderBottom: "2px solid var(--hl-border)", background: "#B84A1C" }}>
          <div className="hl-reveal" style={{ maxWidth: 1140, margin: "0 auto" }}>
            <div className="hl-cta-layout" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, alignItems: "start" }}>
              <div className="hl-cta-left" style={{ paddingRight: 60, borderRight: "2px solid rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,220,200,0.7)", marginBottom: 12 }}>
                  {lang === "en" ? "Early access" : "Accesso anticipato"}
                </div>
                <h2 style={{ fontFamily: "var(--font-sora), 'Sora', sans-serif", fontSize: "clamp(34px, 4vw, 54px)", fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05, color: "#fff" }}>
                  {lang === "en" ? <>Beta is live.<br />Get in early.</> : <>La beta è aperta.<br />Entra in anticipo.</>}
                </h2>
              </div>
              <div className="hl-cta-right" style={{ paddingLeft: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <a
                  href="/signup"
                  style={{
                    background: "var(--hl-green)",
                    color: "var(--hl-ink)",
                    border: "2px solid var(--hl-border)",
                    padding: "16px 36px",
                    fontSize: 17,
                    fontWeight: 600,
                    fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                    textDecoration: "none",
                    boxShadow: "4px 4px 0px var(--hl-border)",
                    transition: "all 0.15s ease",
                    display: "inline-block",
                    borderRadius: 4,
                    letterSpacing: -0.2,
                  }}
                  onMouseEnter={(e) => pressIn(e.currentTarget as HTMLElement)}
                  onMouseLeave={(e) => pressOut(e.currentTarget as HTMLElement)}
                >
                  {lang === "en" ? "Enter Huntlist →" : "Entra in Huntlist →"}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer style={{ padding: "28px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "2px solid var(--hl-border)", flexWrap: "wrap", gap: 12, background: "var(--hl-bg)", transition: "background 0.2s" }}>
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            {mounted && <Image src={logoSrc} alt="Huntlist" width={100} height={28} style={{ height: 28, width: "auto", filter: dark ? "drop-shadow(4px 4px 0px #3A3D38)" : "drop-shadow(4px 4px 0px #000000)" }} />}
          </a>
          <p style={{ fontSize: 13, color: "var(--hl-ink-light)" }}>© 2025 Huntlist</p>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <a href="mailto:hello@huntlist.eu" style={{ fontSize: 13, color: "var(--hl-ink-light)", textDecoration: "none" }}>hello@huntlist.eu</a>
            <a href="https://instagram.com/huntlisteu" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ color: "var(--hl-ink-light)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <Link href="/privacy" style={{ fontSize: 13, color: "var(--hl-ink-light)", textDecoration: "none" }}>Privacy &amp; Cookies</Link>
          </div>
        </footer>

        {/* ── COOKIE BANNER ────────────────────────────────────────────────── */}
        <CookieBanner />
      </div>
    </>
  );
}

// ── Cookie banner ─────────────────────────────────────────────────────────────

function CookieBanner() {
  const [choice, setChoice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hl-cookie-consent");
      setChoice(saved);
    } catch {
      setChoice("accepted");
    }
    setReady(true);
  }, []);

  function accept(c: string) {
    try { localStorage.setItem("hl-cookie-consent", c); } catch { /* noop */ }
    setChoice(c);
  }

  if (!ready || choice !== null) return null;

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, background: "var(--hl-card)", borderTop: "2px solid var(--hl-border)", boxShadow: "0 -4px 0px var(--hl-border)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--hl-ink-mid)", maxWidth: 600, margin: 0 }}>
        We use essential cookies to make this site work. By continuing, you agree to our{" "}
        <Link href="/privacy" style={{ color: "var(--hl-green)", textDecoration: "underline" }}>Privacy &amp; Cookie Policy</Link>.
      </p>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={() => accept("essential")} style={{ padding: "8px 16px", border: "2px solid var(--hl-border)", borderRadius: 4, background: "transparent", fontSize: 13, fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", color: "var(--hl-ink-mid)", cursor: "pointer", boxShadow: "var(--hl-shadow-sm)" }}>
          Essential only
        </button>
        <button onClick={() => accept("accepted")} style={{ padding: "8px 16px", border: "2px solid var(--hl-border)", borderRadius: 4, background: "var(--hl-ink)", color: "var(--hl-bg)", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif", cursor: "pointer", boxShadow: "var(--hl-shadow-sm)" }}>
          Accept
        </button>
      </div>
    </div>
  );
}

// ── Section helpers ───────────────────────────────────────────────────────────

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: 3, textTransform: "uppercase", color: "var(--hl-green)", marginBottom: 12 }}>
      {children}
    </div>
  );
}

function STitle({ children, orange }: { children: React.ReactNode; orange: string }) {
  return (
    <h2 style={{ fontFamily: "var(--font-sora), 'Sora', sans-serif", fontSize: "clamp(34px, 4vw, 54px)", fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05, color: "var(--hl-ink)", marginBottom: 16 }}>
      {children}<br /><em style={{ color: "var(--hl-orange)", fontStyle: "normal" }}>{orange}</em>
    </h2>
  );
}

function SSub({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 16, color: "var(--hl-ink-mid)", maxWidth: 520, lineHeight: 1.65, marginBottom: 56 }}>
      {children}
    </p>
  );
}
