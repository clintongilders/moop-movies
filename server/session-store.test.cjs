const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sessionSerializer, createSessionStore } = require('./session-store.cjs');
test('Redis sessions are encrypted and authenticated', () => {
  const serializer = sessionSerializer('example-secret');
  const data = { tmdbSession: 'private-token', cookie: { expires: '2026-10-01T00:00:00Z' } };
  const encoded = serializer.stringify(data);
  assert.ok(!encoded.includes('private-token'));
  assert.deepEqual(serializer.parse(encoded), data);
  assert.notEqual(serializer.stringify(data), encoded);
  assert.throws(() => sessionSerializer('different-secret').parse(encoded));
  const tampered = Buffer.from(encoded, 'base64');
  tampered[tampered.length - 1] ^= 1;
  assert.throws(() => serializer.parse(tampered.toString('base64')));
});
test('production requires Redis and disallows plaintext Redis transport', async () => {
  await assert.rejects(createSessionStore({ secret: 'test', production: true }), /REDIS_URL/);
  await assert.rejects(createSessionStore({ secret: 'test', redisUrl: 'redis:\/\/localhost' }), /TLS/);
});
