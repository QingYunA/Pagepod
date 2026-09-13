import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(user.id, 30),
    getUnreadNotificationsCount(user.id),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body.all) {
      await markAllNotificationsAsRead(user.id);
      return NextResponse.json({ success: true });
    }

    if (body.id) {
      await markNotificationAsRead(body.id, user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing id or all parameter" }, { status: 400 });
  } catch (err) {
    console.error("PATCH /api/notifications error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
