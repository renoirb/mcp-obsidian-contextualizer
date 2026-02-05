---
tags:
  - resource/shared/pai/generated/distillation
  - resource/shared/pai/referenced-obsidian-uri-source
description: Convention for tagging files shared between PAI and Obsidian. Defines grep-able markers (resource/shared/pai/...) to identify preservable PAI outputs and referenced Obsidian sources. Apply when generating documents, deciding what to preserve, or syncing between systems.
related:
  - "[[PAI-OBSIDIAN-BRIDGING]]"
  - "[[MULTI-PATH-CONTENT-SEPARATION-SPEC]]"
  - "[[I1-ObsidianExternalBrain-Sync]]"
  - "[[CHALLENGES]]"
---

# PAI-Obsidian Tagging Convention

## Purpose

This document defines the tagging convention for files that exist in a **shared knowledge relationship** between PAI (`$PAI_DIR`) and the Obsidian vault. These tags enable:

1. **Identification** — Grep-able markers to find files worth preserving
2. **Directionality** — Clear indication of which system owns the file
3. **Type classification** — What kind of document this is
4. **Constraint communication** — What actions are forbidden (e.g., renaming)

## The Problem Space

PAI generates and maintains files that distill knowledge from multiple sources. Some of these files reference Obsidian vault files via `[[WikiLinks]]`. This creates a dependency graph:

```
PAI File (generated)          Obsidian File (source)
┌─────────────────────┐       ┌─────────────────────┐
│ TECHSTACKPREFS.md   │       │ LLM-Context-TS.md   │
│                     │──────▶│                     │
│ Contains:           │       │ Authoritative       │
│ [[LLM-Context-TS]]  │       │ human-written       │
└─────────────────────┘       └─────────────────────┘
     PAI owns this              Obsidian owns this
     Back up to vault           Do not rename
```

**Problem:** PAI is non-deterministic. Files may be created, updated, or deleted across sessions. Without explicit markers, there's no reliable way to:
- Know which PAI files should be preserved/backed up
- Know which Obsidian files PAI depends on (and thus cannot be renamed)
- Distinguish permanent knowledge from transient working files

**Solution:** Explicit tags that carry intent, independent of file path.

---

## Tag Namespace

All tags use the namespace: `#resource/shared/pai/`

- `resource/` — Fits existing Obsidian taxonomy for resource classification
- `shared/` — Indicates these files exist in a sharing relationship between systems
- `pai/` — Scopes to PAI system specifically

---

## Obsidian Files (Human-Written Sources)

### Tag: `#resource/shared/pai/referenced-obsidian-uri-source`

**When to use:** Apply this tag to any Obsidian vault file that is referenced by a PAI-managed document via `[[WikiLink]]`.

**Reasoning:**
- `referenced` — PAI references this file; it's a dependency
- `obsidian` — The file lives in Obsidian, not PAI
- `uri` — The filename is an identifier (like a URI); changing it breaks the link
- `source` — This is the authoritative source; PAI's reference is derived

**Constraint:** **DO NOT RENAME** files with this tag. PAI documents contain `[[WikiLinks]]` that will break if the filename changes.

**Example files:**
- `LLM-Context-Programming-Focus-TypeScript.md`
- Any note referenced in `TECHSTACKPREFERENCES.md` or similar PAI distillations

---

## PAI Files (System-Generated)

All PAI-generated files use the base: `#resource/shared/pai/generated/`

The suffix indicates the document type. **The presence of ANY `generated/` tag means: preserve this file / back up to Obsidian.**

### Tag: `#resource/shared/pai/generated/distillation`

**When to use:** Living documents that synthesize knowledge from multiple inputs over time.

**Reasoning:** These are not single-session outputs. They accumulate and refine understanding across many conversations and sources. They represent PAI's ongoing synthesis of a domain.

**Characteristics:**
- Updated incrementally over time
- References multiple Obsidian source files
- May be manually edited by the user
- Core to PAI's operational knowledge

**Example files:**
- `skills/CORE/USER/TECHSTACKPREFERENCES.md`
- `skills/CORE/USER/DEFINITIONS.md`
- Any `USER/*.md` file that accumulates preferences/knowledge

---

### Tag: `#resource/shared/pai/generated/session`

**When to use:** Outcome notes from a specific work session, capturing decisions, context, or discussion summaries.

**Reasoning:** These document what happened in a particular session. Unlike distillations, they are point-in-time snapshots, not living documents. Valuable for recalling "what did we decide about X?"

**Characteristics:**
- Created at end of a session
- Captures session-specific context and decisions
- Not expected to be updated later
- Useful for continuity across sessions

**Example files:**
- `MEMORY/202601251206-Reorganization-Notes.md`
- Session summaries in `MEMORY/` with date prefixes

---

