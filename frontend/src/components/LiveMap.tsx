import { useMemo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Device } from "@/types";
import { ALARM_COLOR } from "@/lib/utils";
import type { AlarmLevel } from "@/types";

// Radar ping DivIcon — xuddi radar ekranidagi kabi (4-effekt)
function createRadarIcon(level: AlarmLevel, color: string) {
  const pingDur = level === 3 ? "0.7s" : level === 2 ? "1.0s" : "1.8s";
  const coreSize = level === 3 ? 12 : level >= 1 ? 10 : 8;
  const glow = level >= 2 ? `0 0 10px ${color}, 0 0 20px ${color}60` : `0 0 6px ${color}80`;

  return L.divIcon({
    className: "",
    iconSize:   [36, 36],
    iconAnchor: [18, 18],
    popupAnchor:[0, -18],
    html: `
      <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
        <!-- Radar halqa 1 -->
        <div style="
          position:absolute;inset:0;border-radius:50%;
          border:2px solid ${color};
          animation:radar-ping ${pingDur} ease-out infinite;
          opacity:0.9;
        "></div>
        <!-- Radar halqa 2 (ketma-ket kechikish) -->
        <div style="
          position:absolute;inset:0;border-radius:50%;
          border:2px solid ${color};
          animation:radar-ping ${pingDur} ease-out infinite;
          animation-delay:${parseFloat(pingDur) * 0.55}s;
          opacity:0.6;
        "></div>
        <!-- Markaziy nuqta -->
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

// Xarita dastlabki marta ochilganda barcha markerlarga sig'diradi
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

export function LiveMap({ devices }: Props) {
  const positioned = useMemo(
    () => devices.filter((d) => d.live?.gps_lat != null && d.live?.gps_lon != null),
    [devices]
  );

  return (
    <MapContainer
      center={[41.0, 65.0]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      attributionControl={false}
    >
      {/* CartoDB Dark tiles — API key shart emas */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap &copy; CARTO"
      />
      <MapFit devices={devices} />

      {positioned.map((device) => {
        const level = device.live!.alarm_level;
        const color = ALARM_COLOR[level];
        const icon = createRadarIcon(level, color);

        return (
          <Marker
            key={device.device_id}
            position={[device.live!.gps_lat!, device.live!.gps_lon!]}
            icon={icon}
          >
            <Popup closeButton={false}>
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
                    {["Xavfsiz", "Ehtiyot", "Ogohlantirish", "XAVF!"][level]}
                  </p>
                </div>
                {device.live?.gps_speed != null && (
                  <p className="text-[11px] text-text-muted">
                    {device.live.gps_speed.toFixed(0)} km/h
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
