# Retrieval Evaluation Cases

## Purpose

This document defines the v1 retrieval evaluation cases for JobSeeker AI. The cases use the controlled synthetic semantic dataset from `docs/semantic-test-data.md`, where deterministic records are arranged into known strong, medium, and decoy relationships.

The goal is to evaluate top-N retrieval behavior and cluster quality, not to treat exact similarity percentages as stable truth.

## Setup

Seed the semantic dataset for a dedicated local or development user:

```bash
pnpm seed:semantic-test-data --email test@example.com
```

Generate embeddings separately:

```bash
pnpm backfill:embeddings
```

Run the retrieval evaluation:

```bash
pnpm evaluate:retrieval --email test@example.com
```

Or use the environment variable:

```bash
SEMANTIC_TEST_USER_EMAIL=test@example.com pnpm evaluate:retrieval
```

Write an optional markdown report:

```bash
pnpm evaluate:retrieval --email test@example.com --write-report
```

The report is written to:

```txt
docs/evaluation-results/retrieval-evaluation-latest.md
```

## Dataset Assumptions

- 24 semantic demo job postings exist for the selected user.
- 12 semantic demo resumes exist for the selected user.
- Deterministic IDs from `docs/semantic-test-data.md` are used.
- Expected records have both `embedding` and `embeddingTextHash` populated.
- The script is read-only and does not create, update, delete, or backfill records.

## Job Query Cases

| Case | Query | Expected strong IDs | Expected medium IDs | Expected decoy IDs |
| --- | --- | --- | --- | --- |
| Frontend dashboard components | `frontend dashboard components` | `semantic-demo-job-frontend-dashboard`, `semantic-demo-job-frontend-react`, `semantic-demo-job-frontend-accessibility` | `semantic-demo-job-fullstack-next-prisma`, `semantic-demo-job-ux-design-systems` | `semantic-demo-job-general-customer-support`, `semantic-demo-job-general-content-coordinator` |
| People analytics hiring process | `people analytics hiring process` | `semantic-demo-job-peopleops-talent-analyst`, `semantic-demo-job-peopleops-hr-coordinator`, `semantic-demo-job-peopleops-psych-research` | `semantic-demo-job-ux-researcher`, `semantic-demo-job-data-ai-analyst` | `semantic-demo-job-devops-release-operations`, `semantic-demo-job-backend-node-api` |
| Cloud deployment pipeline | `cloud deployment pipeline` | `semantic-demo-job-devops-cloud-ci`, `semantic-demo-job-devops-release-operations`, `semantic-demo-job-devops-platform-reliability` | `semantic-demo-job-backend-payments`, `semantic-demo-job-fullstack-saas-integrations` | `semantic-demo-job-general-office-operations`, `semantic-demo-job-peopleops-hr-coordinator` |
| Customer support SaaS users | `customer support SaaS users` | `semantic-demo-job-general-customer-support` | `semantic-demo-job-general-content-coordinator`, `semantic-demo-job-general-office-operations` | `semantic-demo-job-fullstack-saas-integrations`, `semantic-demo-job-frontend-react` |
| Data AI evaluation workflows | `data AI evaluation workflows` | `semantic-demo-job-data-ml-evaluation`, `semantic-demo-job-data-ai-analyst`, `semantic-demo-job-data-product-analyst` | `semantic-demo-job-peopleops-talent-analyst`, `semantic-demo-job-ux-researcher` | `semantic-demo-job-peopleops-hr-coordinator`, `semantic-demo-job-general-office-operations` |

## Resume Query Cases

| Case | Query | Expected strong IDs | Expected medium IDs | Expected decoy IDs |
| --- | --- | --- | --- | --- |
| Frontend React components | `frontend React components` | `semantic-demo-resume-junior-frontend`, `semantic-demo-resume-react-ui` | `semantic-demo-resume-fullstack-next`, `semantic-demo-resume-ux-product` | `semantic-demo-resume-customer-support`, `semantic-demo-resume-hr-peopleops` |
| Node APIs database services | `Node APIs database services` | `semantic-demo-resume-backend-node`, `semantic-demo-resume-fullstack-next` | `semantic-demo-resume-devops-cloud` | `semantic-demo-resume-general-admin`, `semantic-demo-resume-customer-support` |
| People operations hiring research | `people operations hiring research` | `semantic-demo-resume-hr-peopleops`, `semantic-demo-resume-psychology-research` | `semantic-demo-resume-data-ai`, `semantic-demo-resume-ml-evaluation`, `semantic-demo-resume-ux-product` | `semantic-demo-resume-devops-cloud`, `semantic-demo-resume-backend-node` |
| Cloud deployment pipeline | `cloud deployment pipeline` | `semantic-demo-resume-devops-cloud` | `semantic-demo-resume-backend-node`, `semantic-demo-resume-fullstack-next` | `semantic-demo-resume-general-admin`, `semantic-demo-resume-hr-peopleops` |
| Customer support SaaS users | `customer support SaaS users` | `semantic-demo-resume-customer-support` | `semantic-demo-resume-general-admin`, `semantic-demo-resume-fullstack-next` | `semantic-demo-resume-backend-node`, `semantic-demo-resume-devops-cloud` |

## Similar-Record Cases

### Resume To Jobs

