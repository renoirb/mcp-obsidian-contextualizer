# gateway-vault-indexer-py

Gateway module that proxies the vault-indexer Python service through ObsidianMCPAL's MCP interface.

## Why this exists

ObsidianMCPAL (Deno/TypeScript) handles resolution, access control, and LLM-facing tool calls.
The vault-indexer (Python/LanceDB) handles bulk indexing, structural analysis, and audit queries
over the full vault (~5000 files). These are different problems best served by different ecosystems
— see [[Blueprint-Vault-Indexer]] for the full rationale.

The two services connect over HTTP or a Unix socket. This gateway module makes the vault-indexer's
capabilities available through the same MCP interface that LLMs already use for vault reads/writes,
so the caller doesn't need to know about the Python service behind the scenes.

```
Claude Code / local LLM
    +-- MCP server (Deno/TypeScript)
         +-- Direct vault access (resolve, read, write, access control)
         +-- HTTP/socket --> vault-indexer (Python)
              +-- LanceDB (structured data, future: vectors)
              +-- Vault parser (frontmatter, wikilinks, headings)
              +-- Future: ollama (embeddings)
```

(From [[Blueprint-Vault-Indexer]], Architecture Decision: Two Services, One Socket)

## Relationship to the shared-library principle

The long-term architectural direction (idea #12 in `renoirb-obsidian-mcp-access-layer-ideas.md`)
is that the resolution engine becomes a shared library consumed by both the MCP server and the
indexer. The Python indexer's prototype had to reimplement its own frontmatter parsing, heading
extraction, and wikilink scanning because that shared library didn't exist yet — see idea #3.

This gateway is pragmatic: the indexer already works as a separate Python process with a JSON API.
Rather than wait for the shared-library extraction, we proxy its API now. When the shared library
materializes, the indexer will consume it for content extraction and access-control logic, but the
gateway pattern (MCP proxying a companion service over socket) remains valid for the capabilities
Python owns: LanceDB storage, embedding/vector operations, batch scanning.

## MCP tools exposed

| MCP tool | Vault-indexer endpoint | Description |
|---|---|---|
| `vault_index_status` | `GET /status` | Index counts (files, chunks, edges) |
| `vault_search` | `GET /search?q=...&scope=...&limit=N` | Search by basename, tags, or full-text |
| `vault_file_info` | `GET /files/{basename}` | Full metadata for one file |
| `vault_orphans` | `GET /orphans` | Notes with zero incoming wikilinks |
| `vault_broken_links` | `GET /broken-links` | Wikilinks pointing to nonexistent files |
| `vault_missing_backlinks` | `GET /missing-backlinks` | One-directional links (A-->B but B-/->A) |
| `vault_tags` | `GET /tags?prefix=...` | Tag counts, filterable by prefix |
| `vault_index_build` | (shells out to CLI) | Triggers full index rebuild via `uv run vault-indexer build` |

## Configuration

The vault-indexer base URL is read from environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `VAULT_INDEXER_URL` | `http://127.0.0.1:7421` | Base URL (TCP or Unix socket path) |
| `VAULT_INDEXER_CONFIG` | *(none)* | Config file path passed to `vault-indexer build` |

The vault path is inherited from the MCP server's own CLI argument.

## Files

- `client.ts` — `VaultIndexerClient` class wrapping `fetch` calls to the indexer API
- `tools.ts` — MCP tool schemas (`vaultIndexerToolDefs`) and dispatch function (`handleVaultIndexerTool`)
- `types.ts` — TypeScript interfaces mirroring the indexer's JSON response shapes
- `index.ts` — barrel export
- `client.test.ts` — unit tests (mocked fetch)

## See also

- [[Blueprint-Vault-Indexer]] — full spec for the Python/LanceDB indexer
- [[Blueprint-Obsidian-MCP-Access-Layer]] — ObsidianMCPAL design principles and MCP tool interface
- `renoirb-obsidian-mcp-access-layer-ideas.md` — ideas #3 (vault indexer as consumer) and #12 (shared resolution logic)
