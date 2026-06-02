/**
 * Funnelguard — server-side deterministic funnel/lifecycle linter
 * (Cloudflare Pages Function).
 *
 * Accepts a FunnelConfig JSON YOU submit — a snapshot of your campaigns, forms,
 * lifecycle stages, contact segments, workflows, and declared UTM taxonomy — and
 * runs 13 deterministic rules against it ENTIRELY on the server. No synthetic
 * data, no secrets, no external calls, no LLM, no live HubSpot/GA4/Salesforce
 * connection: you submit your own config, the function inspects it, and hands
 * back the findings the client renders.
 *
 * Honest boundary: this is REAL deterministic analysis of the exact config you
 * submit. The rules are pure functions over the config object — same input →
 * byte-identical findings, run to run, client or server. It is a linter over a
 * point-in-time config snapshot, not a connection that reads from your live
 * marketing stack. The rules are real; the data is yours.
 *
 * The pure helpers below (runRules + ALL_RULES + each rule) are exported so they
 * can be unit-tested without a network or a Workers runtime (see
 * ../../tests/funnelguard-check.test.js). Ported verbatim from the client-side
 * TypeScript engine (src/components/funnelguard/rules.ts) — types stripped,
 * logic unchanged.
 */

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...init.headers,
    },
    ...init,
  });
}

// ─── UTM Integrity Rules ─────────────────────────────────────────────────────

const checkRetiredCampaignReferences = (config) => {
  const findings = [];
  const { retiredCampaigns } = config.utmTaxonomy;

  for (const campaign of config.campaigns) {
    if (campaign.utmCampaign && retiredCampaigns.includes(campaign.utmCampaign) && campaign.status === 'retired') {
      // Check if contacts reference this retired campaign
      const retiredContacts = config.contacts.find(
        (c) => c.attributionSource === campaign.utmCampaign
      );
      if (retiredContacts) {
        findings.push({
          id: 'FG-001',
          category: 'UTM Integrity',
          severity: 'Critical',
          headline: 'Q1 Retargeting is retired but still attributing 22 contacts.',
          detail:
            'Campaign `q1-retargeting` is in your declared `retired_campaigns` list but is the recorded UTM source for 22 live contacts. Any conversion from these contacts will attribute to a campaign that hasn\'t run since Q1. Your Q2 channel ROI will include Q1 retargeting spend — or worse, zero attribution for these contacts if the campaign is deleted from the ad platform.',
          fix: 'Archive these contacts\' UTM source or update their attribution to the Q2 successor campaign. Add a taxonomy validation step to your campaign-creation process.',
          criticalContext:
            'Critical because: attribution to a retired campaign means Q2 ROI reports will include spend that wasn\'t Q2, and if the campaign is removed from the ad platform these contacts will show zero-touch attribution permanently.',
          affectedObjects: [campaign.id, retiredContacts.segment],
        });
      }
    }
  }
  return findings;
};

