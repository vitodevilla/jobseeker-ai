# Semantic Test Data

## Purpose

This dataset provides controlled, fully synthetic records for testing semantic retrieval in JobSeeker AI. It is designed around known clusters, strong matches, medium matches, and weak/decoy relationships so retrieval behavior can be judged without manually entering realistic data.

The seed does not generate embeddings. After seeding, run:

```bash
pnpm backfill:embeddings
```

Rankings should be evaluated by top-N relevance and cluster quality, not by exact similarity scores. Scores can shift when embedding models, formatting, or surrounding records change.

Dashboard-facing dates are relative to the seed run date. The script normalizes one seed-run base date to UTC start of day, then derives job posting dates, application next-action dates, task due dates, and interview times from deterministic offsets. This keeps dashboard-assistant demos current while preserving rerunnable data.

## Run Commands

Attach demo records to an existing user:

```bash
pnpm seed:semantic-test-data --email test@example.com
```

Or use an environment variable:

```bash
SEMANTIC_TEST_USER_EMAIL=test@example.com pnpm seed:semantic-test-data
```

Then generate embeddings separately:

```bash
pnpm backfill:embeddings
```

## Cleanup Commands

Delete only deterministic semantic demo records for the selected user:

```bash
pnpm seed:semantic-test-data --email test@example.com --cleanup-only
```

Default seeding is also rerunnable:

```bash
pnpm seed:semantic-test-data --email test@example.com
```

It first deletes and recreates only deterministic semantic demo records for that user, including seeded dashboard tasks and interviews. It also updates the selected user's career context to a broad semantic-demo profile for European remote/hybrid technology, product, data, UX, and people operations exploration.

## Reset Warning

For a dedicated local/dev test user only, this command deletes existing app records owned by the selected user before seeding:

```bash
pnpm seed:semantic-test-data --email test@example.com --reset-user-data
```

This does not delete the `User` row and does not delete Better Auth account or session rows. It does delete the user's app records: tasks, interviews, cover letters, applications, job postings, companies, and resumes. When seeding records, the script updates that same selected user's career context to the broad semantic-demo profile.

Demo records are disposable. Cleanup and reset are intended to remove them. The career context update is another reason not to run this script casually against a real personal account.

## Dataset Counts

- Companies: 8
- Job postings: 24
- Resumes: 12
- Applications: 6
- Tasks: 8
- Interviews: 3
- Cover letters: 0

## Clusters

| Cluster | Company | Job postings | Resumes |
| --- | --- | ---: | ---: |
| Junior frontend / React / TypeScript | Northstar Interfaces | 3 | 2 |
| Full-stack Next.js / Prisma / Postgres | Harbor Stack Labs | 3 | 1 |
| Backend Node.js / APIs / databases | LedgerLoop Systems | 3 | 1 |
| Data / AI / ML analyst | Signal Garden Analytics | 3 | 2 |
| DevOps / cloud / CI/CD | Cloudlane Reliability | 3 | 1 |
| UX / product / design | Canvas and Compass Studio | 3 | 1 |
| Psychology / HR / people operations | PeopleWorks Collective | 3 | 2 |
| Weak/no-match general | BrightDesk Services | 3 | 2 |

## Expected Top Job Matches By Resume

