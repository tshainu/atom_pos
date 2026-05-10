import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useScrollAnimation, useCounter } from "../hooks/useScrollAnimation";
import {
  Layers,
  Thermometer,
  Scissors,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Menu,
  X,
  Star,
  Award,
  Users,
  Package,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  ArrowRight,
} from "lucide-react";

// ─── Navbar ─────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#services", label: "Services" },
    { href: "#process", label: "Process" },
    { href: "#products", label: "Products" },
    { href: "#about", label: "About" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: "all 0.3s",
        background: scrolled ? "rgba(10,14,26,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        padding: "0 5%",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <img src="/logo.png" alt="Pandora Garment" style={{ height: 44 }} />
        </a>

        {/* Desktop Links */}
        <div style={{ display: "flex", gap: 36, alignItems: "center" }} className="hidden-mobile">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="nav-link">{l.label}</a>
          ))}
          <a href="#contact">
            <button className="btn-red" style={{ padding: "10px 24px", fontSize: 12 }}>Get a Quote</button>
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "none" }}
          className="mobile-only"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          background: "rgba(10,14,26,0.99)",
          padding: "24px 5%",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          {links.map((l) => (
            <a key={l.href} href={l.href} className="nav-link" onClick={() => setMobileOpen(false)}
              style={{ display: "block", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {l.label}
            </a>
          ))}
          <a href="#contact" style={{ marginTop: 16, display: "block" }}>
            <button className="btn-red" style={{ width: "100%", marginTop: 16 }}>Get a Quote</button>
          </a>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #0A0E1A 0%, #0f1628 50%, #0A0E1A 100%)",
        paddingTop: 72,
      }}
    >
      {/* Background jersey image */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/jersey-hero.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center right",
        opacity: 0.12,
      }} />

      {/* Red diagonal accent */}
      <div style={{
        position: "absolute",
        top: 0, right: 0,
        width: "45%",
        height: "100%",
        background: "linear-gradient(135deg, transparent 0%, rgba(232,35,42,0.06) 100%)",
        clipPath: "polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)",
      }} />

      {/* Diagonal stripe pattern */}
      <div style={{
        position: "absolute",
        inset: 0,
        opacity: 0.4,
      }} className="diagonal-stripe" />

      {/* Red vertical line accent */}
      <div style={{
        position: "absolute",
        top: 0,
        right: "42%",
        width: 3,
        height: "100%",
        background: "linear-gradient(to bottom, transparent, #E8232A, transparent)",
        opacity: 0.6,
      }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 5%", position: "relative", zIndex: 2, width: "100%" }}>
        <div style={{ maxWidth: 680 }}>
          {/* Tag */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(232,35,42,0.15)",
            border: "1px solid rgba(232,35,42,0.3)",
            padding: "6px 16px",
            marginBottom: 28,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#E8232A" }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#E8232A" }}>
              Premium Sports Apparel Manufacturer
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(56px, 9vw, 120px)",
            lineHeight: 0.95,
            color: "white",
            marginBottom: 8,
          }}>
            CRAFT YOUR
          </h1>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(56px, 9vw, 120px)",
            lineHeight: 0.95,
            color: "#E8232A",
            marginBottom: 8,
          }}>
            WINNING
          </h1>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(56px, 9vw, 120px)",
            lineHeight: 0.95,
            color: "white",
            marginBottom: 28,
          }}>
            JERSEY
          </h1>

          <p style={{ fontSize: 16, lineHeight: 1.8, color: "#9CA3AF", marginBottom: 44, maxWidth: 520 }}>
            From sublimation printing to precision stitching — Pandora Garment delivers championship-grade sports jerseys for teams, clubs, and brands worldwide.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a href="#contact"><button className="btn-red" style={{ fontSize: 13 }}>Order Now <ArrowRight size={14} style={{ display: "inline", marginLeft: 8 }} /></button></a>
            <a href="#products"><button className="btn-outline" style={{ fontSize: 13 }}>View Products</button></a>
          </div>

          {/* Quick stats row */}
          <div style={{
            display: "flex", gap: 40, marginTop: 60, flexWrap: "wrap",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 32,
          }}>
            {[
              { val: "500+", label: "Clients Served" },
              { val: "50K+", label: "Jerseys Made" },
              { val: "10+", label: "Years Experience" },
              { val: "15+", label: "Countries Exported" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "#E8232A" }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: 0.5,
      }}>
        <div style={{ width: 1, height: 40, background: "white", animation: "pulse 2s infinite" }} />
        <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "white" }}>Scroll</span>
      </div>
    </section>
  );
}

