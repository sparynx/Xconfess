import { misconfiguredBackendResponse, internalProxyErrorResponse } from "@/app/lib/utils/proxyError";

const BASE_API_URL = process.env.BACKEND_API_URL;

export async function GET(request: Request) {
  if (!BASE_API_URL) return misconfiguredBackendResponse();

  try {
    const backendUrl = `${BASE_API_URL}/users/privacy-settings`;

    const correlationId = request.headers.get("X-Correlation-ID") || "unknown";
    const cookie = request.headers.get("cookie") || "";

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "X-Correlation-ID": correlationId,
        "cookie": cookie,
      },
    });

    const responseBody = await response.text();
    const status = response.status;

    return new Response(responseBody, {
      status,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": response.headers.get("set-cookie") || "",
      },
    });
  } catch (error) {
    return internalProxyErrorResponse({ route: "GET /api/users/privacy-settings" }, error);
  }
}

export async function PATCH(request: Request) {
  if (!BASE_API_URL) return misconfiguredBackendResponse();

  try {
    const body = await request.json();
    const backendUrl = `${BASE_API_URL}/users/privacy-settings`;

    const correlationId = request.headers.get("X-Correlation-ID") || "unknown";
    const cookie = request.headers.get("cookie") || "";

    const response = await fetch(backendUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
        "cookie": cookie,
      },
      body: JSON.stringify(body),
    });

    const responseBody = await response.text();
    const status = response.status;

    return new Response(responseBody, {
      status,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": response.headers.get("set-cookie") || "",
      },
    });
  } catch (error) {
    return internalProxyErrorResponse({ route: "PATCH /api/users/privacy-settings" }, error);
  }
}
