# Funnelguard

> **Your funnel is lying to you.** It started the day someone built the blog ad with `utm_medium=cpc`. Funnelguard catches the lie at config time — not at the QBR.

| Field | Value |
|---|---|
| **Slug** | `funnelguard` |
| **Lane fit** | L1 (MarTech / RevOps) primary; L2 (GTM Engineer / Revenue Systems) co-signal |
| **Live route** | `demos.dallascrilley.com/funnelguard` |
| **Status** | Spec v2; v1 build candidate |
| **Build estimate** | ~1 week core / ~1.5 weeks trimmed-full |
| **Buildability** | 4 — rules as data, client-side only, zero backend |
| **Accent token** | `--accent: oklch(62% 0.24 22)` signal-orange |

---

## 1. Vision + Positioning

**One-line vision:** Funnelguard is a static, client-side funnel-config linter that catches broken UTM taxonomy, orphaned forms, and lifecycle-stage logic errors *before* they corrupt attribution data and QBR reports.

**Hook:** "Your funnel is lying to you. It started the day someone built the blog ad with `utm_medium=cpc`."

**Tagline variants:**
- *"Catch the lie before the QBR."*
- *"Bizible shows you the damage. Funnelguard prevents it."*

**Microcopy voice sample** (finding card, FG-009):
> **Support Ticket form is demoting your customers.**
> When an existing Customer submits a support ticket, this form resets their lifecycle stage to Lead. They'll re-enter lead nurture sequences and lose their sales history. This happens silently, every time.
> **Fix:** Remove the "Set lifecycle stage" action from the Support Ticket form, or add an enrollment suppression for Customer-stage contacts.

**Positioning statement:** "Bizible and Dreamdata tell you the funnel is broken at the QBR. Funnelguard catches it when the form is built." The tool operates at the config layer — UTM taxonomy, form-workflow bindings, lifecycle-stage assignments, attribution rules — not the reporting layer.

---

## 2. Problem & Evidence

RevOps teams manage dozens of campaign sources, hundreds of forms, and lifecycle automation rules spread across three or more systems. The rot enters at build time — a bad UTM tag on an ad, a form with no downstream workflow, a contact pushed to Customer lifecycle while still enrolled in a lead nurture sequence — and surfaces months later as corrupted attribution or a QBR that nobody trusts.

### Cited job-posting evidence (IDEAS-FROM-JOBS.md §4)

> **Glean Lifecycle Marketing Ops:** "Campaign and channel taxonomies… continuous improvements in funnel performance and data hygiene."

> **Filevine:** "Ensure proper UTM tracking, campaign tagging, and attribution setup."

> **Neptune:** "Implement attribution logic so it remains credible under growth pressure."

> **Bloomerang:** "Maintain data integrity across marketing automation and CRM systems, including list hygiene, enrichment updates, and field validation."

### Why current tools fail

- **Bizible / Dreamdata** are reporting-layer tools. They show damage after the QBR. They don't enforce taxonomy at form-build / ad-build time.
- **UTM hygiene** is a manual quarterly spreadsheet audit. Nobody cross-references an ad URL against the declared taxonomy when the ad is created.
- **HubSpot native validation** catches field-level errors; it does not cross-reference campaign taxonomy, downstream workflow binding, or lifecycle-stage consistency.
- The result: attribution rot enters silently at configuration time and is discovered painfully at reporting time.

---

## 3. The Signature Finding — "The Moment"

**FG-009 / FG-012 as a paired narrative:** A RevOps lead scanning the default scenario sees two findings that land like a gut punch:

> **FG-009 — Critical — Form Binding:** *"Support Ticket form is set to assign lifecycle stage = Lead on submit. Any Customer-stage contact who submits a support ticket will be silently downgraded to Lead, re-enrolled in lead nurture, and lose their deal history. This has been firing on every support submission."*

> **FG-012 — Critical — Lifecycle Logic:** *"7 contacts are in Customer lifecycle stage but are currently active in Lead Nurture Q2 workflow. They are receiving 'learn about our product' emails. This is a churn risk, not a nurture opportunity."*

These two findings tell a story: **the form and the workflow are both broken, and they reinforce each other.** The form demotes Customers, the workflow catches them on the way down and starts emailing them about "getting started." Only someone who has lived inside a lifecycle engine recognizes that these aren't two separate bugs — they're one compounding failure.

**Why this is the unforgettable moment:** Any engineer can write "UTM is missing." Only someone who has configured HubSpot lifecycle automation, mapped form-to-workflow enrollments, and debugged why Customers ended up back in lead nurture knows to look for this interaction. The finding proves systems ownership, not API knowledge.

