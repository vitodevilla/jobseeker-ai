# JobSeeker AI

JobSeeker AI is a full-stack web application for managing a job search workflow.

The app helps users track companies, job postings, applications, resumes, cover letters, interviews, and follow-up tasks in one authenticated workspace.

The current version focuses on a solid non-AI foundation: authentication, CRUD flows, dashboard aggregation, search/pagination, validation, file upload, and mobile-first usability. AI features will be added on top of this foundation next.

---

## Current Status

### Implemented

- Email/password authentication with Better Auth
- Protected dashboard and app shell
- User profile / career context
- Company CRUD
- Resume CRUD
- Resume PDF upload with text extraction
- Job posting CRUD
- Application CRUD
- Task CRUD
- Interview CRUD
- Cover letter CRUD
- Dashboard aggregation
- Search and pagination on core list pages
- Zod server-side validation
- Delete confirmation dialogs
- Mobile-responsive navigation and layout
- Basic Playwright smoke tests

### Deferred / Future Work

- AI resume critique
- AI cover letter critique and generation
- AI job matching
- AI interview preparation
- Embeddings and vector search with pgvector
- More advanced dashboard insights
- More polished inline form error handling
- Authenticated private file download route for stored PDFs

---

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI components:** shadcn/ui + Radix primitives
- **Authentication:** Better Auth
- **Database:** PostgreSQL on Neon
- **ORM:** Prisma 7
- **Vector extension:** pgvector enabled in database schema
- **File storage:** Vercel Blob
- **Validation:** Zod
- **Testing:** Playwright
- **Deployment:** Vercel

---

## Main Entities

The app currently manages these core entities:

- **User** — authentication and career context
- **Company** — companies of interest
- **Resume** — resume versions, including PDF upload and extracted text
- **JobPosting** — saved job postings linked to companies
- **Application** — job search pipeline records
- **Task** — follow-ups and reminders, standalone or application-linked
- **Interview** — interview rounds linked to applications
- **CoverLetter** — application-specific cover letter drafts and versions

---

## Local Development Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root.

Required variables:

```env
DATABASE_URL=
DIRECT_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_GENERATIVE_AI_API_KEY=
BLOB_READ_WRITE_TOKEN=
```

Notes:

- `DATABASE_URL` is the pooled Neon connection string used at runtime.
- `DIRECT_URL` is the direct Neon connection string used by Prisma CLI/migrations.
- `BETTER_AUTH_URL` should be `http://localhost:3000` during local development.
- `BLOB_READ_WRITE_TOKEN` is required for Vercel Blob resume PDF uploads.
- Do not commit real environment variable values.

### 3. Generate Prisma client

```bash
pnpm exec prisma generate
```

### 4. Run migrations

For local development against Neon:

```bash
pnpm exec prisma migrate dev
```

### 5. Start the development server

```bash
pnpm dev
```

Open:

```txt
http://localhost:3000
```

---

## Useful Commands

Run the app locally:

```bash
pnpm dev
```

Run linting:

```bash
pnpm lint
```

Run production build:

```bash
pnpm build
```

Open Prisma Studio:

```bash
pnpm exec prisma studio
```

Run Playwright smoke tests:

```bash
pnpm exec playwright test tests/smoke.spec.ts --project=chromium
```

Run all Playwright tests:

```bash
pnpm exec playwright test
```

---

## Database and Prisma Notes

The Prisma schema lives in:

```txt
prisma/schema.prisma
```

The Prisma client is generated into:

```txt
src/generated/prisma
```

This generated client is intentionally ignored by ESLint.

The database uses PostgreSQL on Neon with the vector extension enabled for future pgvector-based AI search and matching.

Current migration approach:

- Migrations are run manually from the local development machine.
- Vercel builds run Prisma generation, not database migrations.
- `DIRECT_URL` is used for migration-related Prisma CLI work.
- `DATABASE_URL` is used by the runtime app.

---

## File Upload Notes

Resume PDF upload uses Vercel Blob.

Current behavior:

- Users can create resumes manually by pasting text.
- Users can upload a PDF resume.
- Uploaded PDFs are stored in a private Vercel Blob store.
- Text is extracted from the PDF and saved into `Resume.content`.
- If extraction fails or produces no usable text, the user can use manual text fallback.

Known limitations:

- Scanned/image-only PDFs may not produce useful extracted text.
- Stored private Blob files are not yet exposed through an authenticated download route.
- Replacing a PDF stores a new file but does not yet delete the old Blob object.

---

## Testing Notes

The project currently has minimal Playwright smoke tests.

These tests check:

- Sign-in page renders
- Sign-up page renders
- Signed-out users are redirected away from protected dashboard access

The current test suite is intentionally small. Full authenticated CRUD E2E testing is deferred until the core AI layer is underway or stable.

---

## Deployment Notes

The app is deployed on Vercel.

Vercel is connected to the GitHub repository:

- Pushes/merged PRs to `main` trigger production deployment.
- Feature branches/PRs can create preview deployments.

Required Vercel environment variables:

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
GOOGLE_GENERATIVE_AI_API_KEY=
BLOB_READ_WRITE_TOKEN=
```

`DIRECT_URL` is not currently required on Vercel because migrations are run locally, not during Vercel builds.

---

## Development Workflow

The project uses feature branches and PR flow.

Typical workflow:

```bash
git checkout main
git pull
git checkout -b feature/example-feature
```

After implementation:

```bash
pnpm lint
pnpm build
git status
git add .
git commit -m "feat: describe change"
git push -u origin feature/example-feature
```

Then open a GitHub pull request, review the diff, merge into `main`, and pull locally:

```bash
git checkout main
git pull
git branch -d feature/example-feature
```

---

## Current Pre-AI Milestone

The non-AI foundation is nearly complete.

Before entering the AI layer, the app has:

- Authenticated user-scoped CRUD for all main entities
- Searchable/paginated operational lists
- Responsive app shell
- Dashboard overview
- Server-side validation
- Delete confirmations
- Resume PDF ingestion
- Basic smoke tests

The next major phase is the AI layer:

- Resume critique
- Cover letter critique
- Cover letter generation
- Job posting summarization
- Resume/job matching
- Interview preparation
- Later: embeddings and vector search