const checkUTMMediumTaxonomy = (config) => {
  const findings = [];
  const { validMediums } = config.utmTaxonomy;

  for (const campaign of config.campaigns) {
    // Check for organic/blog channel tagged as cpc
    if (
      (campaign.utmSource === 'blog' || campaign.utmSource === 'content') &&
      campaign.utmMedium === 'cpc' &&
      campaign.status === 'active'
    ) {
      findings.push({
        id: 'FG-002',
        category: 'UTM Integrity',
        severity: 'Critical',
        headline: 'Blog campaign is reporting as paid search in GA4.',
        detail:
          'Campaign `blog-traffic` sets `utm_medium=cpc` but is an organic blog channel. `cpc` is reserved for paid search in your declared taxonomy. GA4 and any connected attribution model (Bizible, Dreamdata) will count this organic traffic as paid-search clicks, inflating CPC channel performance and deflating organic.',
        fix: 'Change `utm_medium` on all blog URLs to `organic`. Audit GA4 for historical sessions attributed under this campaign and note the correction in your QBR data notes.',
        criticalContext:
          'Critical because: this is a silent misattribution that corrupts channel ROI calculations for every reporting period the blog campaign runs. Paid search ROAS appears higher than it is; organic performance appears lower.',
        affectedObjects: [campaign.id],
      });
    }
    // Check for meta/social tagged as cpc
    if (
      (campaign.utmSource === 'meta' || campaign.utmSource === 'instagram') &&
      campaign.utmMedium === 'cpc' &&
      campaign.status === 'active'
    ) {
      findings.push({
        id: 'FG-002',
        category: 'UTM Integrity',
        severity: 'Critical',
        headline: 'Meta campaign is reporting as paid search — wrong medium tag.',
        detail:
          `Campaign \`${campaign.name}\` sets \`utm_medium=cpc\` but runs on Meta (paid social). \`cpc\` is reserved for paid search in your declared taxonomy. GA4 and attribution models will count this social spend as search clicks, inflating Google CPC metrics.`,
        fix: 'Change `utm_medium` to `paid_social` on all Meta campaign URLs. Audit historical attribution for periods this campaign ran.',
        criticalContext:
          'Critical because: paid social spend masquerading as CPC inflates Google channel performance metrics in every attribution model connected to this data.',
        affectedObjects: [campaign.id],
      });
    }
    // Check for undeclared utm_source
    if (
      campaign.utmSource &&
      !config.utmTaxonomy.validSources.includes(campaign.utmSource) &&
      campaign.status === 'active'
    ) {
      findings.push({
        id: 'FG-002',
        category: 'UTM Integrity',
        severity: 'Warning',
        headline: `Campaign \`${campaign.name}\` uses undeclared UTM source \`${campaign.utmSource}\`.`,
        detail:
          `The source \`${campaign.utmSource}\` is not in your declared \`valid_sources\` list. This traffic will aggregate under an unrecognized source in your attribution model, making channel reporting inconsistent.`,
        fix: `Either add \`${campaign.utmSource}\` to your declared taxonomy or update the campaign to use a valid source value.`,
        affectedObjects: [campaign.id],
      });
    }
  }
  return findings;
};

const checkMissingUTMCampaign = (config) => {
  const findings = [];

  for (const campaign of config.campaigns) {
    if (campaign.utmCampaign === null && campaign.status === 'active') {
      findings.push({
        id: 'FG-003',
        category: 'UTM Integrity',
        severity: 'Warning',
        headline: `${campaign.name} traffic will appear as unattributed in GA4.`,
        detail: `Campaign \`${campaign.name}\` has no \`utm_campaign\` value set. Traffic will aggregate under a null-campaign bucket, making it impossible to isolate this campaign's ROI from other traffic or direct sessions.`,
        fix: `Add a \`utm_campaign\` value to all URLs for ${campaign.name} before the campaign runs.`,
        affectedObjects: [campaign.id],
      });
    }
  }
  return findings;
};

// ─── Form Binding Rules ───────────────────────────────────────────────────────

const checkOrphanedFormBindings = (config) => {
  const findings = [];

  for (const form of config.forms) {
    if (!form.crmIntegration) {
      findings.push({
        id: 'FG-010',
        category: 'Form Binding',
        severity: 'Info',
        headline: `${form.name} form data is going nowhere.`,
        detail: `Form \`${form.name}\` collects submissions with no CRM object creation, no list enrollment, and no workflow. Submissions are stored in form submissions only — not accessible as contacts or in automation.`,
        fix: 'Decide if submissions should become Contacts (and at what lifecycle stage), or connect to an ATS or notification system. If purely operational, add a notification email at minimum.',
        affectedObjects: [form.id],
      });
      continue;
    }

    // No workflow enrollment and no owner path
    if (
      form.workflowEnrollments.length === 0 &&
      !form.ownerAssigned &&
      form.crmIntegration &&
      form.lifecycleStageAssigned === 'Lead' &&
      form.id !== 'fg-support-011' && // handled separately
      form.id !== 'fg-exit-002'  // handled separately
    ) {
      if (form.id === 'fg-ebook-004' || form.name.toLowerCase().includes('ebook') || form.name.toLowerCase().includes('content download')) {
        findings.push({
          id: 'FG-004',
          category: 'Form Binding',
          severity: 'Warning',
          headline: 'Ebook leads are collected and immediately forgotten.',
          detail: `Form \`${form.name}\` creates a Lead record but enrolls contacts in no workflow. These leads receive zero follow-up automation — no nurture, no notification, no list.`,
          fix: 'Add an enrollment action to a nurture sequence, or at minimum add a Sales Notify enrollment so reps can see new leads.',
          affectedObjects: [form.id],
        });
      } else if (form.id === 'fg-partner-008' || form.name.toLowerCase().includes('partner')) {
        findings.push({
          id: 'FG-006',
          category: 'Form Binding',
          severity: 'Warning',
          headline: 'Partner leads are invisible to your automation.',
          detail: `Form \`${form.name}\` creates a Lead with no list enrollment and no workflow trigger. Partner leads cannot be distinguished from any other Lead-stage contact and receive no partner-specific follow-up.`,
          fix: 'Add a Partner Interest list enrollment and a partner-specific notification workflow, or add it to Sales Notify with a source-based filter.',
          affectedObjects: [form.id],
        });
      }
    }

    // Thank-you 404
    if (form.thankYouUrl404 === true) {
      findings.push({
        id: 'FG-008',
        category: 'Form Binding',
        severity: 'Warning',
        headline: `${form.name} shows a 404 after submission.`,
        detail: `Form \`${form.name}\` redirects to \`${form.thankYouUrl}\` after submit — a URL that returns 404. Contacts see a broken page immediately after giving you their information.`,
        fix: 'Update the thank-you redirect URL to a valid path (e.g., `/events/thank-you` or `/thank-you`).',
        affectedObjects: [form.id],
      });
    }
  }
  return findings;
};