---

## 4. Target Role & Proof Narrative

**Primary audience:** RevOps / Marketing Ops hiring managers, GTM Engineering leads. Secondary: any interviewer evaluating systems ownership depth.

### What 30 seconds proves

| Claim | Proof moment |
|---|---|
| "I owned lifecycle systems, not just integrations" | FG-012 is the tell: a contact in Customer stage enrolled in Lead Nurture Q2 is only alarming if you know what lead nurture enrollment *does* to a customer relationship. |
| "I understand attribution at the config layer, not the dashboard layer" | FG-002 flags `utm_medium=cpc` on an organic blog URL — not "link is broken" but "taxonomy collision that will misattribute organic sessions as paid in GA4 and connected attribution models." |
| "I can operationalize quality gates, not just spot problems" | Each finding has severity + a fix that reads like an admin would write it — exact field name, exact workflow name, exact corrective action. |
| "I can build tools, not just run them" | Client-side, zero backend, synthetic-data banner visible, rule set readable in-browser. |

### Objection → proof table

| Hiring concern | Role | How Funnelguard answers it |
|---|---|---|
| "Can you actually operate in HubSpot, or just talk about it?" | RevOps Manager | FG-007: knows HubSpot form IDs are distinct from form names and that workflow triggers reference the ID, not the label. |
| "Have you owned lifecycle architecture or just maintained it?" | GTM Engineering Lead | FG-009 + FG-012 cascade: correctly identifies that a form action and a workflow enrollment criterion are co-causes of the same lifecycle corruption. |
| "Can you enforce standards, not just define them?" | Revenue Systems Lead | The rule engine is typed, composable, and deterministic — each rule is a pure function that a team could extend. It's not a one-off audit script. |
| "Do you understand attribution at the model level?" | Marketing Ops Director | FG-001 + FG-014: retired campaign still attributed to 22 live contacts + explains downstream QBR impact on channel ROI calculations. |
| "Have you actually run GTM programs, or just plumbed them?" | Hiring Manager (general) | The synthetic Acme config names *specific* campaigns (Q2 Paid Search Google, Q2 LinkedIn Sponsored), *specific* workflows (Owner Assign Round-Robin, Lead Nurture Q2), and the findings reference them by exact name — not generic placeholders. |

### Dallas's moat line, made visible

"I owned the system, I did not integrate against it."

The finding set is the proof. Anyone can write "UTM is missing." Only someone who has owned the system knows to flag:
- A contact simultaneously in Customer lifecycle AND enrolled in Lead Nurture (FG-012).
- A form collecting data that goes nowhere — no list, no workflow, no notification (FG-006 Partner Application).
- A UTM medium value `cpc` on an organic blog URL — taxonomy collision, not a missing param (FG-002).
- A workflow trigger referencing a form ID that doesn't match the actual form ID — a silent enrollment failure nobody would catch in a dashboard (FG-007).

These findings are the credential. The code is the supporting evidence.

### Honesty as sophistication

A persistent banner reads:

> **Synthetic data only.** This demo runs on a fabricated HubSpot + GA4 + ad-account config — realistic in shape, fictional in fact. No real CRM data, no API connections, no secrets. The findings engine is real; the config it runs against is not. [View the synthetic config →]

Framed as a trust signal, not a disclaimer. The collapsible config viewer is the proof: a visitor can read every campaign, form, workflow, and lifecycle rule the engine scanned.

---

## 5. The Demo — Core Flow

### Entry

User lands on `demos.dallascrilley.com/funnelguard`. Page loads with a persistent synthetic-data banner and a pre-selected **"Acme Corp — Q2 Funnel Config"** scenario. No login required.

### Config selection

Top bar shows a scenario selector (dropdown). Three scenarios ship:
- **Acme Corp Q2 Funnel** — mixed-severity findings, the default
- **SaaS Startup — Post-Series A** — heavy lifecycle contradiction set
- **E-Commerce Brand** — heavy UTM/attribution gap set

Selecting a scenario loads a JSON config (UTMs, forms, lifecycle stages, workflows, ad campaigns) into the engine. Config is rendered as a collapsible **"What we scanned"** panel — campaigns, forms, workflows, lifecycle rules — so visitors can verify the synthetic objects. (Not contact records — the scan surface is the *config*, which is the tell.)

### Scan + findings

Funnelguard runs the rule engine client-side on load (< 200 ms for the synthetic config). Results render as a findings list, default-sorted by severity:

