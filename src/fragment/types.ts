export type FragmentType = 'heading' | 'blockId'

export type ParsedFragment =
  | { type: 'heading', target: string }
  | { type: 'blockId', target: string }

export type HeadingInfo = {
  text: string,
  level: number,
  startLine: number,
  endLine: number,
}

export type BlockIdInfo = {
  id: string,
  startLine: number,
  endLine: number,
}

export type ExtractionSuccess = {
  found: true,
  content: string,
  heading?: string,
  level?: number,
  startLine: number,
  endLine: number,
}

export type ExtractionError = {
  found: false,
  error: string,
  fragment: string,
  availableHeadings: Array<{ text: string, level: number }>,
  availableBlockIds: string[],
}

export type ExtractionResult = ExtractionSuccess | ExtractionError
