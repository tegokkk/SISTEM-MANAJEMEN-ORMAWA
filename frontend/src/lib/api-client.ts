import { env } from "@/config/env";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface ApiSuccessResponse<T, TMeta = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: TMeta;
}

async function requestEnvelope<T, TMeta = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiSuccessResponse<T, TMeta>> {
  const url = `${env.NEXT_PUBLIC_API_URL}${endpoint}`;

  const response = await fetch(url, {
    credentials: "include", // Always send cookies
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...options,
  });

  const json = await response.json().catch(() => ({
    success: false,
    message: "Respons dari server tidak valid",
  }));

  if (!response.ok) {
    throw new ApiClientError(
      json.message || "Terjadi kesalahan",
      response.status,
      json.errors ?? json.data
    );
  }

  return json as ApiSuccessResponse<T, TMeta>;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await requestEnvelope<T>(endpoint, options);
  return response.data;
}

export const apiClient = {
  get: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "GET" }),

  getEnvelope: <T, TMeta = unknown>(endpoint: string) =>
    requestEnvelope<T, TMeta>(endpoint, { method: "GET" }),

  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),

  postForm: <T>(endpoint: string, body: FormData) =>
    request<T>(endpoint, { method: "POST", body, headers: { Accept: "application/json" } }),

  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),

  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};