| Severity | Color | Meaning |
|---|---|---|
| Critical | `oklch(55% 0.24 28)` red | Corrupt attribution or data loss — fix before next campaign |
| Warning | `oklch(70% 0.18 60)` amber | Degraded reporting quality — fix before QBR |
| Info | `oklch(65% 0.18 240)` blue | Best-practice gap — fix when convenient |

Each finding card shows:
- **Severity-colored left border** (4px, prominent — not a dot or chip)
- **Finding ID** in monospace: `FG-009`
- **Category badge:** UTM Integrity / Form Binding / Lifecycle Logic / Attribution Gap
- **Headline:** one sentence, specific, written in practitioner voice (not generic engineer voice)
- **Detail:** one to three sentences — the *why it matters* framing a senior RevOps person would recognize
- **Fix:** one to two sentences, exact — the field, workflow, or tag to change
- **Affected objects:** inline monospace references, linked to the config viewer

### The "Why this is critical" context note

Under every Critical finding, a one-line plain-English context note:
> *"Critical because: Customer-stage contacts re-entering lead nurture is a churn signal, not a nurture opportunity — it indicates the contact's lifecycle history has been corrupted."*

This ensures a hiring manager who hasn't configured HubSpot lifecycle still understands the severity.

### Filters + sort

Sticky filter bar: severity multi-select, category multi-select. Sort: Severity (default), Category, Object name. Finding count updates reactively. A summary strip above the list: **Critical: 6 | Warning: 9 | Info: 1 | Scanned objects: 38**.

### Interactive affordances (v1)

- Scenario switching (three configs, three different finding profiles)
- Filter / sort controls
- Expanding finding cards for full detail + fix
- Config viewer (raw synthetic objects, structured JSON inspector)

---

## 6. Brand / Visual Direction

**Name:** Funnelguard (slug `funnelguard`; display "Funnelguard")

**Visual direction:** Diagnostic audit tool — not a marketing dashboard, not a SaaS onboarding flow. Specific references: Sentry's issue list density, Linear's severity system, a linter terminal output made legible for non-engineers.

**Sibling differentiation mandate:** Funnelguard must be visually distinct from Q2See (flow-graph Sankey, node-based). Q2See is wide-canvas, data-viz heavy. Funnelguard is dense, list-based, terminal-aesthetic — a findings ledger, not a diagram. The difference is immediately obvious side-by-side.

### Palette (exact tokens)

```css
:root {
  /* surfaces */
  --bg:            oklch(12% 0 0);     /* near-black — audit tools live in the dark */
  --surface:       oklch(17% 0 0);     /* elevated card panels */
  --surface-hover: oklch(20% 0 0);     /* interactive hover state */
  --border:        oklch(28% 0 0);     /* subtle separators */

  /* severity */
  --critical:      oklch(55% 0.24 28); /* deep red */
  --warning:       oklch(70% 0.18 60); /* amber */
  --info:          oklch(65% 0.18 240);/* muted blue */

  /* brand */
  --accent:        oklch(62% 0.24 22); /* signal-orange — "fix this" attention color */

  /* text */
  --text-primary:  oklch(92% 0 0);
  --text-secondary:oklch(62% 0 0);
  --text-mono:     oklch(78% 0.04 120);/* slightly warm for mono IDs */
}
```

### Typography

- **IDs, object names, code references:** JetBrains Mono (or IBM Plex Mono fallback) — the mono-body contrast signals "tool output, not brochure"
- **Body, headlines, UI copy:** Inter (or system-ui fallback)
- **Finding ID** rendered as: `FG-009` in `--text-mono`, 11px, letter-spacing 0.08em
- **Headline:** Inter 15px/22px, `--text-primary`, medium weight — compact, not card-hero sized

### Signature visual motif: the severity-border finding row

The findings list is the hero of the UI. Each row:
- **4px solid left border** in the severity color — this is the dominant visual element
- Compact density: 56-72px row height (not padded cards)
- Finding ID in mono, left-aligned, 60px column
- Category badge: small, pill, `--surface-hover` background with severity-tinted text
- Headline flows inline, no line break from the badge

This is the "linter terminal cleaned up for humans" aesthetic. Not a card grid. Not shadcn defaults.

### Signature interaction: the config cross-link

Clicking an affected-object reference in a finding card highlights the corresponding object in the "What we scanned" config viewer panel. The link is subtle (underlined mono text) but the target glows with a 300ms `--accent` border flash. This is the interaction that proves the tool actually understands the *relationship* between findings and config objects — not just a list of complaints.

### Wordmark

"funnelguard" in lowercase JetBrains Mono, with a `▼` funnel glyph (U+25BC) preceding the name in `--accent`. Small, left-aligned in the nav. Deliberately tool-like, not startup-logotype.

