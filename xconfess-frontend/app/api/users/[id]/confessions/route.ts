import { misconfiguredBackendResponse, internalProxyErrorResponse } from "@/app/lib/utils/proxyError";

const BASE_API_URL = process.env.BACKEND_API_URL;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!BASE_API_URL) return misconfiguredBackendResponse();

  try {
    const { id } = params;
    const backendUrl = `${BASE_API_URL}/users/${id}/confessions`;

    const correlationId = request.headers.get("X-Correlation-ID") || "unknown";

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "X-Correlation-ID": correlationId,
      },
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
    return internalProxyErrorResponse({ route: "GET /api/users/[id]/confessions" }, error);
  }
}