// ─── Services ────────────────────────────────────────────────────────────────
function Services() {
  const ref = useScrollAnimation();
  const services = [
    {
      icon: <Layers size={32} />,
      number: "01",
      title: "Sublimation Printing",
      desc: "Full-color all-over printing that becomes part of the fabric. Vivid, permanent, and never cracks or fades — perfect for complex designs and gradients.",
      features: ["All-over printing", "Unlimited colors", "No cracking or fading", "Lightweight feel"],
    },
    {
      icon: <Thermometer size={32} />,
      number: "02",
      title: "Heat Press Transfer",
      desc: "Precision heat transfer for logos, numbers, and names. Sharp, durable results on all fabric types with consistent quality across bulk orders.",
      features: ["Logo application", "Name & number sets", "Multi-color transfers", "Fast turnaround"],
    },
    {
      icon: <Scissors size={32} />,
      number: "03",
      title: "Cutting & Stitching",
      desc: "Pattern-precise cutting and expert stitching for jerseys that fit perfectly. Custom sizing, reinforced seams, and athletic cuts for peak performance.",
      features: ["Custom patterns", "Reinforced seams", "Athletic fit", "All sport types"],
    },
  ];

  return (
    <section id="services" ref={ref} style={{
      background: "var(--bg-secondary)",
      padding: "100px 5%",
      position: "relative",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Section header */}
        <div className="animate-fade-up" style={{ marginBottom: 60 }}>
          <div className="red-line" />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8232A" }}>
            What We Do
          </span>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(40px, 5vw, 72px)", color: "white", marginTop: 8 }}>
            OUR SERVICES
          </h2>
          <p style={{ color: "#9CA3AF", maxWidth: 520, fontSize: 15, lineHeight: 1.7, marginTop: 12 }}>
            End-to-end sports jersey manufacturing under one roof. We handle everything from design to delivery.
          </p>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {services.map((s, i) => (
            <div
              key={s.title}
              className={`animate-fade-up delay-${i + 1} card-glow`}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                padding: "40px 36px",
                position: "relative",
                overflow: "hidden",
                transition: "border-color 0.3s, box-shadow 0.3s, transform 0.3s",
                cursor: "default",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-6px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
            >
              {/* Big background number */}
              <div style={{
                position: "absolute", top: -10, right: 20,
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 100, color: "rgba(232,35,42,0.06)",
                lineHeight: 1, userSelect: "none",
              }}>{s.number}</div>

              {/* Red top accent line */}
              <div style={{ width: 48, height: 3, background: "#E8232A", marginBottom: 28 }} />

              <div style={{ color: "#E8232A", marginBottom: 20 }}>{s.icon}</div>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "white", marginBottom: 16, letterSpacing: "0.02em" }}>
                {s.title}
              </h3>
              <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>{s.desc}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {s.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle size={14} color="#E8232A" />
                    <span style={{ fontSize: 13, color: "#9CA3AF" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ────────────────────────────────────────────────────────────
function Process() {
  const ref = useScrollAnimation();
  const steps = [
    { num: "01", title: "Submit Your Design", desc: "Share your design files, team colors, and jersey specifications. Our team reviews and confirms feasibility within 24 hours." },
    { num: "02", title: "Sample & Approval", desc: "We produce a sample jersey for your approval. Review fit, colors, and print quality before we move to bulk production." },
    { num: "03", title: "Production", desc: "Full production begins with cutting, sublimation or heat press, and expert stitching — all quality-checked at every stage." },
    { num: "04", title: "Delivery", desc: "Jerseys are packaged, labeled, and shipped to your location. Bulk orders dispatched on schedule, every time." },
  ];

  return (
    <section id="process" ref={ref} style={{
      background: "var(--bg-primary)",
      padding: "100px 5%",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background factory image */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/factory.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.04,
      }} />

      <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div className="animate-fade-up" style={{ marginBottom: 60, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div className="red-line" />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8232A" }}>
            How It Works
          </span>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(40px, 5vw, 72px)", color: "white", marginTop: 8 }}>
            FROM CONCEPT TO COURT
          </h2>
        </div>

        {/* Steps */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 0, position: "relative" }}>
          {/* Connector line */}
          <div style={{
            position: "absolute", top: 40, left: "12%", right: "12%", height: 2,
            background: "linear-gradient(to right, #E8232A, rgba(232,35,42,0.2))",
            display: "none",
          }} className="connector-line" />

          {steps.map((step, i) => (
            <div key={step.num} className={`animate-fade-up delay-${i + 1}`} style={{
              padding: "40px 28px",
              position: "relative",
              borderTop: "3px solid transparent",
              transition: "border-color 0.3s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderTopColor = "#E8232A")}
              onMouseLeave={e => (e.currentTarget.style.borderTopColor = "transparent")}
            >
              <div style={{
                width: 64, height: 64,
                border: "2px solid rgba(232,35,42,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 24,
                background: "rgba(232,35,42,0.08)",
              }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#E8232A" }}>{step.num}</span>
              </div>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: "white", marginBottom: 12, letterSpacing: "0.02em" }}>
                {step.title}
              </h3>
              <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.8 }}>{step.desc}</p>

              {i < steps.length - 1 && (
                <div style={{
                  position: "absolute", right: -12, top: 52,
                  color: "rgba(232,35,42,0.4)", zIndex: 2,
                }}>
                  <ChevronRight size={24} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Products / Sports ───────────────────────────────────────────────────────
function Products() {
  const ref = useScrollAnimation();
  const sports = [
    { name: "Football", emoji: "⚽", desc: "Lightweight, breathable jerseys with team crests and player numbers." },
    { name: "Cricket", emoji: "🏏", desc: "Traditional whites and colored kits for T20, ODI, and Test formats." },
    { name: "Basketball", emoji: "🏀", desc: "Performance mesh jerseys with bold graphics and team branding." },
    { name: "Volleyball", emoji: "🏐", desc: "Stretchy, form-fitting jerseys designed for agility and comfort." },
    { name: "Rugby", emoji: "🏉", desc: "Heavy-duty construction with reinforced seams for contact sport demands." },
    { name: "Cycling", emoji: "🚴", desc: "Aerodynamic sublimation kits with moisture-wicking fabric." },
  ];

  return (
    <section id="products" ref={ref} style={{
      background: "var(--bg-secondary)",
      padding: "100px 5%",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div className="animate-fade-up" style={{ marginBottom: 60 }}>
          <div className="red-line" />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8232A" }}>
            Sports We Cover
          </span>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(40px, 5vw, 72px)", color: "white", marginTop: 8 }}>
            BUILT FOR EVERY SPORT
          </h2>
          <p style={{ color: "#9CA3AF", maxWidth: 520, fontSize: 15, lineHeight: 1.7, marginTop: 12 }}>
            From football to cycling — we manufacture precision jerseys for all major sports.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {sports.map((sport, i) => (
            <div key={sport.name}
              className={`animate-fade-up delay-${(i % 3) + 1} card-glow`}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                padding: "32px 28px",
                display: "flex", gap: 20, alignItems: "flex-start",
                transition: "border-color 0.3s, box-shadow 0.3s, transform 0.3s",
                cursor: "default",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div style={{
                width: 56, height: 56, minWidth: 56,
                background: "rgba(232,35,42,0.1)",
                border: "1px solid rgba(232,35,42,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
              }}>
                {sport.emoji}
              </div>
              <div>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "white", marginBottom: 8, letterSpacing: "0.02em" }}>
                  {sport.name}
                </h3>
                <p style={{ color: "#9CA3AF", fontSize: 13, lineHeight: 1.7 }}>{sport.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stats ───────────────────────────────────────────────────────────────────
function Stats() {
  const c1 = useCounter(500);
  const c2 = useCounter(50000);
  const c3 = useCounter(10);
  const c4 = useCounter(15);

  const stats = [
    { ref: c1, suffix: "+", label: "Happy Clients", icon: <Users size={24} /> },
    { ref: c2, suffix: "+", label: "Jerseys Produced", icon: <Package size={24} /> },
    { ref: c3, suffix: "+", label: "Years Experience", icon: <Award size={24} /> },
    { ref: c4, suffix: "+", label: "Countries Served", icon: <Globe size={24} /> },
  ];

  return (
    <section id="about" style={{
      background: "#E8232A",
      padding: "80px 5%",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/factory2.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.1,
        mixBlendMode: "multiply",
      }} />
      <div style={{
        position: "absolute", inset: 0,
      }} className="diagonal-stripe" />

      <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, textAlign: "center" }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, opacity: 0.8 }}>
                {s.icon}
              </div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(48px, 6vw, 72px)", color: "white", lineHeight: 1 }}>
                <span ref={s.ref}>0</span>{s.suffix}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Why Choose Us ───────────────────────────────────────────────────────────
function WhyUs() {
  const ref = useScrollAnimation();
  const points = [
    { icon: <Star size={20} />, title: "Premium Quality", desc: "Every jersey undergoes strict quality control before shipping." },
    { icon: <Package size={20} />, title: "Bulk Orders Welcome", desc: "Competitive pricing for teams, clubs, and wholesale buyers." },
    { icon: <CheckCircle size={20} />, title: "Custom Everything", desc: "Your logo, your colors, your design — we bring your vision to life." },
    { icon: <Globe size={20} />, title: "Worldwide Shipping", desc: "We export to 15+ countries with reliable logistics partners." },
    { icon: <Award size={20} />, title: "Fast Turnaround", desc: "Sample in 5 days. Bulk production completed within 3 weeks." },
    { icon: <Users size={20} />, title: "Dedicated Support", desc: "Personal account manager for every order from start to delivery." },
  ];

  return (
    <section style={{
      background: "var(--bg-primary)",
      padding: "100px 5%",
    }} ref={ref}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          {/* Left: Text */}
          <div>
            <div className="animate-fade-up">
              <div className="red-line" />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8232A" }}>
                Why Pandora
              </span>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(40px, 5vw, 72px)", color: "white", marginTop: 8, lineHeight: 1 }}>
                THE PANDORA<br />DIFFERENCE
              </h2>
              <p style={{ color: "#9CA3AF", fontSize: 15, lineHeight: 1.8, marginTop: 20, maxWidth: 460 }}>
                With over a decade in sports apparel manufacturing, Pandora Garment has earned the trust of teams, brands, and distributors across the globe. Our factory combines modern sublimation technology with traditional craftsmanship.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 44 }}>
              {points.map((p, i) => (
                <div key={p.title} className={`animate-fade-up delay-${(i % 3) + 1}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ color: "#E8232A" }}>{p.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "white" }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Image */}
          <div className="animate-fade-up delay-2" style={{ position: "relative" }}>
            <div style={{
              position: "absolute", top: -20, left: -20, right: 20, bottom: 20,
              border: "2px solid rgba(232,35,42,0.2)",
              zIndex: 0,
            }} />
            <img
              src="/factory2.jpg"
              alt="Pandora Garment Factory"
              style={{
                width: "100%",
                height: 480,
                objectFit: "cover",
                position: "relative",
                zIndex: 1,
              }}
            />
            {/* Badge overlay */}
            <div style={{
              position: "absolute", bottom: -20, right: -20,
              background: "#E8232A",
              padding: "20px 24px",
              zIndex: 2,
              textAlign: "center",
            }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: "white", lineHeight: 1 }}>10+</div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>Years of Excellence</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Quote Form ──────────────────────────────────────────────────────────────
function QuoteSection() {
  const ref = useScrollAnimation();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", sport: "", quantity: "", service: "", message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.quotes.$post({ json: data });
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <section id="contact" ref={ref} style={{
      background: "var(--bg-secondary)",
      padding: "100px 5%",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
          {/* Left: Info */}
          <div>
            <div className="animate-fade-up">
              <div className="red-line" />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8232A" }}>
                Get in Touch
              </span>
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(40px, 5vw, 72px)", color: "white", marginTop: 8, lineHeight: 1 }}>
                REQUEST A<br />FREE QUOTE
              </h2>
              <p style={{ color: "#9CA3AF", fontSize: 15, lineHeight: 1.8, marginTop: 20 }}>
                Tell us about your project and we'll get back to you within 24 hours with pricing and lead times.
              </p>
            </div>

            <div className="animate-fade-up delay-2" style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 28 }}>
              {[
                { icon: <Phone size={18} />, label: "Phone", val: "+94 77 XXX XXXX" },
                { icon: <Mail size={18} />, label: "Email", val: "info@pandoragarment.com" },
                { icon: <MapPin size={18} />, label: "Location", val: "Sri Lanka" },
              ].map((c) => (
                <div key={c.label} style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{
                    width: 44, height: 44, minWidth: 44,
                    background: "rgba(232,35,42,0.1)",
                    border: "1px solid rgba(232,35,42,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#E8232A",
                  }}>{c.icon}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", marginBottom: 2 }}>{c.label}</div>
                    <div style={{ fontSize: 15, color: "white" }}>{c.val}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Social */}
            <div className="animate-fade-up delay-3" style={{ marginTop: 40, display: "flex", gap: 12 }}>
              {[Instagram, Facebook, Twitter].map((Icon, i) => (
                <div key={i} style={{
                  width: 40, height: 40,
                  border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "border-color 0.2s",
                  color: "#9CA3AF",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "#E8232A";
                    (e.currentTarget as HTMLDivElement).style.color = "#E8232A";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLDivElement).style.color = "#9CA3AF";
                  }}
                >
                  <Icon size={16} />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div className="animate-fade-up delay-2">
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              padding: "40px 36px",
            }}>
              {submitted ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <CheckCircle size={48} color="#E8232A" style={{ margin: "0 auto 16px" }} />
                  <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: "white", marginBottom: 12 }}>
                    QUOTE REQUESTED!
                  </h3>
                  <p style={{ color: "#9CA3AF", fontSize: 14 }}>
                    Thanks {form.name}! We'll get back to you within 24 hours.
                  </p>
                  <button className="btn-red" style={{ marginTop: 24 }} onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", sport: "", quantity: "", service: "", message: "" }); }}>
                    New Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label>Full Name</label>
                      <input required placeholder="John Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label>Email</label>
                      <input required type="email" placeholder="john@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label>Phone</label>
                      <input required placeholder="+94 77 XXX XXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div>
                      <label>Sport Type</label>
                      <select required value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}>
                        <option value="">Select sport...</option>
                        <option>Football</option>
                        <option>Cricket</option>
                        <option>Basketball</option>
                        <option>Volleyball</option>
                        <option>Rugby</option>
                        <option>Cycling</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label>Quantity</label>
                      <select required value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}>
                        <option value="">Select quantity...</option>
                        <option>1–10 pcs</option>
                        <option>11–50 pcs</option>
                        <option>51–100 pcs</option>
                        <option>101–500 pcs</option>
                        <option>500+ pcs</option>
                      </select>
                    </div>
                    <div>
                      <label>Service Needed</label>
                      <select required value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}>
                        <option value="">Select service...</option>
                        <option>Sublimation Printing</option>
                        <option>Heat Press</option>
                        <option>Cutting & Stitching</option>
                        <option>Full Package</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label>Additional Details</label>
                    <textarea placeholder="Describe your requirements, colors, timeline, etc." rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} style={{ resize: "vertical" }} />
                  </div>

                  <button type="submit" className="btn-red" disabled={mutation.isPending} style={{ width: "100%", padding: "16px 24px", fontSize: 14, opacity: mutation.isPending ? 0.7 : 1 }}>
                    {mutation.isPending ? "Sending..." : "Submit Quote Request →"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      background: "#060912",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      padding: "60px 5% 32px",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 60, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <img src="/logo.png" alt="Pandora Garment" style={{ height: 48, marginBottom: 20 }} />
            <p style={{ color: "#6B7280", fontSize: 13, lineHeight: 1.8, maxWidth: 280 }}>
              Premium sports jersey manufacturer specializing in sublimation printing, heat press, cutting and stitching for teams worldwide.
            </p>
          </div>

          {[
            {
              title: "Services", links: ["Sublimation Printing", "Heat Press", "Cutting & Stitching", "Custom Design"]
            },
            {
              title: "Sports", links: ["Football", "Cricket", "Basketball", "Volleyball", "Rugby", "Cycling"]
            },
            {
              title: "Company", links: ["About Us", "Our Process", "Quality Control", "Contact Us"]
            },
          ].map((col) => (
            <div key={col.title}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "white", marginBottom: 20, letterSpacing: "0.05em" }}>
                {col.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map((l) => (
                  <a key={l} href="#" style={{ color: "#6B7280", fontSize: 13, textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = "#E8232A")}
                    onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = "#6B7280")}
                  >{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ color: "#6B7280", fontSize: 12 }}>
            © {new Date().getFullYear()} Pandora Garment. All rights reserved.
          </span>
          <span style={{ color: "#6B7280", fontSize: 12 }}>
            Made with ❤️ in Sri Lanka
          </span>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function IndexPage() {
  return (
    <div>
      <Navbar />
      <Hero />
      <Services />
      <Process />
      <Products />
      <Stats />
      <WhyUs />
      <QuoteSection />
      <Footer />

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .mobile-only { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
        @media (max-width: 900px) {
          section > div > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          section > div > div[style*="grid-template-columns: 2fr 1fr 1fr 1fr"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
