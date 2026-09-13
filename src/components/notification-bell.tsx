"use client";

import * as React from "react";
import { Bell, ShieldAlert, AlertTriangle, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Notification } from "@/db/schema";
import type { NotificationType } from "@/lib/moderation/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";
import { Badge } from "@/components/ui/badge";

export function NotificationBell() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkOne = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-md text-muted-foreground hover:text-foreground border border-border/50"
          title={t.notifications?.title || "Notifications"}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-lg border border-border bg-popover"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">{t.notifications?.title || "Notifications"}</span>
            {unreadCount > 0 && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20 font-medium">
                {unreadCount} {t.notifications?.unreadBadge || "unread"}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isLoading}
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCheck className="w-3 h-3 mr-1" />
              )}
              {t.notifications?.markAllRead || "Mark all read"}
            </Button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {t.notifications?.empty || "No notifications"}
            </div>
          ) : (
            notifications.map((notif) => {
              const notifType = notif.type as NotificationType;
              const isDowngrade = notifType === "moderation_downgrade";
              const isRejected = notifType === "moderation_rejected";

              return (
                <DropdownMenuItem
                  key={notif.id}
                  onClick={() => !notif.isRead && handleMarkOne(notif.id)}
                  className={cn(
                    "flex items-start gap-3 p-3.5 cursor-pointer rounded-none focus:bg-muted/40 transition-colors",
                    !notif.isRead && "bg-amber-500/[0.03]"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {isRejected ? (
                      <div className="w-6 h-6 rounded-md bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>
                    ) : isDowngrade ? (
                      <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center border border-border">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-xs font-medium truncate",
                          !notif.isRead ? "text-foreground font-semibold" : "text-muted-foreground"
                        )}
                      >
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 font-mono">
                      {new Date(notif.createdAt).toLocaleDateString()}{" "}
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
