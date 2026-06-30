import { useEffect, useRef, useState, useCallback } from "react";
import { VideoOff, Loader2, RefreshCw, Video } from "lucide-react";
import type { AlarmLevel } from "@/types";

type ConnStatus = "idle" | "connecting" | "live" | "offline";

interface Props {
  deviceId: string;
  streamUrl: string | null;
  alarmLevel?: AlarmLevel;
  className?: string;
  /** Compact thumbnail mode for DriverCard */
  small?: boolean;
}

// Exponential backoff delays (ms)
const BACKOFF_MS = [2000, 4000, 8000, 16000, 30000];

export function LiveCameraFeed({
  deviceId,
  streamUrl,
  alarmLevel = 0,
  className = "",
  small = false,
}: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const pcRef      = useRef<RTCPeerConnection | null>(null);
  const retryCount = useRef(0);
  const alive      = useRef(true);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<ConnStatus>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  /* ── WebRTC connection ──────────────────────────────────────────────── */
  const connect = useCallback(async () => {
    if (!streamUrl || !alive.current) return;

    // Tear down previous connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;

    setStatus("connecting");
    setErrMsg(null);

    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.addEventListener("track", (ev) => {
        if (ev.streams[0] && videoRef.current && alive.current) {
          videoRef.current.srcObject = ev.streams[0];
          setStatus("live");
          retryCount.current = 0;
        }
      });

      pc.addEventListener("connectionstatechange", () => {
        if (!alive.current) return;
        const s = pc.connectionState;
        if (s === "failed" || s === "disconnected") {
          setStatus("offline");
          scheduleRetry();
        }
      });

      pc.addTransceiver("video", { direction: "recvonly" });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch(streamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const { sdp, type } = (await res.json()) as { sdp: string; type: RTCSdpType };
      await pc.setRemoteDescription({ sdp, type });

    } catch (err) {
      if (!alive.current) return;
      const msg = err instanceof Error ? err.message : "Ulanishda xatolik";
      setStatus("offline");
      setErrMsg(msg);
      scheduleRetry();
    }
  }, [streamUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleRetry = useCallback(() => {
    if (!alive.current || !streamUrl) return;
    const delay = BACKOFF_MS[Math.min(retryCount.current, BACKOFF_MS.length - 1)];
    retryCount.current += 1;
    console.info(`[LiveCam:${deviceId}] retry ${retryCount.current} in ${delay / 1000}s`);
    retryTimer.current = setTimeout(() => {
      if (alive.current) connect();
    }, delay);
  }, [connect, deviceId, streamUrl]);

  useEffect(() => {
    alive.current = true;
    if (streamUrl) connect();
    return () => {
      alive.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      pcRef.current?.close();
      pcRef.current = null;
    };
  }, [connect, streamUrl]);

  if (!streamUrl) return null;

  /* ── Border colour based on alarm level + connection ───────────────── */
  const borderColor =
    status === "live"
      ? alarmLevel >= 2
        ? "rgba(255,71,87,0.7)"
        : "rgba(138,148,255,0.45)"
      : "var(--border)";

  const glowStyle =
    status === "live" && alarmLevel >= 2
      ? { boxShadow: "0 0 24px rgba(255,71,87,0.28), 0 0 6px rgba(255,71,87,0.15)" }
      : {};

  /* ────────────────────────────────────────────────────────────────────
     SMALL thumbnail mode — for DriverCard
  ───────────────────────────────────────────────────────────────────── */
  if (small) {
    return (
      <div
        className="relative rounded-xl overflow-hidden flex-shrink-0"
        style={{ width: 88, height: 66, border: `1.5px solid ${borderColor}`, ...glowStyle }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: status === "live" ? "block" : "none" }}
        />

        {status !== "live" && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(5,6,15,0.88)" }}
          >
            {status === "connecting"
              ? <Loader2 size={16} className="text-text-muted animate-spin" />
              : <VideoOff size={15} className="text-text-muted opacity-40" />
            }
          </div>
        )}

        {status === "live" && (
          <div
            className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.7)", fontSize: 9, color: "#3DDC84", fontFamily: "monospace" }}
          >
            <span className="w-1 h-1 rounded-full bg-safe animate-pulse inline-block" />
            LIVE
          </div>
        )}
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────────
     FULL panel mode — for DriverDetail page
  ───────────────────────────────────────────────────────────────────── */
  return (
    <div
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{
        aspectRatio: "16/9",
        background: "rgba(5,6,15,0.72)",
        backdropFilter: "blur(12px)",
        border: `1.5px solid ${borderColor}`,
        transition: "border-color 300ms ease, box-shadow 300ms ease",
        ...glowStyle,
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
        style={{ display: status === "live" ? "block" : "none" }}
      />

      {/* Non-live states */}
      {status !== "live" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          {status === "connecting" ? (
            <>
              <Loader2 size={30} className="text-text-muted animate-spin" />
              <p className="text-sm font-semibold text-text-muted">Kamera ulanyapti…</p>
              <p className="text-xs text-text-muted font-mono opacity-50">{deviceId}</p>
            </>
          ) : (
            <>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(138,148,255,0.08)", border: "1px solid rgba(138,148,255,0.15)" }}
              >
                <VideoOff size={24} className="text-text-muted opacity-40" />
              </div>
              <p className="text-sm font-semibold text-text-muted">Kamera oflayn</p>
              {errMsg && (
                <p className="text-xs font-mono text-center max-w-[200px]"
                  style={{ color: "rgba(255,71,87,0.7)" }}>
                  {errMsg}
                </p>
              )}
              <button
                onClick={() => { retryCount.current = 0; connect(); }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200"
                style={{
                  background: "rgba(var(--accent-rgb),0.14)",
                  border: "1px solid rgba(var(--accent-rgb),0.3)",
                  color: "var(--accent)",
                }}
              >
                <RefreshCw size={12} />
                Qayta ulanish
              </button>
            </>
          )}
        </div>
      )}

      {/* LIVE badge */}
      {status === "live" && (
        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={{ background: "rgba(0,0,0,0.68)", backdropFilter: "blur(6px)" }}
        >
          <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
          <span className="text-[11px] font-bold text-white font-mono tracking-widest">LIVE</span>
        </div>
      )}

      {/* Device ID badge */}
      <div
        className="absolute top-3 right-3 px-2.5 py-1 rounded-full"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.6)" }}>{deviceId}</span>
      </div>

      {/* Alarm-level glow border pulse when level >= 2 */}
      {status === "live" && alarmLevel >= 2 && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: `1.5px solid ${alarmLevel === 3 ? "rgba(255,71,87,0.6)" : "rgba(255,138,61,0.5)"}`,
            animation: "health-pulse 1.5s ease-in-out infinite",
          }}
        />
      )}

      {/* Camera icon decoration when not live */}
      {status === "idle" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Video size={32} className="text-text-muted opacity-20" />
        </div>
      )}
    </div>
  );
}
