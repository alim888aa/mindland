export function normalizeTimeZone(timeZone: string) {
  const normalized = timeZone.trim();

  if (normalized.length === 0 || normalized.length > 100) {
    throw new Error("The time zone is invalid.");
  }

  new Intl.DateTimeFormat("en", { timeZone: normalized }).format(0);
  return normalized;
}

export const checkInQueuedLeaseMs = 2 * 60 * 1_000;
export const checkInStreamingLeaseMs = 15 * 60 * 1_000;
export const checkInModelRequestTimeoutMs = 8 * 60 * 1_000;

export function createCheckInGenerationLease(
  timeoutMs = checkInModelRequestTimeoutMs,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(
      new Error("The daily check-in model request exceeded its lease."),
    );
  }, timeoutMs);

  return {
    signal: controller.signal,
    release: () => clearTimeout(timeout),
  };
}

export function localDateForTimeZone(timeZone: string, now = Date.now()) {
  const normalized = normalizeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: normalized,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  if (!values.year || !values.month || !values.day) {
    throw new Error("The local date could not be determined.");
  }

  return `${values.year}-${values.month}-${values.day}`;
}

export function isCurrentLocalDate(
  localDate: string,
  timeZone: string,
  now = Date.now(),
) {
  return localDateForTimeZone(timeZone, now) === localDate;
}

export function isSameCheckInRequest(
  submission: { requestText?: string },
  text: string,
) {
  return submission.requestText !== undefined && submission.requestText === text;
}

export function isOwnedCheckIn(
  checkIn: { ownerTokenIdentifier: string } | null,
  ownerTokenIdentifier: string,
) {
  return (
    checkIn !== null &&
    checkIn.ownerTokenIdentifier === ownerTokenIdentifier
  );
}

export function boundCheckInForRequest<T extends {
  localDate: string;
  timeZone: string;
}>(latest: T | null, now = Date.now()) {
  if (
    latest !== null &&
    isCurrentLocalDate(latest.localDate, latest.timeZone, now)
  ) {
    return latest;
  }

  return null;
}

export type RetryAction = "wait" | "queue" | "requestAbort";

export function retryActionForSubmission(options: {
  status: "queued" | "streaming" | "completed" | "failed";
  stale: boolean;
  retryAlreadyRequested: boolean;
}): RetryAction {
  if (options.retryAlreadyRequested || options.status === "completed") {
    return "wait";
  }

  if (options.status === "failed") {
    return "queue";
  }

  if (!options.stale) {
    return "wait";
  }

  return options.status === "streaming" ? "requestAbort" : "queue";
}
