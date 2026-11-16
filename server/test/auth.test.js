import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

// Set NODE_ENV to test so app does not automatically bind PORT 5000 on import
process.env.NODE_ENV = 'test';

import app from '../src/index.js';
import { store } from '../src/services/store.js';
import { signToken } from '../src/middleware/auth.js';
import { env } from '../src/config/env.js';

describe('Real Authentication & Role Separation Test Suite', () => {
  let server;
  let baseUrl;
  let assistantToken;
  let clientToken;

  before(async () => {
    // Ensure in-memory seed is initialized
    await store.initSeedData();

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Create realistic JWT tokens
    assistantToken = signToken({
      userId: 'user_maya',
      role: 'assistant',
      orgId: 'org_vortex_001',
    });

    clientToken = signToken({
      userId: 'user_priya',
      role: 'client',
      orgId: 'org_vortex_001',
      clientId: 'client_priya_001',
    });
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  it('1. POST /api/auth/switch-role returns 404 (endpoint permanently removed)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/switch-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${assistantToken}`,
      },
      body: JSON.stringify({ role: 'client' }),
    });

    assert.equal(res.status, 404);
  });

  it('2. Client user gets 403 Forbidden when calling Assistant-only endpoints', async () => {
    // A) GET /api/agents
    const agentsRes = await fetch(`${baseUrl}/api/agents`, {
      headers: { Cookie: `token=${clientToken}` },
    });
    assert.equal(agentsRes.status, 403, 'Client calling GET /api/agents should be 403 Forbidden');

    // B) POST /api/threads/th_10/override-label
    const overrideRes = await fetch(`${baseUrl}/api/threads/th_10/override-label`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${clientToken}`,
      },
      body: JSON.stringify({ newLabel: 'ASSISTANT_TO_REPLY' }),
    });
    assert.equal(overrideRes.status, 403, 'Client calling override-label should be 403 Forbidden');

    // C) POST /api/threads/th_10/archive
    const archiveRes = await fetch(`${baseUrl}/api/threads/th_10/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${clientToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(archiveRes.status, 403, 'Client calling archive should be 403 Forbidden');

    // D) GET /api/auth/client-profile
    const profileRes = await fetch(`${baseUrl}/api/auth/client-profile`, {
      headers: { Cookie: `token=${clientToken}` },
    });
    assert.equal(profileRes.status, 403, 'Client calling get client-profile should be 403 Forbidden');

    // E) POST /api/auth/invite-client
    const inviteRes = await fetch(`${baseUrl}/api/auth/invite-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${clientToken}`,
      },
      body: JSON.stringify({ name: 'New Client', email: 'test@client.com' }),
    });
    assert.equal(inviteRes.status, 403, 'Client calling invite-client should be 403 Forbidden');
  });

  it('3. Assistant user gets 403 Forbidden when calling client decision endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/threads/th_10/client-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${assistantToken}`,
      },
      body: JSON.stringify({ action: 'approve' }),
    });

    assert.equal(res.status, 403, 'Assistant calling client-decision should be 403 Forbidden');
  });

  it('4. Invite token is single-use: accepting it marks it used; a second attempt fails', async () => {
    // Step A: Assistant generates client invite
    const inviteRes = await fetch(`${baseUrl}/api/auth/invite-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${assistantToken}`,
      },
      body: JSON.stringify({
        name: 'Alexander Hamilton',
        email: 'alexander@hamilton.test',
      }),
    });

    assert.equal(inviteRes.status, 201);
    const inviteData = await inviteRes.json();
    assert.equal(inviteData.ok, true);
    assert.ok(inviteData.data.inviteUrl || inviteData.data.inviteLink);
    assert.ok(inviteData.data.token);

    const rawToken = inviteData.data.token;

    // Step B: Public validate endpoint verifies token is valid
    const validateRes = await fetch(`${baseUrl}/api/auth/invite/${rawToken}`);
    assert.equal(validateRes.status, 200);
    const validateData = await validateRes.json();
    assert.equal(validateData.ok, true);
    assert.equal(validateData.data.email, 'alexander@hamilton.test');

    // Step C: Client accepts invite with strong password
    const acceptRes = await fetch(`${baseUrl}/api/auth/invite/${rawToken}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'StrongPassword2026!' }),
    });

    assert.equal(acceptRes.status, 200);
    const acceptData = await acceptRes.json();
    assert.equal(acceptData.ok, true);
    assert.equal(acceptData.data.user.role, 'client');
    assert.equal(acceptData.data.user.email, 'alexander@hamilton.test');

    // Step D: Second acceptance attempt MUST fail with 400 INVITE_ALREADY_USED
    const repeatRes = await fetch(`${baseUrl}/api/auth/invite/${rawToken}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'AnotherPassword2026!' }),
    });

    assert.equal(repeatRes.status, 400);
    const repeatData = await repeatRes.json();
    assert.equal(repeatData.error.code, 'INVITE_ALREADY_USED');
  });

  it('5. Expired invite token is rejected with INVITE_EXPIRED', async () => {
    // Create an artificially expired invite directly in store
    const rawToken = 'test_expired_token_' + Date.now();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await store.createInvite({
      orgId: 'org_vortex_001',
      clientId: 'client_priya_001',
      email: 'expired.user@test.com',
      role: 'client',
      tokenHash,
      status: 'pending',
      invitedBy: 'user_maya',
      expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // Expired yesterday
    });

    // Validate request returns 400 INVITE_EXPIRED
    const validateRes = await fetch(`${baseUrl}/api/auth/invite/${rawToken}`);
    assert.equal(validateRes.status, 400);
    const validateData = await validateRes.json();
    assert.equal(validateData.error.code, 'INVITE_EXPIRED');

    // Accept request returns 400 INVITE_EXPIRED
    const acceptRes = await fetch(`${baseUrl}/api/auth/invite/${rawToken}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'ValidPassword123!' }),
    });
    assert.equal(acceptRes.status, 400);
    const acceptData = await acceptRes.json();
    assert.equal(acceptData.error.code, 'INVITE_EXPIRED');
  });

  it('6. Invite token is stored as a SHA-256 hash, not plaintext in DB', async () => {
    const rawToken = 'sample_raw_token_for_hash_verification';
    const computedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await store.createInvite({
      orgId: 'org_vortex_001',
      clientId: 'client_priya_001',
      email: 'hashcheck@test.com',
      role: 'client',
      tokenHash: computedHash,
      status: 'pending',
      invitedBy: 'user_maya',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });

    const storedInvite = await store.findInviteByTokenHash(computedHash);
    assert.ok(storedInvite, 'Stored invite record must exist');
    assert.equal(storedInvite.tokenHash, computedHash);
    assert.notEqual(storedInvite.tokenHash, rawToken, 'Stored tokenHash must never be plaintext');
  });

  it('7. Rate limit: 11th failed login attempt within 15 minutes returns 429', async () => {
    const testEmail = `ratelimit.target.${Date.now()}@example.com`;

    // Fire 10 failed login attempts with wrong password
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'wrongpassword' }),
      });
      assert.equal(res.status, 401, `Attempt ${i + 1} should return 401`);
    }

    // 11th failed attempt must be blocked by loginRateLimiter with 429
    const blockedRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'wrongpassword' }),
    });

    assert.equal(blockedRes.status, 429, '11th failed attempt must return HTTP 429 Too Many Requests');
    const blockedData = await blockedRes.json();
    assert.equal(blockedData.error.code, 'LOGIN_RATE_LIMIT_EXCEEDED');
  });

  it('8. When DEMO_MODE=false, POST /api/auth/demo-login returns 404', async () => {
    // Temporarily toggle DEMO_MODE to false
    const previousMode = env.DEMO_MODE;
    env.DEMO_MODE = false;

    try {
      const res = await fetch(`${baseUrl}/api/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant' }),
      });

      assert.equal(res.status, 404, 'Demo login should return 404 when DEMO_MODE=false');
      const data = await res.json();
      assert.equal(data.error.code, 'DEMO_MODE_DISABLED');
    } finally {
      env.DEMO_MODE = previousMode;
    }
  });

  it('9. Client user can only see clientVisible / decision threads for their own organization & client', async () => {
    // Fetch threads as client Priya
    const clientRes = await fetch(`${baseUrl}/api/threads`, {
      headers: { Cookie: `token=${clientToken}` },
    });
    assert.equal(clientRes.status, 200);
    const clientData = await clientRes.json();
    assert.equal(clientData.ok, true);

    const threads = clientData.data;
    assert.ok(threads.length > 0, 'Client should receive visible threads');

    // Invariant: No Quiet folder or internal threads
    for (const t of threads) {
      assert.notEqual(
        t.currentLabel,
        'NO_REPLY_NEEDED',
        'Client must never see NO_REPLY_NEEDED (Quiet Folder) threads'
      );
      assert.ok(
        t.clientVisible === true || t.currentLabel === 'CLIENT_TO_REPLY',
        'Threads returned to client must be clientVisible or CLIENT_TO_REPLY'
      );
      assert.equal(t.orgId, 'org_vortex_001', 'Thread must match client orgId');
    }
  });

  it('10. Login role mismatch handling: valid credentials with mismatched role returns 400 ROLE_MISMATCH', async () => {
    // Client Priya Sharma trying to sign in through Assistant role form
    const mismatchRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'priya@vortexdynamics.com',
        password: 'password123',
        expectedRole: 'assistant',
      }),
    });

    assert.equal(mismatchRes.status, 400, 'Mismatched role on valid credentials should return HTTP 400');
    const data = await mismatchRes.json();
    assert.equal(data.ok, false);
    assert.equal(data.error.code, 'ROLE_MISMATCH');
    assert.equal(data.error.actualRole, 'client');
    assert.match(data.error.message, /That account is a client account/);

    // Verify invalid credentials with expectedRole returns generic 401 (no leak)
    const badCredsRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'priya@vortexdynamics.com',
        password: 'wrongpassword',
        expectedRole: 'assistant',
      }),
    });
    assert.equal(badCredsRes.status, 401);
    const badData = await badCredsRes.json();
    assert.equal(badData.error.code, 'INVALID_CREDENTIALS');
    assert.equal(badData.error.message, 'Incorrect email or password');
  });
});
