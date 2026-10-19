import test from 'node:test';
import assert from 'node:assert/strict';
import { checkContent } from '../scripts/check-games.mjs';

test('every game in src/content is legal and loses nothing', () => {
  const { errors } = checkContent();
  assert.deepEqual(errors, []);
});
