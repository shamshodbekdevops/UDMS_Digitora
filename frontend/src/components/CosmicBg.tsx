import { useEffect, useRef } from "react";

function genStars(n: number, maxPx: number): string {
  return Array.from({ length: n }, () => {
    const x = ((Math.random() * 1920) | 0) + "px";
    const y = ((Math.random() * 1080) | 0) + "px";
    const s = (0.3 + Math.random() * maxPx).toFixed(1) + "px";
    const a = (0.3 + Math.random() * 0.7).toFixed(2);
    return `${x} ${y} 0 ${s} rgba(255,255,255,${a})`;
  }).join(",");
}

// Generated once — stable across renders
const STARS_SM = genStars(700, 0.7);   // small  0.3–1.0px, twinkle 3-4s
const STARS_MD = genStars(250, 1.2);   // medium 0.3–1.5px, twinkle 5-7s
const STARS_LG = genStars(80,  1.7);   // bright 0.3–2.0px, twinkle 8-12s

export function CosmicBg() {
  const starsRef = useRef<HTMLDivElement>(null);

  // Mouse parallax — dark mode only
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

        {/* 4 nebula qatlami */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 15% 10%, #2D1B69 0%, transparent 45%)",
          animation: "nebula-drift-1 65s ease-in-out infinite alternate",
        }} />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 85% 80%, #0E2A4A 0%, transparent 45%)",
          animation: "nebula-drift-2 85s ease-in-out infinite alternate",
        }} />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 70% 20%, #3D1A5E 0%, transparent 35%)",
          animation: "nebula-drift-3 75s ease-in-out infinite alternate",
        }} />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 20% 75%, #0A3040 0%, transparent 40%)",
          animation: "nebula-drift-4 95s ease-in-out infinite alternate",
        }} />

        {/* Yulduzlar — 3 qatlam, parallaks */}
        <div ref={starsRef} className="absolute inset-0" style={{ willChange: "transform" }}>
          {/* Qatlam 1: kichik, 3.5s twinkle */}
          <div className="absolute" style={{
            top: 0, left: 0, width: 1, height: 1,
            borderRadius: "50%", background: "transparent",
            boxShadow: STARS_SM,
            animation: "twinkle-small 3.5s ease-in-out infinite alternate",
          }} />
          {/* Qatlam 2: o'rtacha, 6s twinkle */}
          <div className="absolute" style={{
            top: 0, left: 0, width: 1, height: 1,
            borderRadius: "50%", background: "white",
            boxShadow: STARS_MD,
            animation: "twinkle-medium 6s ease-in-out infinite alternate",
          }} />
          {/* Qatlam 3: yorqin, 10s twinkle */}
          <div className="absolute" style={{
            top: 0, left: 0, width: 1, height: 1,
            borderRadius: "50%", background: "white",
            boxShadow: STARS_LG,
            animation: "twinkle-bright 10s ease-in-out infinite alternate",
          }} />
        </div>
      </div>

      {/* ── LIGHT: Atmosfera ── */}
      <div className="cosmic-light absolute inset-0" style={{
        background: "linear-gradient(180deg, #EAF4FF 0%, #F7FBFF 60%, #FFFFFF 100%)",
      }} />
    </div>
  );
}
