/**
 * MCP tool definitions and dispatch for vault-indexer gateway tools.
 *
 * Exports:
 * - `vaultIndexerToolDefs` — array of tool schemas for ListTools
 * - `handleVaultIndexerTool` — dispatcher for CallTools
 */

import type { VaultIndexerClient } from "./client.js";

/** Tool schemas for the ListToolsRequestSchema handler. */
export const vaultIndexerToolDefs = [
  {
    name: "vault_index_status",
    description:
      "Returns the current vault-indexer status: counts of indexed files, chunks, and edges.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "vault_search",
    description:
      "Search the indexed vault by basename, tags, or full-text. Returns matching file paths with metadata.",
    inputSchema: {
      type: "object" as const,
      properties: {
        q: {
          type: "string",
          description: "Search query string",
        },
        scope: {
          type: "string",
          enum: ["basename", "tags", "all"],
          description: "Search scope (default: all)",
        },
        limit: {
          type: "number",
          description: "Maximum results to return",
        },
      },
      required: ["q"],
    },
  },
  {
    name: "vault_file_info",
    description:
      "Full metadata for a single indexed file: tags, outgoing links, backlinks, headings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        basename: {
          type: "string",
          description: "File basename (e.g. 'My-Note' or 'My-Note.md')",
        },
      },
      required: ["basename"],
    },
  },
  {
    name: "vault_orphans",
    description:
      "Lists notes with zero incoming wikilinks — candidates for cleanup or linking.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "vault_broken_links",
    description:
      "Lists wikilinks that point to files that don't exist in the vault.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "vault_missing_backlinks",
    description:
      "Lists one-directional links: A links to B, but B doesn't link back to A.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "vault_tags",
    description:
      "Returns tag usage counts across the indexed vault, optionally filtered by prefix.",
    inputSchema: {
      type: "object" as const,
      properties: {
        prefix: {
          type: "string",
          description: "Filter tags by this prefix (e.g. 'status/')",
        },
      },
    },
  },
  {
    name: "vault_index_build",
    description:
      "Triggers a full rebuild of the vault index. This runs the indexer CLI and may take a while for large vaults.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

/** Names of all vault-indexer tools, for use in the dispatch check. */
export const vaultIndexerToolNames = new Set(
  vaultIndexerToolDefs.map((t) => t.name)
);

/**
 * Handle a vault-indexer tool call. Returns the MCP response content.
 * Throws if the tool name is not recognized.
 */
export async function handleVaultIndexerTool(
  name: string,
  args: Record<string, unknown>,
  client: VaultIndexerClient
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    let result: unknown;

    switch (name) {
      case "vault_index_status":
        result = await client.status();
        break;
      case "vault_search":
        result = await client.search({
          q: args.q as string,
          scope: args.scope as "basename" | "tags" | "all" | undefined,
          limit: args.limit as number | undefined,
        });
        break;
      case "vault_file_info":
        result = await client.fileInfo(args.basename as string);
        break;
      case "vault_orphans":
        result = await client.orphans();
        break;
      case "vault_broken_links":
        result = await client.brokenLinks();
        break;
      case "vault_missing_backlinks":
        result = await client.missingBacklinks();
        break;
      case "vault_tags":
        result = await client.tags(args.prefix as string | undefined);
        break;
      case "vault_index_build":
        result = await client.build();
        break;
      default:
        throw new Error(`Unknown vault-indexer tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}
