export type AlarmLevel = 0 | 1 | 2 | 3;

export interface User {
  id: number;
  username: string;
  email: string;
  role: "free" | "business" | "admin";
  company_name?: string;
  phone?: string;
  email_alerts_level3?: boolean;
  browser_push_notifications?: boolean;
}

export interface LiveStatus {
  alarm_level: AlarmLevel;
  last_seen: string;
  gps_lat: number | null;
  gps_lon: number | null;
  gps_speed: number | null;
  perclos: number;
}

export interface Device {
  id: number;
  device_id: string;
  driver_name: string;
  vehicle_plate: string;
  is_active: boolean;
  created_at: string;
  live: LiveStatus | null;
}

export interface Driver {
  id: number;
  full_name: string;
  vehicle_plate: string;
  device: number | null;
  device_id: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface AlertEvent {
  id: number;
  device_id: string;
  driver_name: string;
  alarm_level: AlarmLevel;
  alarm_msg: string;
  perclos: number;
  gps_lat: number | null;
  gps_lon: number | null;
  gps_speed: number | null;
  cabin_temp: number | null;
  cabin_humidity: number | null;
  timestamp: string;
}

export interface WsPacket {
  device_id: string;
  driver_name: string;
  timestamp: string;
  alarm_level: AlarmLevel;
  alarm_msg: string;
  perclos: number;
  gps: { lat: number; lon: number; speed: number };
  cabin: { temp: number; humidity: number };
}

export interface AuthTokens {
  access: string;
  refresh: string;
}
