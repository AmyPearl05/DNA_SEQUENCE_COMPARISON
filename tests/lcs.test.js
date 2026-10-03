import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSequences, normalizeSequence } from '../public/lcs.js';

test('normalizes plain DNA and single-record FASTA', () => {
  assert.equal(normalizeSequence(' aCg t\nac '), 'ACGTAC');
  assert.equal(normalizeSequence('>sample A\nacgt\nac'), 'ACGTAC');
});

test('rejects missing, ambiguous, multiple-record and oversized inputs', () => {
  for (const value of ['', 'ACGN', 'ACGU', 'A'.repeat(301), '>a\nAC\n>b\nGT']) assert.throws(() => normalizeSequence(value));
});

test('identical DNA has complete similarity and coverage', () => {
  const result = compareSequences('ACGT', 'ACGT');
  assert.equal(result.subsequence, 'ACGT');
  assert.equal(result.similarity, 100);
  assert.equal(result.cells, 25);
  assert.equal(result.coverageFirst, 100);
});

test('no overlap produces zero length, not a false match', () => {
  const result = compareSequences('AAA', 'TT');
  assert.equal(result.subsequence, '');
  assert.equal(result.similarity, 0);
  assert.equal(result.path.at(-1).row, 0);
  assert.equal(result.path.at(-1).column, 0);
});

test('recovers a non-contiguous subsequence and valid match indices', () => {
  const result = compareSequences('ACGTAC', 'AGCTAC');
  assert.equal(result.length, 5);
  assert.equal(result.table[6][6], 5);
  for (const match of result.matches) {
    assert.equal(result.first[match.first], match.base);
    assert.equal(result.second[match.second], match.base);
  }
  for (let index = 1; index < result.matches.length; index++) {
    assert.ok(result.matches[index].first > result.matches[index - 1].first);
    assert.ok(result.matches[index].second > result.matches[index - 1].second);
  }
});

test('unequal lengths use total length normalization', () => {
  const result = compareSequences('ACGT', 'AG');
  assert.equal(result.subsequence, 'AG');
  assert.equal(result.coverageFirst, 50);
  assert.equal(result.coverageSecond, 100);
  assert.ok(Math.abs(result.similarity - 200 / 3) < 0.00001);
});

test('upper-bound input remains correct and uses a bounded DP table', () => {
  const result = compareSequences('ACGT'.repeat(75), 'ACGT'.repeat(75));
  assert.equal(result.length, 300);
  assert.equal(result.cells, 90601);
});

test('tie-breaking is deterministic', () => {
  const result = compareSequences('AC', 'CA');
  assert.equal(result.subsequence, 'A');
});
