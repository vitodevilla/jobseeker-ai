# JobSeeker AI Technical Documentation

This folder is the technical source of truth for the implemented JobSeeker AI app. It documents the app behavior, AI features, retrieval architecture, evaluation method, test data, and known future work that belong with the codebase.

The separate `~/zavrsni` folder is a thesis/dev writing workspace. It can contain personal notes, working drafts, and thesis source material, but it is not part of this app repository. Private credentials and personal working notes should stay out of the app repo.

## Recommended Reading Order

1. [AI System Overview](ai-system-overview.md)
2. [AI Feature Inventory](ai-feature-inventory.md)
3. [Retrieval Architecture](retrieval-architecture.md)
4. [AI Evaluation Methodology](evaluation-methodology.md)
5. [Future Work](future-work.md)

## Main Documents

- [AI System Overview](ai-system-overview.md): high-level description of the app's AI layer, provider/tooling choices, ownership boundaries, and v1 non-goals.
- [AI Feature Inventory](ai-feature-inventory.md): implemented AI, retrieval, semantic refresh, and evaluation features with inputs, outputs, limitations, and status.
- [Retrieval Architecture](retrieval-architecture.md): technical explanation of embeddings, pgvector storage, staleness handling, semantic refresh, similar records, and hybrid search.
- [AI Evaluation Methodology](evaluation-methodology.md): two-layer evaluation method for manual generative review and semi-automated retrieval evaluation.
- [Future Work](future-work.md): planned or deferred improvements that are not part of the current v1 implementation.

## Supporting Documents

- [Semantic Test Data](data/semantic-test-data.md): controlled synthetic dataset used for semantic retrieval testing.
- [Retrieval Evaluation Cases](evaluation/retrieval-evaluation-cases.md): expected strong, medium, and decoy records for the retrieval harness.
- [Latest Retrieval Evaluation Results](evaluation-results/retrieval-evaluation-latest.md): latest generated markdown report from `pnpm evaluate:retrieval --email test@example.com --write-report`.

