import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AlertEvent, AlarmLevel, WsPacket } from "@/types";

export interface NotificationItem {
  id: number | string;
  device_id: string;
  driver_name: string;
  alarm_level: AlarmLevel;
  alarm_msg: string;
  timestamp: string;
  read: boolean;
}

interface NotificationState {
  notificationsEnabled: boolean;
  emailAlertsLevel3: boolean;
  browserPushNotifications: boolean;
  soundAlerts: boolean;
  sensitivity: 1 | 2 | 3;
  items: NotificationItem[];
  unreadCount: number;
  setNotificationsEnabled: (enabled: boolean) => void;
  setEmailAlertsLevel3: (enabled: boolean) => void;
  setBrowserPushNotifications: (enabled: boolean) => void;
  setSoundAlerts: (enabled: boolean) => void;
  setSensitivity: (level: 1 | 2 | 3) => void;
  replaceFromAlerts: (alerts: AlertEvent[]) => void;
  addFromPacket: (packet: WsPacket) => void;
  markAllAsRead: () => void;
  markAsRead: (id: number | string) => void;
}

function countUnread(items: NotificationItem[]) {
  return items.reduce((total, item) => total + (item.read ? 0 : 1), 0);
}

function mapAlerts(alerts: AlertEvent[], existing: NotificationItem[]): NotificationItem[] {
  const readMap = new Map(existing.map((item) => [String(item.id), item.read]));
  return alerts.slice(0, 20).map((alert) => ({
    id: alert.id,
    device_id: alert.device_id,
    driver_name: alert.driver_name,
    alarm_level: alert.alarm_level,
    alarm_msg: alert.alarm_msg,
    timestamp: alert.timestamp,
    read: readMap.get(String(alert.id)) ?? false,
  }));
}

function mapPacket(packet: WsPacket): NotificationItem {
  return {
    id: `ws-${packet.timestamp}-${packet.device_id}`,
    device_id: packet.device_id,
    driver_name: packet.driver_name,
    alarm_level: packet.alarm_level,
    alarm_msg: packet.alarm_msg,
    timestamp: packet.timestamp,
    read: false,
  };
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notificationsEnabled: true,
      emailAlertsLevel3: false,
      browserPushNotifications: false,
      soundAlerts: true,
      sensitivity: 3,
      items: [],
      unreadCount: 0,
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setEmailAlertsLevel3: (emailAlertsLevel3) => set({ emailAlertsLevel3 }),
      setBrowserPushNotifications: (browserPushNotifications) => set({ browserPushNotifications }),
      setSoundAlerts: (soundAlerts) => set({ soundAlerts }),
      setSensitivity: (sensitivity) => set({ sensitivity }),
      replaceFromAlerts: (alerts) => set((state) => {
        const nextItems = mapAlerts(alerts, state.items);
        return { items: nextItems, unreadCount: countUnread(nextItems) };
      }),
      addFromPacket: (packet) => {
        if (packet.alarm_level < 2) return;
        set((state) => {
          const nextItems = [mapPacket(packet), ...state.items].slice(0, 20);
          return { items: nextItems, unreadCount: countUnread(nextItems) };
        });
      },
      markAllAsRead: () => set((state) => {
        const nextItems = state.items.map((item) => ({ ...item, read: true }));
        return { items: nextItems, unreadCount: 0 };
      }),
      markAsRead: (id) => set((state) => {
        const nextItems = state.items.map((item) => (String(item.id) === String(id) ? { ...item, read: true } : item));
        return { items: nextItems, unreadCount: countUnread(nextItems) };
      }),
    }),
    {
      name: "digitora-notification-center",
      partialize: (state) => ({
        notificationsEnabled: state.notificationsEnabled,
        emailAlertsLevel3: state.emailAlertsLevel3,
        browserPushNotifications: state.browserPushNotifications,
        soundAlerts: state.soundAlerts,
        sensitivity: state.sensitivity,
        items: state.items,
        unreadCount: state.unreadCount,
      }),
    }
  )
);
