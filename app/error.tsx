"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="notice">
      <h1 className="page-title">The shelf didn’t load</h1>
      <p className="lede">{error.message || "Something went wrong while reading the catalog."}</p>
      <button type="button" className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