### Anti-template bar (required)

The findings list must not look like a generic card grid. Required:
- Severity-colored left borders (4px), not severity dots or chips
- Compact density, not card-heavy padding
- Inline monospace object references, not separate "affected" accordions
- Sticky header with live counts
- Config viewer looks like a structured JSON inspector with line numbers, not an accordion FAQ

---

## 7. Rule Set + Synthetic Config — "Acme Corp Q2"

The synthetic config tells a story: **a Q2 launch that quietly broke attribution.** A real campaign ran. A retired retargeting campaign wasn't cleaned up. A blog post went live with the wrong UTM medium. A new pricing form went live with no owner assignment. The support team enabled a new support ticket form without knowing it had a lifecycle-stage action. These aren't random bugs — they're the *actual* class of mistakes RevOps teams inherit.

### Named synthetic objects

```
Campaigns (8)
  Q2-Paid-Search-Google     utm_source=google,     utm_medium=cpc,        utm_campaign=q2-paid-search
  Q2-LinkedIn-Sponsored     utm_source=linkedin,   utm_medium=paid_social, utm_campaign=q2-linkedin
  Q2-Email-Newsletter       utm_source=newsletter, utm_medium=email,       utm_campaign=q2-newsletter
  Q2-Webinar-April          utm_source=webinar,    utm_medium=event,       utm_campaign=q2-webinar-apr
  Q1-Retargeting-RETIRED    utm_source=google,     utm_medium=cpc,         utm_campaign=q1-retargeting   ← DEFECT: retired campaign, still attributing
  Blog-Organic              utm_source=blog,        utm_medium=cpc,        utm_campaign=blog-traffic      ← DEFECT: wrong medium (organic channel, cpc value)
  Q2-Tradeshow-Boston       utm_source=tradeshow,  utm_medium=event,       utm_campaign=(missing)         ← DEFECT: missing campaign value
  Partner-Referral          utm_source=partner,    utm_medium=referral                                     valid

UTM Taxonomy (declared)
  valid_sources:    [google, linkedin, newsletter, webinar, blog, partner, direct, tradeshow]
  valid_mediums:    [cpc, paid_social, email, event, organic, referral, display]
  retired_campaigns:[q1-retargeting, q1-demo-day, 2025-fall-launch]

Forms (12)
  Contact Us              → lifecycle=Lead,       enrolled: Sales Notify, Owner Assign
  Free Trial Request      → lifecycle=MQL,        enrolled: Trial Nurture, Owner Assign
  Webinar Registration    → lifecycle=Lead,        enrolled: Webinar Follow-Up
  Content Download—Ebook  → lifecycle=Lead,        enrolled: (none)                           ← DEFECT: no workflow enrollment
  Pricing Page Inquiry    → lifecycle=MQL,         enrolled: (none), no owner assignment      ← DEFECT: MQL with no owner path
  Demo Request            → lifecycle=SQL,         enrolled: Demo Confirm, Owner Assign
  Newsletter Signup       → lifecycle=Subscriber,  enrolled: Newsletter Welcome
  Partner Application     → lifecycle=Lead,        enrolled: (none), no list, no workflow     ← DEFECT: invisible to automation
  Exit Intent Popup       → lifecycle=Lead,        enrolled: Re-Engage (form ID: fg-exit-002) ← DEFECT: workflow trigger expects fg-exit-003
  Event Check-In          → lifecycle=Lead,        enrolled: (none); thank-you URL: /events/thank-you-boston (404) ← DEFECT: broken redirect
  Support Ticket          → lifecycle=Lead [SET],  enrolled: (none)                           ← DEFECT: overwrites Customer stage to Lead
  Careers Interest        → (no CRM integration)                                               ← DEFECT: form data goes nowhere (Info)

Lifecycle Stages
  Defined: [Subscriber, Lead, MQL, SQL, Customer]

Contacts — sampled contradictions
  14 contacts  stage=MQL,      owner=null                                    ← DEFECT: unowned MQLs
   7 contacts  stage=Customer, enrolled: Lead Nurture Q2 (active)            ← DEFECT: customers in lead nurture
   3 contacts  stage=SQL,      last_activity > 90 days, no owner touch       ← DEFECT: stale SQLs
  22 contacts  stage=Lead,     attribution source = q1-retargeting (retired) ← DEFECT: retired campaign attribution

Workflows (9)
  Trial Nurture              active, 6 steps,  enrolled from: Free Trial Request
  Sales Notify               active, 1 step,   enrolled from: Contact Us, Demo Request
  Demo Confirm               active, 3 steps,  enrolled from: Demo Request
  Lead Nurture Q2            active, 8 steps,  enrolled: includes 7 Customer-stage contacts  ← DEFECT: wrong audience
  Owner Assign Round-Robin   active,           enrolled from: 4 forms (Pricing Inquiry missing) ← DEFECT: missing enrollment
  Re-Engage                  active, 4 steps,  trigger: form ID fg-exit-003; form has fg-exit-002 ← DEFECT: ID mismatch
  Webinar Follow-Up          active, 3 steps,  enrolled from: Webinar Registration
  Newsletter Welcome         active, 2 steps,  enrolled from: Newsletter Signup
  Q1 Demo Day Follow-Up      ORPHANED,         trigger campaign retired, 0 enrollments in 180 days ← DEFECT: zombie workflow
```