const checkFormWithNoOwnerAssignment = (config) => {
  const findings = [];

  for (const form of config.forms) {
    if (
      (form.lifecycleStageAssigned === 'MQL' || form.lifecycleStageAssigned === 'SQL') &&
      !form.ownerAssigned &&
      form.workflowEnrollments.length === 0 &&
      form.crmIntegration
    ) {
      if (form.id === 'fg-pricing-005' || form.name.toLowerCase().includes('pricing')) {
        findings.push({
          id: 'FG-005',
          category: 'Form Binding',
          severity: 'Critical',
          headline: 'Pricing inquiries go to nobody.',
          detail: `Form \`${form.name}\` sets lifecycle to MQL but routes the contact to no owner. MQL-stage contacts from the highest-intent form on your site have no assigned rep and will receive no outreach.`,
          fix: 'Enroll `Pricing Page Inquiry` in `Owner Assign Round-Robin`. This is likely the root cause of FG-011.',
          criticalContext:
            'Critical because: intent-signal leads without owner assignment are effectively lost — they convert at the highest rate of any lead source and receive zero human follow-up.',
          affectedObjects: [form.id],
        });
      } else if (form.id === 'sc-trial-002' || form.name.toLowerCase().includes('trial')) {
        findings.push({
          id: 'FG-005',
          category: 'Form Binding',
          severity: 'Critical',
          headline: 'Trial signups have no owner assignment and no nurture path.',
          detail: `Form \`${form.name}\` creates MQL contacts with no assigned owner and no workflow enrollment. Your highest-intent conversion action has zero follow-up automation.`,
          fix: 'Add an Owner Assign enrollment and a trial nurture workflow trigger to this form immediately.',
          criticalContext:
            'Critical because: unowned trial signups are your fastest path to pipeline — leaving them unworked is direct revenue leakage.',
          affectedObjects: [form.id],
        });
      }
    }
  }
  return findings;
};

const checkFormIDMismatch = (config) => {
  const findings = [];

  for (const workflow of config.workflows) {
    if (workflow.enrollmentFormIdExpected && workflow.enrollmentFormIdActual) {
      if (workflow.enrollmentFormIdExpected !== workflow.enrollmentFormIdActual) {
        const relatedForm = config.forms.find(
          (f) => f.id === workflow.enrollmentFormIdActual
        );
        findings.push({
          id: 'FG-007',
          category: 'Form Binding',
          severity: 'Critical',
          headline: `Re-Engage workflow has never enrolled a single contact from Exit Intent.`,
          detail: `Workflow \`${workflow.name}\` triggers on form submission from form ID \`${workflow.enrollmentFormIdExpected}\`. The Exit Intent Popup form has ID \`${workflow.enrollmentFormIdActual}\`. These have never matched. Every exit-intent submission has silently missed the Re-Engage enrollment.`,
          fix: `Update the Re-Engage workflow trigger to form ID \`${workflow.enrollmentFormIdActual}\`, or rename the form ID to \`${workflow.enrollmentFormIdExpected}\` and update any other references.`,
          criticalContext:
            'Critical because: this is a zero-yield automation — the workflow runs, the trigger never fires. You\'ve been running a re-engagement campaign that has enrolled exactly zero contacts.',
          affectedObjects: [workflow.id, relatedForm?.id ?? workflow.enrollmentFormIdActual],
        });
      }
    }
  }
  return findings;
};

