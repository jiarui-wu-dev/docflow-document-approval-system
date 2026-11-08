import { afterEach, describe, expect, it, vi } from "vitest";
import {
  api,
  authenticate,
  clearCredentials,
  request,
  setUnauthorizedHandler,
} from "./api";
afterEach(() => {
  clearCredentials();
  vi.unstubAllGlobals();
});
describe("HTTP Basic API boundary", () => {
  it("authenticates identity, sends credentials only in the header, and clears them on logout", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ id: 7, username: "test", role: "ADMIN" }),
            { status: 200 },
          ),
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    await authenticate("test", "test-password");
    await api.documents({ title: "hello & world", status: "DRAFT" });
    const [url, options] = fetcher.mock.calls[1];
    expect(url).toBe("/api/documents?title=hello+%26+world&status=DRAFT");
    expect(options.headers.Authorization).toBe(
      `Basic ${btoa("test:test-password")}`,
    );
    expect(options.credentials).toBe("omit");
    expect(options.cache).toBe("no-store");
    clearCredentials();
    await request("/auth/me");
    expect(fetcher.mock.calls[2][1].headers.Authorization).toBeUndefined();
  });
  it("does not retain credentials after failed login", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(authenticate("test", "wrong")).rejects.toMatchObject({
      status: 401,
    });
    fetcher.mockResolvedValue(new Response("{}"));
    await request("/auth/me");
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });
  it("expires an authenticated session on 401 and preserves backend validation errors", async () => {
    const expired = vi.fn();
    setUnauthorizedHandler(expired);
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response('{"id":1,"username":"test","role":"ADMIN"}'),
      );
    vi.stubGlobal("fetch", fetcher);
    await authenticate("test", "test-password");
    fetcher.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(request("/documents")).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledOnce();
    fetcher.mockResolvedValue(
      new Response('{"message":"Reviewer not found"}', { status: 400 }),
    );
    await expect(
      api.create({ title: "test", description: "", reviewerId: 99 }),
    ).rejects.toThrow("Reviewer not found");
  });
  it("explains 403 and network failures", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(request("/documents")).rejects.toMatchObject({
      status: 403,
      message: "You do not have permission to perform this action.",
    });
    fetcher.mockRejectedValue(new TypeError("Network"));
    await expect(request("/documents")).rejects.toMatchObject({ status: 0 });
  });
});
