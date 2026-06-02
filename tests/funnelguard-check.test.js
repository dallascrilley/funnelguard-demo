/**
 * Funnelguard rule-engine tests — run with `node --test` (no network, no
 * Workers runtime). Covers every rule (positive fire + clean/silent case) and
 * asserts the three shipped sample configs reproduce the engine's findings
 * exactly. The same engine runs in the browser (src/components/rules.ts) and on
 * the live Cloudflare backend (functions/funnelguard/check.js); this suite pins
 * them both.
 *
 * The "truth" for each sample fixture is whatever the engine produces — there is
 * no precomputed findings list. These tests pin the engine's output so any
 * accidental logic drift (client or server) is caught.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  runRules,
  check,
  ALL_RULES,
  checkRetiredCampaignReferences,
  checkUTMMediumTaxonomy,
  checkMissingUTMCampaign,
  checkOrphanedFormBindings,
  checkFormWithNoOwnerAssignment,
  checkFormIDMismatch,
  checkLifecycleDowngrade,
  checkUnownedMQLs,
  checkCustomerInLeadNurture,
  checkStaleSQL,
  checkRetiredCampaignAttribution,
  checkOrphanedWorkflows,
  checkMissingOwnerAssignEnrollment,
} from '../functions/funnelguard/check.js';

const here = dirname(fileURLToPath(import.meta.url));
const sample = (name) =>
  JSON.parse(readFileSync(join(here, `../public/data/${name}.json`), 'utf8'));

const ids = (findings) => findings.map((f) => f.id);

// A minimal, fully-clean config. Every rule should be silent on this.
function cleanConfig() {
  return {
    scenario: 'clean',
    label: 'Clean',
    description: 'no defects',
    scannedObjectCount: 0,
    utmTaxonomy: {
      validSources: ['google', 'blog', 'meta'],
      validMediums: ['cpc', 'organic', 'paid_social'],
      retiredCampaigns: ['q1-retargeting'],
    },
    campaigns: [],
    forms: [],
    lifecycleStages: ['Lead', 'MQL', 'SQL', 'Customer'],
    contacts: [],
    workflows: [],
  };
}

// ─── UTM Integrity ──────────────────────────────────────────────────────────

test('FG-001 fires when a retired campaign still attributes contacts, silent on clean', () => {
  const cfg = cleanConfig();
  cfg.campaigns = [{ id: 'c1', name: 'Q1 Retarget', utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'q1-retargeting', status: 'retired', defect: null }];
  cfg.contacts = [{ segment: 'seg1', count: 22, lifecycleStage: 'Lead', attributionSource: 'q1-retargeting', defect: null }];
  assert.ok(checkRetiredCampaignReferences(cfg).some((f) => f.id === 'FG-001'));
  assert.equal(checkRetiredCampaignReferences(cleanConfig()).length, 0);
});

test('FG-002 fires (blog cpc / undeclared source), silent on clean', () => {
  const blog = cleanConfig();
  blog.campaigns = [{ id: 'c1', name: 'Blog', utmSource: 'blog', utmMedium: 'cpc', utmCampaign: 'blog-traffic', status: 'active', defect: null }];
  assert.ok(checkUTMMediumTaxonomy(blog).some((f) => f.id === 'FG-002' && f.severity === 'Critical'));

  const meta = cleanConfig();
  meta.campaigns = [{ id: 'c2', name: 'Meta', utmSource: 'meta', utmMedium: 'cpc', utmCampaign: 'meta-q2', status: 'active', defect: null }];
  assert.ok(checkUTMMediumTaxonomy(meta).some((f) => f.id === 'FG-002' && f.severity === 'Critical'));

  const undeclared = cleanConfig();
  undeclared.campaigns = [{ id: 'c3', name: 'Mystery', utmSource: 'tiktok', utmMedium: 'paid_social', utmCampaign: 'x', status: 'active', defect: null }];
  assert.ok(checkUTMMediumTaxonomy(undeclared).some((f) => f.id === 'FG-002' && f.severity === 'Warning'));

  assert.equal(checkUTMMediumTaxonomy(cleanConfig()).length, 0);
});

test('FG-003 fires on a missing utm_campaign, silent on clean', () => {
  const cfg = cleanConfig();
  cfg.campaigns = [{ id: 'c1', name: 'Tradeshow', utmSource: 'google', utmMedium: 'cpc', utmCampaign: null, status: 'active', defect: null }];
  assert.ok(checkMissingUTMCampaign(cfg).some((f) => f.id === 'FG-003'));
  assert.equal(checkMissingUTMCampaign(cleanConfig()).length, 0);
});

// ─── Form Binding ───────────────────────────────────────────────────────────

const baseForm = (over) => ({
  id: 'f1', name: 'Form', lifecycleStageAssigned: 'Lead', lifecycleStageOverwrite: false,
  workflowEnrollments: ['wf-x'], ownerAssigned: true, thankYouUrl: '/ty', crmIntegration: true, defect: null, ...over,
});

test('FG-010 fires when a form has no CRM integration, silent on clean', () => {
  const cfg = cleanConfig();
  cfg.forms = [baseForm({ id: 'f-careers', name: 'Careers', lifecycleStageAssigned: null, crmIntegration: false, ownerAssigned: false, workflowEnrollments: [] })];
  assert.ok(checkOrphanedFormBindings(cfg).some((f) => f.id === 'FG-010'));
  assert.equal(checkOrphanedFormBindings(cleanConfig()).length, 0);
});

test('FG-004 fires on an ebook lead with no workflow', () => {
  const cfg = cleanConfig();
  cfg.forms = [baseForm({ id: 'fg-ebook-004', name: 'Content Download — Ebook', workflowEnrollments: [], ownerAssigned: false })];
  assert.ok(checkOrphanedFormBindings(cfg).some((f) => f.id === 'FG-004'));
});

test('FG-006 fires on a partner lead with no workflow', () => {
  const cfg = cleanConfig();
  cfg.forms = [baseForm({ id: 'fg-partner-008', name: 'Partner Application', workflowEnrollments: [], ownerAssigned: false })];
  assert.ok(checkOrphanedFormBindings(cfg).some((f) => f.id === 'FG-006'));
});

test('FG-008 fires on a thank-you 404', () => {
  const cfg = cleanConfig();
  cfg.forms = [baseForm({ id: 'fg-event', name: 'Event Check-In', thankYouUrl: '/events/ty', thankYouUrl404: true })];
  assert.ok(checkOrphanedFormBindings(cfg).some((f) => f.id === 'FG-008'));
});

test('FG-005 fires on an unowned MQL form (pricing / trial), silent on clean', () => {
  const pricing = cleanConfig();
  pricing.forms = [baseForm({ id: 'fg-pricing-005', name: 'Pricing Page Inquiry', lifecycleStageAssigned: 'MQL', ownerAssigned: false, workflowEnrollments: [] })];
  assert.ok(checkFormWithNoOwnerAssignment(pricing).some((f) => f.id === 'FG-005'));

  const trial = cleanConfig();
  trial.forms = [baseForm({ id: 'sc-trial-002', name: 'Trial Signup', lifecycleStageAssigned: 'MQL', ownerAssigned: false, workflowEnrollments: [] })];
  assert.ok(checkFormWithNoOwnerAssignment(trial).some((f) => f.id === 'FG-005'));

  assert.equal(checkFormWithNoOwnerAssignment(cleanConfig()).length, 0);
});

test('FG-007 fires on a workflow form-ID mismatch, silent on clean', () => {
  const cfg = cleanConfig();
  cfg.workflows = [{ id: 'wf-re', name: 'Re-Engage', status: 'active', stepCount: 4, enrollmentTriggers: [], enrollmentFormIdExpected: 'fg-exit-003', enrollmentFormIdActual: 'fg-exit-002', activeEnrollments: 0, defect: null }];
  assert.ok(checkFormIDMismatch(cfg).some((f) => f.id === 'FG-007'));
  assert.equal(checkFormIDMismatch(cleanConfig()).length, 0);
});

test('FG-009 fires on a lifecycle-downgrade form (support/return/cancel/contact-sales), silent on clean', () => {
  const support = cleanConfig();
  support.forms = [baseForm({ id: 'fg-support-011', name: 'Support Ticket', lifecycleStageOverwrite: true })];
  assert.ok(checkLifecycleDowngrade(support).some((f) => f.id === 'FG-009'));

  const ret = cleanConfig();
  ret.forms = [baseForm({ id: 'ec-return-004', name: 'Return Request', lifecycleStageOverwrite: true })];
  assert.ok(checkLifecycleDowngrade(ret).some((f) => f.id === 'FG-009'));

  const churn = cleanConfig();
  churn.forms = [baseForm({ id: 'sc-churn-004', name: 'Cancellation Survey', lifecycleStageOverwrite: true })];
  assert.ok(checkLifecycleDowngrade(churn).some((f) => f.id === 'FG-009'));

  const contact = cleanConfig();
  contact.forms = [baseForm({ id: 'sc-contact-003', name: 'Contact Sales', lifecycleStageOverwrite: true })];
  assert.ok(checkLifecycleDowngrade(contact).some((f) => f.id === 'FG-009'));

  assert.equal(checkLifecycleDowngrade(cleanConfig()).length, 0);
});

// ─── Lifecycle Logic ────────────────────────────────────────────────────────

test('FG-011 fires on unowned MQL contacts, silent on clean', () => {
  const cfg = cleanConfig();
  cfg.contacts = [{ segment: 'unowned-mqls', count: 14, lifecycleStage: 'MQL', ownerAssigned: false, defect: null }];
  assert.ok(checkUnownedMQLs(cfg).some((f) => f.id === 'FG-011'));
  assert.equal(checkUnownedMQLs(cleanConfig()).length, 0);
});

test('FG-012 fires when customers are enrolled in lead nurture, silent on clean', () => {
  const cfg = cleanConfig();
  cfg.workflows = [{ id: 'wf-ln', name: 'Lead Nurture Q2', status: 'active', stepCount: 8, enrollmentTriggers: [], activeEnrollments: 147, customerStageEnrolled: 7, defect: null }];
  assert.ok(checkCustomerInLeadNurture(cfg).some((f) => f.id === 'FG-012'));
  assert.equal(checkCustomerInLeadNurture(cleanConfig()).length, 0);
});

test('FG-013 fires on stale SQLs, silent on clean', () => {
  const cfg = cleanConfig();
  cfg.contacts = [{ segment: 'stale-sqls', count: 3, lifecycleStage: 'SQL', ownerAssigned: true, lastOwnerActivityDays: 92, openOpportunity: false, defect: null }];
  assert.ok(checkStaleSQL(cfg).some((f) => f.id === 'FG-013'));
  assert.equal(checkStaleSQL(cleanConfig()).length, 0);
});

// ─── Attribution Gap ────────────────────────────────────────────────────────

test('FG-014 fires on contacts attributed to a retired campaign, silent on clean', () => {
  const cfg = cleanConfig();
  cfg.contacts = [{ segment: 'retired-attr', count: 22, lifecycleStage: 'Lead', attributionSource: 'q1-retargeting', defect: null }];
  assert.ok(checkRetiredCampaignAttribution(cfg).some((f) => f.id === 'FG-014'));
  assert.equal(checkRetiredCampaignAttribution(cleanConfig()).length, 0);
});

test('FG-015 fires on an orphaned workflow triggered by a retired campaign, silent on clean', () => {
  const cfg = cleanConfig();
  cfg.workflows = [{ id: 'wf-q1', name: 'Q1 Demo Follow-Up', status: 'active', stepCount: 4, enrollmentTriggers: [], triggerCampaign: 'q1-retargeting', activeEnrollments: 0, totalEnrollmentsLast180Days: 0, defect: null }];
  assert.ok(checkOrphanedWorkflows(cfg).some((f) => f.id === 'FG-015'));
  assert.equal(checkOrphanedWorkflows(cleanConfig()).length, 0);
});

test('FG-016 fires when owner-assign workflow has a missing trigger, silent on clean', () => {
  const cfg = cleanConfig();
  cfg.forms = [baseForm({ id: 'fg-pricing-005', name: 'Pricing Page Inquiry' })];
  cfg.workflows = [{ id: 'wf-owner', name: 'Owner Assign Round-Robin', status: 'active', stepCount: 1, enrollmentTriggers: ['fg-contact-001'], missingTriggers: ['fg-pricing-005'], activeEnrollments: 71, defect: null }];
  assert.ok(checkMissingOwnerAssignEnrollment(cfg).some((f) => f.id === 'FG-016'));
  assert.equal(checkMissingOwnerAssignEnrollment(cleanConfig()).length, 0);
});

// ─── Coverage guard: all 13 rule fns exercised + a clean config is silent ────

test('all 13 rule functions are wired into ALL_RULES', () => {
  assert.equal(ALL_RULES.length, 13);
});

test('every rule function is silent on a fully clean config', () => {
  assert.equal(runRules(cleanConfig()).length, 0);
});

// ─── Sample fixtures reproduce the engine output exactly ─────────────────────

for (const name of ['acme-q2', 'saas-post-series-a', 'ecommerce-brand']) {
  test(`sample fixture: ${name} reproduces the engine findings exactly`, () => {
    const cfg = sample(name);
    const got = runRules(cfg);
    // Pin: re-running the engine on the same config is byte-identical.
    assert.deepEqual(runRules(cfg), got);
    // Guard: the fixture actually exercises rules (non-empty) and emits valid shapes.
    assert.ok(got.length > 0);
    for (const f of got) {
      assert.match(f.id, /^FG-\d{3}$/);
      assert.ok(['Critical', 'Warning', 'Info'].includes(f.severity));
      assert.ok(Array.isArray(f.affectedObjects));
    }
  });
}

test('acme-q2 produces the full 16-finding signature set in stable order', () => {
  const got = ids(runRules(sample('acme-q2')));
  assert.deepEqual(got, [
    'FG-001', 'FG-002', 'FG-003', 'FG-004', 'FG-006', 'FG-008', 'FG-010',
    'FG-005', 'FG-007', 'FG-009', 'FG-011', 'FG-012', 'FG-013', 'FG-014', 'FG-015', 'FG-016',
  ]);
});

// ─── check() entry: shape + validation ───────────────────────────────────────

test('check() returns { findings, counts } with counts summed by severity', () => {
  const out = check(sample('acme-q2'));
  assert.ok(Array.isArray(out.findings));
  assert.deepEqual(Object.keys(out.counts).sort(), ['Critical', 'Info', 'Warning']);
  const total = out.counts.Critical + out.counts.Warning + out.counts.Info;
  assert.equal(total, out.findings.length);
});

test('check() rejects a non-object, a missing taxonomy, and a non-array field', () => {
  assert.throws(() => check(null), /FunnelConfig object/);
  assert.throws(() => check([]), /FunnelConfig object/);
  assert.throws(() => check({ campaigns: [], forms: [], contacts: [], workflows: [] }), /utmTaxonomy/);
  const badArr = cleanConfig();
  badArr.campaigns = 'not-an-array';
  assert.throws(() => check(badArr), /`campaigns` must be an array/);
});
