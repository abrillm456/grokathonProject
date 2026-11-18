"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="wordmark text-3xl">
          LIFE<span>//</span>RIVAL
        </p>
        <p className="mt-3 text-muted">Something broke while rendering this page.</p>
        <button className="btn btn-primary mt-5" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
