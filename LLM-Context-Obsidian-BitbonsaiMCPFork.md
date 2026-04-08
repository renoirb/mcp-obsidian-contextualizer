---
title: Context for Obsidian BitBonsai MCP Fork
aliases:
  - Context for Obsidian BitBonsai MCP Fork
  - BitBonsai MCP Fork
  - mcp-obsidian fork
tags:
  - resource/llm/context-engineering/exportable
  - type/configuration
  - type/knowledge
created: 2026-03-11
modified: 2026-03-11
related:
  - "[[RENOIRB-PAI-OBSIDIAN-SYNC-PROBLEM]]"
---

# Context for Obsidian BitBonsai MCP Fork

## Summary

**Purpose:** General context for personal improvements to the `bitbonsai/mcp-obsidian` MCP server. This fork makes the MCP a first-class citizen for LLMs working with an Obsidian vault — including when the vault isn't on the local filesystem. Three pillars:

1. **Truth:** The MCP is the authoritative source for things the LLM would otherwise guess — today's date and timezone (so frontmatter `modified:` fields are correct, not hallucinated), tag vocabularies (so the LLM uses governed terms, not invented ones), document conventions (so the LLM follows the vault's own rules).
2. **Precision:** Section extraction and size metadata so the LLM loads exactly what it needs, not entire documents that get silently truncated by context budget limits downstream.
3. **Access:** Vault-aware resolution (wiki-links, name-based paths, folder conventions) so LLMs can navigate the vault by its own linking system — the same way Obsidian does — regardless of whether the vault is local, remote, or accessed through an intermediary.

## Details

