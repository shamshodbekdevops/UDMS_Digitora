import { ALARM_COLOR, ALARM_PULSE_DURATION } from "@/lib/utils";
import type { AlarmLevel } from "@/types";

interface Props {
  level: AlarmLevel;
  size?: number;
}

export function RiskPulse({ level, size = 44 }: Props) {
  const color = ALARM_COLOR[level];
  const duration = ALARM_PULSE_DURATION[level];
  const inner = Math.round(size * 0.48);

  // Level 2/3 da "radar" glow halqalari (prompt: 3-effekt)
  const hasGlow = level >= 2;
  const isKritik = level === 3;

  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer pulsing background disc */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          backgroundColor: color,
          opacity: isKritik ? 0.2 : 0.12,
          animationName: "risk-pulse",
          animationDuration: duration,
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      />

      {/* Radar halqa 1 — L2/L3 da */}
      {hasGlow && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${color}`,
            animationName: "risk-ring",
            animationDuration: duration,
            animationTimingFunction: "ease-out",
            animationIterationCount: "infinite",
          }}
        />
      )}

      {/* Radar halqa 2 — faqat L3 da (ketma-ket kechikish) */}
      {isKritik && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${color}`,
            animationName: "risk-ring-delay",
            animationDuration: duration,
            animationTimingFunction: "ease-out",
            animationIterationCount: "infinite",
            animationDelay: `${parseFloat(duration) * 0.45}s`,
          }}
        />
      )}

      {/* Inner solid dot */}
      <div
        className="rounded-full relative z-10 shrink-0"
        style={{
          width: inner,
          height: inner,
          backgroundColor: color,
          boxShadow: hasGlow
            ? `0 0 ${Math.round(size * 0.35)}px ${color}90, 0 0 ${Math.round(size * 0.6)}px ${color}40`
            : `0 0 ${Math.round(size * 0.2)}px ${color}60`,
        }}
      />
    </div>
  );
}
