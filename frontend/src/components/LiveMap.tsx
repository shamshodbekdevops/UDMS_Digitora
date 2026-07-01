import { useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Device } from "@/types";
import { ALARM_COLOR } from "@/lib/utils";
import type { AlarmLevel } from "@/types";
import { useThemeStore } from "@/store/theme";

// Ping tezligi darajaga qarab:
// 0 (yashil) = juda sekin (3.5s), 1 (sariq) = sekin (2.0s),
// 2 (to'q sariq) = o'rtacha (1.0s), 3 (qizil) = tez (0.45s)
const PING_DUR: Record<number, string> = { 0: "3.5s", 1: "2.0s", 2: "1.0s", 3: "0.45s" };

function createRadarIcon(level: AlarmLevel, color: string) {
  const pingDur = PING_DUR[level] ?? "1.8s";
  const pingDelay = `${(parseFloat(pingDur) * 0.55).toFixed(3)}s`;
  const coreSize = level === 3 ? 12 : level >= 1 ? 10 : 8;
  const glow = level >= 2
    ? `0 0 10px ${color}, 0 0 20px ${color}60`
    : level === 1
      ? `0 0 8px ${color}90`
      : `0 0 5px ${color}60`;

  return L.divIcon({
    className: "",
    iconSize:   [36, 36],
    iconAnchor: [18, 18],
    popupAnchor:[0, -18],
    html: `
      <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;--ping-dur:${pingDur};--ping-delay:${pingDelay}">
        <div class="radar-ring" style="color:${color};opacity:0.9"></div>
        <div class="radar-ring radar-ring-2" style="color:${color};opacity:0.6"></div>
        <div style="
          width:${coreSize}px;height:${coreSize}px;
          border-radius:50%;
          background:${color};
          box-shadow:${glow};
          z-index:2;
          position:relative;
        "></div>
      </div>
    `,
  });
}

function MapFit({ devices }: { devices: Device[] }) {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const pts = devices.filter((d) => d.live?.gps_lat != null && d.live?.gps_lon != null);
    if (pts.length === 0) return;
    done.current = true;
    const lats = pts.map((d) => d.live!.gps_lat!);
    const lons = pts.map((d) => d.live!.gps_lon!);
    map.fitBounds(
      [[Math.min(...lats) - 0.3, Math.min(...lons) - 0.3],
       [Math.max(...lats) + 0.3, Math.max(...lons) + 0.3]],
      { padding: [24, 24] }
    );
  }, [devices, map]);

  return null;
}

interface Props {
  devices: Device[];
}

const DGT002_FALLBACK_LAT = 41.309847;
const DGT002_FALLBACK_LON = 69.2686852;

export function LiveMap({ devices }: Props) {
  const { t, i18n } = useTranslation();
  const { isDark } = useThemeStore();

  const devicesWithFallback = useMemo(() =>
    devices.map((d) => {
      if (
        d.device_id === "DGT-002" &&
        d.live &&
        (d.live.gps_lat === 0 || d.live.gps_lat == null) &&
        (d.live.gps_lon === 0 || d.live.gps_lon == null)
      ) {
        return { ...d, live: { ...d.live, gps_lat: DGT002_FALLBACK_LAT, gps_lon: DGT002_FALLBACK_LON } };
      }
      return d;
    }),
    [devices]
  );

  const positioned = useMemo(
    () => devicesWithFallback.filter((d) => d.live?.gps_lat != null && d.live?.gps_lon != null),
    [devicesWithFallback]
  );

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <MapContainer
      center={[41.0, 65.0]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        key={tileUrl}
        url={tileUrl}
        attribution="&copy; OpenStreetMap &copy; CARTO"
      />
      <MapFit devices={devicesWithFallback} />
      {positioned.map((device) => {
        const level = device.live!.alarm_level;
        const color = ALARM_COLOR[level];
        const icon = createRadarIcon(level, color);

        return (
          <Marker
            key={`${device.device_id}-${level}`}
            position={[device.live!.gps_lat!, device.live!.gps_lon!]}
            icon={icon}
          >
            <Popup key={i18n.language} closeButton={false}>
              <div className="min-w-[145px] space-y-1 text-[13px] text-text-primary">
                <p className="font-display font-semibold leading-tight">
                  {device.driver_name}
                </p>
                <p className="font-mono text-[11px] text-text-muted">
                  {device.device_id} · {device.vehicle_plate}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 0 4px ${color}18` }}
                  />
                  <p className="text-[12px] font-semibold" style={{ color }}>
                    {t(`alarm.level${level}`)}
                  </p>
                </div>
                {device.live?.gps_speed != null && (
                  <p className="text-[11px] text-text-muted">
                    {device.live.gps_speed.toFixed(0)} {t("common.km_h")}
                  </p>
                )}
                {device.live?.perclos != null && (
                  <p className="text-[11px] text-text-muted">
                    PERCLOS {(device.live.perclos * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
