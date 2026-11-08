import type {
  CreateDocument,
  Document,
  Filters,
  History,
  ReviewComment,
  Status,
  User,
} from "./types";
let authorization: string | undefined;
let unauthorized: (() => void) | undefined;
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function setUnauthorizedHandler(handler: () => void) {
  unauthorized = handler;
}
export function clearCredentials() {
  authorization = undefined;
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
  credentials = authorization,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      cache: "no-store",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(credentials ? { Authorization: credentials } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      "Cannot reach DOCFLOW. Check that the backend is running and try again.",
    );
  }
  if (!response.ok) {
    if (response.status === 401 && credentials === authorization)
      unauthorized?.();
    const body: unknown = await response.json().catch(() => null);
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : null;
    throw new ApiError(
      response.status,
      response.status === 401
        ? "Your credentials were not accepted. Please sign in again."
        : response.status === 403
          ? "You do not have permission to perform this action."
          : message || `Request failed (${response.status}). Please try again.`,
    );
  }
  return response.json() as Promise<T>;
}
export async function authenticate(
  username: string,
  password: string,
): Promise<User> {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  const basic = `Basic ${btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))}`;
  const user = await request<User>("/auth/me", {}, basic);
  authorization = basic;
  return user;
}
export const api = {
  documents: (filters: Filters = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return request<Document[]>(`/documents?${params}`, { signal });
  },
  document: (id: string, signal?: AbortSignal) =>
    request<Document>(`/documents/${id}`, { signal }),
  history: (id: string) => request<History[]>(`/documents/${id}/history`),
  comments: (id: string) =>
    request<ReviewComment[]>(`/documents/${id}/comments`),
  create: (body: CreateDocument) =>
    request<Document>("/documents", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  transition: (id: number, status: Status, remark: string) =>
    request<Document>(`/documents/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, remark }),
    }),
  comment: (id: number, content: string) =>
    request<ReviewComment>(`/documents/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
