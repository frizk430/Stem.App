import React, { useState } from "react";
import {
  Warehouse, Boxes, Package, Smartphone, Users, BarChart3,
  Mail, Phone, Building2, Send, CheckCircle2, Sprout, ArrowRight
} from "lucide-react";
import { LOGO_DATA_URI } from "./App.jsx";
import { supabase } from "./supabaseClient.js";

const FEATURES = [
  { icon: Warehouse, title: "Room Management", body: "Create and organize cultivation rooms, monitor their status, and keep important information accessible to your entire team." },
  { icon: Boxes, title: "Inventory Tracking", body: "View and organize inventory across your cultivation operation with a simple, centralized dashboard." },
  { icon: Package, title: "Batch & Package Management", body: "Track packages and inventory movements throughout your facility while maintaining an organized record of your operation." },
  { icon: Smartphone, title: "Mobile Friendly", body: "Built mobile-first so your team can complete daily tasks directly from the grow instead of returning to a computer." },
  { icon: Users, title: "Team Collaboration", body: "Keep everyone working from the same information with shared access and real-time updates." },
  { icon: BarChart3, title: "Dashboards & Reporting", body: "Quickly view operational data and generate reports that help you stay organized and make better decisions." },
];

const CUSTOM_EXAMPLES = [
  "Custom inventory systems", "Cultivation dashboards", "Distribution management tools", "Employee task tracking",
  "Internal reporting", "Mobile data collection", "Compliance workflows", "Facility-specific operational tools",
];

