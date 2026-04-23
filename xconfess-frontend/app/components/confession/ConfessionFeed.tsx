"use client";

import { useEffect, useRef } from "react";
import { ConfessionCard } from "./ConfessionCard";
import { ConfessionFeedSkeleton, SkeletonCard } from "./LoadingSkeleton";
import { useConfessionsQuery } from "../../lib/hooks/useConfessionsQuery";
import ErrorState from "../common/ErrorState";

export const ConfessionFeed = () => {
  const observerTarget = useRef<HTMLDivElement>(null);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useConfessionsQuery();

  const confessions = data?.pages.flatMap((page) => page.confessions) ?? [];
  const isEmpty = !isLoading && confessions.length === 0;

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "100px", threshold: 0.1 },
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Retry handler
  const handleRetry = () => {
    void refetch();
  };

  // Loading skeletons
  const renderLoadingSkeletons = () =>
    Array.from({ length: 3 }).map((_, idx) => (
      <SkeletonCard key={`skeleton-${idx}`} />
    ));

  return (
    <div className="mx-auto w-full max-w-3xl py-2">
      {/* Empty State */}
      {isEmpty && (
        <div className="luxury-panel rounded-[30px] p-10 text-center">
          <p className="mb-3 font-editorial text-4xl text-[var(--foreground)]">
            No confessions yet.
          </p>
          <p className="mb-5 text-sm leading-7 text-[var(--secondary)]">
            Be the first to set the tone for the community.
          </p>
          <button
            onClick={handleRetry}
            className="rounded-full bg-[linear-gradient(135deg,var(--primary),var(--primary-deep))] px-5 py-2.5 text-sm font-medium text-white shadow-[0_18px_40px_-22px_rgba(143,109,60,0.85)] transition-colors hover:brightness-105"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <ErrorState
          error={error.message ?? "Failed to load confessions"}
          title="Failed to load confessions"
          description="Something went wrong while fetching confessions."
          showRetry
          onRetry={handleRetry}
        />
      )}

      {isLoading && confessions.length === 0 && <ConfessionFeedSkeleton />}

      {/* Confessions Grid */}
      {!isEmpty && confessions.length > 0 && (
        <div className="space-y-5">
          {confessions.map((confession) => (
            <ConfessionCard key={confession.id} confession={confession} />
          ))}

          {/* Loading skeletons while fetching more */}
          {isFetchingNextPage && renderLoadingSkeletons()}
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasNextPage && (
        <div
          ref={observerTarget}
          className="h-10 flex items-center justify-center mt-8"
          aria-label="Loading more confessions"
        >
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-[var(--secondary)]">
              <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--primary)]" />
              <div className="delay-100 h-2 w-2 animate-bounce rounded-full bg-[var(--primary)]" />
              <div className="delay-200 h-2 w-2 animate-bounce rounded-full bg-[var(--primary)]" />
            </div>
          )}
        </div>
      )}

      {/* End of feed message */}
      {!hasNextPage && confessions.length > 0 && (
        <div className="py-8 text-center">
          <p className="text-[var(--secondary)]">
            You&apos;ve reached the end of confessions
          </p>
        </div>
      )}
    </div>
  );
};
