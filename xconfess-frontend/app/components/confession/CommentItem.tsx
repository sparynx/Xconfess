"use client";

import { type Comment } from "@/app/lib/types/confession";
import { formatDate } from "@/app/lib/utils/formatDate";
import { MessageCircle } from "lucide-react";

interface CommentItemProps {
  comment: Comment;
  onReply?: (comment: Comment) => void;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  onReply,
  isReply = false,
}: CommentItemProps) {
  const date =
    typeof comment.createdAt === "string"
      ? formatDate(new Date(comment.createdAt))
      : formatDate(new Date());

  return (
    <article
      className={`rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 ${
        isReply ? "ml-6 sm:ml-8 border-l-2 border-l-zinc-700" : ""
      } ${comment.isOptimistic ? "opacity-80" : ""}`}
      data-comment-id={comment.id}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-400">
            {comment.author || "Anonymous"}
          </span>
          {comment.isOptimistic && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              Sending
            </span>
          )}
        </div>
        <time
          className="text-xs text-zinc-500"
          dateTime={
            typeof comment.createdAt === "string"
              ? comment.createdAt
              : new Date().toISOString()
          }
        >
          {date}
        </time>
      </div>
      <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
        {comment.content}
      </p>
      {onReply && (
        <button
          type="button"
          onClick={() => onReply(comment)}
          className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
          aria-label={`Reply to comment by ${comment.author}`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Reply
        </button>
      )}
    </article>
  );
}