### Tag: `#resource/shared/pai/generated/report`

**When to use:** Auto-generated reports from PAI systems (learning captures, sentiment ratings, etc.).

**Reasoning:** These are machine-generated summaries of session outcomes. They follow a structured format and are created automatically by hooks or workflows. May want to preserve the learnings even if the specific report format changes.

**Characteristics:**
- Structured/templated format
- Generated automatically (not manually written)
- Contains extracted learnings or metrics
- Part of PAI's self-improvement feedback loop

**Example files:**
- `MEMORY/LEARNING/ALGORITHM/2026-01/2026-01-16-135216_LEARNING_sentiment-rating-5.md`
- Any file in `MEMORY/LEARNING/` directories

---

### Tag: `#resource/shared/pai/generated/research`

**When to use:** Topic-specific research or analysis on a domain question.

**Reasoning:** These are deep-dives into a specific topic, often requested by the user. They represent significant research effort and conclusions that shouldn't be lost.

**Characteristics:**
- Focused on a specific topic/question
- Contains analysis, not just raw information
- Represents research effort worth preserving
- May include recommendations or conclusions

**Example files:**
- `MEMORY/LEARNING/PROJECTS/2026-01/2026-01-21_gsr-ratio-based-systematic-investing.md`
- Topic-specific analysis documents

---

### Tag: `#resource/shared/pai/generated/investigation`

**When to use:** OSINT or entity-focused research (people, companies, etc.).

**Reasoning:** Distinct from general research in that it's entity-centric. These investigations aggregate information about a specific subject and often take significant effort to compile.

**Characteristics:**
- Focused on a person, company, or entity
- Aggregates multiple sources
- OSINT methodology
- Potentially sensitive (handle appropriately)

**Example files:**
- `MEMORY/OSINT/2026-01-17_self-investigation-renoir-boulanger.md`
- Any OSINT skill output

---

### Tag: `#resource/shared/pai/generated/plan`

**When to use:** Execution plans from `/plan` mode that are worth referencing for future similar problems.

**Reasoning:** Plans are nominally "temporary" but often contain valuable problem decomposition and approach decisions. Preserving good plans helps with similar future challenges.

**Characteristics:**
- Created during `/plan` mode
- Contains step-by-step approach
- Documents architectural decisions
- Useful as reference for similar problems

**Example files:**
- `Plans/curious-juggling-squid.md`
- Any plan file worth keeping after execution

---

## Files NOT to Tag

Do **not** apply these tags to:

| File Type | Reason |
|-----------|--------|
| System scaffolding (`MEMORY/README.md`) | May be replaced by PAI updates |
| Session metadata YAML files | Transient, machine-readable, not primary knowledge |
| Temporary working files | Not intended for preservation |
| Files that will be regenerated | Tags are for unique knowledge worth keeping |

---

## Decision Tree: Which Tag?

```
Is this file in Obsidian vault?
├─ YES → Is it referenced by a PAI file via [[WikiLink]]?
│        ├─ YES → #resource/shared/pai/referenced-obsidian-uri-source
│        └─ NO  → No PAI tag needed
│
└─ NO (file is in $PAI_DIR) → Is this worth preserving?
         ├─ NO  → No tag needed
         └─ YES → What type?
                  ├─ Living doc, many inputs → /distillation
                  ├─ Session outcome → /session
                  ├─ Auto-generated report → /report
                  ├─ Topic research → /research
                  ├─ Person/entity OSINT → /investigation
                  └─ Execution plan → /plan
```

---

## Grep Patterns

```bash
# All Obsidian files PAI depends on (constraint: don't rename)
grep -rli "#resource/shared/pai/referenced" ~/path/to/obsidian/

# All PAI files worth preserving (any type)
grep -rli "#resource/shared/pai/generated" ~/.claude/

# Specific types
grep -rli "#resource/shared/pai/generated/distillation" ~/.claude/
grep -rli "#resource/shared/pai/generated/plan" ~/.claude/

# Find which PAI files reference Obsidian (extract [[WikiLinks]])
grep -rhoP '\[\[[^\]]+\]\]' ~/.claude/ | sort -u
```

---

## For Atlas: When Generating Documents

When creating a document that will persist beyond the current session:

1. **Ask:** Is this document worth preserving for future reference?
2. **If yes:** Determine the type using the decision tree above
3. **Apply the tag** in the document (typically in YAML frontmatter or as inline tag)
4. **If the document references Obsidian files:** Note that those Obsidian files should eventually be tagged with `referenced-obsidian-uri-source`

**Tag placement:** Prefer YAML frontmatter for cleaner parsing:
```yaml
---
tags:
  - resource/shared/pai/generated/distillation
---
```

Or inline at the document end:
```markdown
---
#resource/shared/pai/generated/research
```