### Findings — exact text, builder implements verbatim

| ID | Category | Severity | Defect | Headline | Detail | Fix |
|---|---|---|---|---|---|---|
| FG-001 | UTM Integrity | Critical | `q1-retargeting` retired, 22 contacts still attributed | "Q1 Retargeting is retired but still attributing 22 contacts." | Campaign `q1-retargeting` is in your declared `retired_campaigns` list but is the recorded UTM source for 22 live contacts. Any conversion from these contacts will attribute to a campaign that hasn't run since Q1. Your Q2 channel ROI will include Q1 retargeting spend — or worse, zero attribution for these contacts if the campaign is deleted from the ad platform. | Archive these contacts' UTM source or update their attribution to the Q2 successor campaign. Add a taxonomy validation step to your campaign-creation process. |
| FG-002 | UTM Integrity | Critical | Blog-Organic uses `utm_medium=cpc` (wrong medium) | "Blog campaign is reporting as paid search in GA4." | Campaign `blog-traffic` sets `utm_medium=cpc` but is an organic blog channel. `cpc` is reserved for paid search in your declared taxonomy. GA4 and any connected attribution model (Bizible, Dreamdata) will count this organic traffic as paid-search clicks, inflating CPC channel performance and deflating organic. *Critical because: this is a silent misattribution that corrupts channel ROI calculations for every reporting period the blog campaign runs.* | Change `utm_medium` on all blog URLs to `organic`. Audit GA4 for historical sessions attributed under this campaign and note the correction in your QBR data notes. |
| FG-003 | UTM Integrity | Warning | Q2-Tradeshow-Boston missing `utm_campaign` | "Tradeshow traffic will appear as unattributed in GA4." | Campaign `Q2-Tradeshow-Boston` has no `utm_campaign` value set. Traffic will aggregate under a null-campaign bucket, making it impossible to isolate tradeshow ROI from other Boston-event traffic or direct traffic. | Add `utm_campaign=q2-tradeshow-boston` to all tradeshow URLs before the event. |
| FG-004 | Form Binding | Warning | Content Download Ebook: no workflow enrollment | "Ebook leads are collected and immediately forgotten." | Form `Content Download — Ebook` creates a Lead record but enrolls contacts in no workflow. These leads receive zero follow-up automation — no nurture, no notification, no list. | Add an enrollment action to a nurture sequence (Trial Nurture or a dedicated content-download nurture), or at minimum add a Sales Notify enrollment so reps can see new leads. |
| FG-005 | Form Binding | Critical | Pricing Page Inquiry: no owner assignment | "Pricing inquiries go to nobody." | Form `Pricing Page Inquiry` sets lifecycle to MQL but routes the contact to no owner. MQL-stage contacts from the highest-intent form on your site have no assigned rep and will receive no outreach. *Critical because: intent-signal leads without owner assignment are effectively lost.* | Enroll `Pricing Page Inquiry` in `Owner Assign Round-Robin`. This is likely the root cause of FG-011. |
| FG-006 | Form Binding | Warning | Partner Application: no list, no workflow | "Partner leads are invisible to your automation." | Form `Partner Application` creates a Lead with no list enrollment and no workflow trigger. Partner leads cannot be distinguished from any other Lead-stage contact and receive no partner-specific follow-up. | Add a Partner Interest list enrollment and a partner-specific notification workflow, or add it to Sales Notify with a source-based filter. |
| FG-007 | Form Binding | Critical | Exit Intent Popup: form ID mismatch with Re-Engage workflow | "Re-Engage workflow has never enrolled a single contact from Exit Intent." | Workflow `Re-Engage` triggers on form submission from form ID `fg-exit-003`. The Exit Intent Popup form has ID `fg-exit-002`. These have never matched. Every exit-intent submission has silently missed the Re-Engage enrollment. *Critical because: this is a zero-yield automation — the workflow runs, the trigger never fires.* | Update the Re-Engage workflow trigger to form ID `fg-exit-002`, or rename the form ID to `fg-exit-003` and update any other references. |
| FG-008 | Form Binding | Warning | Event Check-In: broken thank-you redirect | "Event Check-In shows a 404 after submission." | Form `Event Check-In` redirects to `/events/thank-you-boston` after submit — a URL that returns 404. Contacts see a broken page immediately after giving you their information. | Update the thank-you redirect URL to a valid path (e.g., `/events/thank-you` or `/thank-you`). |
| FG-009 | Form Binding | Critical | Support Ticket: overwrites Customer lifecycle to Lead | "Support Ticket form is demoting your customers." | Form `Support Ticket` is configured to set lifecycle stage to `Lead` on submit. Any Customer-stage contact who submits a support ticket will be downgraded to Lead, re-enrolled in lead nurture sequences, and lose their lifecycle history. *Critical because: Customer-stage contacts re-entering lead nurture is a churn signal — they will receive "learn about our product" messaging they've already been through.* | Remove the "Set lifecycle stage" action from Support Ticket, or add a suppression condition: "skip if current stage = Customer." |
| FG-010 | Form Binding | Info | Careers Interest: no CRM integration | "Careers form data is going nowhere." | Form `Careers Interest` collects submissions with no CRM object creation, no list enrollment, and no workflow. Submissions are stored in HubSpot form submissions only — not accessible as contacts or in automation. | Decide if careers submissions should become Contacts (and at what lifecycle stage), or connect to an ATS or Google Sheet. If purely operational, add a notification email at minimum. |
| FG-011 | Lifecycle Logic | Critical | 14 MQL contacts with null owner | "14 MQLs have no owner and are going cold." | 14 contacts are in MQL lifecycle stage with `owner = null`. Unowned MQLs receive no sales outreach — they are a dead end in the funnel. The likely cause is FG-005: `Pricing Page Inquiry` is not enrolled in `Owner Assign Round-Robin`. *Critical because: MQL-stage contacts represent real pipeline; every day without owner assignment is lost pipeline velocity.* | Enroll `Pricing Page Inquiry` in `Owner Assign Round-Robin` (see FG-005). Run a one-time owner assignment for the 14 existing unowned MQLs. |
| FG-012 | Lifecycle Logic | Critical | 7 Customer-stage contacts in Lead Nurture Q2 | "7 of your customers are receiving lead-acquisition emails." | 7 contacts are in `Customer` lifecycle stage but are active enrollees in `Lead Nurture Q2` workflow. These customers are receiving "learn about our product" and "start your free trial" messaging. This is a churn risk, not a nurture opportunity. *Critical because: sending acquisition messaging to existing customers signals that your system doesn't recognize them — eroding trust and risking support tickets or opt-outs.* | Add an enrollment suppression to `Lead Nurture Q2`: "Do not enroll if lifecycle stage = Customer." Unenroll the 7 existing contacts immediately. |
| FG-013 | Lifecycle Logic | Warning | 3 SQL contacts > 90 days with no owner activity | "3 SQLs have been sitting untouched for 90 days." | 3 contacts are SQL-stage with last owner activity logged > 90 days ago and no open opportunity. Stale SQLs distort pipeline coverage metrics and suggest a routing or capacity issue. | Run a review pass on these 3 contacts: either qualify to Opportunity, recycle to MQL, or mark as Disqualified. Add a workflow alert for SQLs with no owner activity > 30 days. |
| FG-014 | Attribution Gap | Warning | 22 contacts attributed to retired campaign | "22 contacts will report under a retired campaign in attribution." | These are the same 22 contacts flagged in FG-001. In any attribution model run against the current data, these contacts will attribute to `q1-retargeting` — a campaign that no longer runs. Q2 channel ROI will include contacts whose first touch predates Q2. | See FG-001. Add a note in your attribution model documentation that pre-Q2 contacts are included in Q2 counts until the attribution is updated. |
| FG-015 | Attribution Gap | Warning | Workflow `Q1 Demo Day Follow-Up` is orphaned | "Q1 Demo Day Follow-Up has had zero enrollments in 6 months." | Workflow `Q1 Demo Day Follow-Up` has had 0 enrollments in 180 days. Its trigger campaign (`q1-demo-day`) is in `retired_campaigns`. This workflow is active, consuming automation capacity, and adding audit noise to workflow reporting. | Archive or delete `Q1 Demo Day Follow-Up`. If there is any chance the demo-day campaign runs again, clone it with a new campaign trigger before deleting the original. |
| FG-016 | Attribution Gap | Warning | `Owner Assign Round-Robin` missing Pricing Inquiry | "Your owner-assignment workflow has a gap at the highest-intent form." | `Owner Assign Round-Robin` is enrolled from 4 forms but not from `Pricing Page Inquiry`. Leads from your pricing page — likely your highest-intent traffic — have no automated owner path. This is the root cause of both FG-005 and FG-011. | Add `Pricing Page Inquiry` as an enrollment trigger in `Owner Assign Round-Robin`. This single fix resolves three interconnected issues. |