const LICENSE_TYPES = ["Cultivation", "Distribution", "Manufacturing", "Retail", "Microbusiness", "Other"];

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ContactForm() {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", license_type: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [error, setError] = useState("");

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setError("");
    setStatus("sending");
    try {
      const { error: dbError } = await supabase.from("contact_submissions").insert({
        name: form.name.trim(), company: form.company.trim(), email: form.email.trim(),
        phone: form.phone.trim(), license_type: form.license_type, message: form.message.trim(),
        status: "new",
      });
      if (dbError) throw dbError;

      // Optional email notification — only fires if EmailJS is configured via env vars.
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      if (serviceId && templateId && publicKey) {
        try {
          const emailjs = await import("@emailjs/browser");
          await emailjs.default.send(serviceId, templateId, {
            name: form.name.trim(), company: form.company.trim(), email: form.email.trim(),
            phone: form.phone.trim(), license_type: form.license_type, message: form.message.trim(),
          }, { publicKey });
        } catch (emailErr) {
          // Don't fail the whole submission just because the email notification didn't go out —
          // the lead is already safely saved in Supabase either way.
          console.warn("Email notification failed (submission was still saved):", emailErr);
        }
      }
      setStatus("done");
      setForm({ name: "", company: "", email: "", phone: "", license_type: "", message: "" });
    } catch (err) {
      console.error(err);
      setError("Something went wrong submitting the form. Please try again, or email us directly.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div style={mstyles.formDoneBox}>
        <CheckCircle2 size={32} color="#8FAF8B" />
        <div style={mstyles.formDoneTitle}>Thanks — we got it.</div>
        <div style={mstyles.formDoneBody}>We'll be in touch soon.</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={mstyles.form}>
      <div style={mstyles.formRow}>
        <div style={mstyles.formField}>
          <label style={mstyles.label}>Name</label>
          <input style={mstyles.input} value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div style={mstyles.formField}>
          <label style={mstyles.label}>Company</label>
          <input style={mstyles.input} value={form.company} onChange={(e) => set("company", e.target.value)} />
        </div>
      </div>
      <div style={mstyles.formRow}>
        <div style={mstyles.formField}>
          <label style={mstyles.label}>Email</label>
          <input style={mstyles.input} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
        </div>
        <div style={mstyles.formField}>
          <label style={mstyles.label}>Phone</label>
          <input style={mstyles.input} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
      </div>
      <div style={mstyles.formField}>
        <label style={mstyles.label}>License Type</label>
        <select style={mstyles.input} value={form.license_type} onChange={(e) => set("license_type", e.target.value)}>
          <option value="">Select one…</option>
          {LICENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={mstyles.formField}>
        <label style={mstyles.label}>Tell us about your project</label>
        <textarea style={{ ...mstyles.input, minHeight: 120, resize: "vertical" }} value={form.message} onChange={(e) => set("message", e.target.value)} />
      </div>
      {error && <div style={mstyles.formError}>{error}</div>}
      <button type="submit" style={mstyles.submitBtn} disabled={status === "sending"}>
        <Send size={16} /> {status === "sending" ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}

export default function Marketing() {
  return (
    <div style={mstyles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        html { scroll-behavior: smooth; }
        .m-nav-links { display: flex; gap: 28px; }
        .m-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .m-solutions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
        .m-hero-buttons { display: flex; gap: 16px; flex-wrap: wrap; }
        .m-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 860px) {
          .m-nav-links { display: none; }
          .m-features-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 560px) {
          .m-features-grid { grid-template-columns: 1fr; }
          .m-solutions-grid { grid-template-columns: 1fr; }
          .m-form-row { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* NAV */}
      <header style={mstyles.nav}>
        <div style={mstyles.navInner}>
          <div style={mstyles.navBrand} onClick={() => scrollToId("top")}>
            <img src={LOGO_DATA_URI} alt="Stem" style={mstyles.navLogo} />
            <span style={mstyles.navWordmark}>STEM</span>
          </div>
          <nav className="m-nav-links">
            <a href="#top" style={mstyles.navLink}>Home</a>
            <a href="#features" style={mstyles.navLink}>Features</a>
            <a href="#custom-solutions" style={mstyles.navLink}>Custom Solutions</a>
            <a href="#contact" style={mstyles.navLink}>Contact</a>
          </nav>
          <a href="/app" style={mstyles.loginBtn}>Log In</a>
        </div>
      </header>

      {/* HERO */}
      <section id="top" style={mstyles.hero}>
        <div style={mstyles.heroInner}>
          <div style={mstyles.heroBadge}><Sprout size={14} /> Built for licensed cannabis operators</div>
          <h1 style={mstyles.heroTitle}>Cultivation. Simplified.</h1>
          <p style={mstyles.heroBody}>
            Stem is a modern cultivation management platform built specifically for licensed cannabis operators.
            Manage your cultivation from your phone, tablet, or desktop with a clean, intuitive interface designed
            around real-world workflows.
          </p>
          <p style={mstyles.heroSub}>Spend less time on paperwork and spreadsheets—and more time growing.</p>
          <div className="m-hero-buttons">
            <button style={mstyles.primaryBtn} onClick={() => scrollToId("contact")}>Request a Demo <ArrowRight size={16} /></button>
            <a href="/app" style={mstyles.secondaryBtn}>Log In</a>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={mstyles.section}>
        <div style={mstyles.sectionInner}>
          <h2 style={mstyles.sectionTitle}>Everything in One Place</h2>
          <p style={mstyles.sectionSub}>
            Stem helps organize your cultivation operation with easy-to-use tools that keep your team aligned and your facility running efficiently.
          </p>
          <div className="m-features-grid" style={{ marginTop: 40 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={mstyles.featureCard}>
                <div style={mstyles.featureIcon}><f.icon size={22} color="#C9A24B" /></div>
                <div style={mstyles.featureTitle}>{f.title}</div>
                <div style={mstyles.featureBody}>{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT BY OPERATORS */}
      <section style={{ ...mstyles.section, background: "#161B10" }}>
        <div style={{ ...mstyles.sectionInner, maxWidth: 760, textAlign: "center" }}>
          <h2 style={mstyles.sectionTitle}>Built by Cannabis Operators</h2>
          <p style={{ ...mstyles.sectionSub, marginTop: 20 }}>
            Stem wasn't built by software developers trying to understand cannabis.
          </p>
          <p style={{ ...mstyles.sectionSub, marginTop: 14 }}>
            It was built from years of hands-on experience managing cultivation, retail, inventory, compliance,
            and day-to-day cannabis operations. Every feature is designed to solve real problems operators face every day.
          </p>
        </div>
      </section>

      {/* CUSTOM SOLUTIONS */}
      <section id="custom-solutions" style={mstyles.section}>
        <div style={mstyles.sectionInner}>
          <h2 style={mstyles.sectionTitle}>Need a Custom Solution?</h2>
          <p style={mstyles.sectionSub}>Every cultivation and distribution business operates differently.</p>
          <p style={{ ...mstyles.sectionSub, marginTop: 10 }}>
            If your facility needs something beyond the standard Stem platform, we can build custom tools tailored to your workflow.
          </p>
          <div style={mstyles.examplesLabel}>Examples include:</div>
          <div className="m-solutions-grid">
            {CUSTOM_EXAMPLES.map((ex) => (
              <div key={ex} style={mstyles.exampleItem}><CheckCircle2 size={15} color="#8FAF8B" /> {ex}</div>
            ))}
          </div>
          <button style={{ ...mstyles.primaryBtn, marginTop: 32 }} onClick={() => scrollToId("contact")}>
            Build a Custom System <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ ...mstyles.section, background: "#161B10" }}>
        <div style={{ ...mstyles.sectionInner, maxWidth: 640 }}>
          <h2 style={mstyles.sectionTitle}>Let's Build Something Together</h2>
          <p style={mstyles.sectionSub}>
            Interested in Stem or need a custom solution for your cultivation or distribution business?
            Fill out the form below and we'll get in touch.
          </p>
          <div style={{ marginTop: 32 }}>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* WHAT'S NEXT */}
      <section style={mstyles.section}>
        <div style={{ ...mstyles.sectionInner, maxWidth: 700, textAlign: "center" }}>
          <h2 style={mstyles.sectionTitle}>What's Next</h2>
          <p style={{ ...mstyles.sectionSub, marginTop: 20 }}>
            Stem is actively expanding with new features based on feedback from real operators. Our roadmap includes
            additional cultivation tools, enhanced reporting, and deeper workflow automation to help cannabis
            businesses operate even more efficiently.
          </p>
        </div>
      </section>

      <footer style={mstyles.footer}>
        <img src={LOGO_DATA_URI} alt="Stem" style={{ width: 24, height: 24, opacity: 0.6 }} />
        <span>© {new Date().getFullYear()} Stem. All rights reserved.</span>
      </footer>
    </div>
  );
}

const mstyles = {
  page: { background: "#12160F", color: "#D8D3C2", fontFamily: "'Inter', sans-serif", minHeight: "100vh" },
  nav: { position: "sticky", top: 0, zIndex: 50, background: "rgba(18,22,15,0.92)", backdropFilter: "blur(8px)", borderBottom: "1px solid #2A3324" },
  navInner: { maxWidth: 1100, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 },
  navBrand: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  navLogo: { width: 28, height: 28 },
  navWordmark: { fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, letterSpacing: "0.08em", color: "#EDE8D8" },
  navLink: { color: "#B9BFA9", textDecoration: "none", fontSize: 14.5, fontWeight: 500 },
  loginBtn: { color: "#12160F", background: "#C9A24B", textDecoration: "none", fontSize: 14, fontWeight: 700, padding: "9px 20px", borderRadius: 7, whiteSpace: "nowrap" },
  hero: { padding: "90px 24px 80px", textAlign: "center" },
  heroInner: { maxWidth: 760, margin: "0 auto" },
  heroBadge: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#8FAF8B", background: "rgba(143,175,139,0.12)", padding: "6px 14px", borderRadius: 20, marginBottom: 24, fontWeight: 600 },
  heroTitle: { fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: "clamp(36px, 6vw, 58px)", color: "#EDE8D8", margin: "0 0 24px", lineHeight: 1.1 },
  heroBody: { fontSize: 17, lineHeight: 1.7, color: "#B9BFA9", margin: "0 0 18px" },
  heroSub: { fontSize: 15, color: "#8C9483", fontStyle: "italic", margin: "0 0 36px" },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 8, background: "#C9A24B", color: "#12160F", border: "none", fontWeight: 700, fontSize: 15, padding: "14px 26px", borderRadius: 8, cursor: "pointer" },
  secondaryBtn: { display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "#EDE8D8", border: "1px solid #3A4232", textDecoration: "none", fontWeight: 600, fontSize: 15, padding: "13px 26px", borderRadius: 8 },
  section: { padding: "80px 24px" },
  sectionInner: { maxWidth: 1100, margin: "0 auto" },
  sectionTitle: { fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: "clamp(26px, 4vw, 36px)", color: "#EDE8D8", margin: "0 0 14px", textAlign: "center" },
  sectionSub: { fontSize: 16, lineHeight: 1.7, color: "#B9BFA9", textAlign: "center", margin: 0 },
  featureCard: { background: "#171D12", border: "1px solid #2A3324", borderRadius: 12, padding: "26px 24px" },
  featureIcon: { width: 44, height: 44, borderRadius: 10, background: "rgba(201,162,75,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  featureTitle: { fontSize: 17, fontWeight: 700, color: "#EDE8D8", marginBottom: 8 },
  featureBody: { fontSize: 14.5, lineHeight: 1.6, color: "#8C9483" },
  examplesLabel: { fontSize: 14, fontWeight: 700, color: "#EDE8D8", marginTop: 36, marginBottom: 16, textAlign: "center" },
  exampleItem: { display: "flex", alignItems: "center", gap: 10, fontSize: 15, color: "#D8D3C2", padding: "6px 0" },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  formRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  formField: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12.5, color: "#8C9483", fontWeight: 600 },
  input: { background: "#1A2015", border: "1px solid #2A3324", borderRadius: 8, padding: "12px 14px", color: "#EDE8D8", fontSize: 15, fontFamily: "'Inter', sans-serif" },
  submitBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#C9A24B", color: "#12160F", border: "none", fontWeight: 700, fontSize: 15, padding: "14px 26px", borderRadius: 8, cursor: "pointer", marginTop: 6 },
  formError: { color: "#C9855F", fontSize: 13.5 },
  formDoneBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "40px 20px", background: "#1A2015", border: "1px solid #2A3324", borderRadius: 12, textAlign: "center" },
  formDoneTitle: { fontSize: 19, fontWeight: 700, color: "#EDE8D8" },
  formDoneBody: { fontSize: 14.5, color: "#8C9483" },
  footer: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "32px 24px", borderTop: "1px solid #2A3324", fontSize: 13, color: "#6B7264" },
};
