import { NextRequest, NextResponse } from "next/server";
import { backendHttpErrorResponse, internalProxyErrorResponse } from "@/app/lib/utils/proxyError";

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    const response = await fetch(
      `${process.env.BACKEND_URL}/notifications/read-all`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({} as { error?: string; message?: string }));
      const message = errData.message ?? errData.error ?? "Failed to mark all as read";
      return backendHttpErrorResponse(message, response.status, "Failed to mark all as read", {
        route: "PATCH /api/notifications/read-all",
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return internalProxyErrorResponse({ route: "PATCH /api/notifications/read-all" }, error);
  }
}
