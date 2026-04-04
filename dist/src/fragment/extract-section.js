import { parseFragment } from './parse-fragment.js';
import { scanHeadings } from './scan-headings.js';
import { scanBlockIds } from './scan-block-ids.js';
/**
 * Extract a section from markdown content by fragment reference.
 *
 * Supports:
 * - Heading references: 'Heading Text' or '#Heading Text'
 * - Block ID references: '^block-id' or '#^block-id'
 *
 * Returns bare section text (no wrappers, no metadata in content).
 * Source metadata is in the result object, not in the content string.
 *
 * @param content - Full markdown content (without frontmatter)
 * @param fragment - Fragment reference (heading text or ^block-id)
 */
export function extractSection(content, fragment) {
    const parsed = parseFragment(fragment);
    const lines = content.split('\n');
    if (parsed.type === 'heading') {
        return extractByHeading(content, lines, parsed.target);
    }
    return extractByBlockId(content, lines, parsed.target);
}
function extractByHeading(content, lines, target) {
    const headings = scanHeadings(content);
    const match = headings.find((h) => h.text.toLowerCase() === target.toLowerCase());
    if (!match) {
        const blockIds = scanBlockIds(content);
        return {
            found: false,
            error: 'fragment_not_found',
            fragment: target,
            availableHeadings: headings.map((h) => ({
                text: h.text,
                level: h.level,
            })),
            availableBlockIds: blockIds.map((b) => b.id),
        };
    }
    const sectionLines = lines.slice(match.startLine - 1, match.endLine);
    const sectionContent = sectionLines.join('\n');
    return {
        found: true,
        content: sectionContent,
        heading: match.text,
        level: match.level,
        startLine: match.startLine,
        endLine: match.endLine,
    };
}
function extractByBlockId(content, lines, target) {
    const blockIds = scanBlockIds(content);
    const match = blockIds.find((b) => b.id === target);
    if (!match) {
        const headings = scanHeadings(content);
        return {
            found: false,
            error: 'fragment_not_found',
            fragment: `^${target}`,
            availableHeadings: headings.map((h) => ({
                text: h.text,
                level: h.level,
            })),
            availableBlockIds: blockIds.map((b) => b.id),
        };
    }
    const sectionLines = lines.slice(match.startLine - 1, match.endLine);
    const sectionContent = sectionLines.join('\n');
    return {
        found: true,
        content: sectionContent,
        startLine: match.startLine,
        endLine: match.endLine,
    };
}
