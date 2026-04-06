/**
 * Types for the vault-indexer Python service gateway.
 *
 * These mirror the JSON shapes returned by the vault-indexer HTTP API.
 */

export interface VaultIndexerConfig {
  /** Base URL for the vault-indexer service (e.g. "http://127.0.0.1:7421") */
  baseUrl: string;
  /** Vault path — passed to vault_index_build CLI invocation */
  vaultPath: string;
  /** Optional config path for the indexer CLI */
  configPath?: string | undefined;
}

export interface IndexStatus {
  files: number;
  chunks: number;
  edges: number;
}

export interface SearchParams {
  q: string;
  scope?: "basename" | "tags" | "all" | undefined;
  limit?: number | undefined;
}

export interface SearchResult {
  path: string;
  basename: string;
  score?: number;
  tags?: string[];
  [key: string]: unknown;
}

export interface FileInfo {
  path: string;
  basename: string;
  tags?: string[];
  links?: string[];
  backlinks?: string[];
  headings?: string[];
  [key: string]: unknown;
}

export interface OrphanEntry {
  path: string;
  basename: string;
  [key: string]: unknown;
}

export interface BrokenLink {
  source: string;
  target: string;
  [key: string]: unknown;
}

export interface MissingBacklink {
  source: string;
  target: string;
  [key: string]: unknown;
}

export interface TagCount {
  tag: string;
  count: number;
  [key: string]: unknown;
}

export interface BuildResult {
  success: boolean;
  message: string;
}