---

## 8. Technical Architecture

### Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Astro (static output) | Matches demo-lab stack; zero runtime; CDN deploy |
| Logic | TypeScript, client-side only | Rules as typed data objects; no server needed |
| State | In-memory module scope | Config is small enough; no IndexedDB for v1 |
| Config format | JSON fixtures in `data/funnelguard/` | Editable, readable, version-controlled |
| Deploy | Wrangler / Cloudflare Pages under `demos.dallascrilley.com` | Matches demo-lab deployment pattern |
| Styles | CSS custom properties + project token system | Matches demo-lab conventions; no component library |

### Rule engine

Rules are pure TypeScript functions with a typed signature:

```typescript
type FunnelConfig = {
  campaigns: Campaign[];
  utmTaxonomy: UTMTaxonomy;
  forms: Form[];
  lifecycleStages: string[];
  contacts: ContactSample[];
  workflows: Workflow[];
};

type Finding = {
  id: string;           // 'FG-001'
  category: 'UTM Integrity' | 'Form Binding' | 'Lifecycle Logic' | 'Attribution Gap';
  severity: 'Critical' | 'Warning' | 'Info';
  headline: string;     // one sentence, practitioner voice
  detail: string;       // why it matters
  fix: string;          // exact actionable fix
  criticalContext?: string;  // "Critical because: ..." — plain-English for non-HS readers
  affectedObjects: string[]; // IDs of scanned objects implicated
};

type Rule = (config: FunnelConfig) => Finding[];
```

