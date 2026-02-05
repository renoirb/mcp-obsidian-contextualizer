# Fork Feature Plans

> [!note]
> Cleaned up from speech-to-text dictation. These are planned features for our fork of mcp-obsidian.
>
> See also: [[RENOIRB-PAI-OBSIDIAN-SYNC-PROBLEM]] — analysis of how these features relate to the PAI ↔ Obsidian boundary and TELOS challenges.

---

## Vault Folder Convention

This convention underpins several features below (referenced as "the folder convention").

Every folder in the vault contains two sibling files:
1. **A document matching the folder name** — the authoritative content for that folder
2. **A `README.md`** — a navigation shim that redirects to and transcludes the main document

### Example

For a vault rooted at `~/Documents/Obsidian/SomeVaultName/`:

At the vault root:
- `README.md`
- `SomeVaultName.md`

The README:
```markdown
---
redirect: "[[SomeVaultName]]"
---

![[SomeVaultName]]
```

The main document (`SomeVaultName.md`):
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

### Dual-access navigability

This convention serves two access modes:
1. **With MCP** — AI clients use wiki-links (`[[Between-Home-And-Work]]`) to resolve documents by name regardless of path (see feature 1)
2. **Without MCP** — Any tool with raw filesystem access (CLI, LLMs reading files directly, file browsers) can navigate the vault by following `README.md` files in each folder, which provide both a redirect hint (frontmatter) and inline content (transclusion)

The READMEs act as signposts: they explain what's in the folder and point to the canonical document, making the vault self-navigable even outside Obsidian.

---

## Features

### 1. Name-based path resolution

When a document is referenced by name alone (without its full path), resolve it to the actual location in the vault — similar to how a 301 redirect works. For example, querying `Bar` should resolve to `foo/bar/Bar.md` regardless of where it lives in the hierarchy.

### 2. Unique document names with whitelisted exceptions

Enforce that document filenames are unique across the vault. Certain filenames (e.g., `README.md`) are whitelisted as exceptions since they repeat by convention in every folder (see [Vault Folder Convention](#vault-folder-convention)).

The uniqueness check allows name-based resolution (feature 1) to be unambiguous. If a non-whitelisted filename appears in multiple locations, the server should flag it as a conflict.

### 3. Self-documenting MCP endpoint

Add a "manual" or "help" tool to the MCP server that explains:
- How to use the server
- The vault folder convention and link conventions
- What error codes mean and how to resolve them

This makes the MCP server self-explanatory to any AI client connecting to it.

### 4. Tag-based write protection

Before writing to a file, check its frontmatter tags. A configurable required tag must be present for writes to be allowed. If the tag is missing, the write is denied. This prevents AI clients from modifying notes that haven't been explicitly marked as writable.

### 5. Configurable default file creation location

Allow configuration of where new files are automatically created in the vault (e.g., a designated inbox or drafts folder).

### 6. Write-denied error handling with auto-increment fallback

When a write is denied (e.g., missing the required tag from feature 4):
- Return a proper client error (405 Method Not Allowed or similar — not a 500 server error, since the client is the one not allowed to write)
- Offer to create a **new file** in the default folder with the same name plus an increment (e.g., `page-1.md`, `page-2.md`)
- The new file should include a link back to the original, indicating it's intended as a proposed replacement

This is one of the error codes that the self-documenting endpoint (feature 3) should explain.

### 7. Wiki-link query with section extraction

Support querying using Obsidian's `[[Document Name]]` wiki-link syntax:
- `[[Document Name]]` resolves the document regardless of where it sits in the vault hierarchy
- `[[Document Name#Heading]]` returns **only the section** under that heading
- Section extraction logic:
  - Detect the heading level (e.g., `##` = h2)
  - Return everything from that heading down to (but not including) the next heading at the same or higher level
  - Sub-headings within the section (h3, h4, etc.) are included
- The document can be large, but only the referenced section is returned

### 8. Transclusion / content embedding

Support Obsidian's `![[Document Name]]` embed syntax to include content from other documents inline. This enables stitching together content from multiple notes using native Obsidian markup, allowing composed documents that pull from authoritative sources.

### 9. Folder scaffolding

An MCP tool that automates creating new folder structures following the [vault folder convention](#vault-folder-convention).

**Discovery:** The tool can inventory existing "places" in the vault by scanning for `README.md` files and their sibling documents (the file whose name matches the parent folder). This gives an AI client a quick map of the vault's organizational structure.

**Creation:** Given a path (e.g., `Sharing-Between-Contexts/Between-Home-And-Work/Project-Alpha`), the tool scaffolds:
- `Project-Alpha/Project-Alpha.md` — the main document, with frontmatter and a heading ready to fill in
- `Project-Alpha/README.md` — the navigation shim with `redirect` frontmatter and transclusion of the main document

**Use case:** An AI client can respond to a request like _"Let's have a sub-folder in the vault where we regroup all files describing X and we can share them for the project at work"_ by:
1. Listing existing places to find the right parent folder
2. Scaffolding the new folder with the convention files
3. Updating the parent's main document to reference the new sub-folder

### 10. Tag-based file discovery

An MCP tool that queries files by frontmatter tag and returns their paths and metadata. This extends the existing `search_notes` and `manage_tags` tools with tag-specific filtering.

**Use cases:**
- `resource/llm/context-engineering/exportable` — find files meant to be portable across contexts
- `resource/sharing/between-home-and-work` — find files explicitly marked for cross-machine sharing

The MCP itself does not sync files between machines — that's a separate concern (see [[RENOIRB-PAI-OBSIDIAN-SYNC-PROBLEM#2. The sync (separate, future)]]). But by providing a tag-based manifest of what should move, the MCP gives external sync tools the information they need.

### 11. Tag and naming vocabulary exposure

The MCP should be able to tell the LLM **which tags are allowed and what each one means**. Rather than letting the LLM invent arbitrary tags, the server exposes a governed vocabulary.

The source of truth is **a document in the vault itself**. Documents like [[TAGGING-CONVENTION-PAI-OBSIDIAN]] and [[Agentic-Writing-Contexts/Shared-Between-Home-And-Work/PAI-OBSIDIAN-BRIDGING]] already exist (on the work machine) with this kind of content. The MCP looks for a well-known document name, reads the relevant sections, and serves them as-is.

No external config files, no server-side configuration — the vault documents its own conventions, and the MCP reads them. This self-referential pattern (the system describes itself using its own medium) is a recurring strategy — see [[TELOS-Challenge-C0]], [[Meta-Toolsmith]].

**Example tags** (there is more documentation scattered around the vault):
- `resource/llm/context-engineering/exportable` — portable across LLM contexts
- `resource/sharing/between-home-and-work` — should be available on both machines
- `ai-writable` — MCP is allowed to modify this file

The MCP could also report tags found in the vault that aren't in the manifest document — surfacing "wild" tags that haven't been formally documented yet.

This connects to:
- Feature 3 (self-documenting endpoint) — serves the vocabulary content to LLMs
- Feature 4 (tag-based write protection) — the LLM knows upfront which tag it needs
- Feature 10 (tag-based discovery) — the vocabulary explains what each queryable tag means