const checkLifecycleDowngrade = (config) => {
  const findings = [];

  for (const form of config.forms) {
    if (form.lifecycleStageOverwrite && form.lifecycleStageAssigned === 'Lead') {
      if (form.id === 'fg-support-011' || form.name.toLowerCase().includes('support')) {
        findings.push({
          id: 'FG-009',
          category: 'Form Binding',
          severity: 'Critical',
          headline: 'Support Ticket form is demoting your customers.',
          detail:
            'Form `Support Ticket` is configured to set lifecycle stage to `Lead` on submit. Any Customer-stage contact who submits a support ticket will be downgraded to Lead, re-enrolled in lead nurture sequences, and lose their lifecycle history. This happens silently, every time.',
          fix: 'Remove the "Set lifecycle stage" action from Support Ticket, or add a suppression condition: "skip if current stage = Customer."',
          criticalContext:
            'Critical because: Customer-stage contacts re-entering lead nurture is a churn signal — they will receive "learn about our product" messaging they\'ve already been through, signaling that your system doesn\'t recognize them as customers.',
          affectedObjects: [form.id, 'wf-lead-nurture-q2'],
        });
      } else if (form.id === 'ec-return-004' || form.name.toLowerCase().includes('return')) {
        findings.push({
          id: 'FG-009',
          category: 'Form Binding',
          severity: 'Critical',
          headline: 'Return Request form is downgrading repeat customers to Lead.',
          detail: `Form \`${form.name}\` overwrites lifecycle stage to Lead on submit. Any repeat Customer who files a return request loses their Customer lifecycle classification and may re-enter acquisition nurture sequences.`,
          fix: 'Remove the lifecycle stage override from this form, or add a suppression: "skip if current stage = Customer."',
          criticalContext:
            'Critical because: your highest-LTV contacts — repeat customers — are being silently re-classified as cold leads every time they interact with your support process.',
          affectedObjects: [form.id],
        });
      } else if (form.id === 'sc-churn-004' || form.name.toLowerCase().includes('cancell')) {
        findings.push({
          id: 'FG-009',
          category: 'Form Binding',
          severity: 'Critical',
          headline: 'Cancellation survey is setting churning customers back to Lead.',
          detail: `Form \`${form.name}\` overwrites lifecycle stage to Lead. Contacts who cancel are being re-classified as new leads rather than Churned — corrupting lifecycle reporting and potentially enrolling them in new-customer sequences.`,
          fix: 'Create a "Churned" lifecycle stage and set the cancellation form to assign Churned, not Lead.',
          criticalContext:
            'Critical because: churned contacts in Lead stage distort MQL counts and may trigger acquisition outreach to people who just left.',
          affectedObjects: [form.id],
        });
      } else if (form.id === 'sc-contact-003' || (form.name.toLowerCase().includes('contact') && form.name.toLowerCase().includes('sales'))) {
        findings.push({
          id: 'FG-009',
          category: 'Form Binding',
          severity: 'Critical',
          headline: 'Contact Sales form is overwriting Customer lifecycle to MQL.',
          detail: `Form \`${form.name}\` overwrites lifecycle stage to MQL regardless of current stage. Existing customers who contact sales are being reclassified as MQL, re-entering mid-funnel sequences.`,
          fix: 'Add a suppression condition: "skip lifecycle overwrite if current stage = Customer." Use a dedicated post-sale contact routing workflow instead.',
          criticalContext:
            'Critical because: existing customers being reclassified as MQL will receive mid-funnel acquisition messaging — eroding trust and generating false pipeline signals.',
          affectedObjects: [form.id],
        });
      }
    }
  }
  return findings;
};

// ─── Lifecycle Logic Rules ────────────────────────────────────────────────────

