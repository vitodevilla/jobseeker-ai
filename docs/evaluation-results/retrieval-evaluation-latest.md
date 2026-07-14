# Retrieval Evaluation Results

Exact similarity scores can drift when embedding models, record text, or surrounding records change. Top-N relevance and cluster quality are the main judgment in this v1 harness.

## Run Metadata

- Run timestamp: 2026-07-14T11:56:46.170Z
- Target email: test@example.com
- Target user ID: 2PUZzHnzxkPupa2ZVOzgETXF4PfMEPzW
- Top-N limit: 5

## Dataset Preflight

- Semantic demo job postings: 24/24
- Semantic demo resumes: 12/12
- Embedded job postings: 24/24
- Embedded resumes: 12/12

## Aggregate Summary

- Total cases: 22
- Top-1 pass count: 22/22
- Top-3 pass count: 22/22
- Top-5 pass count: 22/22
- Average strongCount@5: 2.05

## Job Posting Semantic Query Cases

| Case | Input | Expected strong IDs | Returned top IDs | Top-1 | Top-3 | Top-5 | strongCount@5 | Best strong | Best medium | Best decoy | Ordering OK |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| Frontend dashboard components | query: `frontend dashboard components` | `semantic-demo-job-frontend-dashboard`, `semantic-demo-job-frontend-react`, `semantic-demo-job-frontend-accessibility` | `semantic-demo-job-frontend-dashboard`, `semantic-demo-job-frontend-accessibility`, `semantic-demo-job-frontend-react`, `semantic-demo-job-ux-design-systems`, `semantic-demo-job-fullstack-saas-integrations` | yes | yes | yes | 3 | 1 | 4 | - | yes |
| People analytics hiring process | query: `people analytics hiring process` | `semantic-demo-job-peopleops-talent-analyst`, `semantic-demo-job-peopleops-hr-coordinator`, `semantic-demo-job-peopleops-psych-research` | `semantic-demo-job-peopleops-talent-analyst`, `semantic-demo-job-peopleops-hr-coordinator`, `semantic-demo-job-peopleops-psych-research`, `semantic-demo-job-data-ai-analyst`, `semantic-demo-job-data-product-analyst` | yes | yes | yes | 3 | 1 | 4 | - | yes |
| Cloud deployment pipeline | query: `cloud deployment pipeline` | `semantic-demo-job-devops-cloud-ci`, `semantic-demo-job-devops-release-operations`, `semantic-demo-job-devops-platform-reliability` | `semantic-demo-job-devops-cloud-ci`, `semantic-demo-job-devops-platform-reliability`, `semantic-demo-job-devops-release-operations`, `semantic-demo-job-fullstack-saas-integrations`, `semantic-demo-job-backend-payments` | yes | yes | yes | 3 | 1 | 4 | - | yes |
| Customer support SaaS users | query: `customer support SaaS users` | `semantic-demo-job-general-customer-support` | `semantic-demo-job-general-customer-support`, `semantic-demo-job-fullstack-saas-integrations`, `semantic-demo-job-ux-design-systems`, `semantic-demo-job-devops-platform-reliability`, `semantic-demo-job-ux-product-designer` | yes | yes | yes | 1 | 1 | - | 2 | yes |
| Data AI evaluation workflows | query: `data AI evaluation workflows` | `semantic-demo-job-data-ml-evaluation`, `semantic-demo-job-data-ai-analyst`, `semantic-demo-job-data-product-analyst` | `semantic-demo-job-data-ml-evaluation`, `semantic-demo-job-data-ai-analyst`, `semantic-demo-job-peopleops-talent-analyst`, `semantic-demo-job-data-product-analyst`, `semantic-demo-job-ux-product-designer` | yes | yes | yes | 3 | 1 | 3 | - | yes |

## Resume Semantic Query Cases