Rules compose:

```typescript
const ALL_RULES: Rule[] = [
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
  checkOrphanedWorkflows,
  checkMissingOwnerAssignEnrollment,
];

export function runRules(config: FunnelConfig): Finding[] {
  return ALL_RULES.flatMap(rule => rule(config));
}
```

Deterministic and pure — no async, no LLM, no API.

### File layout

```
demos/funnelguard/
  data/
    acme-q2.json            # default scenario — 16 planted defects
    saas-post-series-a.json
    ecommerce-brand.json
  src/
    rules/
      utm-integrity.ts
      form-binding.ts
      lifecycle-logic.ts
      attribution-gaps.ts
      index.ts               # composes ALL_RULES
    types.ts
    engine.ts
    scenarios.ts
  pages/
    index.astro
  components/
    FindingCard.astro
    SeverityBadge.astro
    CategoryBadge.astro
    ConfigViewer.astro
    SummaryStrip.astro
    ScenarioSelector.astro
    SyntheticBanner.astro
```

---

## 9. Scope: In / Out

### In (v1)

- Three synthetic funnel scenarios, pre-loaded
- 16 planted defects → 16 classified findings across 4 categories
- Severity + category filter / sort controls
- Config viewer (collapsible, structured JSON; shows synthetic objects implicated in each finding)
- Config cross-link: clicking an affected object in a finding highlights it in the config viewer
- Persistent synthetic-data banner (dismissible per session)
- Summary stats strip (Critical N / Warning N / Info N / Scanned objects N)
- "Critical because:" context note on all Critical findings
- Dark-mode intentional visual design per §6
- Static deploy to `demos.dallascrilley.com/funnelguard`
- Playwright smoke test: loads HTTPS, default scenario produces expected finding count, severity sort works, banner visible

### Out (v1)

- User-provided config upload or paste
- Real HubSpot / GA4 / Salesforce API connections
- Authentication / workspace
- Saved reports or shareable finding URLs
- Auto-fix actions (findings describe the fix; no one-click apply)
- Mobile-optimized layout (desktop-first; 768px minimum)
- LLM-generated explanations (all finding text is authored in rule definitions)

---

## 10. Acceptance Criteria

