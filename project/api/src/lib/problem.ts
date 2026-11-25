/**
 * RFC 9457 Problem Details — ai-rules/02-errors.md.
 * Service throw ProblemError; route KHÔNG tự build JSON lỗi. Handler toàn cục ở src/app.ts.
 */
export const PROBLEM_BASE_URI = "https://leximpact.example/problems/";
export const PROBLEM_MEDIA_TYPE = "application/problem+json";

const DEFAULTS: Record<number, [code: string, title: string]> = {
  400: ["MALFORMED_REQUEST", "Bad request"],
  401: ["UNAUTHENTICATED", "Authentication required"],
  403: ["FORBIDDEN", "Forbidden"],
  404: ["RESOURCE_NOT_FOUND", "Resource not found"],
  405: ["METHOD_NOT_ALLOWED", "Method not allowed"],
  409: ["CONFLICT", "Conflict"],
  412: ["PRECONDITION_FAILED", "Precondition failed"],
  413: ["PAYLOAD_TOO_LARGE", "Payload too large"],
  415: ["UNSUPPORTED_MEDIA_TYPE", "Unsupported media type"],
  422: ["VALIDATION_ERROR", "Validation failed"],
  428: ["PRECONDITION_REQUIRED", "Precondition required"],
  429: ["RATE_LIMITED", "Too many requests"],
  500: ["INTERNAL_ERROR", "Internal server error"],
  503: ["SERVICE_UNAVAILABLE", "Service unavailable"],
};

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export class ProblemError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;
  readonly errors?: FieldError[];
  readonly headers?: Record<string, string>;

  constructor(
    status: number,
    code?: string,
    detail?: string,
    opts: { title?: string; errors?: FieldError[]; headers?: Record<string, string> } = {},
  ) {
    const [defaultCode, defaultTitle] = DEFAULTS[status] ?? ["ERROR", "Error"];
    super(detail ?? opts.title ?? defaultTitle);
    this.status = status;
    this.code = code ?? defaultCode;
    this.title = opts.title ?? titleFromCode(this.code, defaultTitle);
    this.errors = opts.errors;
    this.headers = opts.headers;
  }
}

function titleFromCode(code: string, fallback: string): string {
  const known = Object.values(DEFAULTS).find(([c]) => c === code);
  if (known) return known[1];
  const words = code.toLowerCase().split("_").join(" ");
  return words ? words[0]!.toUpperCase() + words.slice(1) : fallback;
}

export function problemResponse(err: ProblemError, instance: string, requestId: string): Response {
  const body: Record<string, unknown> = {
    type: PROBLEM_BASE_URI + err.code.toLowerCase().replaceAll("_", "-"),
    title: err.title,
    status: err.status,
    detail: err.message,
    instance,
    code: err.code,
    request_id: requestId,
  };
  if (err.errors?.length) body.errors = err.errors;
  return new Response(JSON.stringify(body), {
    status: err.status,
    headers: { "Content-Type": PROBLEM_MEDIA_TYPE, "X-Request-Id": requestId, ...err.headers },
  });
}

export const notFound = (what = "tài nguyên") =>
  new ProblemError(404, "RESOURCE_NOT_FOUND", `Không tìm thấy ${what}.`);