| Resume ID | Expected strong matches | Expected medium matches | Expected weak/decoy notes |
| --- | --- | --- | --- |
| `semantic-demo-resume-junior-frontend` | `semantic-demo-job-frontend-react`, `semantic-demo-job-frontend-dashboard` | `semantic-demo-job-frontend-accessibility`, `semantic-demo-job-fullstack-next-prisma` | Should rank technical UI roles above SaaS support or content roles despite shared product words. |
| `semantic-demo-resume-react-ui` | `semantic-demo-job-frontend-accessibility`, `semantic-demo-job-frontend-dashboard` | `semantic-demo-job-ux-design-systems`, `semantic-demo-job-ux-product-designer` | Design-system UX roles may appear nearby, but coding-heavy frontend jobs should lead. |
| `semantic-demo-resume-fullstack-next` | `semantic-demo-job-fullstack-next-prisma`, `semantic-demo-job-fullstack-product-platform` | `semantic-demo-job-fullstack-saas-integrations`, `semantic-demo-job-backend-node-api` | Should avoid overmatching `semantic-demo-job-general-customer-support` just because both mention SaaS. |
| `semantic-demo-resume-backend-node` | `semantic-demo-job-backend-node-api`, `semantic-demo-job-backend-payments` | `semantic-demo-job-backend-database-services`, `semantic-demo-job-fullstack-saas-integrations`, `semantic-demo-job-devops-platform-reliability` | DevOps can be medium through production reliability, but frontend and HR roles should be low. |
| `semantic-demo-resume-data-ai` | `semantic-demo-job-data-ai-analyst`, `semantic-demo-job-data-product-analyst` | `semantic-demo-job-data-ml-evaluation`, `semantic-demo-job-peopleops-talent-analyst` | People analytics may be medium, but general people operations should not outrank data/AI roles. |
| `semantic-demo-resume-ml-evaluation` | `semantic-demo-job-data-ml-evaluation`, `semantic-demo-job-data-ai-analyst` | `semantic-demo-job-data-product-analyst`, `semantic-demo-job-ux-researcher`, `semantic-demo-job-peopleops-psych-research` | Research and rubric language can connect to UX/psychology, but AI evaluation should lead. |
| `semantic-demo-resume-devops-cloud` | `semantic-demo-job-devops-cloud-ci`, `semantic-demo-job-devops-platform-reliability` | `semantic-demo-job-devops-release-operations`, `semantic-demo-job-backend-payments` | Business operations and people operations use similar words but should rank lower. |
| `semantic-demo-resume-ux-product` | `semantic-demo-job-ux-product-designer`, `semantic-demo-job-ux-design-systems` | `semantic-demo-job-ux-researcher`, `semantic-demo-job-frontend-accessibility`, `semantic-demo-job-data-product-analyst` | Psychology research may be nearby but should not beat product design roles. |
| `semantic-demo-resume-hr-peopleops` | `semantic-demo-job-peopleops-hr-coordinator`, `semantic-demo-job-peopleops-talent-analyst` | `semantic-demo-job-peopleops-psych-research`, `semantic-demo-job-general-office-operations` | Should distinguish people operations from AI operations and DevOps. |
| `semantic-demo-resume-psychology-research` | `semantic-demo-job-peopleops-psych-research` | `semantic-demo-job-ux-researcher`, `semantic-demo-job-peopleops-talent-analyst`, `semantic-demo-job-data-ml-evaluation` | UX research is a deliberate medium match; frontend and backend roles should be low. |
| `semantic-demo-resume-general-admin` | `semantic-demo-job-general-office-operations` | `semantic-demo-job-general-content-coordinator`, `semantic-demo-job-peopleops-hr-coordinator`, `semantic-demo-job-general-customer-support` | Should not overmatch DevOps release operations just because both mention operations. |
| `semantic-demo-resume-customer-support` | `semantic-demo-job-general-customer-support` | `semantic-demo-job-general-content-coordinator`, `semantic-demo-job-fullstack-saas-integrations` | SaaS engineering integrations are a decoy and should not outrank support. |

## Expected Top Resume Matches By Selected Job Posting

| Job posting ID | Expected top resumes | Notes |
| --- | --- | --- |
| `semantic-demo-job-frontend-react` | `semantic-demo-resume-junior-frontend`, `semantic-demo-resume-react-ui` | Junior frontend should usually lead because the seniority and portfolio details align. |
| `semantic-demo-job-fullstack-next-prisma` | `semantic-demo-resume-fullstack-next`, `semantic-demo-resume-backend-node`, `semantic-demo-resume-junior-frontend` | Full-stack should lead; backend and frontend are plausible medium matches. |
| `semantic-demo-job-backend-node-api` | `semantic-demo-resume-backend-node`, `semantic-demo-resume-fullstack-next` | Backend API depth should beat general full-stack. |
| `semantic-demo-job-data-ai-analyst` | `semantic-demo-resume-data-ai`, `semantic-demo-resume-ml-evaluation` | HR operations should not lead despite the word operations. |
| `semantic-demo-job-devops-cloud-ci` | `semantic-demo-resume-devops-cloud`, `semantic-demo-resume-backend-node` | Backend may be medium through production ownership. Business operations should be low. |
| `semantic-demo-job-ux-researcher` | `semantic-demo-resume-ux-product`, `semantic-demo-resume-psychology-research`, `semantic-demo-resume-ml-evaluation` | UX and psychology research are intentionally close but not identical. |
| `semantic-demo-job-peopleops-hr-coordinator` | `semantic-demo-resume-hr-peopleops`, `semantic-demo-resume-psychology-research`, `semantic-demo-resume-general-admin` | People operations should outrank AI operations and DevOps. |
| `semantic-demo-job-general-customer-support` | `semantic-demo-resume-customer-support`, `semantic-demo-resume-general-admin` | Engineering resumes may mention SaaS but should not dominate this result. |

