import { misconfiguredBackendResponse, internalProxyErrorResponse } from "@/app/lib/utils/proxyError";

const BASE_API_URL = process.env.BACKEND_API_URL;

export async function POST(request: Request) {
  if (!BASE_API_URL) return misconfiguredBackendResponse();

  try {
    const body = await request.json();
    const backendUrl = `${BASE_API_URL}/users/register`;

    const correlationId = request.headers.get("X-Correlation-ID") || "unknown";

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
      },
      body: JSON.stringify(body),
    });

    const responseBody = await response.text();
    const status = response.status;

    return new Response(responseBody, {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return internalProxyErrorResponse({ route: "POST /api/users/register" }, error);
  }
}