**Fork:** [renoirb/mcp-obsidian-contextualizer](https://github.com/renoirb/mcp-obsidian-contextualizer) — a few HEADs off upstream main.
**Upstream:** [bitbonsai/mcp-obsidian](https://github.com/bitbonsai/mcp-obsidian) — an MCP server that exposes Obsidian vault operations (read, write, search, tag management) to LLM clients via the Model Context Protocol.

**Fork rationale:** The upstream server is a competent pass-through — it reads and writes files, manages tags, and searches notes. But it treats the vault as a flat filesystem. It has no awareness of vault structure, document conventions, the LLM context window problem, or the fact that an LLM has no reliable source of truth for metadata like timestamps and timezones. This fork makes the MCP server an informed intermediary that understands the vault it serves and compensates for what LLMs inherently cannot know.

**Related:**
- [[RENOIRB-PAI-OBSIDIAN-SYNC-PROBLEM]] — Analysis of how these features relate to the PAI-to-Obsidian boundary

### Vault Folder Convention

This convention underpins several features below (referenced as "the folder convention").

Every folder in the vault contains two sibling files:
1. **A document matching the folder name** — the authoritative content for that folder
2. **A `README.md`** — a navigation shim that redirects to and transcludes the main document

**Example** — for a vault rooted at `~/Documents/Obsidian/SomeVaultName/`:

At the vault root:
- `README.md`:
  ```markdown
  ---
  redirect: "[[SomeVaultName]]"
  ---

  ![[SomeVaultName]]
  ```
- `SomeVaultName.md`:
  ```markdown
  ---
  title: "Some Vault Name"
  ---

  # Some Vault Name

  This is my personal Obsidian Vault.

  ## Shared Between Home And Work

  The files in this vault stored in the path `Sharing-Between-Contexts/Between-Home-And-Work/` are intended to be used for both at home and work.
  ```

This pattern repeats at every level:
- `Sharing-Between-Contexts/README.md`
- `Sharing-Between-Contexts/Sharing-Between-Contexts.md`
- `Sharing-Between-Contexts/Between-Home-And-Work/README.md`
- `Sharing-Between-Contexts/Between-Home-And-Work/Between-Home-And-Work.md`

**Dual-access navigability:**
1. **With MCP** — AI clients use wiki-links (`[[Between-Home-And-Work]]`) to resolve documents by name regardless of path (see OBS-001)
2. **Without MCP** — Any tool with raw filesystem access (CLI, LLMs reading files directly, file browsers) can navigate the vault by following `README.md` files in each folder, which provide both a redirect hint (frontmatter) and inline content (transclusion)

The READMEs act as signposts: they explain what's in the folder and point to the canonical document, making the vault self-navigable even outside Obsidian.

### Key Technical Constraints

- **Serialization:** The codebase uses `gray-matter` with `js-yaml` v3, which applies implicit timestamp detection and single-quotes date-like strings in frontmatter. This is a known serialization concern independent of any timestamp feature.
- **No auto-date injection in current upstream:** Obsidian's native "Update time on edit" plugin handles edits within Obsidian, but MCP-originated writes have no authoritative timestamp source. OBS-012 addresses this gap.
- **No section extraction in current upstream:** `read_note` returns full file content. No markdown heading awareness exists — `gray-matter` handles frontmatter only, not content structure. OBS-013 and OBS-014 address this.

### The Context Truncation Problem (Motivates OBS-007, OBS-013, OBS-014)

When an LLM loads multiple vault documents via MCP, information is silently lost. This was observed directly during the session that produced this fork plan (2026-03-11). Here is the chain of events:

**What happened:**

1. LLM requested two pattern spec documents (~26KB each) via `read_multiple_notes`
2. MCP server returned full content — **52KB, no truncation** (confirmed: the server has zero truncation logic on reads)
3. Claude Code client displayed: `⚠ Large MCP response (~13.0k tokens), this can fill up context quickly`
4. The response was **persisted to a `.json` file** on disk instead of being inlined into conversation context
5. LLM attempted to `Read` the persisted file back — it was again too large, re-persisted to another file
6. **The full content never re-entered the LLM's working context**
7. LLM delegated to a sub-agent (separate context window) which loaded the specs fresh — but the main conversation lost access to the details

**The layers where information can be lost:**

```
Layer 1: MCP Server          → Sends full content (no loss here)
Layer 2: MCP Client/SDK      → May enforce transport limits (unclear)
Layer 3: Claude Code client   → Context budget protection: large responses
                                persisted to disk instead of inlined
Layer 4: Context compression  → As conversation grows, earlier messages
                                are automatically compressed (lossy)
Layer 5: Sub-agent boundary   → Sub-agent has full content but returns
                                only a summary to the parent conversation
```

Layers 3-5 are outside the MCP server's control, but **Layer 1 is where the fix belongs**: if the server can serve exactly the section needed (not the full 26KB doc), the response stays small enough to survive all downstream layers intact.

**Why "make documents smaller" is not a solution:**

- It constrains the author rather than fixing the pipeline
- A 500-line context doc is 500 lines because it needs to be — it captures architecture decisions, session history, cross-references
- Splitting into many small docs shifts the problem to "too many `read_note` calls" and loses the cohesion that makes a single document useful
- The same doc that's "too large" for a batch load of 5 files is perfectly fine when loaded alone — the problem is contextual, not absolute
- It's kicking the can: eventually any doc grows past whatever arbitrary limit you set

**The actual solution — surgical reads:**

The MCP server should let the LLM request exactly what it needs:
- `[[Doc#Heading]]` returns one section, not the full file (OBS-013)
- Size metadata lets the LLM plan its loads before committing context budget (OBS-014)
- Wiki-link resolution means the LLM doesn't need to know file paths (OBS-007)

This matches how Obsidian itself works: `![[Doc#Section]]` transcludes a section, not the whole file. The MCP should offer the same granularity.

---

### Work Tickets

#### Core Infrastructure

- OBS-001: Name-based path resolution -- (planned) ^ticket-obs-001
- OBS-002: Unique document names with whitelisted exceptions -- (planned) ^ticket-obs-002
- OBS-009: Folder scaffolding following vault convention -- (planned) ^ticket-obs-009

#### LLM Experience

- OBS-003: Self-documenting MCP endpoint for AI clients -- (planned) ^ticket-obs-003
- OBS-007: Wiki-link query with section extraction -- (planned) ^ticket-obs-007
- OBS-008: Transclusion and content embedding support -- (planned) ^ticket-obs-008
- OBS-013: Heading-based section extraction for read operations -- (planned) ^ticket-obs-013
- OBS-014: LLM context budget awareness and size metadata -- (planned) ^ticket-obs-014

#### Write Safety

- OBS-004: Tag-based write protection via frontmatter -- (planned) ^ticket-obs-004
- OBS-005: Configurable default file creation location -- (planned) ^ticket-obs-005
- OBS-006: Write-denied error handling with auto-increment fallback -- (planned) ^ticket-obs-006

#### Discovery and Vocabulary

- OBS-010: Tag-based file discovery tool -- (planned) ^ticket-obs-010
- OBS-011: Tag and naming vocabulary exposure from vault documents -- (planned) ^ticket-obs-011

#### Serialization and Dates

- OBS-012: Config-driven automatic timestamps on write -- (planned) ^ticket-obs-012

---

### Feature Specifications

#### OBS-001: Name-based path resolution

When a document is referenced by name alone (without its full path), resolve it to the actual location in the vault — similar to how a 301 redirect works. For example, querying `Bar` should resolve to `foo/bar/Bar.md` regardless of where it lives in the hierarchy.

#### OBS-002: Unique document names with whitelisted exceptions

Enforce that document filenames are unique across the vault. Certain filenames (e.g., `README.md`) are whitelisted as exceptions since they repeat by convention in every folder (see vault folder convention). The uniqueness check allows name-based resolution (OBS-001) to be unambiguous. If a non-whitelisted filename appears in multiple locations, the server should flag it as a conflict.

#### OBS-003: Self-documenting MCP endpoint

Add a "manual" or "help" tool to the MCP server that explains: how to use the server, the vault folder convention and link conventions, what error codes mean and how to resolve them. This makes the MCP server self-explanatory to any AI client connecting to it.

#### OBS-004: Tag-based write protection

Before writing to a file, check its frontmatter tags. A configurable required tag must be present for writes to be allowed. If the tag is missing, the write is denied. This prevents AI clients from modifying notes that haven't been explicitly marked as writable.

#### OBS-005: Configurable default file creation location

Allow configuration of where new files are automatically created in the vault (e.g., a designated inbox or drafts folder).

#### OBS-006: Write-denied error handling with auto-increment fallback

When a write is denied (e.g., missing the required tag from OBS-004): return a proper client error (405 Method Not Allowed or similar — not a 500 server error, since the client is the one not allowed to write). Offer to create a new file in the default folder with the same name plus an increment (e.g., `page-1.md`, `page-2.md`). The new file should include a link back to the original, indicating it's intended as a proposed replacement. This is one of the error codes that the self-documenting endpoint (OBS-003) should explain.

#### OBS-007: Wiki-link query with section extraction

Support querying using Obsidian's `[[Document Name]]` wiki-link syntax:
- `[[Document Name]]` resolves the document regardless of where it sits in the vault hierarchy
- `[[Document Name#Heading]]` returns **only the section** under that heading
- Section extraction logic: detect the heading level (e.g., `##` = h2), return everything from that heading down to (but not including) the next heading at the same or higher level. Sub-headings within the section are included.
- The document can be large, but only the referenced section is returned

#### OBS-008: Transclusion / content embedding

Support Obsidian's `![[Document Name]]` embed syntax to include content from other documents inline. This enables stitching together content from multiple notes using native Obsidian markup, allowing composed documents that pull from authoritative sources.

#### OBS-009: Folder scaffolding

An MCP tool that automates creating new folder structures following the vault folder convention.

**Discovery:** The tool can inventory existing "places" in the vault by scanning for `README.md` files and their sibling documents (the file whose name matches the parent folder). This gives an AI client a quick map of the vault's organizational structure.

**Creation:** Given a path (e.g., `Sharing-Between-Contexts/Between-Home-And-Work/Project-Alpha`), the tool scaffolds:
- `Project-Alpha/Project-Alpha.md` — the main document, with frontmatter and a heading ready to fill in
- `Project-Alpha/README.md` — the navigation shim with `redirect` frontmatter and transclusion of the main document

**Use case:** An AI client can respond to a request like _"Let's have a sub-folder in the vault where we regroup all files describing X and we can share them for the project at work"_ by:
1. Listing existing places to find the right parent folder
2. Scaffolding the new folder with the convention files
3. Updating the parent's main document to reference the new sub-folder

#### OBS-010: Tag-based file discovery

An MCP tool that queries files by frontmatter tag and returns their paths and metadata. This extends the existing `search_notes` and `manage_tags` tools with tag-specific filtering.

**Use cases:**
- `resource/llm/context-engineering/exportable` — find files meant to be portable across contexts
- `resource/sharing/between-home-and-work` — find files explicitly marked for cross-machine sharing

The MCP itself does not sync files between machines — that's a separate concern (see [[RENOIRB-PAI-OBSIDIAN-SYNC-PROBLEM]]). But by providing a tag-based manifest of what should move, the MCP gives external sync tools the information they need.

#### OBS-011: Tag and naming vocabulary exposure

The MCP should be able to tell the LLM **which tags are allowed and what each one means**. Rather than letting the LLM invent arbitrary tags, the server exposes a governed vocabulary.

The source of truth is **a document in the vault itself**. Documents like [[TAGGING-CONVENTION-PAI-OBSIDIAN]] and [[Agentic-Writing-Contexts/Shared-Between-Home-And-Work/PAI-OBSIDIAN-BRIDGING]] already exist (on the work machine) with this kind of content. The MCP looks for a well-known document name, reads the relevant sections, and serves them as-is. No external config files, no server-side configuration — the vault documents its own conventions, and the MCP reads them. This self-referential pattern (the system describes itself using its own medium) is a recurring strategy — see [[TELOS-Challenge-C0]], [[Meta-Toolsmith]].

**Example tags** (there is more documentation scattered around the vault):
- `resource/llm/context-engineering/exportable` — portable across LLM contexts
- `resource/sharing/between-home-and-work` — should be available on both machines
- `ai-writable` — MCP is allowed to modify this file

The MCP could also report tags found in the vault that aren't in the manifest document — surfacing "wild" tags that haven't been formally documented yet.

**Connects to:** OBS-003 (self-documenting endpoint), OBS-004 (tag-based write protection), OBS-010 (tag-based discovery).

#### OBS-012: Config-driven automatic timestamps

Allow the MCP to automatically set a frontmatter timestamp field on write operations, using the server's authoritative timezone — removing the need for the LLM to guess.

**Problem:** When an LLM calls `update_frontmatter` and wants to record a "last modified" timestamp, it has no authoritative timezone source. It may guess UTC, infer from session context, or omit it entirely. Meanwhile, Obsidian's native plugins (Properties, "Update time on edit") handle this correctly using the local OS clock — but only when the user edits within Obsidian, not when the MCP writes.

**Design:** The MCP startup config gains an optional `autoTimestamp` block:

```jsonc
{
  "vaultPath": "/path/to/vault",
  "autoTimestamp": {
    "fieldName": "updated",              // user picks their convention
    "timezone": "America/Los_Angeles",   // IANA timezone identifier
    "format": "iso8601"                  // or "date-only", "iso8601-local", etc.
  }
}
```

**Behavior:**
- When configured, `write_note` and `update_frontmatter` inject the configured field with the current time in the configured timezone and format
- When absent, the MCP remains a pure pass-through (current behavior)
- The configured field name, timezone, and format are exposed via a `get_config` tool so LLMs can discover the convention at runtime

**Why server-side, not LLM-side:** The MCP runs on the user's machine — `Intl.DateTimeFormat` with IANA timezone is authoritative. The LLM has no reliable timezone source and would be guessing. Config is set once; works for any LLM client.

**Relationship to Obsidian native:** Obsidian's "Update time on edit" covers edits inside Obsidian. This covers edits via MCP — filling the gap. Both write to the same field name, so they complement rather than conflict.

#### OBS-013: Heading-based section extraction

Extend `read_note` (and `read_multiple_notes`) with an optional `section` parameter accepting the heading text.

Section extraction logic (simple line-scan, no AST library needed):
1. Scan lines for a heading matching the section text (case-insensitive, ignoring `#` prefix)
2. Record the heading level (number of `#` characters)
3. Collect all lines from that heading until the next heading at the same or higher level
4. Sub-headings within the section are included

**Response format:** Wrap the excerpt in an HTML comment identifying its source:

```markdown
<!-- Excerpt: [[LLM-Context-ClimateData-Programming#Runtime Context]] -->
## Runtime Context

- **Development**: ...
...map servers separately
<!-- End excerpt -->
```

**Implementation complexity:** Low-medium. A line-by-line scan with a heading regex (`/^(#{1,6})\s+(.+)$/`) is sufficient — no need for remark, markdown-it, or any AST library.

**Connects to:** OBS-001 (name-based resolution), OBS-007 (wiki-link query), OBS-008 (transclusion).

#### OBS-014: LLM context budget awareness

Expose document and section sizes so LLMs can make informed loading decisions before committing context window budget.

**Design:** A lightweight enhancement to `get_notes_info` that returns structural metadata:

```jsonc
{
  "path": "LLM-Context-ClimateData-Programming.md",
  "totalLines": 487,
  "totalChars": 18420,
  "sections": [
    { "heading": "Runtime Context", "level": 2, "startLine": 142, "lines": 35, "chars": 1280 },
    { "heading": "Build System", "level": 2, "startLine": 177, "lines": 68, "chars": 2940 }
  ]
}
```

This lets the LLM check sizes before loading, pick specific sections via OBS-013, and prioritize which documents to load fully vs. partially.

**Connects to:** OBS-013 (section extraction), OBS-003 (self-documenting endpoint).

---

### Session Findings to Pick Up Later

> [!todo] **Unwritten findings from 2026-03-11 analysis session**
>
> These details were confirmed by code inspection but not yet formalized into ticket specs or implementation notes:
>
> 1. **Serialization code path:** `update_frontmatter` → `FileSystemService.updateFrontmatter()` (`src/filesystem.ts:576-603`) → `FrontmatterHandler.stringify()` (`src/frontmatter.ts:23-34`) → `matter.stringify(content, frontmatterData)` — **no options passed**. This means gray-matter delegates to js-yaml v3 with all defaults, including single-quoting of date-like strings via implicit timestamp detection. There is no way to disable date quoting without switching to `FAILSAFE_SCHEMA` (which breaks all type detection) or migrating to js-yaml v4+.
>
> 2. **Test fixture coincidence:** The test `expect(result).toContain("modified: '2023-12-01'")` in `src/frontmatter.test.ts` is an arbitrary fixture — the field name "modified" was chosen by the test author, not evidence of auto-date behavior. The MCP has zero auto-date injection anywhere.
>
> 3. **LLM timezone guessing:** The LLM sees `PDT` in the session start system prompt but cannot verify it — it's inferring from context hints, not querying `date +%Z` or `timedatectl`. If the user travels, the context may be stale. This is the core argument for OBS-012 (server-side authoritative timestamps).
>
> 4. **`read_multiple_notes` batch limit:** Hard-coded to max 10 files (`src/filesystem.ts:531-532`). No aggregate size limit — all 10 files returned in full regardless of total size. The 10-file limit is a batch constraint, not a size constraint.
>
> 5. **No markdown parsing dependencies:** The only content-aware library is `gray-matter` (frontmatter only). No remark, marked, markdown-it, or similar. OBS-013's line-scan approach avoids adding one.
