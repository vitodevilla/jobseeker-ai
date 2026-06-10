# JobSeeker AI Technical Documentation

This folder is the technical source of truth for the implemented JobSeeker AI app.

It documents the app behavior, AI features, retrieval architecture, evaluation method, test data, assistant layer, and known future work that belong with the codebase.

The separate `~/zavrsni` folder is a thesis/dev writing workspace. It can contain personal notes, working drafts, project-control docs, and thesis source material, but it is not part of this app repository. Private credentials and personal working notes should stay out of the app repo.

---

## Recommended Reading Order

1. [AI System Overview](ai-system-overview.md)
2. [AI Feature Inventory](ai-feature-inventory.md)
3. [Retrieval Architecture](retrieval-architecture.md)
4. [AI Evaluation Methodology](evaluation-methodology.md)
5. [Future Work](future-work.md)

---

## Main Documents

- [AI System Overview](ai-system-overview.md): high-level technical description of the app's AI layer, provider/tooling choices, ownership boundaries, retrieval features, assistant layer, and current non-goals.
- [AI Feature Inventory](ai-feature-inventory.md): implemented AI, retrieval, semantic refresh, evaluation, and assistant features with inputs, outputs, limitations, and status.
- [Retrieval Architecture](retrieval-architecture.md): technical explanation of embeddings, pgvector storage, staleness handling, semantic refresh, similar records, and hybrid search.
- [AI Evaluation Methodology](evaluation-methodology.md): evaluation method for manual generative review, semi-automated retrieval evaluation, and current assistant-evaluation limitations.
- [Future Work](future-work.md): planned or deferred improvements that are not part of the current implementation.

---

## Supporting Documents

- [Semantic Test Data](data/semantic-test-data.md): controlled synthetic dataset used for semantic retrieval testing.
- [Retrieval Evaluation Cases](evaluation/retrieval-evaluation-cases.md): expected strong, medium, and decoy records for the retrieval harness.
- [Latest Retrieval Evaluation Results](evaluation-results/retrieval-evaluation-latest.md): latest generated markdown report from `pnpm evaluate:retrieval --email test@example.com --write-report`.
- [Demo Readiness Checklist](demo-readiness-checklist.md): short final-prep checklist for seeding demo data, refreshing embeddings, running retrieval evaluation, and manually preparing selected AI outputs.

---

## Current Implemented AI Scope

The current implementation includes:

- task-specific generative AI,
- saved AI outputs,
- semantic embeddings for resumes and job postings,
- similar-record retrieval,
- explicit keyword/semantic search modes,
- semantic refresh UX,
- retrieval evaluation harness,
- read-only contextual assistant,
- read-only assistant tools,
- page-aware assistant context,
- trusted source references,
- global assistant shell,
- safe Markdown rendering for AI output.

Major future-work items include persisted assistant threads, write-capable tools with confirmation UX, assistant-specific evaluation, background embedding refresh, larger retrieval datasets, external integrations, and production-grade polish.
