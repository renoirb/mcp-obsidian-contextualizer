import type { BlockIdInfo } from './types.js'

const BLOCK_ID_RE = /\^([a-zA-Z0-9_-]+)\s*$/

/**
 * Scan markdown content for Obsidian block ID anchors (^identifier).
 * Returns the containing block for each anchor found.
 *
 * Block boundary rules:
 * - Paragraphs: delimited by blank lines
 * - List items: the full list (including continuation lines)
 * - Code fences: from opening ``` to closing ```
 * - Callouts: from > [!type] through consecutive > prefixed lines
 * - Tables: consecutive lines starting with |
 *
 * The ^block-id anchor appears at the end of the last line of the block.
 * Lines are 1-indexed.
 */
export function scanBlockIds(content: string): BlockIdInfo[] {
  if (!content.trim()) {
    return []
  }

  const lines = content.split('\n')
  const results: BlockIdInfo[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string
    const match = BLOCK_ID_RE.exec(line)
    if (!match) {
      continue
    }

    const id = match[1] as string
    const endLine = i + 1
    const startLine = findBlockStart(lines, i)

    results.push({
      id,
      startLine,
      endLine,
    })
  }

  return results
}

function findBlockStart(lines: string[], anchorIndex: number): number {
  const anchorLine = lines[anchorIndex] as string

  if (isClosingCodeFence(anchorLine, lines, anchorIndex)) {
    for (let i = anchorIndex - 1; i >= 0; i--) {
      if (/^```/.test(lines[i] as string)) {
        return i + 1
      }
    }
    return 1
  }

  if (/^>/.test(anchorLine)) {
    let start = anchorIndex
    for (let i = anchorIndex - 1; i >= 0; i--) {
      if (/^>/.test(lines[i] as string)) {
        start = i
      } else {
        break
      }
    }
    return start + 1
  }

  if (/^[-*]|\d+\./.test(anchorLine.trimStart())) {
    return findListStart(lines, anchorIndex)
  }

  if (/^\|/.test(anchorLine)) {
    let start = anchorIndex
    for (let i = anchorIndex - 1; i >= 0; i--) {
      if (/^\|/.test(lines[i] as string)) {
        start = i
      } else {
        break
      }
    }
    return start + 1
  }

  return findParagraphStart(lines, anchorIndex)
}

function isClosingCodeFence(line: string, lines: string[], index: number): boolean {
  if (/^```/.test(line)) {
    let fenceCount = 0
    for (let i = 0; i < index; i++) {
      if (/^```/.test(lines[i] as string)) {
        fenceCount++
      }
    }
    return fenceCount % 2 === 1
  }
  return false
}

function findListStart(lines: string[], anchorIndex: number): number {
  let start = anchorIndex
  for (let i = anchorIndex - 1; i >= 0; i--) {
    const line = lines[i] as string
    if (/^[-*]\s|\d+\.\s|^\s+\S/.test(line)) {
      start = i
    } else {
      break
    }
  }
  return start + 1
}

function findParagraphStart(lines: string[], anchorIndex: number): number {
  let start = anchorIndex
  for (let i = anchorIndex - 1; i >= 0; i--) {
    if ((lines[i] as string).trim() === '') {
      break
    }
    start = i
  }
  return start + 1
}
