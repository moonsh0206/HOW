import test from 'node:test';
import assert from 'node:assert/strict';
import { pagesBase } from '../scripts/pages-base.js';

test('Pages base supports project, renamed repository and user domain', () => {
  assert.equal(pagesBase(), '/HOW/');
  assert.equal(pagesBase('/how-web/'), '/how-web/');
  assert.equal(pagesBase('/'), '/');
  for (const value of ['HOW', '//', 'https://example.com/', '/../', '/HOW', '/./']) assert.throws(() => pagesBase(value));
});
