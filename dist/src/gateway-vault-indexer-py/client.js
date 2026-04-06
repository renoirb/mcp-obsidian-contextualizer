/**
 * Gateway client for the vault-indexer Python service.
 *
 * Wraps the vault-indexer HTTP API with typed methods.
 * Uses fetch (Deno built-in) — no external HTTP client needed.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
export class VaultIndexerClient {
    baseUrl;
    vaultPath;
    configPath;
    constructor(config) {
        // Strip trailing slash for consistent URL building
        this.baseUrl = config.baseUrl.replace(/\/+$/, "");
        this.vaultPath = config.vaultPath;
        this.configPath = config.configPath;
    }
    /**
     * Fetch a JSON endpoint from the vault-indexer.
     * Returns the parsed JSON on success, or throws with a clear message.
     */
    async fetchJson(path) {
        const url = `${this.baseUrl}${path}`;
        let response;
        try {
            response = await fetch(url);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`vault-indexer not reachable at ${this.baseUrl}: ${msg}`);
        }
        if (!response.ok) {
            const body = await response.text().catch(() => "");
            throw new Error(`vault-indexer returned ${response.status} for ${path}: ${body}`);
        }
        return (await response.json());
    }
    async status() {
        return this.fetchJson("/status");
    }
    async search(params) {
        const qs = new URLSearchParams({ q: params.q });
        if (params.scope)
            qs.set("scope", params.scope);
        if (params.limit !== undefined)
            qs.set("limit", String(params.limit));
        return this.fetchJson(`/search?${qs}`);
    }
    async fileInfo(basename) {
        return this.fetchJson(`/files/${encodeURIComponent(basename)}`);
    }
    async orphans() {
        return this.fetchJson("/orphans");
    }
    async brokenLinks() {
        return this.fetchJson("/broken-links");
    }
    async missingBacklinks() {
        return this.fetchJson("/missing-backlinks");
    }
    async tags(prefix) {
        const path = prefix
            ? `/tags?prefix=${encodeURIComponent(prefix)}`
            : "/tags";
        return this.fetchJson(path);
    }
    async build() {
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
        }
        catch (err) {
            const execErr = err;
            const detail = execErr.stderr || execErr.stdout || execErr.message || String(err);
            return {
                success: false,
                message: `Index build failed: ${detail}`,
            };
        }
    }
}
