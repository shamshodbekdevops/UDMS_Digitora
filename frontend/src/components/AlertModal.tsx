import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { MapPin, Clock, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WsPacket } from "@/types";

// Web Audio API orqali alert beep (browser Audio API, ixtiyoriy — prompt 7-bosqich)
function playAlertBeep() {
  try {
    const ctx = new AudioContext();
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    beep(880, 0,    0.15);
    beep(660, 0.18, 0.15);
    beep(880, 0.36, 0.25);
  } catch (_) {/* blocked by browser policy — silently ignore */}
}

interface Props {
  packet: WsPacket | null;
  onDismiss: () => void;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:   { opacity: 0, transition: { duration: 0.15 } },
};

const cardVariants = {
  hidden:  { scale: 0.85, opacity: 0, y: 20 },
  visible: {
    scale: 1, opacity: 1, y: 0,
    transition: { type: "spring" as const, damping: 16, stiffness: 280, duration: 0.3 },
  },
  exit: { scale: 0.92, opacity: 0, y: -10, transition: { duration: 0.18 } },
};

export function AlertModal({ packet, onDismiss }: Props) {
  const { t, i18n } = useTranslation();

  // Beep chalganda + keyboard Esc bilan yopish
  useEffect(() => {
    if (!packet) return;
    playAlertBeep();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [packet, onDismiss]);

  const time = packet ? new Date(packet.timestamp).toLocaleTimeString(i18n.language) : "";

  return (
    <AnimatePresence>
      {packet && (
        <>
          {/* Overlay — backdrop blur (7-effekt) */}
          <motion.div
            key="overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[9000]"
            style={{ backdropFilter: "blur(8px)", background: "rgba(5,6,15,0.75)" }}
            onClick={onDismiss}
          />

          {/* Modal card */}
          <motion.div
            key="modal"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[9001] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-lg pointer-events-auto rounded-2xl border overflow-hidden"
              style={{
                background: "rgba(20,22,38,0.92)",
                backdropFilter: "blur(24px)",
                borderColor: "rgba(255,71,87,0.5)",
                boxShadow: "0 0 60px rgba(255,71,87,0.25), 0 20px 60px rgba(0,0,0,0.6)",
              }}
            >
              {/* Top danger strip */}
              <div
                className="h-1.5 w-full"
                style={{ background: "linear-gradient(90deg, #FF4757, #FF8A3D, #FF4757)", backgroundSize: "200%", animation: "shimmer 1.5s linear infinite" }}
              />

              <div className="p-6 md:p-7">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    {/* Pulsing danger icon */}
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-danger/20 animate-pulse" />
                      <div className="absolute inset-0 rounded-full border-2 border-danger" style={{ animation: "risk-ring 0.6s ease-out infinite" }} />
                      <AlertTriangle size={24} className="text-danger relative z-10" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-danger text-xl leading-tight">
                        {t("alert_modal.title")}
                      </p>
                      <p className="text-sm text-text-muted mt-0.5">{t("alert_modal.subtitle")}</p>
                    </div>
                  </div>
                  <button onClick={onDismiss} className="text-text-muted hover:text-text-primary transition-colors mt-1">
                    <X size={20} />
                  </button>
                </div>

                {/* Driver info */}
                <div
                  className="rounded-xl p-4 mb-4 border border-danger/20"
                  style={{ background: "rgba(255,71,87,0.08)" }}
                >
                  <p className="font-display font-bold text-text-primary text-lg">{packet.driver_name}</p>
                  <p className="text-sm text-text-muted font-mono mt-0.5">{packet.device_id}</p>
                  <p className="text-base text-danger font-medium mt-2">
                    {packet.alarm_msg}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-sm text-text-muted">
                    <span className="font-mono font-bold text-warning text-[14px]">
                      {t("device.perclos")} {(packet.perclos * 100).toFixed(0)}%
                    </span>
                    {packet.gps?.speed != null && (
                      <span className="ml-2">{packet.gps.speed.toFixed(0)} {t("common.km_h")}</span>
                    )}
                  </div>
                </div>

                {/* Meta info */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {packet.gps && (
                    <div className="flex items-start gap-2 text-xs text-text-muted">
                      <MapPin size={13} className="shrink-0 mt-0.5 text-accent" />
                      <div>
                        <p className="text-[11px] uppercase tracking-wider mb-0.5">{t("alert_modal.location")}</p>
                          <p className="font-mono text-text-primary text-[14px]">
                          {packet.gps.lat.toFixed(4)}, {packet.gps.lon.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-xs text-text-muted">
                      <Clock size={14} className="shrink-0 mt-0.5 text-accent" />
                    <div>
                        <p className="text-[11px] uppercase tracking-wider mb-0.5">{t("alert_modal.time")}</p>
                        <p className="font-mono text-text-primary text-[14px]">{time}</p>
                    </div>
                  </div>
                </div>

                {/* Confirm button */}
                <Button
                  onClick={onDismiss}
                    className="w-full bg-danger hover:bg-danger/90 text-white font-semibold py-3 text-base btn-press rounded-2xl"
                  style={{ background: "#FF4757" }}
                >
                  {t("alert_modal.confirm_btn")}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
