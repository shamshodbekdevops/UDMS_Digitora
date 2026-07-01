import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Edit2, Trash2, Wifi, WifiOff } from "lucide-react";
import { api } from "@/lib/api";
import { useFleetStore } from "@/store/fleet";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { Driver, Device } from "@/types";

/* ── Avatar color from name hash ─────────────────────────── */
const AVATAR_COLORS = ["#6C8EFF", "#3DDC84", "#F2C94C", "#FF8A3D", "#A78BFA", "#38BDF8"];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Driver | "new" | null>(null);
  const [delConfirm, setDelConfirm] = useState<number | null>(null);
  const [unassignedDevices, setUnassignedDevices] = useState<Device[]>([]);
  const fleetDevices = useFleetStore((s) => s.devices);

  const fetchDrivers = useCallback(() => {
    setLoading(true);
    api.get<{ results: Driver[] }>("/dms/drivers/?ordering=full_name&page_size=100")
      .then((d) => setDrivers(d.results ?? []))
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }, []);

  const fetchUnassigned = () => {
    api.get<{ results: Device[] }>("/dms/devices/?unassigned=true&page_size=100")
      .then((d) => setUnassignedDevices(d.results ?? []))
      .catch(() => {});
  };

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.full_name.toLowerCase().includes(q) ||
      d.vehicle_plate.toLowerCase().includes(q) ||
      (d.device_id ?? "").toLowerCase().includes(q)
    );
  });

  const handleDelete = (id: number) => {
    api.delete(`/dms/drivers/${id}/`)
      .then(() => { setDrivers((prev) => prev.filter((d) => d.id !== id)); setDelConfirm(null); })
      .catch(() => {});
  };

  const openAdd = () => { fetchUnassigned(); setEditing("new"); };
  const openEdit = (driver: Driver) => { fetchUnassigned(); setEditing(driver); };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-text-primary text-lg">Haydovchilar</h1>
          <p className="text-[12px] text-text-muted mt-0.5">{drivers.length} ta haydovchi</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-200"
          style={{ background: "rgba(var(--accent-rgb),0.18)", border: "1px solid rgba(var(--accent-rgb),0.35)", color: "var(--accent)" }}
        >
          <Plus size={14} />
          Haydovchi qo'shish
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Ism, raqam yoki qurilma bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface-el text-text-primary text-[13px] outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : drivers.length === 0 ? (
        <div className="glass rounded-2xl p-16 flex flex-col items-center gap-4 text-center">
          <div style={{ fontSize: 48, opacity: 0.2 }}>👤</div>
          <p className="font-display font-bold text-text-primary text-lg">Haydovchilar yo'q</p>
          <p className="text-text-muted text-sm max-w-xs">Hozircha hech qanday haydovchi qo'shilmagan</p>
          <button
            onClick={openAdd}
            className="mt-2 px-6 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-200"
            style={{ background: "rgba(var(--accent-rgb),0.18)", border: "1px solid rgba(var(--accent-rgb),0.35)", color: "var(--accent)" }}
          >
            Birinchi haydovchini qo'shish
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
          <div style={{ fontSize: 36, opacity: 0.2 }}>🔍</div>
          <p className="font-semibold text-text-primary">Natija topilmadi</p>
          <p className="text-text-muted text-sm">"{search}" bo'yicha haydovchi topilmadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((driver) => {
              const fleetDev = fleetDevices.find((d) => d.device_id === (driver.device_id ?? ""));
              const isOnline = !!fleetDev?.live;
              const alarmLevel = fleetDev?.live?.alarm_level ?? 0;

              return (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  isOnline={isOnline}
                  alarmLevel={alarmLevel}
                  delConfirm={delConfirm === driver.id}
                  onEdit={() => openEdit(driver)}
                  onDeleteRequest={() => setDelConfirm(driver.id)}
                  onDeleteCancel={() => setDelConfirm(null)}
                  onDeleteConfirm={() => handleDelete(driver.id)}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <DriverDialog
        open={editing !== null}
        driver={editing === "new" ? null : editing}
        devices={unassignedDevices}
        onClose={() => setEditing(null)}
        onSaved={fetchDrivers}
      />
    </div>
  );
}

