# Demo Readiness Checklist

Use this checklist shortly before a thesis/demo run with a dedicated local or development demo user. Do not run seed/reset/backfill commands against production data.

## Data Prep Commands

Set the demo user email for this shell:

```bash
DEMO_EMAIL=test@example.com
```

Reset and recreate deterministic semantic demo records for the demo user:

```bash
pnpm seed:semantic-test-data --email "$DEMO_EMAIL" --reset-user-data
```

Generate embeddings after seeding:

```bash
pnpm backfill:embeddings
```

Run the retrieval evaluation and update the latest report:

```bash
pnpm evaluate:retrieval --email "$DEMO_EMAIL" --write-report
```

Notes:

- `pnpm backfill:embeddings` currently scans all resumes and job postings in the connected database.
- Do not rerun the seed after manually generating AI outputs, because the seed deletes and recreates the deterministic demo records.
- Rerun the seed close to the demo time so relative dashboard dates stay current.

## Manual AI Output Prep

Generate and review these saved outputs through the existing app UI:

- Resume critique for `Full-Stack Resume - Next.js and Prisma`.
- Job summary for `Full-Stack Next.js Developer`.
- Resume/job match for `Full-Stack Next.js Developer` plus `Full-Stack Resume - Next.js and Prisma`.
- Tailoring suggestions for the same job/resume pair.
- Interview prep notes for `semantic-demo-interview-fullstack-technical`.

## Demo Semantic Queries

Job posting semantic queries:

- `frontend dashboard components`
- `cloud deployment pipeline`
- `data AI evaluation workflows`
- `people analytics hiring process`

Resume semantic queries:

- `frontend React components`
- `Node APIs database services`
- `people operations hiring research`
- `customer support SaaS users`

## Final Demo Checks

- Dashboard shows current tasks, interviews, and applications.
- Semantic search returns clear clustered results.
- Similar jobs/resumes cards show results.
- Assistant answers include source records.
- Selected AI panels have saved output.
