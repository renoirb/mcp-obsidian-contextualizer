import type { ParsedFragment } from './types.js'

/**
 * Parse a fragment reference into its typed form.
 * Accepts with or without leading '#'.
 * '^block-id' → blockId type
 * 'Heading Text' → heading type
 */
export function parseFragment(fragment: string): ParsedFragment {
  const trimmed = fragment.trim()
  const stripped = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed

  if (stripped.startsWith('^')) {
    return {
      type: 'blockId',
      target: stripped.slice(1),
    }
  }

  return {
    type: 'heading',
    target: stripped,
  }
}
