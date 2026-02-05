# PAI-Obsidian Sync Problem

> [!info]
> Analysis of the boundary between PAI's file conventions and Obsidian vault structure, and how the MCP fork features relate to TELOS challenges.
>
> See also: [[RENOIRB-FORKING-PLANS]]

---

## The Problem (Twice)

The same problem occurs in two places:

1. **PAI ↔ Obsidian** — PAI expects files at `~/.claude/` paths, Obsidian expects wiki-linkable documents. Some content needs to exist in both.
2. **Home ↔ Work** — Two computers, each with their own PAI and their own Obsidian vault. Some files are personal-only, some should be shared between both.

| Location | Convention | Shared? |
|----------|-----------|---------|
| `~/.claude/` (home) | PAI directory structure | Machine-local |
| `~/.claude/` (work) | PAI directory structure (reduced) | Machine-local |
| Obsidian vault (home) | Wiki-links, frontmatter, folders | Machine-local (vault syncs all personal files) |
| Obsidian vault (work) | Wiki-links, frontmatter, folders | Machine-local |

The MCP fork addresses this by being **the same software running on both machines**. The vault conventions and features work identically regardless of which workstation. The MCP doesn't need to know about PAI's internal structure — it just needs to be good at managing the vault.

> [!note]
> The vault happens to live inside a SyncThing-managed folder, but that syncs ALL personal files — not selectively. Sharing specific vault content between home and work would require either a dedicated SyncThing share, or another mechanism entirely (see below).

**The result of doing it manually:** missed files. `[[Obsidian-PAI-Sync]]` is a dead link in the vault — a document about sync that was never synced — the problem demonstrating itself.

## Two Separate Concerns

### 1. The MCP (this fork)

Runs on both computers. Provides the same tools and convention awareness everywhere. Features like tag-based write protection, wiki-link resolution, scaffolding, and self-documentation work the same on home and work machines.

**Key enabler: tag-based querying.** The MCP can list files matching specific tags, which allows identifying what should be shared. For example:
- `resource/llm/context-engineering/exportable` — files meant to be portable across contexts
- `resource/sharing/between-home-and-work` — files explicitly marked for cross-machine sharing

An MCP tool that queries by tag gives a ready-made manifest of what needs to move.

### 2. The sync (separate, future)

A separate process that handles the actual file transfer between machines. The transport mechanism is TBD — could be a dedicated SyncThing share, git, a tarball, rsync, or something else. What matters is the workflow:

1. **MCP generates the manifest** — query by tag to get the list of files that should be shared (feature 10)
2. **Output is copy-pasteable** — the file list can be fed directly into whatever sync script or tool is chosen
3. **The other machine receives and applies** — import the files, the MCP on that side handles them identically

The MCP's role is to produce the view (the dynamic file list). The transport is external.

## Connection to TELOS Challenges

### [[TELOS-Challenge-C0]]

The MCP fork directly addresses C0's root cause. Ideas arrive as fragments and need a system to capture and aggregate them. The vault folder convention (see [[RENOIRB-FORKING-PLANS#Vault Folder Convention]]) provides that structure:
- Scaffolding (feature 9) creates a place to put fragments
- The convention makes places discoverable without needing MCP
- The self-documenting endpoint (feature 3) teaches the LLM the conventions so it can navigate autonomously

### [[TELOS-Challenge-C1]]

The externalized cognition need from C1 feeds the same capture pipeline. Both challenges benefit from the vault being self-navigable and convention-driven.

## How Convention Helps the LLM (Reading)

When the MCP reads on behalf of an LLM, the convention provides **context hints without configuration:**
- Each folder's README says what the folder is for and links to its canonical document
- The canonical document (`FolderName.md`) describes the purpose in its own words
- An LLM navigating the vault can follow README → canonical doc → sub-folder READMEs to understand the structure progressively

This is **convention over configuration** — the vault explains itself.

## How Convention Helps the LLM (Writing)

When the MCP receives a write request, the convention provides **guardrails:**
- Tag-based write protection (feature 4) prevents modifying unmarked files
- The error response is not just "forbidden" — it's a **hint**: "This file is protected. Create `filename-1.md` in the default folder and link back to the original." (feature 6)
- The self-documenting endpoint (feature 3) explains these patterns upfront so the LLM can plan accordingly

The write-denied flow becomes a teaching moment: the MCP tells the LLM **what to do instead**, rather than just failing.

## Tag-Based File Discovery (MCP Feature)

To support the sync concern (without implementing sync itself), the MCP should have a tool that queries files by tag. This enables workflows like:

```
"List all files tagged resource/sharing/between-home-and-work"
→ Returns paths + frontmatter of matching files
→ External tool can then handle the actual transfer
```

This belongs in [[RENOIRB-FORKING-PLANS]] as a feature — it's a natural extension of the existing `search_notes` and `manage_tags` tools, filtered specifically by frontmatter tags.
