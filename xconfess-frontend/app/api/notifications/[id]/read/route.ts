import { NextRequest, NextResponse } from "next/server";
import { backendHttpErrorResponse, internalProxyErrorResponse } from "@/app/lib/utils/proxyError";


export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    const response = await fetch(
      `${process.env.BACKEND_URL}/notifications/${id}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({} as { error?: string; message?: string }));
      const message = errData.message ?? errData.error ?? "Failed to mark notification as read";
      return backendHttpErrorResponse(message, response.status, "Failed to mark notification as read", {
        route: "PATCH /api/notifications/[id]/read",
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return internalProxyErrorResponse({ route: "PATCH /api/notifications/[id]/read" }, error);
  }
}