| Case | Input | Expected strong IDs | Returned top IDs | Top-1 | Top-3 | Top-5 | strongCount@5 | Best strong | Best medium | Best decoy | Ordering OK |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| Frontend React components | query: `frontend React components` | `semantic-demo-resume-junior-frontend`, `semantic-demo-resume-react-ui` | `semantic-demo-resume-junior-frontend`, `semantic-demo-resume-react-ui`, `semantic-demo-resume-fullstack-next`, `semantic-demo-resume-backend-node`, `semantic-demo-resume-ux-product` | yes | yes | yes | 2 | 1 | 3 | - | yes |
| Node APIs database services | query: `Node APIs database services` | `semantic-demo-resume-backend-node`, `semantic-demo-resume-fullstack-next` | `semantic-demo-resume-backend-node`, `semantic-demo-resume-fullstack-next`, `semantic-demo-resume-devops-cloud`, `semantic-demo-resume-react-ui`, `semantic-demo-resume-junior-frontend` | yes | yes | yes | 2 | 1 | 3 | - | yes |
| People operations hiring research | query: `people operations hiring research` | `semantic-demo-resume-hr-peopleops`, `semantic-demo-resume-psychology-research` | `semantic-demo-resume-psychology-research`, `semantic-demo-resume-hr-peopleops`, `semantic-demo-resume-ux-product`, `semantic-demo-resume-ml-evaluation`, `semantic-demo-resume-general-admin` | yes | yes | yes | 2 | 1 | 3 | - | yes |
| Cloud deployment pipeline | query: `cloud deployment pipeline` | `semantic-demo-resume-devops-cloud` | `semantic-demo-resume-devops-cloud`, `semantic-demo-resume-backend-node`, `semantic-demo-resume-fullstack-next`, `semantic-demo-resume-ml-evaluation`, `semantic-demo-resume-hr-peopleops` | yes | yes | yes | 1 | 1 | 2 | 5 | yes |
| Customer support SaaS users | query: `customer support SaaS users` | `semantic-demo-resume-customer-support` | `semantic-demo-resume-customer-support`, `semantic-demo-resume-devops-cloud`, `semantic-demo-resume-general-admin`, `semantic-demo-resume-data-ai`, `semantic-demo-resume-backend-node` | yes | yes | yes | 1 | 1 | 3 | 2 | yes |

## Similar-Record Cases

