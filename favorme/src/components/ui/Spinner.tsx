export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`size-5 animate-spin rounded-full border-2 border-white/25 border-t-white ${className}`}
      aria-label="loading"
    />
  );
}

