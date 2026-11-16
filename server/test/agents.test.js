import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/services/store.js';
import {
  triageAgent,
  guardianAgent,
  schedulingAgent,
  draftingAgent,
  followupAgent,
  digestAgent,
  runAgentsForThread,
  runAgentsForOrg,
} from '../src/agents/index.js';
import { roleRequired } from '../src/middleware/auth.js';

describe('Autonomous Inbox Agent Collective Test Suite', () => {
  before(async () => {
    await store.initSeedData();
  });

  it('1. Triage auto-files a routine newsletter to Quiet Folder with 1-click Undo payload', async () => {
    const thread = {
      _id: 'test_newsletter_01',
      id: 'test_newsletter_01',
      orgId: 'org_vortex_demo',
      subject: 'Weekly Product Substack #42',
      snippet: 'Unsubscribe here. Your weekly roundup of design tools.',
      participants: [{ name: 'Substack Digest', email: 'newsletter@substack.com' }],
      currentLabel: 'ASSISTANT_TO_REPLY',
      isArchived: false,
      manualOverride: false,
    };
    const messages = [
      {
        _id: 'msg_nl_01',
        from: { name: 'Substack Digest', email: 'newsletter@substack.com' },
        subject: 'Weekly Product Substack #42',
        bodyText: 'Unsubscribe here. Your weekly roundup of design tools and updates.',
        headers: { listUnsubscribe: '<https://substack.com/unsub>' },
      },
    ];

    // Store thread in memory so updates persist
    await store.createThread(thread);

    const result = await triageAgent.run(thread, {
      messages,
      autonomy: 'auto',
      trigger: 'ingest',
    });

    assert.equal(result.agentId, 'triage');
    assert.equal(result.outcome, 'auto_handled');
    assert.equal(result.requiresHuman, false);
    assert.ok(result.undo, 'Expected undo payload to be provided');
    assert.equal(result.undo.type, 'unarchive_thread');
    assert.equal(result.undo.payload.isArchived, false);

    const updated = await store.getThreadById('test_newsletter_01');
    assert.equal(updated.isArchived, true, 'Thread should be archived in Quiet Folder');
  });

  it('2. Triage never auto-files a VIP or legal thread, escalating to human', async () => {
    const legalThread = {
      _id: 'test_legal_02',
      id: 'test_legal_02',
      orgId: 'org_vortex_demo',
      subject: 'URGENT: $15M Term Sheet Agreement & Wire Escrow',
      snippet: 'Priya, please sign the attached Fenwick agreement and authorize the escrow wire transfer.',
      participants: [{ name: 'Mark Suster', email: 'mark@upfront.com', isVip: true }],
      currentLabel: 'ASSISTANT_TO_REPLY',
      isArchived: false,
      manualOverride: false,
    };
    const messages = [
      {
        _id: 'msg_legal_01',
        from: { name: 'Mark Suster', email: 'mark@upfront.com' },
        subject: 'URGENT: $15M Term Sheet Agreement & Wire Escrow',
        bodyText: 'Priya, please sign the attached Fenwick agreement and authorize the escrow wire transfer before 4 PM today.',
      },
    ];

    await store.createThread(legalThread);

    const result = await triageAgent.run(legalThread, {
      messages,
      autonomy: 'auto',
      trigger: 'ingest',
      playbook: {
        vipSenders: ['mark@upfront.com'],
        spendingLimitWithoutApproval: 1000,
      },
    });

    assert.equal(result.agentId, 'triage');
    assert.notEqual(result.outcome, 'auto_handled', 'High-stakes legal thread must never be auto-handled');
    assert.equal(result.requiresHuman, true, 'High-stakes thread must require human intervention');
    assert.notEqual(legalThread.isArchived, true, 'Thread must not be archived to Quiet Folder');
  });

  it('3. Guardian Agent detects and reverses a bad auto-file action on risk keywords', async () => {
    // Simulate a compromised thread erroneously auto-filed into Quiet Folder
    const trapThread = {
      _id: 'test_trap_03',
      id: 'test_trap_03',
      orgId: 'org_vortex_demo',
      subject: 'Quarterly Audit: Invoice and Wire Transfer Instructions',
      snippet: 'Priya, please review the attached $45,000 legal invoice and sign the amendment.',
      participants: [{ name: 'Roelof Botha', email: 'roelof@sequoia.com' }],
      currentLabel: 'NO_REPLY_NEEDED',
      isArchived: true,
      manualOverride: false,
    };
    const messages = [
      {
        _id: 'msg_trap_01',
        from: { name: 'Roelof Botha', email: 'roelof@sequoia.com' },
        subject: 'Quarterly Audit: Invoice and Wire Transfer Instructions',
        bodyText: 'Priya, please review the attached $45,000 legal invoice and sign the amendment.',
      },
    ];

    await store.createThread(trapThread);

    const guardianResult = await guardianAgent.run(trapThread, {
      messages,
      autonomy: 'auto',
      trigger: 'ingest',
      playbook: {
        vipDomains: ['sequoia.com'],
      },
    });

    assert.equal(guardianResult.agentId, 'guardian');
    assert.equal(guardianResult.outcome, 'reversed');
    assert.equal(guardianResult.action, 'guardian_reversed');
    assert.ok(guardianResult.summary.includes('Guardian reversed'));

    // Check thread was rescued in store
    const rescued = await store.getThreadById('test_trap_03');
    assert.equal(rescued.isArchived, false, 'Guardian must unarchive the thread');
    assert.equal(rescued.currentLabel, 'NEEDS_REVIEW', 'Guardian must restore label to NEEDS_REVIEW');
  });

  it('4. 1-Click Undo reverses autonomous state changes accurately', async () => {
    const thread = {
      _id: 'test_undo_04',
      id: 'test_undo_04',
      orgId: 'org_vortex_demo',
      subject: 'Automated Receipt: Cloud Infrastructure',
      currentLabel: 'NO_REPLY_NEEDED',
      isArchived: true,
    };
    await store.createThread(thread);

    // Record an autonomous agent run with undo metadata
    const run = await store.addAgentRun({
      agentId: 'triage',
      agentName: 'Triage Agent',
      orgId: 'org_vortex_demo',
      threadId: 'test_undo_04',
      action: 'auto_file_quiet_folder',
      outcome: 'auto_handled',
      summary: 'Auto-filed receipt to Quiet Folder.',
      requiresHuman: false,
      undo: {
        type: 'unarchive_thread',
        payload: {
          previousLabel: 'ASSISTANT_TO_REPLY',
          isArchived: false,
        },
      },
    });

    const runId = run._id || run.id;
    const undoRes = await store.undoAgentRun(runId, 'user_maya', 'Assistant Maya');

    assert.ok(undoRes.run.undoneAt, 'Run must record undoneAt timestamp');

    const restoredThread = await store.getThreadById('test_undo_04');
    assert.equal(restoredThread.isArchived, false, 'Thread must be restored to unarchived');
    assert.equal(restoredThread.currentLabel, 'ASSISTANT_TO_REPLY', 'Thread label must be restored');
  });

  it('5. Human manualOverride is strictly inviolate for both Triage and Guardian', async () => {
    const overriddenThread = {
      _id: 'test_override_05',
      id: 'test_override_05',
      orgId: 'org_vortex_demo',
      subject: 'Manual Decision Made by Executive',
      currentLabel: 'CLIENT_TO_REPLY',
      isArchived: false,
      manualOverride: true, // Human explicitly intervened
    };

    const ctx = { trigger: 'ingest' };
    assert.equal(triageAgent.canRun(overriddenThread, ctx), false, 'TriageAgent must respect manualOverride');
    assert.equal(guardianAgent.canRun(overriddenThread, ctx), false, 'GuardianAgent must respect manualOverride');
  });

  it('6. Zero-Send Compliance: all agents create proposals/drafts and never transmit emails', async () => {
    const thread = {
      _id: 'test_zerosend_06',
      id: 'test_zerosend_06',
      orgId: 'org_vortex_demo',
      subject: 'Sync on Roadmap',
      snippet: 'Can we meet next Wednesday at 2pm?',
      currentLabel: 'ASSISTANT_TO_REPLY',
      participants: [{ name: 'Alex Partner', email: 'alex@partner.com' }],
    };
    const messages = [
      {
        _id: 'msg_sync_01',
        from: { name: 'Alex Partner', email: 'alex@partner.com' },
        subject: 'Sync on Roadmap',
        bodyText: 'Can we meet next Wednesday at 2pm? Please send a calendar invite.',
      },
    ];

    await store.createThread(thread);

    // Run drafting agent
    const draftRes = await draftingAgent.run(thread, {
      messages,
      autonomy: 'propose',
      trigger: 'ingest',
    });

    assert.equal(draftRes.outcome, 'proposed');
    assert.equal(draftRes.requiresHuman, true, 'Drafts must require human authorization');
    assert.ok(draftRes.details.draftId, 'Draft proposal should be created');

    const draft = await store.getDraftByThreadId('test_zerosend_06');
    assert.ok(draft, 'Draft should exist in store');
    assert.equal(draft.status, 'agent_proposal', 'Draft status must be agent_proposal, never sent');

    // Run scheduling agent
    const schedRes = await schedulingAgent.run(thread, {
      messages,
      autonomy: 'propose',
      trigger: 'ingest',
    });
    assert.equal(schedRes.requiresHuman, true);
    assert.notEqual(schedRes.action, 'send_email', 'Agent must never dispatch email');
  });

  it('7. Client role cannot access Assistant-only Agent endpoints (HTTP 403 Forbidden)', () => {
    const middleware = roleRequired(['assistant']);
    const req = { user: { role: 'client', email: 'priya@vortexdynamics.com' } };
    let statusSet = null;
    let jsonPayload = null;
    let nextCalled = false;

    const res = {
      status(code) {
        statusSet = code;
        return this;
      },
      json(obj) {
        jsonPayload = obj;
        return this;
      },
    };

    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false, 'next() should not be called for client role');
    assert.equal(statusSet, 403, 'Should respond with HTTP 403');
    assert.equal(jsonPayload.error.code, 'FORBIDDEN');
  });

  it('8. Multi-tenant Organization Scoping on getAgentRuns and runAgentsForOrg', async () => {
    const orgA = 'org_alpha';
    const orgB = 'org_beta';

    await store.addAgentRun({
      agentId: 'digest',
      agentName: 'Digest Agent',
      orgId: orgA,
      action: 'generate_morning_brief',
      outcome: 'auto_handled',
      summary: 'Generated morning brief for Org Alpha.',
      requiresHuman: false,
    });

    await store.addAgentRun({
      agentId: 'digest',
      agentName: 'Digest Agent',
      orgId: orgB,
      action: 'generate_morning_brief',
      outcome: 'auto_handled',
      summary: 'Generated morning brief for Org Beta.',
      requiresHuman: false,
    });

    const runsA = await store.getAgentRuns({ orgId: orgA, limit: 10 });
    const runsB = await store.getAgentRuns({ orgId: orgB, limit: 10 });

    assert.ok(runsA.every((r) => r.orgId === orgA), 'All runs for Org A must belong to Org A');
    assert.ok(runsB.every((r) => r.orgId === orgB), 'All runs for Org B must belong to Org B');
  });
});