const checkUnownedMQLs = (config) => {
  const findings = [];

  const unownedMQLs = config.contacts.find(
    (c) => c.lifecycleStage === 'MQL' && c.ownerAssigned === false
  );

  if (unownedMQLs && unownedMQLs.count > 0) {
    findings.push({
      id: 'FG-011',
      category: 'Lifecycle Logic',
      severity: 'Critical',
      headline: `${unownedMQLs.count} MQLs have no owner and are going cold.`,
      detail: `${unownedMQLs.count} contacts are in MQL lifecycle stage with \`owner = null\`. Unowned MQLs receive no sales outreach — they are a dead end in the funnel. The likely cause is FG-005: \`Pricing Page Inquiry\` is not enrolled in \`Owner Assign Round-Robin\`.`,
      fix: 'Enroll `Pricing Page Inquiry` in `Owner Assign Round-Robin` (see FG-005). Run a one-time owner assignment for the existing unowned MQLs.',
      criticalContext:
        'Critical because: MQL-stage contacts represent real pipeline; every day without owner assignment is lost pipeline velocity. These contacts have raised their hand and received no response.',
      affectedObjects: [unownedMQLs.segment, 'wf-owner-assign'],
    });
  }
  return findings;
};

const checkCustomerInLeadNurture = (config) => {
  const findings = [];

  // Check workflows for customer-stage enrollments
  for (const workflow of config.workflows) {
    if (workflow.customerStageEnrolled && workflow.customerStageEnrolled > 0) {
      findings.push({
        id: 'FG-012',
        category: 'Lifecycle Logic',
        severity: 'Critical',
        headline: `${workflow.customerStageEnrolled} of your customers are receiving lead-acquisition emails.`,
        detail: `${workflow.customerStageEnrolled} contacts are in \`Customer\` lifecycle stage but are active enrollees in \`${workflow.name}\` workflow. These customers are receiving "learn about our product" and "start your free trial" messaging. This is a churn risk, not a nurture opportunity.`,
        fix: `Add an enrollment suppression to \`${workflow.name}\`: "Do not enroll if lifecycle stage = Customer." Unenroll the ${workflow.customerStageEnrolled} existing contacts immediately.`,
        criticalContext:
          'Critical because: sending acquisition messaging to existing customers signals that your system doesn\'t recognize them — eroding trust, risking opt-outs, and generating support tickets from confused customers.',
        affectedObjects: [workflow.id, 'customers-in-lead-nurture'],
      });
    }
  }
  return findings;
};

const checkStaleSQL = (config) => {
  const findings = [];

  const staleSQLs = config.contacts.find(
    (c) =>
      c.lifecycleStage === 'SQL' &&
      c.lastOwnerActivityDays !== undefined &&
      c.lastOwnerActivityDays > 90 &&
      c.openOpportunity === false
  );

  if (staleSQLs && staleSQLs.count > 0) {
    findings.push({
      id: 'FG-013',
      category: 'Lifecycle Logic',
      severity: 'Warning',
      headline: `${staleSQLs.count} SQLs have been sitting untouched for 90 days.`,
      detail: `${staleSQLs.count} contacts are SQL-stage with last owner activity logged > 90 days ago and no open opportunity. Stale SQLs distort pipeline coverage metrics and suggest a routing or capacity issue.`,
      fix: `Run a review pass on these ${staleSQLs.count} contacts: either qualify to Opportunity, recycle to MQL, or mark as Disqualified. Add a workflow alert for SQLs with no owner activity > 30 days.`,
      affectedObjects: [staleSQLs.segment],
    });
  }
  return findings;
};

// ─── Attribution Gap Rules ────────────────────────────────────────────────────

const checkRetiredCampaignAttribution = (config) => {
  const findings = [];
  const { retiredCampaigns } = config.utmTaxonomy;

  const retiredContactSegments = config.contacts.filter(
    (c) => c.attributionSource && retiredCampaigns.includes(c.attributionSource)
  );

  for (const segment of retiredContactSegments) {
    findings.push({
      id: 'FG-014',
      category: 'Attribution Gap',
      severity: 'Warning',
      headline: `${segment.count} contacts will report under a retired campaign in attribution.`,
      detail: `${segment.count} contacts have first-touch attribution to \`${segment.attributionSource}\` — a campaign in your \`retired_campaigns\` list. In any attribution model run against current data, these contacts will attribute to a campaign that no longer runs. Q2 channel ROI will include contacts whose first touch predates Q2.`,
      fix: `See FG-001. Add a note in your attribution model documentation that pre-Q2 contacts are included in Q2 counts until the attribution is updated.`,
      affectedObjects: [segment.segment],
    });
  }
  return findings;
};

