/**
 * Centralized query keys for React Query cache management
 */

export const queryKeys = {
  confessions: {
    all: ["confessions"] as const,
    lists: () => ["confessions", "list"] as const,
    list: (params?: Record<string, unknown>) =>
      ["confessions", "list", params ?? {}] as const,
    details: () => ["confessions", "detail"] as const,
    detail: (id: string) => ["confessions", "detail", id] as const,
  },
  comments: {
    all: ["comments"] as const,
    byConfession: (confessionId: string) =>
      ["comments", "byConfession", confessionId] as const,
  },
} as const;
