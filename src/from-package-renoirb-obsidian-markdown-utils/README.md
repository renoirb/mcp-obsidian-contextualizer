# from-package-renoirb-obsidian-markdown-utils

## What this is

An in-project experiment to discover what a standalone Obsidian markdown utilities package needs to do. The code here is developed inside the ObsidianMCPAL fork (`renoirb/mcp-obsidian-contextualizer`) as a way to flesh out the features before committing to a published package structure.

Everything in this folder is **core logic** — pure string processing with zero runtime or I/O dependencies. It handles wikilink parsing, fragment extraction, heading scanning, and block-id detection. It does not read files, access the network, or depend on Node.js, Deno, or any other runtime-specific API.

## Why it's here and not a package yet

Building features inside a consuming project first lets us discover the real API surface through use rather than speculation. The MCP server (`server.ts`) is the first consumer — it uses this library for wikilink resolution and section extraction. As patterns stabilize, this code moves to a standalone package in the `renoirb-esm-modules` monorepo (see the sibling project at `/Users/Shared/PAI_For_Renoir/Projects/renoirb-esm-modules/repo/packages/`).

The folder name `from-package-renoirb-obsidian-markdown-utils` is intentionally explicit — it signals "this is not MCP code, it belongs in a separate package" to anyone reading the source tree.

## Architecture

This follows the [[Professional Development Cross Runtime Module Architecture]] pattern:

- **Core logic** (this folder) — platform-agnostic pure functions. No I/O, no runtime APIs. Testable in isolation with hardcoded inputs.
- **Runtime adapters** (not yet built) — Deno, Node.js, etc. Each provides filesystem access (path listing, file reading) through a common interface. The core logic receives data from the adapter; it never fetches data itself.

When this moves to the monorepo, the structure becomes:

```
packages/obsidian-markdown-utils/
├── src/
│   ├── core/       # What's in this folder today
│   ├── deno/       # Deno filesystem adapter
│   └── node/       # Node.js filesystem adapter
└── tests/
```

## What's here

| File | Export | Purpose |
|------|--------|---------|
| `resolve-wiki-link.ts` | `parseWikiLink`, `resolveWikiLink` | Parse `[[Doc#Heading\|Display]]` syntax, resolve content against a fragment |
| `extract-fragment.ts` | `extractFragment` | Compose parse + scan to extract a heading section or block-id block |
| `parse-fragment.ts` | `parseFragment` | Discriminate `#Heading` vs `#^block-id` from a fragment string |
| `scan-headings.ts` | `scanHeadings` | Line-scan for heading boundaries with `{startLine, endLine}` ranges |
| `scan-block-ids.ts` | `scanBlockIds` | Block-id anchor detection with containing block boundaries |
| `types.ts` | Type definitions | `ObsidianLinkFragmentType`, `ParsedFragmentResult`, `HeadingInfo`, `BlockIdInfo`, `ExtractionResult` |

All extraction reduces to line ranges on `content.split('\n')`. See [[LLM-Context-ObsidianMCPAL-Resolution-Architecture]] for the full architectural description.

## Related

- [[Professional Development Cross Runtime Module Architecture]] — the cross-runtime module pattern this follows
- [[Published Renoir ESM Modules]] — the monorepo where this will eventually live
- [[README For Renoir ESM Modules]] — package conventions for the monorepo
- [[LLM-Context-ObsidianMCPAL-Resolution-Architecture]] — the resolution architecture this implements
