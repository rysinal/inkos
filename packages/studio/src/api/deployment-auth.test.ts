import { afterEach, describe, expect, it, vi } from "vitest";
import { createStudioServer } from "./server.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Studio deployment boundary", () => {
  it("keeps the health endpoint available without credentials", async () => {
    vi.stubEnv("INKOS_STUDIO_AUTH_USERNAME", "writer");
    vi.stubEnv("INKOS_STUDIO_AUTH_PASSWORD", "secret");
    const app = createStudioServer({} as never, process.cwd());

    const response = await app.request("http://localhost/healthz");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("protects Studio routes when deployment credentials are configured", async () => {
    vi.stubEnv("INKOS_STUDIO_AUTH_USERNAME", "writer");
    vi.stubEnv("INKOS_STUDIO_AUTH_PASSWORD", "secret");
    const app = createStudioServer({} as never, process.cwd());

    const unauthorized = await app.request("http://localhost/api/v1/not-found");
    const authorized = await app.request("http://localhost/api/v1/not-found", {
      headers: { Authorization: `Basic ${Buffer.from("writer:secret").toString("base64")}` },
    });

    expect(unauthorized.status).toBe(401);
    expect(authorized.status).toBe(404);
  });

  it("refuses an unprotected production startup", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INKOS_STUDIO_AUTH_USERNAME", "");
    vi.stubEnv("INKOS_STUDIO_AUTH_PASSWORD", "");

    expect(() => createStudioServer({} as never, process.cwd())).toThrow(
      "INKOS_STUDIO_AUTH_USERNAME and INKOS_STUDIO_AUTH_PASSWORD are required in production.",
    );
  });
});
