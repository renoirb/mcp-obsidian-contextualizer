/**
 * Gateway client for the vault-indexer Python service.
 *
 * Wraps the vault-indexer HTTP API with typed methods.
 * Uses fetch (Deno built-in) — no external HTTP client needed.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  VaultIndexerConfig,
  IndexStatus,
  SearchParams,
  SearchResult,
  FileInfo,
  OrphanEntry,
  BrokenLink,
  MissingBacklink,
  TagCount,
  BuildResult,
} from "./types.js";

export class VaultIndexerClient {
  private readonly baseUrl: string;
  private readonly vaultPath: string;
  private readonly configPath?: string | undefined;

  constructor(config: VaultIndexerConfig) {
    // Strip trailing slash for consistent URL building
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.vaultPath = config.vaultPath;
    this.configPath = config.configPath;
  }

  /**
   * Fetch a JSON endpoint from the vault-indexer.
   * Returns the parsed JSON on success, or throws with a clear message.
   */
  private async fetchJson<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err);
      throw new Error(
        `vault-indexer not reachable at ${this.baseUrl}: ${msg}`
      );
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `vault-indexer returned ${response.status} for ${path}: ${body}`
      );
    }
    return (await response.json()) as T;
  }

  async status(): Promise<IndexStatus> {
    return this.fetchJson<IndexStatus>("/status");
  }

  async search(params: SearchParams): Promise<SearchResult[]> {
    const qs = new URLSearchParams({ q: params.q });
    if (params.scope) qs.set("scope", params.scope);
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    return this.fetchJson<SearchResult[]>(`/search?${qs}`);
  }

  async fileInfo(basename: string): Promise<FileInfo> {
    return this.fetchJson<FileInfo>(
      `/files/${encodeURIComponent(basename)}`
    );
  }

  async orphans(): Promise<OrphanEntry[]> {
    return this.fetchJson<OrphanEntry[]>("/orphans");
  }

  async brokenLinks(): Promise<BrokenLink[]> {
    return this.fetchJson<BrokenLink[]>("/broken-links");
  }

  async missingBacklinks(): Promise<MissingBacklink[]> {
    return this.fetchJson<MissingBacklink[]>("/missing-backlinks");
  }

  async tags(prefix?: string): Promise<TagCount[]> {
    const path = prefix
      ? `/tags?prefix=${encodeURIComponent(prefix)}`
      : "/tags";
    return this.fetchJson<TagCount[]>(path);
  }

  async build(): Promise<BuildResult> {
    const execFileAsync = promisify(execFile);
    const args = ["run", "vault-indexer", "build", "--vault", this.vaultPath];
    if (this.configPath) {
      args.push("--config", this.configPath);
    }

    try {
      const { stdout, stderr } = await execFileAsync("uv", args);
      return {
        success: true,
        message: stdout || stderr || "Index build completed.",
      };
    } catch (err: unknown) {
      const execErr = err as { stderr?: string; stdout?: string; code?: number; message?: string };
      const detail = execErr.stderr || execErr.stdout || execErr.message || String(err);
      return {
        success: false,
        message: `Index build failed: ${detail}`,
      };
    }
  }
}