| AC | Test |
|---|---|
| **AC-1** | `https://demos.dallascrilley.com/funnelguard` returns HTTP 200, no mixed-content warnings |
| **AC-2** | Default scenario (Acme Corp Q2) produces exactly 16 findings on load |
| **AC-3** | Critical: 6 / Warning: 9 / Info: 1 — matching the planted-defect table |
| **AC-4** | Severity sort orders findings Critical → Warning → Info deterministically |
| **AC-5** | Category filter to "Lifecycle Logic" shows exactly 3 findings (FG-011, FG-012, FG-013) |
| **AC-6** | Synthetic-data banner visible on load before any interaction |
| **AC-7** | Switching to "SaaS Startup" scenario changes finding list (different IDs/counts) |
| **AC-8** | No secrets, API keys, or real CRM data in deployed bundle |
| **AC-9** | Config viewer renders the raw synthetic config for the active scenario |
| **AC-10** | Clicking an affected-object reference in any finding card highlights the corresponding config-viewer object |
| **AC-11** | All Critical findings display a "Critical because:" context note |
| **AC-12** | Playwright: `funnelguard.spec.ts` passes headless against the live URL |

---

## 11. Build Sequence

### Phase 1 — Engine + data (Day 1–2)

- Write `types.ts` — typed config and finding interfaces (include `criticalContext?: string`)
- Write `data/acme-q2.json` — full synthetic config with all 16 planted defects per §7
- Write all 12 rule functions in `rules/` and compose in `index.ts`
- Write `engine.test.ts` — unit tests asserting all 16 findings fire against acme-q2
- **Gate:** all 16 findings fire; engine is deterministic; test passes

### Phase 2 — UI shell (Day 2–3)

- Astro page at `demos/funnelguard/index.astro`
- `SyntheticBanner.astro` — persistent, dismissible
- `SummaryStrip.astro` — reactive counts
- `FindingCard.astro` — 4px severity border, compact density, finding ID in mono, headline/detail/fix, criticalContext note, affected-objects inline
- `ScenarioSelector.astro` — dropdown, re-runs engine
- Filter + sort controls (severity multiselect, category multiselect)
- **Gate:** default scenario renders 16 cards; sort and filter work

### Phase 3 — Config viewer + cross-link + polish (Day 3–4)

- `ConfigViewer.astro` — collapsible, structured JSON inspector with line numbers
- Config cross-link interaction: affected-object click → config viewer highlight with `--accent` border flash
- Dark-mode palette applied from token system (§6 exact hex values)
- Typography pass: JetBrains Mono for IDs + object names, Inter for body
- **Gate:** cross-link works; finding cards look like linter output, not card grid

### Phase 4 — Scenarios 2 & 3 + acceptance tests (Day 4–5)

- Write `data/saas-post-series-a.json` and `data/ecommerce-brand.json`
- Verify scenario switching loads distinct finding sets
- Write `funnelguard.spec.ts` covering AC-1 through AC-12
- Lighthouse pass: target LCP < 2.5s
- **Gate:** all acceptance criteria pass

### Trim option (3 days)

Skip scenarios 2 and 3, config cross-link, and Playwright. Ship Phase 1 + Phase 2 only with manual QA. The 16-finding Acme scenario is sufficient for interview demonstration.

---

## 12. Open Questions / Risks

| # | Question / Risk | Recommendation |
|---|---|---|
| 1 | **Finding copy voice.** The finding texts in §7 are written in practitioner voice — not engineer guessing at ops language. Maintain this voice in all edits. | Review against the IDEAS-FROM-JOBS job-posting quotes before shipping. The Glean/Filevine/Neptune/Bloomerang voice is the reference register. |
| 2 | **Scenario breadth.** Three scenarios add credibility but surface area. One great scenario outperforms three mediocre ones. | Default to Acme; add scenarios 2 + 3 only if Phase 1–3 land under 3 days. |
| 3 | **Visual fidelity.** The anti-template rule requires manual CSS, not a component library. The severity-border density spec is specific — the builder must implement it exactly. | Build from CSS custom properties. Do not use shadcn or Tailwind card defaults. The `--accent` border flash on config cross-link is the signature interaction. |
| 4 | **Differentiation from Q2See.** Both live under `demos.dallascrilley.com`. Q2See is wide-canvas flow-graph. Funnelguard is dense findings ledger. They must look different at a glance. | The layout difference (list vs. graph) handles most of this. Confirm by reviewing them side-by-side before shipping both. |
| 5 | **Portfolio sequencing.** Per the audit (§1), the publication gap is the blocker — not substance. Funnelguard is L1/L2 Tier-2 signal, not the AI-native flagship. | Ship BX15 (AI-native) first if Tier-1 pipeline is hotter. Ship Funnelguard first if RevOps/GTM interviews dominate. Do not let sequencing indecision block either. |
