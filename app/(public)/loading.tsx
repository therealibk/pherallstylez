export default function PublicLoading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]" aria-label="Loading…">
      <div
        className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--foreground,#111)", borderTopColor: "transparent" }}
        role="status"
        aria-hidden="true"
      />
    </div>
  );
}
