import type {
  ExtractResponse,
  MatchResponse,
  Scheme,
  StudentProfile,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly kind: "network" | "http";

  constructor(message: string, status: number, kind: "network" | "http") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind;
  }
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      cache: "no-store",
      ...init,
    });
  } catch {
    throw new ApiError(
      "Could not reach the EntitleIQ server. Check that the backend is running.",
      0,
      "network",
    );
  }

  if (!response.ok) {
    let message = `Something went wrong (status ${response.status}).`;
    try {
      const body: unknown = await response.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "detail" in body &&
        typeof body.detail === "string"
      ) {
        message = body.detail;
      }
    } catch {
      // Body was not JSON; keep the generic message.
    }
    throw new ApiError(message, response.status, "http");
  }

  return (await response.json()) as T;
}

function stripEmpty(profile: StudentProfile): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(profile)) {
    if (value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export function getSchemes(): Promise<Scheme[]> {
  return request<Scheme[]>("/api/schemes");
}

export function getScheme(id: string): Promise<Scheme> {
  return request<Scheme>(`/api/schemes/${encodeURIComponent(id)}`);
}

export function matchProfile(profile: StudentProfile): Promise<MatchResponse> {
  return request<MatchResponse>("/api/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stripEmpty(profile)),
  });
}

export function extractProfile(text: string): Promise<ExtractResponse> {
  return request<ExtractResponse>("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE}/health`, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}
