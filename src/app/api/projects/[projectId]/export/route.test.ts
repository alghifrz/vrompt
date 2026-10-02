import { beforeEach, describe, expect, it, vi } from "vitest";
import { GenerationError, GenerationErrorCode } from "../../../../../core/generation/errors";
import { AuthError, AuthErrorCode, PersistenceError, PersistenceErrorCode } from "../../../../../server/persistence/errors";

const exportZip = vi.fn();

vi.mock("../../../../../server/runtime", () => ({
  getGenerationFlow: () => ({ exportZip }),
}));

const { GET } = await import("./route");

function request(url: string) {
  return new Request(url);
}

describe("GET /api/projects/[projectId]/export", () => {
  beforeEach(() => {
    exportZip.mockReset();
  });

  it("redirects unauthenticated callers", async () => {
    exportZip.mockRejectedValueOnce(
      new AuthError(AuthErrorCode.UNAUTHENTICATED, "Authentication required."),
    );

    const response = await GET(request("http://localhost/api/projects/p1/export?targets=cursor"), {
      params: Promise.resolve({ projectId: "p1" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/sign-in");
  });

  it("hides missing and foreign projects", async () => {
    exportZip.mockRejectedValueOnce(
      new PersistenceError(PersistenceErrorCode.NOT_FOUND, "Project not found."),
    );

    const response = await GET(request("http://localhost/api/projects/missing/export?targets=cursor"), {
      params: Promise.resolve({ projectId: "missing" }),
    });

    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toBe("Not found");
    expect(body).not.toContain("user_");
  });

  it("returns a ZIP without accepting URLs or filesystem paths as targets", async () => {
    exportZip.mockResolvedValueOnce({
      filename: "vrompt-fieldkit.zip",
      bytes: new Uint8Array([80, 75, 3, 4]),
    });

    const response = await GET(
      request(
        "http://localhost/api/projects/p1/export?targets=cursor,https://evil.test/x,../../secret",
      ),
      { params: Promise.resolve({ projectId: "p1" }) },
    );

    expect(exportZip).toHaveBeenCalledWith({
      projectId: "p1",
      targets: ["cursor"],
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="vrompt-fieldkit.zip"',
    );
  });

  it("does not return raw generation internals", async () => {
    exportZip.mockRejectedValueOnce(
      new GenerationError(
        GenerationErrorCode.GENERATION_FAILED,
        "DrizzleQueryError DATABASE_URL=secret",
      ),
    );

    const response = await GET(request("http://localhost/api/projects/p1/export?targets=cursor"), {
      params: Promise.resolve({ projectId: "p1" }),
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Export failed.");
  });
});
