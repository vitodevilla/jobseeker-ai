# AI Evaluation Methodology

This document describes the evaluation methodology used for JobSeeker AI’s AI and retrieval features.

It belongs in the app repository as technical documentation. Thesis prose and broader discussion belong in the separate `~/zavrsni` workspace.

---

## Thesis Framing

JobSeeker AI uses three categories of AI behavior that need different evaluation methods.

1. **Generative and reasoning features** produce context-sensitive text for a job seeker.
2. **Retrieval and embedding features** rank existing records against queries or other records.
3. **Assistant features** answer flexible user questions using saved records, page context, read-only tools, and trusted references.

The current evaluation methodology is strongest for retrieval. It uses a split methodology because these categories have different evidence shapes:

- Generated outputs are reviewed with a qualitative rubric.
- Retrieval behavior is evaluated semi-automatically with controlled synthetic records and expected strong, medium, and weak relationships.
- Assistant behavior is currently verified through implementation constraints and manual checks; a formal assistant-specific evaluation harness is future work.

The retrieval harness is implemented as a local/development script and can produce the latest markdown report in:

```txt
docs/evaluation-results/retrieval-evaluation-latest.md
```

The goal is not to prove model quality universally. The goal is to create repeatable, explainable evidence that the app's AI features are useful, grounded, and aligned with the implementation.

Related documents:

- Semantic dataset: [data/semantic-test-data.md](data/semantic-test-data.md)
- Retrieval cases: [evaluation/retrieval-evaluation-cases.md](evaluation/retrieval-evaluation-cases.md)
- Latest retrieval report: [evaluation-results/retrieval-evaluation-latest.md](evaluation-results/retrieval-evaluation-latest.md)

---

## Evaluation Goals

- Provide a repeatable way to judge AI behavior during thesis development.
- Separate generative AI evaluation from retrieval evaluation.
- Keep v1 lightweight, local, and understandable.
- Use controlled synthetic data for retrieval metrics.
- Use manual rubrics for generated outputs where automatic scoring would be unreliable.
- Document assistant safety boundaries and manual verification needs.
- Capture evidence that can be used in thesis screenshots, tables, and discussion.

---

## Non-Goals

- No LLM-as-judge grading in v1.
- No automatic grading of generated prose in v1.
- No new app UI for evaluation.
- No schema changes or migrations.
- No production monitoring or telemetry.
- No attempt to calibrate exact similarity scores as stable quality measures.
- No automatic embedding backfill during evaluation.
- No formal assistant evaluation harness yet.
- No automated grading of assistant answers or citations yet.

---

## Three-Layer Methodology

### Layer 1: Manual Generative AI Evaluation

Generative and reasoning outputs are reviewed manually with a shared 1-5 rubric. Each run should record the feature, input records, generated output, rubric scores, and notes about any defects or useful behavior.

This layer covers:

- Resume critique
- Cover letter critique
- Cover letter generation
- Job posting summary
- Resume/job match
- Interview prep generation
- Resume tailoring suggestions

Manual evaluation is appropriate because these outputs depend on context, tone, usefulness, and the absence of invented details. Those qualities are difficult to grade reliably with a small script, and using another LLM as a judge would introduce another model-dependent layer without clear thesis value at this stage.

---

### Layer 2: Semi-Automated Retrieval Evaluation

Retrieval features are evaluated against the synthetic semantic dataset documented in [data/semantic-test-data.md](data/semantic-test-data.md).

The dataset uses deterministic IDs and known clusters, allowing a script to compare top-N results with expected strong, medium, and decoy records.

This layer covers:

- Semantic Similar Records UI
- Hybrid Job Posting Search
- Hybrid Resume Search

The script evaluates the semantic retrieval branch behind these surfaces. The full retrieval case specification lives in [evaluation/retrieval-evaluation-cases.md](evaluation/retrieval-evaluation-cases.md).

Manual UI checks remain useful for confirming filter behavior, empty states, semantic refresh states, and presentation.

---

### Layer 3: Assistant Verification And Future Evaluation

The read-only contextual assistant is implemented, but it does not yet have a formal evaluation harness comparable to the retrieval script.

The assistant combines:

- base context,
- page-aware context,
- read-only tool results,
- final answer generation,
- trusted source references.

Current assistant evidence comes from:

- server-side ownership boundaries,
- read-only tools,
- source registry and trusted citation filtering,
- manual checks of representative questions,
- safe UI rendering and referenced records.

Future assistant evaluation should add:

- fixed assistant question set,
- expected referenced records,
- expected page-context behavior,
- expected tool-call behavior,
- citation/source precision checks,
- limitation/refusal behavior checks.

---

## Manual Generative Rubric

