"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";

export default function PrivacyPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === "dark";
  const logoSrc = dark ? "/logo_dark.svg" : "/logo_light.svg";

  return (
    <>
      <style>{`
        .hl-priv {
          --hl-green:   #6DBE00;
          --hl-orange:  #B84A1C;
          --hl-gp:      #EEF7CC;
          --hl-bg:      #F2EDE3;
          --hl-bg2:     #EAE2D4;
          --hl-ink:     #1A1A18;
          --hl-ink-mid: #4A4A44;
          --hl-ink-l:   #8A8A82;
          --hl-border:  #1A1A18;
          --hl-card:    #FAF7F2;
          --hl-shsm:    4px 3px 0px #1A1A18;
          --hl-shsml:   6px 5px 0px #1A1A18;
        }
        .dark .hl-priv {
          --hl-green:   #9ADE00;
          --hl-orange:  #FF6B2C;
          --hl-gp:      rgba(154,222,0,0.13);
          --hl-bg:      #111210;
          --hl-bg2:     #1A1C19;
          --hl-ink:     #F0EFE8;
          --hl-ink-mid: #B0AFA8;
          --hl-ink-l:   #6A6A62;
          --hl-border:  #3A3D38;
          --hl-card:    #1A1C19;
          --hl-shsm:    4px 3px 0px #3A3D38;
          --hl-shsml:   6px 5px 0px #3A3D38;
        }
        @media (max-width: 720px) {
          .hl-priv-nav  { padding: 0 16px !important; }
          .hl-priv-cont { padding: 36px 14px 80px !important; }
          .hl-priv-doc  { padding: 26px 20px 30px !important; }
          .hl-priv-h1   { font-size: 30px !important; }
          .hl-priv-tw   { overflow-x: auto !important; }
          .hl-priv-tw table { min-width: 520px !important; }
        }
      `}</style>

      <div
        className="hl-priv"
        style={{
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          background: "var(--hl-bg)",
          color: "var(--hl-ink)",
          lineHeight: 1.7,
          transition: "background 0.2s, color 0.2s",
          minHeight: "100vh",
        }}
      >
        {/* NAV */}
        <nav
          className="hl-priv-nav"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 40px",
            height: 60,
            borderBottom: "2px solid var(--hl-border)",
            background: "var(--hl-bg)",
            position: "sticky",
            top: 0,
            zIndex: 100,
            transition: "background 0.2s",
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            {mounted && <Image src={logoSrc} alt="Huntlist" width={120} height={32} style={{ height: 32, width: "auto" }} />}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              href="/"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--hl-ink)",
                textDecoration: "none",
                border: "2px solid var(--hl-border)",
                borderRadius: 4,
                padding: "7px 14px",
                background: "var(--hl-card)",
                display: "inline-block",
                transition: "transform 0.12s ease, box-shadow 0.12s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "translate(-2px,-2px)";
                el.style.boxShadow = "2px 2px 0px var(--hl-border)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = "";
                el.style.boxShadow = "";
              }}
            >
              ← Back to Huntlist
            </Link>
          </div>
        </nav>

        {/* CONTENT */}
        <div className="hl-priv-cont" style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 110px" }}>
          <div
            className="hl-priv-doc"
            style={{
              border: "2px solid var(--hl-border)",
              borderRadius: 6,
              background: "var(--hl-card)",
              padding: "40px 40px 44px",
              transition: "background 0.2s",
            }}
          >
            {/* ── Privacy Policy ── */}
            <Eyebrow />
            <h1 className="hl-priv-h1" style={h1Style}>Privacy &amp; Cookie Policy</h1>
            <p style={updatedStyle}>Last updated: April 2025</p>

            <Section title="1. Who we are">
              <P>Huntlist is operated by an individual ("we", "us", "our") based in Italy. You can contact us at <A href="mailto:huntlisteu@gmail.com">huntlisteu@gmail.com</A>.</P>
              <P>This policy explains what personal data we collect when you visit huntlist.eu, how we use it, and your rights under the EU General Data Protection Regulation (GDPR).</P>
            </Section>

            <Section title="2. What data we collect">
              <P>When you sign up for our waiting list, we collect:</P>
              <ul style={ulStyle}>
                <Li><strong style={strongStyle}>Email address</strong> — to notify you when Huntlist launches.</Li>
                <Li><strong style={strongStyle}>Favourite TCG</strong> — to understand the community demand (Pokémon, One Piece, Yu-Gi-Oh!).</Li>
                <Li><strong style={strongStyle}>Country</strong> — to understand which markets to prioritise at launch.</Li>
              </ul>
              <P>We do not collect your name, phone number, payment details, or any sensitive personal data at this stage.</P>
            </Section>

            <Section title="3. How we use your data">
              <P>We use your data exclusively to:</P>
              <ul style={ulStyle}>
                <Li>Send you one email when Huntlist officially launches.</Li>
                <Li>Send occasional pre-launch updates about the project (no more than once a month).</Li>
                <Li>Understand the geographic and interest distribution of our early community.</Li>
              </ul>
              <P>We will never sell your data, share it with advertisers, or use it for any purpose beyond the above.</P>
            </Section>

            <Section title="4. Legal basis for processing">
              <P>We process your data on the basis of your explicit consent, given when you tick the consent checkbox and submit the waiting list form. You can withdraw your consent at any time by clicking the unsubscribe link in any email we send you, or by contacting us at <A href="mailto:huntlisteu@gmail.com">huntlisteu@gmail.com</A>.</P>
            </Section>

            <Section title="5. Third-party services">
              <P>We use the following third-party services that may process your data:</P>
              <ul style={ulStyle}>
                <Li><strong style={strongStyle}>Brevo (Sendinblue SAS)</strong> — email marketing platform that stores your waiting list data. Privacy policy: <A href="https://www.brevo.com/legal/privacypolicy/" target="_blank" rel="noopener noreferrer">brevo.com/legal/privacypolicy</A></Li>
                <Li><strong style={strongStyle}>Vercel Inc.</strong> — hosting provider for this website. May process technical data such as IP addresses. Privacy policy: <A href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">vercel.com/legal/privacy-policy</A></Li>
                <Li><strong style={strongStyle}>Cloudflare Inc.</strong> — CDN and security provider used by Vercel. May process IP addresses for performance and security purposes. Privacy policy: <A href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">cloudflare.com/privacypolicy</A></Li>
                <Li><strong style={strongStyle}>Google Fonts (Google LLC)</strong> — used to load fonts on this website. May transmit your IP address to Google servers. Privacy policy: <A href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">policies.google.com/privacy</A></Li>
              </ul>
            </Section>

            <Section title="6. Data retention">
              <P>We retain your data until you unsubscribe from our list, or until Huntlist launches and you have been notified. After launch, we will ask for your explicit consent before any further communication.</P>
            </Section>

            <Section title="7. Your rights">
              <P>Under the GDPR, you have the right to:</P>
              <ul style={ulStyle}>
                <Li>Access the personal data we hold about you.</Li>
                <Li>Request correction of inaccurate data.</Li>
                <Li>Request deletion of your data ("right to be forgotten").</Li>
                <Li>Withdraw consent at any time.</Li>
                <Li>Lodge a complaint with the Italian data protection authority (Garante per la protezione dei dati personali) at <A href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">garanteprivacy.it</A>.</Li>
              </ul>
              <P>To exercise any of these rights, contact us at <A href="mailto:huntlisteu@gmail.com">huntlisteu@gmail.com</A>. We will respond within 30 days.</P>
            </Section>

            <Section title="8. Data transfers outside the EU">
              <P>Some of our third-party providers (Vercel, Cloudflare, Google) are based in the United States. Data transfers are covered by Standard Contractual Clauses as required by EU law.</P>
            </Section>

            <hr style={{ border: "none", borderTop: "2px solid var(--hl-border)", margin: "44px 0" }} />

            {/* ── Cookie Policy ── */}
            <Eyebrow />
            <h1 className="hl-priv-h1" style={h1Style}>Cookie Policy</h1>
            <p style={updatedStyle}>Last updated: April 2025</p>

            <Section title="1. What are cookies">
              <P>Cookies are small text files stored on your device when you visit a website. We also use <strong style={strongStyle}>localStorage</strong>, a similar browser technology that stores data locally on your device without an expiry date unless cleared manually.</P>
            </Section>

            <Section title="2. Cookies we use">
              <div className="hl-priv-tw" style={{ border: "2px solid var(--hl-border)", borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                  <thead>
                    <tr>
                      {["Name", "Type", "Purpose", "Duration"].map((h, j) => (
                        <th key={h} style={{ textAlign: "left", padding: "11px 13px", background: "var(--hl-ink)", color: "var(--hl-bg)", fontFamily: "var(--font-sora), 'Sora', sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: 0.3, borderRight: j < 3 ? "2px solid var(--hl-bg)" : "none" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "hl-theme", type: "localStorage — Functional", purpose: "Remembers your dark/light mode preference", duration: "Until manually cleared" },
                      { name: "hl-ref", type: "localStorage — Functional", purpose: "Remembers which partner store referred you", duration: "Until manually cleared" },
                      { name: "hl-cookie-consent", type: "localStorage — Functional", purpose: "Remembers your cookie consent choice", duration: "Until manually cleared" },
                      { name: "Brevo session", type: "Third-party — Functional", purpose: "Required for the waiting list form to function", duration: "Session" },
                      { name: "Cloudflare __cf_bm", type: "Third-party — Functional", purpose: "Bot protection and security (set by Cloudflare via Vercel)", duration: "30 minutes" },
                    ].map((row, i) => (
                      <tr key={row.name}>
                        {[row.name, row.type, row.purpose, row.duration].map((cell, j) => (
                          <td key={j} style={{ padding: "11px 13px", borderTop: "2px solid var(--hl-border)", borderRight: j < 3 ? "1px solid var(--hl-border)" : "none", color: "var(--hl-ink-mid)", verticalAlign: "top", background: i % 2 === 1 ? "var(--hl-bg2)" : undefined }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <P>We do not use analytics cookies, advertising cookies, or any tracking technology beyond the above.</P>
            </Section>

            <Section title="3. Managing cookies">
              <P>You can manage or delete cookies and localStorage data through your browser settings. Note that disabling functional cookies may affect how the website works (e.g. your theme preference will not be saved).</P>
              <P>Most browsers allow you to:</P>
              <ul style={ulStyle}>
                <Li>View and delete cookies and localStorage data.</Li>
                <Li>Block cookies from specific sites.</Li>
                <Li>Block all third-party cookies.</Li>
              </ul>
            </Section>

            <Section title="4. Changes to this policy">
              <P>We may update this policy as Huntlist grows and new services are added. We will always update the "last updated" date at the top. For significant changes, we will notify waiting list subscribers by email.</P>
            </Section>

            <Section title="5. Contact">
              <P>For any questions about this policy, contact us at <A href="mailto:huntlisteu@gmail.com">huntlisteu@gmail.com</A>.</P>
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Shared style objects ──────────────────────────────────────────────────────

const h1Style: React.CSSProperties = {
  fontFamily: "var(--font-sora), 'Sora', sans-serif",
  fontSize: 38,
  fontWeight: 800,
  letterSpacing: -1.5,
  lineHeight: 1.05,
  marginBottom: 8,
  color: "var(--hl-ink)",
  fontVariantLigatures: "none",
};

const updatedStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--hl-ink-l)",
  marginBottom: 40,
};

const ulStyle: React.CSSProperties = { padding: 0, marginBottom: 14, listStyle: "none" };
const strongStyle: React.CSSProperties = { color: "var(--hl-ink)", fontWeight: 600 };

function Eyebrow() {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--font-sora), 'Sora', sans-serif",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: "var(--hl-green)",
        background: "var(--hl-gp)",
        border: "2px solid var(--hl-border)",
        borderRadius: 4,
        padding: "4px 10px",
        marginBottom: 18,
      }}
    >
      Legal
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h2 style={{ fontFamily: "var(--font-sora), 'Sora', sans-serif", fontSize: 21, fontWeight: 700, letterSpacing: -0.5, marginTop: 38, marginBottom: 12, color: "var(--hl-ink)" }}>
        {title}
      </h2>
      {children}
    </>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 15, color: "var(--hl-ink-mid)", marginBottom: 14 }}>{children}</p>;
}

function A({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) {
  return (
    <a href={href} style={{ color: "var(--hl-green)", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 2 }} {...rest}>
      {children}
    </a>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ fontSize: 15, color: "var(--hl-ink-mid)", marginBottom: 8, paddingLeft: 22, position: "relative", lineHeight: 1.55, listStyle: "none" }}>
      <span style={{ position: "absolute", left: 0, color: "var(--hl-orange)", fontWeight: 700 }}>→</span>
      {children}
    </li>
  );
}
