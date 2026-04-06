import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VaultIndexerClient } from "./client.js";

const BASE_URL = "http://127.0.0.1:7421";
const VAULT_PATH = "/tmp/test-vault";

function makeClient(overrides?: Partial<{ baseUrl: string; vaultPath: string; configPath: string }>) {
  return new VaultIndexerClient({
    baseUrl: overrides?.baseUrl ?? BASE_URL,
    vaultPath: overrides?.vaultPath ?? VAULT_PATH,
    configPath: overrides?.configPath,
  });
}

describe("VaultIndexerClient", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetchJson(data: unknown, status = 200) {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
      })
    );
  }

  function mockFetchError(message: string) {
    fetchSpy.mockRejectedValueOnce(new Error(message));
  }

  describe("status()", () => {
    it("returns index counts", async () => {
      const client = makeClient();
      const payload = { files: 100, chunks: 500, edges: 300 };
      mockFetchJson(payload);

      const result = await client.status();

      expect(result).toEqual(payload);
      expect(fetchSpy).toHaveBeenCalledWith(`${BASE_URL}/status`);
    });
  });

  describe("search()", () => {
    it("passes query and optional params", async () => {
      const client = makeClient();
      mockFetchJson([{ path: "Notes/foo.md", basename: "foo" }]);

      await client.search({ q: "hello", scope: "tags", limit: 5 });

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("/search?");
      expect(calledUrl).toContain("q=hello");
      expect(calledUrl).toContain("scope=tags");
      expect(calledUrl).toContain("limit=5");
    });

    it("omits optional params when not provided", async () => {
      const client = makeClient();
      mockFetchJson([]);

      await client.search({ q: "test" });

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("q=test");
      expect(calledUrl).not.toContain("scope=");
      expect(calledUrl).not.toContain("limit=");
    });
  });

  describe("fileInfo()", () => {
    it("encodes the basename in the URL", async () => {
      const client = makeClient();
      mockFetchJson({ path: "Notes/My Note.md", basename: "My Note" });

      await client.fileInfo("My Note");

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toBe(`${BASE_URL}/files/My%20Note`);
    });
  });

  describe("orphans()", () => {
    it("returns orphan list", async () => {
      const client = makeClient();
      const payload = [{ path: "orphan.md", basename: "orphan" }];
      mockFetchJson(payload);

      const result = await client.orphans();
      expect(result).toEqual(payload);
    });
  });

  describe("brokenLinks()", () => {
    it("returns broken links", async () => {
      const client = makeClient();
      const payload = [{ source: "a.md", target: "nonexistent" }];
      mockFetchJson(payload);

      const result = await client.brokenLinks();
      expect(result).toEqual(payload);
    });
  });

  describe("missingBacklinks()", () => {
    it("returns missing backlinks", async () => {
      const client = makeClient();
      const payload = [{ source: "a.md", target: "b.md" }];
      mockFetchJson(payload);

      const result = await client.missingBacklinks();
      expect(result).toEqual(payload);
    });
  });

  describe("tags()", () => {
    it("fetches all tags when no prefix", async () => {
      const client = makeClient();
      mockFetchJson([{ tag: "status/draft", count: 12 }]);

      await client.tags();

      expect(fetchSpy).toHaveBeenCalledWith(`${BASE_URL}/tags`);
    });

    it("passes prefix param", async () => {
      const client = makeClient();
      mockFetchJson([]);

      await client.tags("status/");

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain("prefix=status%2F");
    });
  });

  describe("error handling", () => {
    it("throws with clear message when service is unreachable", async () => {
      const client = makeClient();
      mockFetchError("Connection refused");

      await expect(client.status()).rejects.toThrow(
        "vault-indexer not reachable at http://127.0.0.1:7421: Connection refused"
      );
    });

    it("throws with status and body on non-OK response", async () => {
      const client = makeClient();
      fetchSpy.mockResolvedValueOnce(
        new Response("not found", { status: 404 })
      );

      await expect(client.fileInfo("missing")).rejects.toThrow(
        "vault-indexer returned 404 for /files/missing: not found"
      );
    });
  });

  describe("trailing slash normalization", () => {
    it("strips trailing slashes from base URL", async () => {
      const client = makeClient({ baseUrl: "http://localhost:7421///" });
      mockFetchJson({ files: 0, chunks: 0, edges: 0 });

      await client.status();

      expect(fetchSpy).toHaveBeenCalledWith("http://localhost:7421/status");
    });
  });
});
