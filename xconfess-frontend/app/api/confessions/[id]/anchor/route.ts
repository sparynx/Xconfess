import { getApiBaseUrl } from "@/app/lib/config";
import { logProxyError, backendHttpErrorResponse, backendUnreachableResponse, internalProxyErrorResponse } from "@/app/lib/utils/proxyError";

const BASE_API_URL = getApiBaseUrl();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { stellarTxHash } = body;

    if (!stellarTxHash) {
      return new Response(
        JSON.stringify({ message: "Stellar transaction hash is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate transaction hash format (64 hex characters)
    if (!/^[a-fA-F0-9]{64}$/.test(stellarTxHash)) {
      return new Response(
        JSON.stringify({ message: "Invalid Stellar transaction hash format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const backendUrl = `${BASE_API_URL}/confessions/${id}/anchor`;

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stellarTxHash }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as { message?: string }));
        return backendHttpErrorResponse(
          errorData.message,
          response.status,
          `Failed to anchor confession: ${response.statusText}`,
          { route: "POST /api/confessions/[id]/anchor" },
        );
      }

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (fetchError) {
      logProxyError("Backend fetch error", { route: "POST /api/confessions/[id]/anchor" }, fetchError);

      // Demo mode fallback
      const isDemoMode =
        process.env.NODE_ENV === "development" ||
        process.env.DEMO_MODE === "true";

      if (isDemoMode) {
        return new Response(
          JSON.stringify({
            id,
            stellarTxHash,
            isAnchored: true,
            anchoredAt: new Date().toISOString(),
            stellarExplorerUrl: `https://stellar.expert/explorer/testnet/tx/${stellarTxHash}`,
            _demo: true,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Demo-Mode": "true",
            },
          }
        );
      }

      return backendUnreachableResponse({ route: "POST /api/confessions/[id]/anchor" }, fetchError);
    }
  } catch (error) {
    return internalProxyErrorResponse({ route: "POST /api/confessions/[id]/anchor" }, error);
  }
}
