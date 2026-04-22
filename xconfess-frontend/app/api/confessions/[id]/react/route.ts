import {
  isValidReactionType,
  REACTION_EMOJI_MAP,
} from "@/app/lib/constants/reactions";
import { getApiBaseUrl } from "@/app/lib/config";
import { backendHttpErrorResponse, internalProxyErrorResponse } from "@/app/lib/utils/proxyError";

const BASE_API_URL = getApiBaseUrl();

/**
 * POST /api/confessions/[id]/react
 * Persists a reaction to the backend and returns updated counts
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  let correlationId: string | undefined;
  try {
    const { id } = await context.params;
    correlationId = request.headers.get("X-Correlation-ID") ?? undefined;
    const body = await request.json();
    const { type } = body;

    // Validate reaction type using shared constants
    if (!type || !isValidReactionType(type)) {
      return new Response(
        JSON.stringify({
          error: "Invalid reaction type",
          message: "Reaction type must be 'like' or 'love'",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get anonymousUserId from request headers (set by middleware or client)
    const anonymousUserId = request.headers.get("x-anonymous-user-id");

    if (!anonymousUserId) {
      return new Response(
        JSON.stringify({
          error: "Missing anonymous user ID",
          message:
            "Anonymous user ID is required. Please ensure you are logged in.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Map frontend reaction type to backend emoji representation
    const emoji = REACTION_EMOJI_MAP[type];

    // Send reaction to backend /reactions endpoint
    const reactionRes = await fetch(`${BASE_API_URL}/reactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward any authorization headers
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization")! }
          : {}),
      },
      body: JSON.stringify({
        confessionId: id,
        anonymousUserId,
        emoji,
      }),
    });

    if (!reactionRes.ok) {
      const errorText = await reactionRes.text();
      let errorMessage = "Failed to persist reaction";

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        // Use default error message if response is not JSON
      }

      return backendHttpErrorResponse(
        errorMessage,
        reactionRes.status,
        "Failed to persist reaction",
        { route: "POST /api/confessions/[id]/react", correlationId },
      );
    }

    // Fetch updated confession to return fresh reaction counts
    const confessionRes = await fetch(`${BASE_API_URL}/confessions/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 0 }, // Don't cache to get fresh counts
    });

    if (!confessionRes.ok) {
      // Reaction persisted but fetching updated counts failed — still return success
      console.warn(
        `Reaction saved but failed to fetch updated counts for confession ${id}`
      );
      return new Response(
        JSON.stringify({
          success: true,
          message: "Reaction saved successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await confessionRes.json();

    // Normalize reaction counts (backend may return array or aggregated counts)
    let reactions = { like: 0, love: 0 };

    if (Array.isArray(data.reactions)) {
      // Backend returns array of reaction records
      reactions = {
        like: data.reactions.filter((r: { emoji: string }) => {
          const emoji = String(r.emoji ?? "").toLowerCase();
          return emoji.includes("👍") || emoji.includes("like");
        }).length,
        love: data.reactions.filter((r: { emoji: string }) => {
          const emoji = String(r.emoji ?? "").toLowerCase();
          return emoji.includes("❤️") || emoji.includes("love");
        }).length,
      };
    } else if (data.reactions && typeof data.reactions === "object") {
      // Backend provides aggregated counts
      reactions = {
        like: Number(data.reactions.like ?? 0),
        love: Number(data.reactions.love ?? 0),
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        reactions,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return internalProxyErrorResponse(
      { route: "POST /api/confessions/[id]/react", correlationId },
      err,
    );
  }
}
