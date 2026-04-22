import { normalizeConfession } from "../../lib/utils/normalizeConfession";
import {
  misconfiguredBackendResponse,
  backendHttpErrorResponse,
  backendUnreachableResponse,
  internalProxyErrorResponse,
} from "@/app/lib/utils/proxyError";

const BASE_API_URL = process.env.BACKEND_API_URL;

export async function POST(request: Request) {
  // Fail fast if backend URL is not configured
  if (!BASE_API_URL) return misconfiguredBackendResponse();

  try {
    const body = await request.json();
    const { title, message, body: bodyContent, gender, stellarTxHash } = body;

    if (!message && !bodyContent) {
      return new Response(
        JSON.stringify({ message: "Confession content is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const confessionContent = bodyContent || message;
    const backendUrl = `${BASE_API_URL}/confessions`;

    const backendBody: any = {
      message: confessionContent,
      body: confessionContent,
    };

    if (title) backendBody.title = title;
    if (gender) backendBody.gender = gender;
    if (stellarTxHash) backendBody.stellarTxHash = stellarTxHash;

    const correlationId = request.headers.get("X-Correlation-ID") || "unknown";

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Correlation-ID": correlationId,
        },
        body: JSON.stringify(backendBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as { message?: string }));
        return backendHttpErrorResponse(
          errorData.message,
          response.status,
          `Failed to create confession: ${response.statusText}`,
          { route: "POST /api/confessions", correlationId },
        );
      }

      const data = await response.json();
      const normalized = normalizeConfession(data);

      return new Response(JSON.stringify(normalized), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (fetchError) {
      return backendUnreachableResponse({ route: "POST /api/confessions", correlationId }, fetchError);
    }
  } catch (error) {
    const correlationId = request.headers.get("X-Correlation-ID") || "unknown";
    return internalProxyErrorResponse({ route: "POST /api/confessions", correlationId }, error);
  }
}

export async function GET(request: Request) {
  // Fail fast if backend URL is not configured
  if (!BASE_API_URL) return misconfiguredBackendResponse();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
  const limit = Math.max(1, parseInt(searchParams.get("limit") ?? "10") || 10);
  const sort = searchParams.get("sort") ?? "newest";
  const gender = searchParams.get("gender");

  const backendParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort: sort,
  });

  if (gender) {
    backendParams.append("gender", gender);
  }

  const correlationId = request.headers.get("X-Correlation-ID") || "unknown";

  try {
    const backendUrl = `${BASE_API_URL}/confessions?${backendParams}`;

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
      },
      next: {
        revalidate: 30, // Cache for 30 seconds
      },
    });

    if (!response.ok) {
      return backendHttpErrorResponse(
        undefined,
        response.status,
        `Failed to fetch confessions: ${response.statusText}`,
        { route: "GET /api/confessions", correlationId },
      );
    }

    const data = await response.json();
    const rawConfessions = data.data || data.confessions || [];
    const confessions = rawConfessions.map(normalizeConfession);

    // ✅ Compute pagination metadata properly
    const total = data.total ?? confessions.length;
    const totalPages = data.totalPages ?? Math.ceil(total / limit);

    const hasMore =
      page < totalPages || (totalPages === undefined && confessions.length > 0);

    return new Response(
      JSON.stringify({
        confessions,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasMore,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return backendUnreachableResponse({ route: "GET /api/confessions", correlationId }, error);
  }
}
