import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPost } from './content-validation.mjs';

function post(body, extra = '') {
  return `---\ntitle: "Test post"\ndescription: "Useful description"\nheroImage: "/images/test.jpg"\nheroImageAlt: "A useful test image"\nsourceUrl: "https://example.com/source"\n${extra}draft: false\n---\n${body}`;
}

test('accepts a complete published post', () => {
  const result = inspectPost(post('A complete article.'), 'complete.md');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test('blocks unresolved review markers in published posts', () => {
  const result = inspectPost(post('[EXPERIENCE: add a real result]'), 'marker.md');
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /still contains/);
});

test('does not block review markers while a post remains a draft', () => {
  const text = post('[SOURCE NEEDED: verify this]').replace('draft: false', 'draft: true');
  const result = inspectPost(text, 'draft.md');
  assert.deepEqual(result.errors, []);
});

test('requires alt text when a published post has a hero image', () => {
  const text = post('Article body.').replace('heroImageAlt: "A useful test image"\n', '');
  const result = inspectPost(text, 'missing-alt.md');
  assert.match(result.errors.join('\n'), /heroImageAlt/);
});
