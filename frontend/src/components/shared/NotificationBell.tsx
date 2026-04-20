"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Gavel, ArrowLeftRight, ShieldCheck, CreditCard, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: "auction" | "trade" | "escrow" | "payment" | "system";
  title: string;
  message: string;
  href: string;
  timestamp: number;
  read: boolean;
}

const ICON_MAP = {
  auction: Gavel,
  trade: ArrowLeftRight,
  escrow: ShieldCheck,
  payment: CreditCard,
  system: Bell,
};

const COLOR_MAP = {
  auction: "text-blue-400",
  trade: "text-[var(--cipher-violet)]",
  escrow: "text-[var(--cipher-cyan)]",
  payment: "text-[var(--cipher-green)]",
  system: "text-[var(--text-muted)]",
};

const STORAGE_KEY = "cipherdex-notifications";

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(items: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
  } catch {
    // noop
  }
}

/**
 * Notification bell with badge count and dropdown.
 * Persists notifications in localStorage.
 * Components can dispatch custom events to add notifications.
 */
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load on mount
  useEffect(() => {
    setItems(loadNotifications());
  }, []);

  // Listen for custom notification events from other components
  useEffect(() => {
    const handler = (e: CustomEvent<Omit<Notification, "id" | "timestamp" | "read">>) => {
      const newNotif: Notification = {
        ...e.detail,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        read: false,
      };
      setItems((prev) => {
        const next = [newNotif, ...prev].slice(0, 50);
        saveNotifications(next);
        return next;
      });
    };

    window.addEventListener("cipherdex-notify" as string, handler as EventListener);
    return () => window.removeEventListener("cipherdex-notify" as string, handler as EventListener);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    saveNotifications([]);
  }, []);

  const handleClick = useCallback(
    (notif: Notification) => {
      markRead(notif.id);
      setOpen(false);
      router.push(notif.href);
    },
    [markRead, router]
  );

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)]
                   hover:bg-white/[0.03] transition-all"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--cipher-violet)]
                           flex items-center justify-center text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            className="absolute right-0 top-full mt-2 w-80 glass-elevated rounded-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Notifications
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-[var(--cipher-violet)] hover:text-[var(--cipher-cyan)] transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell size={20} className="mx-auto text-[var(--text-muted)] mb-2" />
                  <p className="text-xs text-[var(--text-muted)]">No notifications yet</p>
                </div>
              ) : (
                items.slice(0, 20).map((notif) => {
                  const Icon = ICON_MAP[notif.type];
                  const color = COLOR_MAP[notif.type];

                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors
                                  hover:bg-white/[0.02] border-b border-[var(--border-subtle)]
                                  ${!notif.read ? "bg-[var(--cipher-violet)]/[0.03]" : ""}`}
                    >
                      <Icon size={14} className={`${color} mt-0.5 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-medium truncate ${
                            notif.read ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"
                          }`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--cipher-violet)] shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                          {notif.message}
                        </p>
                        <p className="text-[9px] text-[var(--text-muted)] mt-1">
                          {formatTime(notif.timestamp)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
