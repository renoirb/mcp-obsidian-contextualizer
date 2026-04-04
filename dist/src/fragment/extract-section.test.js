import { test, expect, describe, it } from 'vitest';
import { extractSection } from './extract-section.js';
const FIXTURE = `# Document Title

Intro paragraph.

## Summary

Summary content here.

### Details Within Summary

Some details.

## Details

### How Code Works

Code explanation.

#### Step 1

Step 1 content.
More step 1 content.

#### Step 2

Step 2 content.

## References

- [[SomeLink]]
- [[AnotherLink]] ^refBlock
`;
describe('extractSection', () => {
    describe('heading extraction', () => {
        it('extracts h2 section with sub-headings included', () => {
            const result = extractSection(FIXTURE, 'Summary');
            expect(result.found).toBe(true);
            if (!result.found)
                return;
            expect(result.heading).toBe('Summary');
            expect(result.level).toBe(2);
            expect(result.content).toContain('## Summary');
            expect(result.content).toContain('### Details Within Summary');
            expect(result.content).toContain('Some details.');
            // Should NOT contain the next h2 section's content
            expect(result.content).not.toContain('### How Code Works');
        });
        it('extracts h4 section stopping at next h4', () => {
            const result = extractSection(FIXTURE, 'Step 1');
            expect(result.found).toBe(true);
            if (!result.found)
                return;
            expect(result.heading).toBe('Step 1');
            expect(result.level).toBe(4);
            expect(result.content).toContain('Step 1 content.');
            expect(result.content).toContain('More step 1 content.');
            expect(result.content).not.toContain('Step 2 content.');
        });
        it('is case-insensitive for heading matching', () => {
            const result = extractSection(FIXTURE, 'how code works');
            expect(result.found).toBe(true);
            if (!result.found)
                return;
            expect(result.heading).toBe('How Code Works');
        });
        it('accepts # prefix in fragment', () => {
            const result = extractSection(FIXTURE, '#Summary');
            expect(result.found).toBe(true);
            if (!result.found)
                return;
            expect(result.heading).toBe('Summary');
        });
        it('last section extends to end of content', () => {
            const result = extractSection(FIXTURE, 'References');
            expect(result.found).toBe(true);
            if (!result.found)
                return;
            expect(result.content).toContain('[[SomeLink]]');
            expect(result.content).toContain('[[AnotherLink]]');
        });
        it('returns structured error when heading not found', () => {
            const result = extractSection(FIXTURE, 'Nonexistent Heading');
            expect(result.found).toBe(false);
            if (result.found)
                return;
            expect(result.error).toBe('fragment_not_found');
            expect(result.fragment).toBe('Nonexistent Heading');
            expect(result.availableHeadings.length).toBeGreaterThan(0);
            expect(result.availableHeadings.some((h) => h.text === 'Summary')).toBe(true);
        });
    });
    describe('block-id extraction', () => {
        it('extracts block by ^block-id', () => {
            const result = extractSection(FIXTURE, '^refBlock');
            expect(result.found).toBe(true);
            if (!result.found)
                return;
            expect(result.content).toContain('[[SomeLink]]');
            expect(result.content).toContain('[[AnotherLink]]');
        });
        it('accepts #^ prefix', () => {
            const result = extractSection(FIXTURE, '#^refBlock');
            expect(result.found).toBe(true);
            if (!result.found)
                return;
            expect(result.content).toContain('[[AnotherLink]]');
        });
        it('returns structured error when block-id not found', () => {
            const result = extractSection(FIXTURE, '^nonexistent');
            expect(result.found).toBe(false);
            if (result.found)
                return;
            expect(result.error).toBe('fragment_not_found');
            expect(result.fragment).toBe('^nonexistent');
            expect(result.availableBlockIds).toContain('refBlock');
        });
    });
    describe('content is bare', () => {
        it('returns raw text with no wrappers or metadata markers', () => {
            const result = extractSection(FIXTURE, 'Step 1');
            expect(result.found).toBe(true);
            if (!result.found)
                return;
            // No HTML comment wrappers
            expect(result.content).not.toContain('<!-- Excerpt');
            expect(result.content).not.toContain('<!-- End excerpt');
            // No transclusion markers
            expect(result.content).not.toContain('![[');
            // Content starts with the heading itself
            expect(result.content.startsWith('#### Step 1')).toBe(true);
        });
    });
});