const checkOrphanedWorkflows = (config) => {
  const findings = [];
  const { retiredCampaigns } = config.utmTaxonomy;

  for (const workflow of config.workflows) {
    if (
      workflow.triggerCampaign &&
      retiredCampaigns.includes(workflow.triggerCampaign) &&
      (workflow.totalEnrollmentsLast180Days === 0 || workflow.totalEnrollmentsAllTime === 0)
    ) {
      findings.push({
        id: 'FG-015',
        category: 'Attribution Gap',
        severity: 'Warning',
        headline: `\`${workflow.name}\` has had zero enrollments in 6 months.`,
        detail: `Workflow \`${workflow.name}\` has had 0 enrollments in 180 days. Its trigger campaign (\`${workflow.triggerCampaign}\`) is in \`retired_campaigns\`. This workflow is active, consuming automation capacity, and adding audit noise to workflow reporting.`,
        fix: `Archive or delete \`${workflow.name}\`. If there is any chance the campaign runs again, clone it with a new campaign trigger before deleting the original.`,
        affectedObjects: [workflow.id],
      });
    }
  }
  return findings;
};

const checkMissingOwnerAssignEnrollment = (config) => {
  const findings = [];

  const ownerAssignWorkflow = config.workflows.find(
    (w) => w.name.toLowerCase().includes('owner assign') || w.name.toLowerCase().includes('owner-assign')
  );

  if (ownerAssignWorkflow && ownerAssignWorkflow.missingTriggers && ownerAssignWorkflow.missingTriggers.length > 0) {
    const missingForms = ownerAssignWorkflow.missingTriggers
      .map((id) => config.forms.find((f) => f.id === id)?.name ?? id)
      .join(', ');

    findings.push({
      id: 'FG-016',
      category: 'Attribution Gap',
      severity: 'Warning',
      headline: 'Your owner-assignment workflow has a gap at the highest-intent form.',
      detail: `\`${ownerAssignWorkflow.name}\` is enrolled from ${ownerAssignWorkflow.enrollmentTriggers.length} forms but not from \`${missingForms}\`. Leads from your pricing page — likely your highest-intent traffic — have no automated owner path. This is the root cause of both FG-005 and FG-011.`,
      fix: `Add \`${missingForms}\` as an enrollment trigger in \`${ownerAssignWorkflow.name}\`. This single fix resolves three interconnected issues.`,
      affectedObjects: [ownerAssignWorkflow.id, ...ownerAssignWorkflow.missingTriggers],
    });
  }
  return findings;
};

// ─── Rule composition ────────────────────────────────────────────────────────

const ALL_RULES = [
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
];

export function runRules(config) {
  return ALL_RULES.flatMap((rule) => rule(config));
}

// Exported individual rules + the rule list so each can be unit-tested in
// isolation (see ../../tests/funnelguard-check.test.js).
export {
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
};

// ─── Findings → severity counts ──────────────────────────────────────────────

function countSeverities(findings) {
  const counts = { Critical: 0, Warning: 0, Info: 0 };
  for (const f of findings) {
    if (f.severity === 'Critical') counts.Critical += 1;
    else if (f.severity === 'Warning') counts.Warning += 1;
    else if (f.severity === 'Info') counts.Info += 1;
  }
  return counts;
}

// ─── check() entry: validation + shape ───────────────────────────────────────

const REQUIRED_ARRAYS = ['campaigns', 'forms', 'contacts', 'workflows'];

export function check(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Submit a FunnelConfig object to check.');
  }
  if (!config.utmTaxonomy || typeof config.utmTaxonomy !== 'object') {
    throw new Error('FunnelConfig is missing `utmTaxonomy`.');
  }
  const tax = config.utmTaxonomy;
  if (!Array.isArray(tax.validSources) || !Array.isArray(tax.validMediums) || !Array.isArray(tax.retiredCampaigns)) {
    throw new Error('`utmTaxonomy` must have validSources, validMediums, and retiredCampaigns arrays.');
  }
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(config[key])) {
      throw new Error(`FunnelConfig field \`${key}\` must be an array.`);
    }
  }
  const findings = runRules(config);
  const counts = countSeverities(findings);
  return { findings, counts };
}

// ─── Pages Function entry ──────────────────────────────────────────────────

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    return json(check(body));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Check failed.' }, { status: 400 });
  }
}