Score each criterion from 1 to 5.

| Score | Meaning                                                                             |
| ----- | ----------------------------------------------------------------------------------- |
| 1     | Major failure. The output is unsafe, unusable, or mostly ungrounded.                |
| 2     | Weak. The output has some value but contains serious omissions, vagueness, or risk. |
| 3     | Acceptable. The output is mostly useful with clear areas for improvement.           |
| 4     | Strong. The output is useful, grounded, and practical with minor issues.            |
| 5     | Excellent. The output is highly specific, safe, concise, and clearly useful.        |

| Criterion               | What To Check                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| Groundedness            | Uses only saved app data and provided context. Does not imply browsing or hidden knowledge.   |
| Specificity             | References concrete resume, job, application, company, or interview details where available.  |
| Usefulness              | Helps the job seeker make a better decision, edit, or preparation plan.                       |
| Hallucination risk      | Avoids invented facts, employers, tools, achievements, credentials, locations, or metrics.    |
| Actionability           | Provides practical next steps rather than vague encouragement.                                |
| Conciseness/readability | Is appropriately short, structured, and easy to scan for the feature.                         |
| Safety/product fit      | Avoids overclaiming certainty, pretending guarantees, or giving advice beyond the app's role. |

Suggested evidence per generated-output case:

- Feature name
- Input record IDs or screenshots
- Generated output copy
- Rubric scores
- Short evaluator notes
- Any hallucination, omission, or product-fit concern

---

## Retrieval Metrics

Retrieval evaluation uses top-5 results for each case.

| Metric            | Definition                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Top-1 relevance   | The first returned ID is one of the expected strong IDs.                                                |
| Top-3 relevance   | At least one expected strong ID appears in the first 3 results.                                         |
| Top-5 relevance   | At least one expected strong ID appears in the first 5 results.                                         |
| strongCount@5     | Number of expected strong IDs present in the top 5.                                                     |
| Ordering behavior | The primary expected strong result should appear before medium or decoy records when both are returned. |
| Decoy behavior    | Deliberate weak matches should generally rank below strong matches.                                     |

Exact similarity scores should be treated as supporting detail only. They may shift when the embedding model, record text, or surrounding dataset changes.

---

## Assistant Evaluation Ideas

Assistant evaluation should eventually check:

| Area               | What To Check                                                                    |
| ------------------ | -------------------------------------------------------------------------------- |
| Grounding          | Answer uses saved app records rather than invented context.                      |
| Page awareness     | Assistant correctly understands the current resume, job posting, or application. |
| Tool use           | Assistant calls read-only tools when needed and avoids unnecessary tool calls.   |
| Source references  | Referenced records match records actually used in context/tool results.          |
| Limitations        | Assistant admits uncertainty or missing data instead of overclaiming.            |
| Read-only boundary | Assistant does not claim it changed data or offer unsupported autonomous action. |
| Usefulness         | Answer helps the user decide what to do next.                                    |

This is future evaluation work. It is not part of the current retrieval evaluation script.

---

## Evidence Capture Guidance

For thesis evidence, capture a small, consistent set of artifacts:

- Screenshots of generated output cards or edit pages.
- Copies of generated AI output for manual rubric scoring.
- Terminal output from `pnpm evaluate:retrieval --email test@example.com`.
- Optional markdown report from `pnpm evaluate:retrieval --email test@example.com --write-report`.
- Latest committed report at [evaluation-results/retrieval-evaluation-latest.md](evaluation-results/retrieval-evaluation-latest.md).
- Notes about failures, ambiguous cases, missing embeddings, or decoy behavior.
- Screenshots of assistant answers with referenced records.
- Manual notes for page-aware assistant behavior.

For retrieval tables, prefer top-N hit rates and cluster-quality notes over raw similarity percentages.

---

## Limitations

- The retrieval dataset is small and synthetic.
- Results can drift when the embedding model or prompt formatting changes.
- Similarity percentages are not calibrated as stable absolute quality scores.
- Manual rubric scoring is subjective and should be interpreted as qualitative evidence.
- V1 does not use LLM-as-judge grading.
- V1 does not automatically evaluate generated prose.
- V1 does not evaluate every possible filter, empty state, or UI presentation path automatically.
- Assistant behavior does not yet have a formal automated evaluation harness.

---

## Recommended Workflow

1. Seed the semantic test data for a dedicated local or development user.
2. Generate embeddings with the backfill script.
3. Run the retrieval evaluation script.
4. Capture the terminal output or optional markdown report.
5. Manually run representative generative AI features.
6. Score generated outputs with the rubric.
7. Manually test representative assistant questions.
8. Capture assistant answers and referenced records where useful.
9. Summarize all evidence layers in the thesis discussion.
