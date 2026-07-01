import { useEffect, useRef, useState, useCallback } from 'react';
import type { AlarmLevel } from '@/types';

interface Props {
  deviceId: string;
  alarmLevel?: AlarmLevel;
  className?: string;
  small?: boolean;
}

export function LiveCameraFeed({ deviceId, alarmLevel = 0, className = '', small = false }: Props) {
  const [frame, setFrame]   = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const timerRef            = useRef<ReturnType<typeof setInterval>>();
  const failCount           = useRef(0);

  const fetchFrame = useCallback(async () => {
    try {
      const res  = await fetch(`/api/video-frame/${deviceId}/`, {
        signal: AbortSignal.timeout(800),
      });
      const data = await res.json();
      if (data.frame) {
        setFrame(data.frame);
        setOnline(data.online ?? true);
        failCount.current = 0;
      } else {
        setOnline(false);
      }
    } catch {
      failCount.current += 1;
      if (failCount.current > 3) setOnline(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchFrame();
    timerRef.current = setInterval(fetchFrame, 250);
    return () => clearInterval(timerRef.current);
  }, [fetchFrame]);

  const borderCol =
    alarmLevel >= 3 ? 'rgba(255,71,87,0.7)'
    : alarmLevel === 2 ? 'rgba(255,138,61,0.6)'
    : alarmLevel === 1 ? 'rgba(242,201,76,0.5)'
    : 'var(--border)';

  /* ── Small thumbnail for DriverCard ─────────────────────── */
  if (small) {
    return (
      <div
        className={`relative rounded-xl overflow-hidden flex-shrink-0 ${className}`}
        style={{ width: 88, height: 66, border: `1.5px solid ${borderCol}` }}
      >
        {frame ? (
          <img
            src={`data:image/jpeg;base64,${frame}`}
            alt="kamera"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            decoding="async"
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(5,6,15,0.88)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          </div>
        )}
        {online && (
          <div style={{
            position: 'absolute', top: 3, left: 3,
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '1px 5px', borderRadius: 20,
            background: 'rgba(0,0,0,0.7)',
            fontSize: 9, color: '#3DDC84', fontFamily: 'monospace',
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#3DDC84', display: 'inline-block' }} />
            LIVE
          </div>
        )}
      </div>
    );
  }

  /* ── Full panel for DriverDetail ─────────────────────────── */
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        border: `2px solid ${borderCol}`,
        background: 'var(--surface)',
        aspectRatio: '16/9',
        transition: 'border-color 0.3s',
      }}
    >
      {frame ? (
        <img
          src={`data:image/jpeg;base64,${frame}`}
          alt="Jonli kamera"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          decoding="async"
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 10, color: 'var(--text-muted)',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" opacity={0.35}>
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
          <span style={{ fontSize: 13 }}>Kamera oflayn</span>
          <span style={{ fontSize: 11, opacity: 0.5, fontFamily: 'monospace' }}>{deviceId}</span>
        </div>
      )}

      {/* LIVE / OFFLINE badge */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        padding: '3px 10px', borderRadius: 20,
        fontSize: 11, fontWeight: 700,
        background: online ? 'rgba(61,220,132,0.15)' : 'rgba(255,71,87,0.12)',
        color: online ? '#3DDC84' : 'rgba(255,71,87,0.8)',
        border: `1px solid ${online ? '#3DDC84' : 'rgba(255,71,87,0.4)'}`,
        backdropFilter: 'blur(8px)',
        letterSpacing: '0.5px',
      }}>
        {online ? '● LIVE' : '○ OFFLINE'}
      </div>

      {/* Device ID */}
      <div style={{
        position: 'absolute', top: 10, left: 10,
        padding: '3px 8px', borderRadius: 20,
        fontSize: 10, fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.6)',
        color: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(6px)',
      }}>
        {deviceId}
      </div>

      {/* Red banner when alarm level 3 */}
      {alarmLevel >= 3 && online && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '6px 12px',
          background: 'rgba(255,71,87,0.85)',
          backdropFilter: 'blur(4px)',
          color: '#fff', fontSize: 12, fontWeight: 700,
          textAlign: 'center', letterSpacing: '0.5px',
        }}>
          XAVF ANIQLANDI
        </div>
      )}
    </div>
  );
}