| Source resume ID | Expected strong IDs | Expected medium IDs | Expected decoy IDs |
| --- | --- | --- | --- |
| `semantic-demo-resume-junior-frontend` | `semantic-demo-job-frontend-react`, `semantic-demo-job-frontend-dashboard` | `semantic-demo-job-frontend-accessibility`, `semantic-demo-job-fullstack-next-prisma` | `semantic-demo-job-general-customer-support`, `semantic-demo-job-general-content-coordinator` |
| `semantic-demo-resume-backend-node` | `semantic-demo-job-backend-node-api`, `semantic-demo-job-backend-payments` | `semantic-demo-job-backend-database-services`, `semantic-demo-job-fullstack-saas-integrations`, `semantic-demo-job-devops-platform-reliability` | `semantic-demo-job-peopleops-hr-coordinator`, `semantic-demo-job-general-office-operations` |
| `semantic-demo-resume-data-ai` | `semantic-demo-job-data-ai-analyst`, `semantic-demo-job-data-product-analyst` | `semantic-demo-job-data-ml-evaluation`, `semantic-demo-job-peopleops-talent-analyst` | `semantic-demo-job-peopleops-hr-coordinator`, `semantic-demo-job-general-office-operations` |
| `semantic-demo-resume-devops-cloud` | `semantic-demo-job-devops-cloud-ci`, `semantic-demo-job-devops-platform-reliability` | `semantic-demo-job-devops-release-operations`, `semantic-demo-job-backend-payments` | `semantic-demo-job-general-office-operations`, `semantic-demo-job-peopleops-hr-coordinator` |
| `semantic-demo-resume-hr-peopleops` | `semantic-demo-job-peopleops-hr-coordinator`, `semantic-demo-job-peopleops-talent-analyst` | `semantic-demo-job-peopleops-psych-research`, `semantic-demo-job-general-office-operations` | `semantic-demo-job-data-ai-analyst`, `semantic-demo-job-devops-release-operations` |
| `semantic-demo-resume-customer-support` | `semantic-demo-job-general-customer-support` | `semantic-demo-job-general-content-coordinator`, `semantic-demo-job-fullstack-saas-integrations` | `semantic-demo-job-frontend-react`, `semantic-demo-job-backend-node-api` |

### Job To Resumes

| Source job posting ID | Expected strong IDs | Expected medium IDs | Expected decoy IDs |
| --- | --- | --- | --- |
| `semantic-demo-job-frontend-react` | `semantic-demo-resume-junior-frontend`, `semantic-demo-resume-react-ui` | `semantic-demo-resume-fullstack-next` | `semantic-demo-resume-customer-support`, `semantic-demo-resume-hr-peopleops` |
| `semantic-demo-job-backend-node-api` | `semantic-demo-resume-backend-node`, `semantic-demo-resume-fullstack-next` | `semantic-demo-resume-devops-cloud` | `semantic-demo-resume-general-admin`, `semantic-demo-resume-customer-support` |
| `semantic-demo-job-data-ai-analyst` | `semantic-demo-resume-data-ai`, `semantic-demo-resume-ml-evaluation` | `semantic-demo-resume-psychology-research` | `semantic-demo-resume-hr-peopleops`, `semantic-demo-resume-general-admin` |
| `semantic-demo-job-devops-cloud-ci` | `semantic-demo-resume-devops-cloud`, `semantic-demo-resume-backend-node` | `semantic-demo-resume-fullstack-next` | `semantic-demo-resume-general-admin`, `semantic-demo-resume-hr-peopleops` |
| `semantic-demo-job-peopleops-hr-coordinator` | `semantic-demo-resume-hr-peopleops`, `semantic-demo-resume-psychology-research`, `semantic-demo-resume-general-admin` | `semantic-demo-resume-customer-support` | `semantic-demo-resume-devops-cloud`, `semantic-demo-resume-data-ai` |
| `semantic-demo-job-general-customer-support` | `semantic-demo-resume-customer-support`, `semantic-demo-resume-general-admin` | `semantic-demo-resume-fullstack-next` | `semantic-demo-resume-backend-node`, `semantic-demo-resume-devops-cloud` |

## Metric Definitions

| Metric | Definition |
| --- | --- |
| returnedTopIds | The ordered top 5 IDs returned by the retrieval helper. |
| expectedStrongIds | Records expected to be highly relevant for the case. |
| expectedMediumIds | Records that may reasonably appear but should not dominate strong matches. |
| expectedDecoyIds | Records that share misleading vocabulary or context and should generally rank lower. |
| top1Hit | The first returned ID is one of the expected strong IDs. |
| top3Hit | At least one expected strong ID appears in the first 3 results. |
| top5Hit | At least one expected strong ID appears in the first 5 results. |
| strongCount@5 | Number of expected strong IDs present in the top 5. |
| bestStrongRank | Best 1-based rank for any expected strong ID. |
| bestMediumRank | Best 1-based rank for any expected medium ID. |
| bestDecoyRank | Best 1-based rank for any expected decoy ID. |
| orderingOk | The primary expected strong ID appears before medium or decoy records when both are present. |

## Interpretation Guidance

- Judge top-N relevance and cluster quality.
- Do not overinterpret exact similarity percentages.
- Strong matches should usually appear above medium and decoy records.
- Medium matches appearing near strong matches can be acceptable when the documented semantic relationship is plausible.
- Decoys are most useful when they expose overmatching on shared words such as "operations", "SaaS", "product", or "research".
- Relevance misses should be treated as evaluation findings, not script failures.

## Missing Embedding Behavior

The evaluation script checks that expected semantic demo records have embeddings before running cases. If records or embeddings are missing, run:

```bash
pnpm seed:semantic-test-data --email test@example.com
pnpm backfill:embeddings
```

The script does not run backfill automatically because evaluation should be read-only and repeatable.

## Manual UI Checks

The v1 script focuses on semantic retrieval helpers. Manual UI checks should still cover:

- Job posting search mode switching between keyword and semantic.
- Resume search mode switching between keyword and semantic.
- Job posting semantic filters such as work mode and company.
- Empty states when embeddings are missing.
- Similar-record cards on resume edit pages.
- Similar-record cards on job posting edit pages.
- User-facing copy explaining approximate similarity.
