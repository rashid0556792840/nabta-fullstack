// Unit tests that run without a database (used by the Jenkins pipeline).
const test = require('node:test');
const assert = require('node:assert/strict');
const { PATTERNS, sanitizeText, escapeRegex, isObjectId } = require('../src/utils/validate');

test('sanitizeText strips script tags and javascript: links', () => {
  assert.equal(sanitizeText('<script>alert(1)</script>Hello'), 'alert(1)Hello');
  assert.equal(sanitizeText('<a href="javascript:evil()">x</a>'), 'x');
  assert.equal(sanitizeText('  plain text  '), 'plain text');
  assert.equal(sanitizeText(null), '');
});

test('sanitizeText enforces max length', () => {
  assert.equal(sanitizeText('abcdef', 3), 'abc');
});

test('escapeRegex makes user input literal', () => {
  const rx = new RegExp(escapeRegex('a.b*c'));
  assert.ok(rx.test('a.b*c'));
  assert.ok(!rx.test('axbbbc'));
});

test('email pattern', () => {
  assert.ok(PATTERNS.email.test('sara@example.com'));
  assert.ok(!PATTERNS.email.test('sara@example'));
  assert.ok(!PATTERNS.email.test('not an email'));
});

test('password pattern needs 10+ chars with letters and digits', () => {
  assert.ok(PATTERNS.password.test('GreenLeaf2024'));
  assert.ok(!PATTERNS.password.test('short1'));
  assert.ok(!PATTERNS.password.test('onlyletterslong'));
});

test('phone and name patterns', () => {
  assert.ok(PATTERNS.phone.test('+966 50 123 4567'));
  assert.ok(!PATTERNS.phone.test('call me'));
  assert.ok(PATTERNS.name.test("Sara O'Neil"));
  assert.ok(!PATTERNS.name.test('<b>x</b>'));
});

test('isObjectId', () => {
  assert.ok(isObjectId('64b7f0c2a1b2c3d4e5f60718'));
  assert.ok(!isObjectId('123'));
  assert.ok(!isObjectId({ $gt: '' }));
});
