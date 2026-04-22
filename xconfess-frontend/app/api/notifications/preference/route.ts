import { NextRequest, NextResponse } from "next/server";
import { backendHttpErrorResponse, internalProxyErrorResponse } from "@/app/lib/utils/proxyError";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    const response = await fetch(
      `${process.env.BACKEND_URL}/notifications/preferences`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({} as { error?: string; message?: string }));
      const message = errData.message ?? errData.error ?? "Failed to fetch preferences";
      return backendHttpErrorResponse(message, response.status, "Failed to fetch preferences", {
        route: "GET /api/notifications/preference",
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return internalProxyErrorResponse({ route: "GET /api/notifications/preference" }, error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    const body = await request.json();

    const response = await fetch(
      `${process.env.BACKEND_URL}/notifications/preferences`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({} as { error?: string; message?: string }));
      const message = errData.message ?? errData.error ?? "Failed to save preferences";
      return backendHttpErrorResponse(message, response.status, "Failed to save preferences", {
        route: "PUT /api/notifications/preference",
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return internalProxyErrorResponse({ route: "PUT /api/notifications/preference" }, error);
  }
}