## Known Medium And Decoy Cases

- UX research vs psychology research: `semantic-demo-job-ux-researcher` and `semantic-demo-resume-psychology-research` should be medium because methods overlap, but product UX experience should remain stronger.
- AI operations vs people operations: `semantic-demo-job-data-ai-analyst` should match data and ML evaluation resumes above HR resumes.
- SaaS customer support vs engineering SaaS work: `semantic-demo-job-general-customer-support` should match support before full-stack integrations.
- Operations in DevOps vs business/people operations: `semantic-demo-job-devops-release-operations`, `semantic-demo-job-general-office-operations`, and `semantic-demo-job-peopleops-hr-coordinator` share operations language but should separate by technical context.
- Product data vs UX/product design: `semantic-demo-job-data-product-analyst` and `semantic-demo-resume-ux-product` can be medium through product discovery and behavior analysis, but data resumes should lead.

## Seeded Applications

Six lightweight applications are included to exercise linked data and dashboard assistant follow-up behavior. Their `nextActionDate` values are relative to the seed run date:

- `semantic-demo-application-frontend-react` - today
- `semantic-demo-application-fullstack-next` - +1 day
- `semantic-demo-application-backend-node` - +2 days
- `semantic-demo-application-data-ai` - +3 days
- `semantic-demo-application-devops-cloud` - +5 days
- `semantic-demo-application-ux-researcher` - +6 days

## Seeded Tasks

Eight pending tasks are included for dashboard-assistant prioritization, follow-up, and weekly planning demos:

- `semantic-demo-task-frontend-follow-up`
- `semantic-demo-task-fullstack-technical-prep`
- `semantic-demo-task-backend-screening-confirm`
- `semantic-demo-task-data-ai-tailor-application`
- `semantic-demo-task-devops-follow-up`
- `semantic-demo-task-ux-research-plan`
- `semantic-demo-task-weekly-priority-review`
- `semantic-demo-task-portfolio-refresh`

Most tasks are linked to seeded applications. The weekly priority review and portfolio refresh tasks are standalone. Due dates are relative to the seed run date.

## Seeded Interviews

Three upcoming interviews are included for dashboard-assistant interview and preparation demos:

- `semantic-demo-interview-frontend-phone-screen`
- `semantic-demo-interview-fullstack-technical`
- `semantic-demo-interview-backend-phone-screen`

All seeded interviews are linked to seeded applications and use relative near-future `scheduledAt` values. No completed interviews are seeded.

## Safety Notes

The seed uses deterministic primary keys such as `semantic-demo-company-frontend`, `semantic-demo-job-frontend-react`, `semantic-demo-resume-junior-frontend`, `semantic-demo-task-frontend-follow-up`, and `semantic-demo-interview-frontend-phone-screen`. Default cleanup only deletes those exact records for the selected user.

If non-demo records are attached to demo records, default cleanup refuses to run because deleting a demo record could cascade or mutate those records. Deterministic seeded tasks and interviews do not block reruns and are deleted before applications. Non-demo tasks or interviews attached to seeded applications still block default cleanup. Use `--reset-user-data` only with a dedicated local/dev test user when you intentionally want to clear that user's app data.

When records are seeded, the selected user's career profile is overwritten with a broad semantic-demo context. Use a dedicated test user if you care about preserving profile fields.

Because deterministic IDs are global primary keys, use one semantic demo user per database at a time.
