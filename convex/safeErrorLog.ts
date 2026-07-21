export type SafeErrorCategory =
  | "aborted"
  | "timeout"
  | "type-error"
  | "syntax-error"
  | "runtime-error"
  | "unknown";

export function safeErrorCategory(error: unknown): SafeErrorCategory {
  if (!(error instanceof Error)) return "unknown";

  switch (error.name) {
    case "AbortError":
      return "aborted";
    case "TimeoutError":
      return "timeout";
    case "TypeError":
      return "type-error";
    case "SyntaxError":
      return "syntax-error";
    default:
      return "runtime-error";
  }
}

export function logSafeFailure(event: string, error: unknown) {
  console.error(event, { category: safeErrorCategory(error) });
}