/* ── Driver Card ─────────────────────────────────────────── */
function DriverCard({ driver, isOnline, alarmLevel, delConfirm, onEdit, onDeleteRequest, onDeleteCancel, onDeleteConfirm }: {
  driver: Driver;
  isOnline: boolean;
  alarmLevel: number;
  delConfirm: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  const navigate = useNavigate();
  const color = avatarColor(driver.full_name);
  const ALARM_COLORS = ["#3DDC84", "#F2C94C", "#FF8A3D", "#FF4757"];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="glass rounded-2xl p-4 border border-border/50 relative group overflow-hidden cursor-pointer"
      style={{
        borderColor: delConfirm ? "rgba(255,71,87,0.4)" : undefined,
        transition: "border-color 200ms ease",
      }}
      onClick={() => driver.device_id && navigate(`/drivers/${driver.device_id}`)}
    >
      {/* Top row: avatar + name + actions */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-bold text-white text-[15px] shrink-0"
          style={{ background: color, boxShadow: `0 4px 12px ${color}44` }}
          onClick={(e) => { e.stopPropagation(); driver.device_id && navigate(`/drivers/${driver.device_id}`); }}
        >
          {initials(driver.full_name)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-text-primary truncate">{driver.full_name}</p>
          <p className="text-[12px] text-text-muted font-mono">{driver.vehicle_plate}</p>
        </div>

        {/* Edit/delete buttons */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-all duration-150"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={onDeleteRequest}
            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all duration-150"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Status + device */}
      <div className="mt-3 flex items-center gap-3 text-[12px]">
        <span className="flex items-center gap-1.5">
          {isOnline
            ? <><Wifi size={11} className="text-safe" /><span className="text-safe font-semibold">Online</span></>
            : <><WifiOff size={11} className="text-text-muted" /><span className="text-text-muted">Offline</span></>
          }
        </span>
        {driver.device_id && (
          <span className="font-mono text-text-muted text-[11px] bg-surface-el px-2 py-0.5 rounded-lg border border-border/50">
            {driver.device_id}
          </span>
        )}
        {isOnline && alarmLevel > 0 && (
          <span
            className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: ALARM_COLORS[alarmLevel] + "22", color: ALARM_COLORS[alarmLevel] }}
          >
            L{alarmLevel}
          </span>
        )}
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {delConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 p-4"
            style={{ background: "rgba(5,6,15,0.88)", backdropFilter: "blur(8px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[13px] font-semibold text-white text-center">
              <span className="text-danger">O'chirish:</span> {driver.full_name}?
            </p>
            <p className="text-[11px] text-white/50 text-center">Bu amalni qaytarib bo'lmaydi</p>
            <div className="flex gap-2">
              <button
                onClick={onDeleteCancel}
                className="px-3 py-1.5 rounded-lg text-[12px] border border-border text-text-muted hover:bg-surface-el transition-all"
              >
                Bekor
              </button>
              <button
                onClick={onDeleteConfirm}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold bg-danger/20 border border-danger/40 text-danger hover:bg-danger/30 transition-all"
              >
                O'chirish
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Add/Edit Dialog ─────────────────────────────────────── */
function DriverDialog({ open, driver, devices, onClose, onSaved }: {
  open: boolean;
  driver: Driver | null;
  devices: Device[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ full_name: "", vehicle_plate: "", device: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (driver) {
      setForm({
        full_name: driver.full_name,
        vehicle_plate: driver.vehicle_plate,
        device: driver.device != null ? String(driver.device) : "",
        phone: driver.phone ?? "",
        notes: driver.notes ?? "",
      });
    } else {
      setForm({ full_name: "", vehicle_plate: "", device: "", phone: "", notes: "" });
    }
    setError(null);
  }, [driver, open]);

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.full_name.trim()) { setError("Ism majburiy"); return; }
    setSaving(true); setError(null);
    const body: Record<string, unknown> = {
      full_name: form.full_name.trim(),
      vehicle_plate: form.vehicle_plate.trim(),
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      device: form.device ? Number(form.device) : null,
    };
    try {
      if (driver) {
        await api.patch(`/dms/drivers/${driver.id}/`, body);
      } else {
        await api.post("/dms/drivers/", body);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" style={{ background: "rgba(20,22,38,0.98)", backdropFilter: "blur(20px)" }}>
        <DialogHeader>
          <DialogTitle>{driver ? "Haydovchini tahrirlash" : "Yangi haydovchi"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="To'liq ism *">
            <input
              value={form.full_name} onChange={f("full_name")}
              placeholder="Familiya Ism Otasining ismi"
              className="input-base"
            />
          </Field>
          <Field label="Davlat raqami *">
            <input
              value={form.vehicle_plate} onChange={f("vehicle_plate")}
              placeholder="01A777AA"
              className="input-base font-mono"
            />
          </Field>
          <Field label="Qurilma (ixtiyoriy)">
            <select value={form.device} onChange={f("device")} className="input-base">
              <option value="">— Qurilma tanlanmagan —</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.device_id} — {d.driver_name}</option>
              ))}
              {driver?.device && driver.device_id && (
                <option value={String(driver.device)}>{driver.device_id} (hozirgi)</option>
              )}
            </select>
          </Field>
          <Field label="Telefon (ixtiyoriy)">
            <input
              value={form.phone} onChange={f("phone")}
              placeholder="+998 90 123 45 67"
              className="input-base"
            />
          </Field>
          <Field label="Izoh (ixtiyoriy)">
            <textarea
              value={form.notes} onChange={f("notes")}
              rows={2}
              placeholder="Qo'shimcha ma'lumot..."
              className="input-base resize-none"
            />
          </Field>

          {error && (
            <p className="text-[12px] text-danger px-1">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-border text-text-muted text-[13px] hover:bg-surface-el transition-all"
            >
              Bekor
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-xl font-bold text-[13px] transition-all disabled:opacity-50"
              style={{ background: "rgba(var(--accent-rgb),0.2)", border: "1px solid rgba(var(--accent-rgb),0.4)", color: "var(--accent)" }}
            >
              {saving ? "Saqlanmoqda…" : "Saqlash"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}