| Case | Input | Expected strong IDs | Returned top IDs | Top-1 | Top-3 | Top-5 | strongCount@5 | Best strong | Best medium | Best decoy | Ordering OK |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| Junior frontend resume to jobs | source: `semantic-demo-resume-junior-frontend` | `semantic-demo-job-frontend-react`, `semantic-demo-job-frontend-dashboard` | `semantic-demo-job-frontend-react`, `semantic-demo-job-frontend-accessibility`, `semantic-demo-job-frontend-dashboard`, `semantic-demo-job-fullstack-next-prisma`, `semantic-demo-job-fullstack-product-platform` | yes | yes | yes | 2 | 1 | 2 | - | yes |
| Backend Node resume to jobs | source: `semantic-demo-resume-backend-node` | `semantic-demo-job-backend-node-api`, `semantic-demo-job-backend-payments` | `semantic-demo-job-backend-node-api`, `semantic-demo-job-backend-database-services`, `semantic-demo-job-fullstack-saas-integrations`, `semantic-demo-job-fullstack-next-prisma`, `semantic-demo-job-backend-payments` | yes | yes | yes | 2 | 1 | 2 | - | yes |
| Data AI resume to jobs | source: `semantic-demo-resume-data-ai` | `semantic-demo-job-data-ai-analyst`, `semantic-demo-job-data-product-analyst` | `semantic-demo-job-data-product-analyst`, `semantic-demo-job-data-ai-analyst`, `semantic-demo-job-data-ml-evaluation`, `semantic-demo-job-peopleops-talent-analyst`, `semantic-demo-job-fullstack-product-platform` | yes | yes | yes | 2 | 1 | 3 | - | yes |
| DevOps cloud resume to jobs | source: `semantic-demo-resume-devops-cloud` | `semantic-demo-job-devops-cloud-ci`, `semantic-demo-job-devops-platform-reliability` | `semantic-demo-job-devops-cloud-ci`, `semantic-demo-job-devops-platform-reliability`, `semantic-demo-job-devops-release-operations`, `semantic-demo-job-backend-payments`, `semantic-demo-job-fullstack-saas-integrations` | yes | yes | yes | 2 | 1 | 3 | - | yes |
| People operations resume to jobs | source: `semantic-demo-resume-hr-peopleops` | `semantic-demo-job-peopleops-hr-coordinator`, `semantic-demo-job-peopleops-talent-analyst` | `semantic-demo-job-peopleops-hr-coordinator`, `semantic-demo-job-general-office-operations`, `semantic-demo-job-peopleops-talent-analyst`, `semantic-demo-job-general-content-coordinator`, `semantic-demo-job-peopleops-psych-research` | yes | yes | yes | 2 | 1 | 2 | - | yes |
| Customer support resume to jobs | source: `semantic-demo-resume-customer-support` | `semantic-demo-job-general-customer-support` | `semantic-demo-job-general-customer-support`, `semantic-demo-job-general-content-coordinator`, `semantic-demo-job-fullstack-saas-integrations`, `semantic-demo-job-devops-release-operations`, `semantic-demo-job-peopleops-hr-coordinator` | yes | yes | yes | 1 | 1 | 2 | - | yes |
| Frontend React job to resumes | source: `semantic-demo-job-frontend-react` | `semantic-demo-resume-junior-frontend`, `semantic-demo-resume-react-ui` | `semantic-demo-resume-junior-frontend`, `semantic-demo-resume-react-ui`, `semantic-demo-resume-fullstack-next`, `semantic-demo-resume-backend-node`, `semantic-demo-resume-ux-product` | yes | yes | yes | 2 | 1 | 3 | - | yes |
| Backend Node job to resumes | source: `semantic-demo-job-backend-node-api` | `semantic-demo-resume-backend-node`, `semantic-demo-resume-fullstack-next` | `semantic-demo-resume-backend-node`, `semantic-demo-resume-fullstack-next`, `semantic-demo-resume-react-ui`, `semantic-demo-resume-devops-cloud`, `semantic-demo-resume-ux-product` | yes | yes | yes | 2 | 1 | 4 | - | yes |
| Data AI job to resumes | source: `semantic-demo-job-data-ai-analyst` | `semantic-demo-resume-data-ai`, `semantic-demo-resume-ml-evaluation` | `semantic-demo-resume-ml-evaluation`, `semantic-demo-resume-data-ai`, `semantic-demo-resume-psychology-research`, `semantic-demo-resume-general-admin`, `semantic-demo-resume-devops-cloud` | yes | yes | yes | 2 | 1 | 3 | 4 | yes |
| DevOps cloud job to resumes | source: `semantic-demo-job-devops-cloud-ci` | `semantic-demo-resume-devops-cloud`, `semantic-demo-resume-backend-node` | `semantic-demo-resume-devops-cloud`, `semantic-demo-resume-backend-node`, `semantic-demo-resume-react-ui`, `semantic-demo-resume-ml-evaluation`, `semantic-demo-resume-customer-support` | yes | yes | yes | 2 | 1 | - | - | n/a |
| People operations job to resumes | source: `semantic-demo-job-peopleops-hr-coordinator` | `semantic-demo-resume-hr-peopleops`, `semantic-demo-resume-psychology-research`, `semantic-demo-resume-general-admin` | `semantic-demo-resume-hr-peopleops`, `semantic-demo-resume-general-admin`, `semantic-demo-resume-psychology-research`, `semantic-demo-resume-customer-support`, `semantic-demo-resume-ml-evaluation` | yes | yes | yes | 3 | 1 | 4 | - | yes |
| Customer support job to resumes | source: `semantic-demo-job-general-customer-support` | `semantic-demo-resume-customer-support`, `semantic-demo-resume-general-admin` | `semantic-demo-resume-customer-support`, `semantic-demo-resume-general-admin`, `semantic-demo-resume-hr-peopleops`, `semantic-demo-resume-devops-cloud`, `semantic-demo-resume-psychology-research` | yes | yes | yes | 2 | 1 | - | 4 | yes |

## Interpretation Notes

- Relevance misses are evaluation findings, not script failures.
- Medium matches can be acceptable when they reflect documented cluster overlap.
- Decoys should generally rank below strong matches.
- The script is read-only and does not generate record embeddings.
