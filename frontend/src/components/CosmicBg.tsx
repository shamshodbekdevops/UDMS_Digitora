import { useEffect, useRef } from "react";

// Generate star field via CSS box-shadow (one 1px element → N "copies")
function genStars(n: number, maxSize: number): string {
  return Array.from({ length: n }, () => {
    const x = ((Math.random() * 1920) | 0) + "px";
    const y = ((Math.random() * 1080) | 0) + "px";
    const s = (Math.random() * maxSize).toFixed(1) + "px";
    const a = (0.3 + Math.random() * 0.7).toFixed(2);
    return `${x} ${y} 0 ${s} rgba(255,255,255,${a})`;
  }).join(",");
}

// Module-level constants — generated once, stable across renders
const STARS_SM = genStars(500, 0.8);
const STARS_MD = genStars(150, 1.4);
const STARS_LG = genStars(60, 2.0);

export function CosmicBg() {
  const starsRef = useRef<HTMLDivElement>(null);

  // Mouse parallax — only in dark mode (CSS hides light layer anyway)
  useEffect(() => {
    let rafId = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth  - 0.5) * -18;
      ty = (e.clientY / window.innerHeight - 0.5) * -12;
    };
    const tick = () => {
      cx += (tx - cx) * 0.04;
      cy += (ty - cy) * 0.04;
      if (starsRef.current) {
        starsRef.current.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
      }
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>

      {/* ── DARK: Galaktika ── */}
      <div className="cosmic-dark absolute inset-0" style={{ background: "#05060F" }}>
        {/* Nebula 1 — binafsha */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 18% 5%, #1B1542 0%, transparent 55%)",
            animation: "nebula-drift-1 65s ease-in-out infinite alternate",
          }}
        />
        {/* Nebula 2 — ko'k */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 82% 95%, #0E2A4A 0%, transparent 55%)",
            animation: "nebula-drift-2 85s ease-in-out infinite alternate",
          }}
        />
        {/* Yulduzlar qatlami — parallaks bilan */}
        <div ref={starsRef} className="absolute inset-0" style={{ willChange: "transform" }}>
          <div
            className="absolute"
            style={{
              top: 0, left: 0,
              width: 1, height: 1,
              borderRadius: "50%",
              background: "transparent",
              boxShadow: STARS_SM,
              animation: "twinkle-slow 5s ease-in-out infinite alternate",
            }}
          />
          <div
            className="absolute"
            style={{
              top: 0, left: 0,
              width: 1, height: 1,
              borderRadius: "50%",
              background: "white",
              boxShadow: STARS_MD,
              animation: "twinkle-fast 3s ease-in-out infinite alternate",
            }}
          />
          <div
            className="absolute"
            style={{
              top: 0, left: 0,
              width: 1, height: 1,
              borderRadius: "50%",
              background: "white",
              boxShadow: STARS_LG,
            }}
          />
        </div>
      </div>

      {/* ── LIGHT: Atmosfera ── */}
      <div
        className="cosmic-light absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #EAF4FF 0%, #F7FBFF 60%, #FFFFFF 100%)",
        }}
      />
    </div>
  );
}
