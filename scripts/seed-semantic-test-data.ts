import { config } from "dotenv";
import type { ApplicationStatus, Priority, WorkMode } from "../src/generated/prisma";

config({ path: ".env.local" });

const DEMO_BASE_URL = "https://semantic-demo.invalid";

type PrismaClientInstance = Awaited<typeof import("../src/lib/prisma")>["prisma"];

const semanticDemoUserContext = {
  targetRole: "Junior technology, product, or people operations role",
  currentRole:
    "Entry-level candidate exploring software, data, UX, and people operations",
  targetLocations: "Europe, Remote, Hybrid",
  yearsOfExperience: 1,
  preferredWorkMode: "HYBRID" as const satisfies WorkMode,
};

type CliOptions = {
  cleanupOnly: boolean;
  email: string | null;
  help: boolean;
  resetUserData: boolean;
};

type CompanySeed = {
  id: string;
  name: string;
  website: string;
  industry: string;
  size: string;
  notes: string;
};

type ResumeSeed = {
  id: string;
  name: string;
  content: string;
};

type JobPostingSeed = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  location: string;
  workMode: WorkMode;
  seniorityLevel: string;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  url: string;
  postedAt: Date;
  deadline: Date;
  savedAt: Date;
};

type ApplicationSeed = {
  id: string;
  jobPostingId: string;
  resumeId: string;
  status: ApplicationStatus;
  priority: Priority;
  appliedAt: Date | null;
  nextActionDate: Date | null;
  notes: string;
};

type DemoDeletionCounts = {
  applications: number;
  jobPostings: number;
  companies: number;
  resumes: number;
};

type ResetDeletionCounts = DemoDeletionCounts & {
  tasks: number;
  interviews: number;
  coverLetters: number;
};

type CreationCounts = {
  companies: number;
  resumes: number;
  jobPostings: number;
  applications: number;
};

const companies: CompanySeed[] = [
  {
    id: "semantic-demo-company-frontend",
    name: "Northstar Interfaces",
    website: `${DEMO_BASE_URL}/companies/northstar-interfaces`,
    industry: "Frontend product engineering",
    size: "51-200",
    notes:
      "Builds internal workflow products with a strong component library, accessibility review, and design-to-code collaboration.",
  },
  {
    id: "semantic-demo-company-fullstack",
    name: "Harbor Stack Labs",
    website: `${DEMO_BASE_URL}/companies/harbor-stack-labs`,
    industry: "B2B SaaS platform",
    size: "11-50",
    notes:
      "Ships multi-tenant web applications for small operations teams, with product engineers owning UI, API routes, data models, and deployment details.",
  },
  {
    id: "semantic-demo-company-backend",
    name: "LedgerLoop Systems",
    website: `${DEMO_BASE_URL}/companies/ledgerloop-systems`,
    industry: "Financial workflow software",
    size: "201-500",
    notes:
      "Maintains event-driven services, payment reconciliation APIs, relational data stores, and audit-heavy integrations for finance teams.",
  },
  {
    id: "semantic-demo-company-data-ai",
    name: "Signal Garden Analytics",
    website: `${DEMO_BASE_URL}/companies/signal-garden-analytics`,
    industry: "Data and AI analytics",
    size: "51-200",
    notes:
      "Turns product, support, and operations data into decision tools using dashboards, evaluation datasets, lightweight models, and analyst workflows.",
  },
  {
    id: "semantic-demo-company-devops",
    name: "Cloudlane Reliability",
    website: `${DEMO_BASE_URL}/companies/cloudlane-reliability`,
    industry: "Cloud infrastructure consulting",
    size: "11-50",
    notes:
      "Helps teams improve deployment pipelines, observability, cloud cost controls, incident response, and release reliability.",
  },
  {
    id: "semantic-demo-company-ux",
    name: "Canvas and Compass Studio",
    website: `${DEMO_BASE_URL}/companies/canvas-and-compass-studio`,
    industry: "Product design and UX research",
    size: "11-50",
    notes:
      "Designs SaaS workflows through discovery interviews, journey mapping, prototypes, usability studies, and design systems.",
  },
  {
    id: "semantic-demo-company-peopleops",
    name: "PeopleWorks Collective",
    website: `${DEMO_BASE_URL}/companies/peopleworks-collective`,
    industry: "People operations and organizational psychology",
    size: "51-200",
    notes:
      "Runs hiring operations, employee listening, onboarding programs, workplace research, and people analytics for growing teams.",
  },
  {
    id: "semantic-demo-company-general",
    name: "BrightDesk Services",
    website: `${DEMO_BASE_URL}/companies/brightdesk-services`,
    industry: "Business support services",
    size: "51-200",
    notes:
      "Provides customer support, office coordination, content operations, and administrative services for small software companies.",
  },
];

const jobPostings: JobPostingSeed[] = [
  {
    id: "semantic-demo-job-frontend-react",
    companyId: "semantic-demo-company-frontend",
    title: "Junior Frontend Developer, React UI",
    description: `Northstar Interfaces is hiring a junior frontend developer to help build customer-facing workflow screens and shared UI components. The role is suited for someone who has built projects with React, TypeScript, form handling, and reusable component patterns, but who is still growing into production ownership.

You will pair with senior engineers and designers to implement accessible layouts, improve empty and loading states, and write small tests around user interactions. The team values clear pull requests, careful attention to keyboard behavior, and curiosity about why a screen is confusing for users. Prior internship, bootcamp, open-source, or portfolio work is enough if it shows steady practice. Experience with CSS, API data fetching, and translating Figma specs is helpful. This is a product engineering role, not a pure visual design role, and it includes learning how frontend code ships in a real SaaS environment.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Junior",
    salaryMin: 32000,
    salaryMax: 45000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/frontend-react`,
    postedAt: new Date("2026-05-03T09:00:00.000Z"),
    deadline: new Date("2026-06-20T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T09:00:00.000Z"),
  },
  {
    id: "semantic-demo-job-frontend-accessibility",
    companyId: "semantic-demo-company-frontend",
    title: "Frontend Engineer, Accessible Components",
    description: `The component platform group at Northstar Interfaces needs a frontend engineer to strengthen its design system. The work centers on turning patterns from product teams into reliable building blocks: inputs, tables, navigation, overlays, and feedback states that behave consistently across complex web tools.

The ideal candidate understands React and TypeScript, cares about semantic HTML, and can reason about focus management, labeling, screen reader behavior, and responsive constraints. You will collaborate closely with designers and QA to review interaction details and document usage guidance for other engineers. This is a hands-on coding position with some product judgment: when a component becomes too flexible, you should be able to recommend a simpler API. Candidates from frontend, design engineering, or UI infrastructure backgrounds can succeed here. A UX research background alone is not enough unless it includes production web implementation experience.`,
    location: "Hybrid - Berlin",
    workMode: "HYBRID",
    seniorityLevel: "Mid",
    salaryMin: 52000,
    salaryMax: 68000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/frontend-accessibility`,
    postedAt: new Date("2026-05-05T09:00:00.000Z"),
    deadline: new Date("2026-06-24T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T09:05:00.000Z"),
  },
  {
    id: "semantic-demo-job-frontend-dashboard",
    companyId: "semantic-demo-company-frontend",
    title: "TypeScript Dashboard Developer",
    description: `Northstar Interfaces is expanding a dashboard product used by operations managers to review alerts, assign work, and understand team capacity. This role focuses on data-rich frontend screens rather than marketing pages. You will build sortable views, filters, charts, side panels, and in-context editing flows with TypeScript and a modern React stack.

The team is looking for someone who can make dense information usable without hiding important detail. Helpful experience includes asynchronous data fetching, state management, form validation, component composition, and collaboration with backend engineers on API contracts. The role has some overlap with analytics because many screens present metrics, but the primary craft is frontend product development. You should be comfortable asking product questions, handling imperfect requirements, and creating interfaces that remain stable when data is missing, delayed, or unusually long.`,
    location: "Remote - EU time zones",
    workMode: "REMOTE",
    seniorityLevel: "Junior/Mid",
    salaryMin: 40000,
    salaryMax: 60000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/frontend-dashboard`,
    postedAt: new Date("2026-05-07T09:00:00.000Z"),
    deadline: new Date("2026-06-27T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T09:10:00.000Z"),
  },
  {
    id: "semantic-demo-job-fullstack-next-prisma",
    companyId: "semantic-demo-company-fullstack",
    title: "Full-Stack Next.js Developer",
    description: `Harbor Stack Labs is looking for a full-stack developer to work across a Next.js application, Prisma data models, and Postgres-backed product features. You will own small slices of customer-facing workflow: refining server actions, shaping database queries, building forms, and improving how users move from saved data to completed tasks.

The team values pragmatic engineering over framework novelty. You should be comfortable reading existing code, adding validation, writing clear TypeScript, and understanding how database constraints affect UI behavior. Experience with App Router patterns, relational modeling, migrations, and authenticated multi-user data is especially useful. Some frontend polish is expected, but this is not a pure UI role. Some backend depth is expected, but this is not an infrastructure role. The strongest candidates enjoy connecting product intent to implementation details and can explain tradeoffs without making the system more complicated than it needs to be.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Mid",
    salaryMin: 56000,
    salaryMax: 76000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/fullstack-next-prisma`,
    postedAt: new Date("2026-05-04T09:00:00.000Z"),
    deadline: new Date("2026-06-21T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T09:15:00.000Z"),
  },
  {
    id: "semantic-demo-job-fullstack-product-platform",
    companyId: "semantic-demo-company-fullstack",
    title: "Product Engineer, Web Platform",
    description: `Harbor Stack Labs needs a product-minded engineer for a small platform team that supports billing settings, account permissions, onboarding checklists, and internal admin tools. The work spans TypeScript, React views, server-side mutations, Postgres tables, and integration points with third-party services.

You will investigate rough product requirements, define the smallest useful data model, and ship workflows that survive real customer edge cases. The team uses code review heavily and expects engineers to leave tests or validation around risky behavior. Experience with Next.js is welcome, but equivalent experience in a modern full-stack web framework is also useful. Candidates who have only built frontend prototypes may need more backend practice. Candidates who have only built APIs should be ready to care about interaction details and user feedback. This role is a strong medium match for backend engineers who want more product ownership.`,
    location: "Hybrid - Amsterdam",
    workMode: "HYBRID",
    seniorityLevel: "Mid",
    salaryMin: 60000,
    salaryMax: 82000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/fullstack-product-platform`,
    postedAt: new Date("2026-05-08T09:00:00.000Z"),
    deadline: new Date("2026-06-28T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T09:20:00.000Z"),
  },
  {
    id: "semantic-demo-job-fullstack-saas-integrations",
    companyId: "semantic-demo-company-fullstack",
    title: "SaaS Integrations Engineer",
    description: `This integrations role at Harbor Stack Labs connects the core web application to customer tools such as ticketing systems, calendars, data exports, and notification services. The work includes API client code, webhook handlers, retry logic, admin screens, and Postgres records that make sync state understandable to support teams.

The best fit is someone who can move between backend reliability and user-facing configuration flows. You should be able to model external identifiers, protect sensitive tokens, explain failed syncs, and build forms that prevent common mistakes. TypeScript experience is important; Next.js, Prisma, and Postgres experience would make ramp-up faster. This is not a customer support job, even though the product helps support teams. It is also not a pure DevOps job, although deployment awareness and monitoring habits are useful when integrations fail in production.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Mid/Senior",
    salaryMin: 65000,
    salaryMax: 90000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/fullstack-saas-integrations`,
    postedAt: new Date("2026-05-09T09:00:00.000Z"),
    deadline: new Date("2026-07-01T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T09:25:00.000Z"),
  },
  {
    id: "semantic-demo-job-backend-node-api",
    companyId: "semantic-demo-company-backend",
    title: "Backend Node.js API Engineer",
    description: `LedgerLoop Systems is hiring a backend engineer to build and maintain Node.js services for financial workflow APIs. The team handles authentication boundaries, request validation, ledger events, reconciliation queues, and partner integrations that must be predictable under audit.

You will design endpoints, improve database queries, write migration-safe changes, and add tests around edge cases such as duplicate events or partial failures. Experience with relational databases, transaction boundaries, background jobs, and TypeScript is highly relevant. Product awareness matters because the APIs support internal tools and customer dashboards, but the center of gravity is backend service design. A candidate from full-stack work can do well if they have owned server-side behavior beyond simple CRUD. A frontend-heavy candidate would likely need more practice with operational concerns, data consistency, and debugging production incidents.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Mid",
    salaryMin: 58000,
    salaryMax: 78000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/backend-node-api`,
    postedAt: new Date("2026-05-06T09:00:00.000Z"),
    deadline: new Date("2026-06-26T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T09:30:00.000Z"),
  },
  {
    id: "semantic-demo-job-backend-database-services",
    companyId: "semantic-demo-company-backend",
    title: "Database Services Developer",
    description: `The database services team at LedgerLoop Systems maintains internal services that power search, reporting, reconciliation, and account history. This role is for an engineer who enjoys understanding schemas, query plans, indexes, data migrations, and the way application code changes when a database grows.

Most work is in TypeScript services backed by Postgres. You will partner with product engineers to clarify access patterns, create safer migrations, remove slow queries, and build tools that make data quality issues visible before customers notice. Familiarity with Prisma or another typed database layer is useful, but the important skill is reasoning about data relationships. This role is a medium match for full-stack developers with strong database instincts and a strong match for backend engineers who have lived with production data. It is not intended for analytics-only candidates who mainly build dashboards.`,
    location: "Onsite - Warsaw",
    workMode: "ONSITE",
    seniorityLevel: "Mid/Senior",
    salaryMin: 65000,
    salaryMax: 88000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/backend-database-services`,
    postedAt: new Date("2026-05-10T09:00:00.000Z"),
    deadline: new Date("2026-07-03T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T09:35:00.000Z"),
  },
  {
    id: "semantic-demo-job-backend-payments",
    companyId: "semantic-demo-company-backend",
    title: "Payments Platform Engineer",
    description: `LedgerLoop Systems is adding an engineer to its payments platform group. The team owns payment status ingestion, reconciliation rules, partner webhooks, retry policies, and internal review tools used when a transaction does not line up cleanly.

The work requires calm reasoning about failure states. You will write service code, improve observability around event pipelines, design idempotent operations, and coordinate with compliance and support specialists when workflows change. TypeScript or Node.js experience is preferred, but candidates from Java, Go, or Python service backgrounds can adapt if they understand APIs and relational persistence. This role overlaps with DevOps in monitoring and incident response, but it is fundamentally backend product infrastructure. It is a poor match for general business operations candidates, even though payment operations language appears throughout the domain.`,
    location: "Hybrid - Warsaw",
    workMode: "HYBRID",
    seniorityLevel: "Senior",
    salaryMin: 78000,
    salaryMax: 105000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/backend-payments`,
    postedAt: new Date("2026-05-11T09:00:00.000Z"),
    deadline: new Date("2026-07-05T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T09:40:00.000Z"),
  },
  {
    id: "semantic-demo-job-data-ai-analyst",
    companyId: "semantic-demo-company-data-ai",
    title: "AI Operations Analyst",
    description: `Signal Garden Analytics is hiring an AI operations analyst to evaluate model-assisted workflows used by product and support teams. This is not a people operations role. The work involves reviewing model outputs, creating labeling guidelines, analyzing quality trends, and helping engineers understand where automation helps or harms users.

You will build spreadsheets and lightweight dashboards, define categories for failure analysis, compare model suggestions to human decisions, and write clear summaries for product managers. SQL, data cleaning, experiment tracking, and comfort with ambiguous examples are important. Python or notebook experience is helpful but not required for every project. The team wants someone who can notice patterns without overstating certainty. Candidates from data analysis, research operations, or technical QA can fit well. A human resources background may be a partial match only if it includes measurement, survey analysis, or evidence-based program evaluation.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Junior/Mid",
    salaryMin: 42000,
    salaryMax: 60000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/data-ai-analyst`,
    postedAt: new Date("2026-05-04T10:00:00.000Z"),
    deadline: new Date("2026-06-22T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T09:45:00.000Z"),
  },
  {
    id: "semantic-demo-job-data-product-analyst",
    companyId: "semantic-demo-company-data-ai",
    title: "Product Data Analyst",
    description: `Signal Garden Analytics needs a product data analyst to help product teams understand onboarding, retention, feature adoption, and support friction. You will combine SQL queries, dashboard design, metric definitions, and written analysis that helps non-technical stakeholders make better decisions.

The role requires curiosity about user behavior and discipline about data quality. You will partner with designers, engineers, and customer-facing teams to define events, check whether a metric answers the real question, and explain uncertainty in plain language. Experience with experimentation, cohort analysis, BI tools, or Python notebooks is useful. This is a strong match for candidates who bridge quantitative analysis and product judgment. It can be a medium match for UX researchers who have worked with behavioral data. It is not a software engineering job, although understanding product instrumentation and database structure will make collaboration easier.`,
    location: "Hybrid - Lisbon",
    workMode: "HYBRID",
    seniorityLevel: "Mid",
    salaryMin: 48000,
    salaryMax: 66000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/data-product-analyst`,
    postedAt: new Date("2026-05-06T10:00:00.000Z"),
    deadline: new Date("2026-06-25T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T09:50:00.000Z"),
  },
  {
    id: "semantic-demo-job-data-ml-evaluation",
    companyId: "semantic-demo-company-data-ai",
    title: "Machine Learning Evaluation Analyst",
    description: `The evaluation team at Signal Garden Analytics designs tests for model-assisted recommendations inside business software. The analyst in this role creates evaluation sets, reviews edge cases, tracks prompt and model changes, and communicates quality regressions before they become customer problems.

You will work with product managers and engineers to define what good output means, sample real workflow examples, score responses against rubrics, and summarize trends. SQL, careful writing, spreadsheet fluency, and comfort with messy qualitative categories are more important than deep model training experience. Some Python is helpful for sampling and analysis. This role intentionally sits between research, data, and product operations. It is a decoy for general operations candidates because it uses process language, but the day-to-day work is evidence gathering, data interpretation, and AI quality measurement rather than scheduling or office coordination.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Mid",
    salaryMin: 50000,
    salaryMax: 70000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/data-ml-evaluation`,
    postedAt: new Date("2026-05-08T10:00:00.000Z"),
    deadline: new Date("2026-06-29T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T09:55:00.000Z"),
  },
  {
    id: "semantic-demo-job-devops-cloud-ci",
    companyId: "semantic-demo-company-devops",
    title: "DevOps Engineer, Cloud CI/CD",
    description: `Cloudlane Reliability is hiring a DevOps engineer to improve deployment pipelines and cloud environments for small SaaS teams. You will work on CI/CD workflows, infrastructure configuration, secrets management, preview environments, and monitoring that helps developers ship with confidence.

The role is hands-on and practical. You should be comfortable reading application logs, improving build reliability, documenting release steps, and automating repeatable tasks. Experience with GitHub Actions or similar CI systems, containers, cloud platforms, and basic scripting is valuable. You do not need to be a deep Kubernetes specialist, but you should understand how code moves from a pull request to production. This role includes the word operations, but it is technical infrastructure operations, not HR, business administration, or office management. Frontend and backend developers with deployment ownership may be medium matches if they enjoy reliability work.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Mid",
    salaryMin: 58000,
    salaryMax: 80000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/devops-cloud-ci`,
    postedAt: new Date("2026-05-04T11:00:00.000Z"),
    deadline: new Date("2026-06-23T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T10:00:00.000Z"),
  },
  {
    id: "semantic-demo-job-devops-platform-reliability",
    companyId: "semantic-demo-company-devops",
    title: "Platform Reliability Engineer",
    description: `The platform reliability team at Cloudlane Reliability helps clients reduce outages and make production behavior easier to understand. The work includes alert tuning, service-level indicators, log and trace review, incident follow-up, runbook cleanup, and small automation projects that remove manual release risk.

You will join client engineering teams for short engagements, so communication and documentation matter as much as technical depth. Strong candidates have experience with cloud services, deployment pipelines, monitoring tools, Linux basics, and scripting. Backend engineers who have supported production systems can be a good fit. Pure data analysts, HR operations specialists, or customer support representatives are less aligned unless they have meaningful technical infrastructure exposure. The role is deliberately broad, but every project should leave a system easier to operate, diagnose, or recover when something goes wrong.`,
    location: "Hybrid - Prague",
    workMode: "HYBRID",
    seniorityLevel: "Mid/Senior",
    salaryMin: 68000,
    salaryMax: 92000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/devops-platform-reliability`,
    postedAt: new Date("2026-05-07T11:00:00.000Z"),
    deadline: new Date("2026-06-30T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T10:05:00.000Z"),
  },
  {
    id: "semantic-demo-job-devops-release-operations",
    companyId: "semantic-demo-company-devops",
    title: "Release Operations Engineer",
    description: `Cloudlane Reliability needs a release operations engineer to make customer deployments predictable. The person in this role will improve release checklists, automate version promotion, maintain deployment documentation, and coordinate with engineering teams during scheduled production changes.

This role uses operational language, but the work is technical. You will diagnose failed builds, review environment configuration, create scripts for repetitive release tasks, and track post-release incidents to find patterns. Experience with CI systems, cloud platforms, command-line tools, and source control is important. A business operations or people operations background may help with coordination, but it is not enough without hands-on technical experience. The best fit is someone who can combine calm process ownership with the ability to read logs, understand dependency failures, and propose changes that reduce risk for future releases.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Junior/Mid",
    salaryMin: 50000,
    salaryMax: 70000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/devops-release-operations`,
    postedAt: new Date("2026-05-09T11:00:00.000Z"),
    deadline: new Date("2026-07-02T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T10:10:00.000Z"),
  },
  {
    id: "semantic-demo-job-ux-product-designer",
    companyId: "semantic-demo-company-ux",
    title: "Product Designer, SaaS Workflows",
    description: `Canvas and Compass Studio is hiring a product designer to work on complex SaaS workflows for operations teams. You will map user journeys, design task-focused screens, create prototypes, and collaborate with engineers to keep interactions practical and accessible.

The role requires strong product thinking rather than decorative page design. You should be comfortable turning messy requirements into flows, writing concise interface copy, presenting tradeoffs, and using research evidence without waiting for perfect certainty. Experience with design systems, Figma, usability testing, and information architecture is useful. This is a strong match for UX/product design candidates and a medium match for frontend engineers with design sensitivity. It is not primarily a psychology research role, although understanding human behavior helps. It is also not a pure graphic design role; the work is grounded in software tasks and repeated user actions.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Mid",
    salaryMin: 50000,
    salaryMax: 68000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/ux-product-designer`,
    postedAt: new Date("2026-05-05T12:00:00.000Z"),
    deadline: new Date("2026-06-25T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T10:15:00.000Z"),
  },
  {
    id: "semantic-demo-job-ux-researcher",
    companyId: "semantic-demo-company-ux",
    title: "UX Researcher, Hiring Tools",
    description: `Canvas and Compass Studio needs a UX researcher for a hiring workflow product used by recruiters, coordinators, and interview teams. You will plan studies, interview users, synthesize behavior patterns, and help designers decide where a workflow is confusing or emotionally costly.

This role overlaps with psychology because it studies people, decisions, and workplace behavior, but it is grounded in product research. You will create research plans, screen participants, moderate interviews, analyze usability sessions, and write findings that directly shape software changes. Experience with survey design, qualitative coding, stakeholder workshops, and research repositories is useful. Candidates from psychology research can be strong medium matches if they can connect findings to product decisions. Candidates from HR coordination may understand the hiring domain, but they will need evidence of research methods. Frontend coding is not required, although collaboration with engineers is frequent.`,
    location: "Hybrid - Copenhagen",
    workMode: "HYBRID",
    seniorityLevel: "Mid",
    salaryMin: 52000,
    salaryMax: 72000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/ux-researcher`,
    postedAt: new Date("2026-05-08T12:00:00.000Z"),
    deadline: new Date("2026-06-29T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T10:20:00.000Z"),
  },
  {
    id: "semantic-demo-job-ux-design-systems",
    companyId: "semantic-demo-company-ux",
    title: "Design Systems Specialist",
    description: `Canvas and Compass Studio is looking for a design systems specialist to help product teams make interface patterns consistent across several SaaS tools. The role includes component audits, token documentation, interaction specifications, accessibility review, and close collaboration with frontend engineers.

You will not be expected to own production code, but you should understand enough about web implementation to design patterns that can be built reliably. Strong candidates can write usage guidance, identify where a component should be split, and balance visual consistency with real workflow needs. Figma, design QA, responsive behavior, and accessibility knowledge are important. This role is a medium match for frontend engineers who have worked with component libraries and a strong match for product designers with systems experience. It is a weaker match for research-only candidates unless they have helped operationalize design patterns across teams.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Mid",
    salaryMin: 48000,
    salaryMax: 66000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/ux-design-systems`,
    postedAt: new Date("2026-05-10T12:00:00.000Z"),
    deadline: new Date("2026-07-03T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T10:25:00.000Z"),
  },
  {
    id: "semantic-demo-job-peopleops-hr-coordinator",
    companyId: "semantic-demo-company-peopleops",
    title: "People Operations Coordinator",
    description: `PeopleWorks Collective is hiring a people operations coordinator to support onboarding, employee records, hiring logistics, and internal communication for growing teams. This is a human resources operations role, not a DevOps role and not an AI operations analyst role.

You will maintain process checklists, coordinate offer and onboarding steps, prepare simple reports, answer employee questions, and help managers keep people-related work moving. The team values discretion, clear written communication, reliable follow-through, and a service mindset. Experience with HR systems, recruiting coordination, employee surveys, or administrative operations is useful. Analytical curiosity is welcome, but deep SQL or machine learning experience is not required. Candidates with psychology coursework can be a good fit if they enjoy practical workplace support. Candidates from software engineering may be overqualified unless they are intentionally changing careers into people operations.`,
    location: "Hybrid - Dublin",
    workMode: "HYBRID",
    seniorityLevel: "Junior/Mid",
    salaryMin: 36000,
    salaryMax: 50000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/peopleops-hr-coordinator`,
    postedAt: new Date("2026-05-03T13:00:00.000Z"),
    deadline: new Date("2026-06-18T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T10:30:00.000Z"),
  },
  {
    id: "semantic-demo-job-peopleops-talent-analyst",
    companyId: "semantic-demo-company-peopleops",
    title: "Talent Analytics Associate",
    description: `PeopleWorks Collective needs a talent analytics associate to help hiring and people teams understand funnel health, onboarding feedback, employee survey results, and retention signals. The role sits between HR operations and data analysis.

You will clean spreadsheet exports, define simple metrics, prepare recurring dashboards, and explain patterns to recruiters and managers. SQL or BI tool experience is helpful, but the team also values domain understanding of hiring workflows, fairness concerns, survey design, and employee experience. This is a strong medium match for data analysts who want to work in HR and for psychology graduates with quantitative project experience. It is a weak match for software engineers looking for backend API work. It is also distinct from AI operations, even though both roles evaluate data and workflow quality.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Junior/Mid",
    salaryMin: 40000,
    salaryMax: 56000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/peopleops-talent-analyst`,
    postedAt: new Date("2026-05-06T13:00:00.000Z"),
    deadline: new Date("2026-06-27T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T10:35:00.000Z"),
  },
  {
    id: "semantic-demo-job-peopleops-psych-research",
    companyId: "semantic-demo-company-peopleops",
    title: "Workplace Psychology Research Assistant",
    description: `The research team at PeopleWorks Collective studies onboarding, team belonging, manager feedback, and burnout risk inside synthetic workplace programs. The research assistant will help prepare surveys, code interview notes, review academic summaries, and turn findings into practical recommendations for HR partners.

This is not a clinical role and does not involve therapy. It is also not a UX research role, although the methods overlap. The best candidates have psychology, organizational behavior, or social science research experience and can handle participant privacy with care. Comfort with survey tools, qualitative coding, basic statistics, and clear writing is useful. The work has some connection to people analytics, but it is less about dashboards and more about study design and interpretation. Designers and product researchers may be medium matches if they have workplace research experience. Software engineering resumes should rank low unless they include relevant research work.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Entry/Junior",
    salaryMin: 34000,
    salaryMax: 46000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/peopleops-psych-research`,
    postedAt: new Date("2026-05-09T13:00:00.000Z"),
    deadline: new Date("2026-07-01T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T10:40:00.000Z"),
  },
  {
    id: "semantic-demo-job-general-customer-support",
    companyId: "semantic-demo-company-general",
    title: "SaaS Customer Support Representative",
    description: `BrightDesk Services is hiring a customer support representative for a small SaaS help desk team. The role involves answering customer questions, reproducing simple product issues, writing help center notes, and escalating bugs with enough context for product and engineering teams.

This is a decoy for engineering searches because it includes SaaS, tickets, product issues, and technical customers, but the role is primarily communication and support operations. You should be patient, organized, and able to explain product behavior clearly. Experience with help desk tools, customer email, chat support, documentation, and triage is useful. Light technical curiosity helps, especially when checking whether a problem is user error or a product defect. React, Prisma, cloud infrastructure, or machine learning experience is not required. Candidates from general operations or customer-facing roles should match better than software development candidates.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Entry/Junior",
    salaryMin: 30000,
    salaryMax: 42000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/general-customer-support`,
    postedAt: new Date("2026-05-04T14:00:00.000Z"),
    deadline: new Date("2026-06-19T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T10:45:00.000Z"),
  },
  {
    id: "semantic-demo-job-general-office-operations",
    companyId: "semantic-demo-company-general",
    title: "Business Operations Assistant",
    description: `BrightDesk Services needs a business operations assistant to keep internal processes organized across vendors, invoices, meeting logistics, and recurring reporting. The person in this role will manage checklists, update trackers, coordinate calendars, prepare simple summaries, and help leadership notice when a process is blocked.

This role intentionally uses operations language that can overlap with DevOps or people operations, but it is general business administration. The best fit is someone reliable, detail-oriented, and comfortable communicating with several teams. Spreadsheet experience, calendar coordination, document organization, and basic reporting are useful. There is no expectation of cloud infrastructure, CI/CD, code deployment, employee relations ownership, or analytics modeling. Customer support and office coordination resumes should rank higher than engineering resumes. Data or HR candidates may be weak-to-medium matches only if they want broad administrative work.`,
    location: "Onsite - Krakow",
    workMode: "ONSITE",
    seniorityLevel: "Entry/Junior",
    salaryMin: 28000,
    salaryMax: 38000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/general-office-operations`,
    postedAt: new Date("2026-05-07T14:00:00.000Z"),
    deadline: new Date("2026-06-26T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T10:50:00.000Z"),
  },
  {
    id: "semantic-demo-job-general-content-coordinator",
    companyId: "semantic-demo-company-general",
    title: "Content Coordinator, Career Resources",
    description: `BrightDesk Services is hiring a content coordinator to maintain a library of career resource articles, templates, and newsletter snippets. The work includes organizing an editorial calendar, updating drafts, checking links, coordinating reviews, and lightly editing practical guidance for job seekers.

This role is a weak match for most technical resumes despite words like templates, workflows, and product content. The day-to-day work is writing coordination and content operations, not frontend engineering or product design. Candidates should be organized, comfortable with style guides, able to simplify instructions, and willing to manage repeated publishing tasks. Experience with CMS tools, editorial planning, customer education, or administrative coordination is useful. UX writers could be medium matches if they enjoy operational publishing work. Software, data, DevOps, and HR research backgrounds should usually rank lower unless the resume shows substantial writing operations experience.`,
    location: "Remote - Europe",
    workMode: "REMOTE",
    seniorityLevel: "Junior",
    salaryMin: 32000,
    salaryMax: 44000,
    salaryCurrency: "EUR",
    url: `${DEMO_BASE_URL}/jobs/general-content-coordinator`,
    postedAt: new Date("2026-05-11T14:00:00.000Z"),
    deadline: new Date("2026-07-04T17:00:00.000Z"),
    savedAt: new Date("2026-05-15T10:55:00.000Z"),
  },
];

const resumes: ResumeSeed[] = [
  {
    id: "semantic-demo-resume-junior-frontend",
    name: "Junior Frontend Resume - Component UI",
    content: `Profile: Early-career frontend developer focused on building clear, accessible web interfaces with React and TypeScript. Completed several portfolio projects that include form validation, reusable components, responsive layouts, and API-driven views. Comfortable taking a Figma mockup, identifying the states that are missing, and translating it into maintainable UI code.

Experience: Built a volunteer scheduling dashboard with React, TypeScript, and CSS modules. Added keyboard-friendly dialogs, loading and empty states, client-side validation, and a small component library for buttons, status badges, and cards. Improved a course project by replacing duplicated form logic with shared hooks and clearer error handling. Collaborated with two peers through pull requests, issue notes, and short design reviews.

Skills: React, TypeScript, HTML, CSS, accessibility basics, form handling, REST API data fetching, Git, simple tests, UI debugging. Has light exposure to Next.js through a personal project but has not owned backend services or database schema work.

Target roles: Junior frontend developer, UI engineer, React developer, design-system-adjacent frontend role. Strongest in roles where the main responsibility is implementing product screens carefully. Medium fit for full-stack product roles with mentoring. Weak fit for DevOps, data analysis, HR, or general office operations.`,
  },
  {
    id: "semantic-demo-resume-react-ui",
    name: "React TypeScript Resume - Accessible Interfaces",
    content: `Profile: Frontend engineer with practical experience improving accessible components and data-rich application screens. Enjoys turning ambiguous interface requirements into stable UI patterns that other developers can reuse. Strongest work has involved forms, tables, navigation, focus states, and design QA rather than backend service ownership.

Experience: Maintained a small design system for an internal operations product. Audited components for labels, keyboard order, contrast, and responsive behavior. Partnered with designers to simplify a complicated filter panel and documented when to use each field type. Built React and TypeScript screens that consume API data, handle pending states, and keep layout stable when labels or records are longer than expected. Added tests around menu behavior and form validation, and wrote short implementation notes for teammates.

Skills: React, TypeScript, semantic HTML, CSS, accessibility testing habits, component APIs, Figma collaboration, frontend testing, data fetching, lightweight performance review. Familiar with dashboards and analytics UI but not primarily a data analyst. Comfortable discussing UX tradeoffs, but the main craft is production frontend implementation.

Target roles: Frontend engineer, design systems engineer, accessible components specialist. Medium fit for product design systems roles that need technical literacy. Weak fit for psychology research, people operations, or non-technical customer support roles.`,
  },
  {
    id: "semantic-demo-resume-fullstack-next",
    name: "Full-Stack Resume - Next.js and Prisma",
    content: `Profile: Product-minded full-stack developer who has built authenticated web applications with Next.js, TypeScript, Prisma, and Postgres. Comfortable moving between UI, server-side mutations, validation, database relationships, and deployment details. Enjoys small teams where engineers clarify product behavior before writing code.

Experience: Built a job tracking app prototype with App Router pages, server actions, Zod validation, Prisma models, and user-owned records. Added list filtering, create/edit flows, relation checks, and guardrails so one user could not update another user's data. Designed Postgres tables for saved items, tasks, and notes, then adjusted forms when constraints changed. In a separate project, connected a SaaS admin panel to webhook events and built retry visibility for failed syncs.

Skills: Next.js, React, TypeScript, Prisma, Postgres, server actions, route handlers, form validation, SQL basics, API integrations, background job concepts, Git, code review, Vercel-style deployment. Strong enough in frontend to polish workflows and strong enough in backend to reason about data integrity. Less interested in pure infrastructure or pure visual design.

Target roles: Full-stack developer, product engineer, SaaS integrations engineer. Strong match for Next.js and Prisma roles, medium match for backend API roles, weak match for HR, psychology research, or general business support.`,
  },
  {
    id: "semantic-demo-resume-backend-node",
    name: "Backend Resume - Node APIs and Databases",
    content: `Profile: Backend engineer focused on TypeScript services, APIs, relational databases, and reliable data changes. Most comfortable behind the product surface: modeling business rules, validating requests, improving queries, and making failure states easier to debug. Has enough frontend awareness to support product teams but does not seek a UI-heavy role.

Experience: Built Node.js services for subscription and account workflows, including REST endpoints, webhook handlers, queue consumers, and Postgres-backed status history. Added idempotency checks for repeated provider events and wrote tests for duplicate submissions, missing records, and rollback cases. Improved several slow queries by changing indexes and narrowing API response shapes. Partnered with support and product managers to turn unclear operational problems into better internal tooling.

Skills: Node.js, TypeScript, Postgres, SQL, API design, data migrations, background jobs, event handling, observability basics, authentication boundaries, integration debugging. Familiar with Prisma and ORMs, but comfortable reading raw SQL when needed. Has used CI pipelines and logs, but DevOps is a secondary skill.

Target roles: Backend Node.js API engineer, payments platform engineer, database services developer. Medium fit for full-stack roles with serious server-side work. Weak fit for frontend-only, UX design, HR coordination, and customer support jobs.`,
  },
  {
    id: "semantic-demo-resume-data-ai",
    name: "Data Analyst Resume - AI Product Insights",
    content: `Profile: Data analyst focused on product behavior, AI-assisted workflows, and clear communication of uncertain findings. Comfortable using SQL, spreadsheets, and notebooks to investigate where users struggle, how features perform, and whether automated suggestions are helping. Works well with product managers, researchers, and engineers.

Experience: Created weekly dashboards for activation, retention, and support friction in a training SaaS project. Defined event names with engineers, checked data quality problems, and wrote short explanations of metric changes. Built an evaluation spreadsheet for AI-generated support draft suggestions, including categories for hallucination, tone, missing context, and correct next action. Sampled examples, compared model output against human review, and summarized patterns for a product lead. Helped a research team combine survey responses with usage data without overstating causality.

Skills: SQL, spreadsheets, BI dashboards, Python notebooks, cohort analysis, data cleaning, product metrics, AI output evaluation, labeling rubrics, written synthesis, stakeholder communication. Understands software teams but is not a production engineer. Has some survey and qualitative analysis exposure, but prefers product and data contexts over general HR administration.

Target roles: Product data analyst, AI operations analyst, ML evaluation analyst. Medium fit for talent analytics if the role is quantitative. Weak fit for DevOps, frontend engineering, office operations, or customer support.`,
  },
  {
    id: "semantic-demo-resume-ml-evaluation",
    name: "ML Evaluation Resume - Quality and Labeling",
    content: `Profile: Analyst with experience evaluating model-assisted workflows through rubrics, sampled datasets, quality reviews, and written error analysis. Strong at turning messy examples into consistent categories and explaining what changed between versions. Interested in AI quality work that sits between research, data, product, and operations.

Experience: Supported a prototype assistant for internal knowledge search by building an evaluation set, labeling good and bad answers, and tracking whether model updates improved the most important cases. Wrote review guidelines that separated wrong facts, missing caveats, irrelevant suggestions, and acceptable partial answers. Used spreadsheets, SQL exports, and simple Python scripts to sample examples and summarize error rates. Partnered with engineers to identify when failures came from retrieval, prompt wording, or insufficient source material. Also helped a customer education team review tone and clarity in generated responses.

Skills: AI evaluation, rubric design, qualitative coding, spreadsheet analysis, SQL basics, Python sampling scripts, product QA, documentation, model output review, stakeholder summaries. Not a machine learning researcher who trains models from scratch, and not a general administrative operations specialist.

Target roles: Machine learning evaluation analyst, AI operations analyst, research operations role with product data. Medium fit for UX research or people analytics when evaluation methods matter. Weak fit for frontend, backend, or cloud infrastructure roles.`,
  },
  {
    id: "semantic-demo-resume-devops-cloud",
    name: "DevOps Resume - Cloud CI/CD",
    content: `Profile: DevOps and platform engineer focused on making deployment paths more reliable for small product teams. Comfortable with CI/CD workflows, cloud services, containers, logs, incident notes, and automation scripts. Enjoys reducing release anxiety by making systems observable and repeatable.

Experience: Maintained GitHub Actions pipelines for a web application, including preview deployments, dependency caching, environment variables, and database migration checks. Wrote scripts that validated configuration before release and posted deployment summaries to a team channel. Helped investigate production incidents by reviewing logs, metrics, and recent commits, then turning findings into runbook updates. Improved alert routing so urgent service failures were separated from noisy background warnings. Collaborated with backend engineers on retry behavior and with frontend engineers on static build reliability.

Skills: CI/CD, cloud hosting, containers, shell scripting, GitHub Actions, environment configuration, observability, incident follow-up, release documentation, infrastructure-as-code basics, Linux command line. Has written small Node.js utilities but is not looking for a feature-heavy product engineering role. Uses the word operations in a technical reliability sense, not HR or office administration.

Target roles: DevOps engineer, platform reliability engineer, release operations engineer. Medium fit for backend roles with production ownership. Weak fit for people operations, business operations, UX research, or content coordination.`,
  },
  {
    id: "semantic-demo-resume-ux-product",
    name: "UX Product Resume - Research and Design",
    content: `Profile: UX/product designer focused on complex workflow software. Strong at understanding user tasks, mapping journeys, creating prototypes, and translating research findings into practical interface decisions. Comfortable collaborating with engineers and product managers, especially when a screen must balance density, clarity, and repeated use.

Experience: Redesigned an internal scheduling workflow after interviewing coordinators and observing where handoffs failed. Produced journey maps, wireframes, usability test scripts, and high-fidelity prototypes. Worked with frontend engineers to define empty states, validation messages, and component behavior. Contributed to a design system by documenting when to use tables, cards, filters, and side panels. Ran lightweight usability sessions and synthesized findings into decision-oriented notes rather than long reports.

Skills: Product design, UX research, workflow mapping, Figma, prototyping, usability testing, information architecture, design systems, accessibility awareness, interface copy, stakeholder facilitation. Has strong qualitative research instincts but applies them to software product decisions rather than academic psychology. Understands technical constraints but does not write production React code.

Target roles: Product designer, UX researcher for software, design systems specialist. Medium fit for frontend-adjacent design roles or workplace research involving digital tools. Weak fit for backend APIs, DevOps, data engineering, HR coordination, or customer support.`,
  },
  {
    id: "semantic-demo-resume-hr-peopleops",
    name: "People Operations Resume - HR Programs",
    content: `Profile: People operations coordinator with experience supporting onboarding, hiring logistics, employee records, and internal communication. Organized, discreet, and comfortable making repeatable processes clearer for managers and employees. Interested in practical HR roles where reliable follow-through matters.

Experience: Coordinated onboarding for new team members in a training organization, including checklists, calendar invites, equipment requests, policy acknowledgements, and first-week feedback forms. Helped recruiters keep interview stages updated and prepared weekly hiring summaries from spreadsheet exports. Drafted employee communication templates, answered routine policy questions, and escalated sensitive topics to senior HR partners. Supported an engagement survey by checking distribution lists, tracking response rates, and summarizing open-text themes at a high level.

Skills: HR coordination, onboarding, recruiting operations, employee records, spreadsheet tracking, calendar coordination, internal communication, survey support, process documentation, confidentiality. Has some analytics curiosity but no deep SQL or model evaluation background. Uses operations in a people and workplace process sense, not cloud infrastructure.

Target roles: People operations coordinator, HR operations assistant, recruiting coordinator. Medium fit for talent analytics if the tooling is accessible and training is provided. Weak fit for DevOps, backend engineering, frontend development, AI evaluation, or general customer support unless intentionally changing paths.`,
  },
  {
    id: "semantic-demo-resume-psychology-research",
    name: "Psychology Research Resume - Workplace Studies",
    content: `Profile: Research assistant with a psychology and organizational behavior focus. Experienced in survey preparation, interview note coding, literature summaries, and ethical handling of participant information. Interested in workplace research, employee experience, and evidence-based people programs.

Experience: Helped run a study on onboarding confidence by preparing survey items, cleaning response exports, coding open-text answers, and summarizing themes for a faculty supervisor. Assisted with interviews about team belonging and manager communication, then organized notes into recurring patterns. Wrote short literature briefs on burnout, motivation, and feedback practices. In a capstone project, combined basic statistics with qualitative examples to explain why a program seemed helpful for some groups but not others.

Skills: Survey design support, qualitative coding, interview notes, literature review, basic statistics, spreadsheet analysis, research ethics, workplace psychology, written synthesis. Familiar with employee experience language and comfortable learning HR tools. Not a clinician, not a software engineer, and not a UX designer by default, though some research methods transfer.

Target roles: Workplace psychology research assistant, people research associate, employee listening coordinator. Medium fit for UX researcher roles when product context is taught. Medium fit for talent analytics with survey focus. Weak fit for React, Node.js, DevOps, or SaaS customer support roles.`,
  },
  {
    id: "semantic-demo-resume-general-admin",
    name: "General Operations Resume - Office Coordination",
    content: `Profile: General operations assistant with experience organizing calendars, vendor notes, spreadsheets, meeting follow-ups, and recurring administrative processes. Reliable, detail-oriented, and comfortable helping teams keep practical work from falling through cracks. Looking for business support roles rather than specialized engineering, data, or HR research roles.

Experience: Maintained an operations tracker for a small services team, including invoice status, vendor contacts, supplies, meeting action items, and policy document updates. Prepared weekly summaries from spreadsheet data and flagged overdue tasks for a manager. Coordinated calendars for interviews and internal meetings, booked rooms, organized shared folders, and updated process checklists when responsibilities changed. Helped a support manager format help center articles, but did not own technical troubleshooting or product development.

Skills: Administrative coordination, spreadsheets, calendar management, process checklists, document organization, written follow-up, vendor communication, basic reporting, customer-facing professionalism. Comfortable learning software tools but not trained in React, databases, cloud infrastructure, statistical modeling, or formal UX research.

Target roles: Business operations assistant, office coordinator, administrative assistant, content operations support. Weak-to-medium fit for customer support. Poor fit for frontend, full-stack, backend, DevOps, ML evaluation, product analytics, or psychology research roles.`,
  },
  {
    id: "semantic-demo-resume-customer-support",
    name: "Customer Support Resume - SaaS Help Desk",
    content: `Profile: Customer support specialist with experience helping users understand SaaS products, documenting common questions, and escalating clear bug reports to product teams. Patient communicator who enjoys solving practical customer problems. Technical curiosity is present, but the career target is support and customer education rather than software engineering.

Experience: Handled email and chat questions for a scheduling tool used by small teams. Reproduced customer issues, collected screenshots and steps, tagged tickets by product area, and wrote concise escalation notes for engineers. Updated help center articles when a workflow changed and created short response templates for recurring billing and permissions questions. Tracked common confusion points and shared monthly notes with a product manager. Learned enough HTML and browser console basics to inspect simple page issues, but did not write production code.

Skills: Customer support, ticket triage, help center writing, product troubleshooting, escalation notes, empathy, written communication, SaaS workflows, documentation, basic technical investigation. Some overlap with product operations and content coordination. Not a frontend developer, backend engineer, DevOps specialist, HR coordinator, or data analyst.

Target roles: SaaS customer support representative, technical support associate, customer education coordinator. Medium fit for content coordinator roles. Weak fit for engineering, AI evaluation, UX design, people analytics, or workplace psychology research.`,
  },
];

const applications: ApplicationSeed[] = [
  {
    id: "semantic-demo-application-frontend-react",
    jobPostingId: "semantic-demo-job-frontend-react",
    resumeId: "semantic-demo-resume-junior-frontend",
    status: "APPLIED",
    priority: "HIGH",
    appliedAt: new Date("2026-05-16T09:00:00.000Z"),
    nextActionDate: new Date("2026-05-30T09:00:00.000Z"),
    notes: "Strong in-cluster frontend match for retrieval smoke testing.",
  },
  {
    id: "semantic-demo-application-fullstack-next",
    jobPostingId: "semantic-demo-job-fullstack-next-prisma",
    resumeId: "semantic-demo-resume-fullstack-next",
    status: "INTERVIEWING",
    priority: "HIGH",
    appliedAt: new Date("2026-05-17T09:00:00.000Z"),
    nextActionDate: new Date("2026-05-27T09:00:00.000Z"),
    notes: "Strong Next.js, Prisma, and Postgres match.",
  },
  {
    id: "semantic-demo-application-backend-node",
    jobPostingId: "semantic-demo-job-backend-node-api",
    resumeId: "semantic-demo-resume-backend-node",
    status: "SCREENING",
    priority: "MEDIUM",
    appliedAt: new Date("2026-05-18T09:00:00.000Z"),
    nextActionDate: new Date("2026-05-29T09:00:00.000Z"),
    notes: "Backend API match with some full-stack overlap.",
  },
  {
    id: "semantic-demo-application-data-ai",
    jobPostingId: "semantic-demo-job-data-ai-analyst",
    resumeId: "semantic-demo-resume-data-ai",
    status: "INTERESTED",
    priority: "HIGH",
    appliedAt: null,
    nextActionDate: new Date("2026-05-31T09:00:00.000Z"),
    notes: "AI operations/data evaluation cluster match.",
  },
  {
    id: "semantic-demo-application-devops-cloud",
    jobPostingId: "semantic-demo-job-devops-cloud-ci",
    resumeId: "semantic-demo-resume-devops-cloud",
    status: "APPLIED",
    priority: "MEDIUM",
    appliedAt: new Date("2026-05-19T09:00:00.000Z"),
    nextActionDate: new Date("2026-06-02T09:00:00.000Z"),
    notes: "Technical operations match, useful for DevOps/business operations decoy checks.",
  },
  {
    id: "semantic-demo-application-ux-researcher",
    jobPostingId: "semantic-demo-job-ux-researcher",
    resumeId: "semantic-demo-resume-ux-product",
    status: "SAVED",
    priority: "MEDIUM",
    appliedAt: null,
    nextActionDate: new Date("2026-06-03T09:00:00.000Z"),
    notes: "Medium UX research match with psychology-research decoy nearby.",
  },
];

const demoCompanyIds = companies.map((company) => company.id);
const demoJobPostingIds = jobPostings.map((jobPosting) => jobPosting.id);
const demoResumeIds = resumes.map((resume) => resume.id);
const demoApplicationIds = applications.map((application) => application.id);

let disconnectPrisma: (() => Promise<void>) | null = null;

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function printUsage() {
  console.log("Usage:");
  console.log("  pnpm seed:semantic-test-data --email test@example.com");
  console.log(
    "  SEMANTIC_TEST_USER_EMAIL=test@example.com pnpm seed:semantic-test-data",
  );
  console.log(
    "  pnpm seed:semantic-test-data --email test@example.com --cleanup-only",
  );
  console.log(
    "  pnpm seed:semantic-test-data --email test@example.com --reset-user-data",
  );
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    cleanupOnly: false,
    email: null,
    help: false,
    resetUserData: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--cleanup-only") {
      options.cleanupOnly = true;
      continue;
    }

    if (arg === "--reset-user-data") {
      options.resetUserData = true;
      continue;
    }

    if (arg === "--email") {
      const value = argv[index + 1];

      if (!value || value.startsWith("--")) {
        throw new Error("--email requires an email address.");
      }

      options.email = value.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith("--email=")) {
      options.email = arg.slice("--email=".length).trim();
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  options.email = options.email || process.env.SEMANTIC_TEST_USER_EMAIL?.trim() || null;

  if (options.cleanupOnly && options.resetUserData) {
    throw new Error("--cleanup-only and --reset-user-data cannot be used together.");
  }

  return options;
}

function assertRequiredEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing required environment variable: DATABASE_URL.");
  }
}

function requireTargetEmail(email: string | null) {
  if (!email) {
    throw new Error(
      "Missing target email. Pass --email test@example.com or set SEMANTIC_TEST_USER_EMAIL.",
    );
  }

  return email;
}

async function assertSafeDemoCleanup(
  prisma: PrismaClientInstance,
  userId: string,
) {
  const [
    primaryDemoResume,
    externalApplicationsOnDemoJobs,
    externalApplicationsUsingDemoResumes,
    externalJobPostingsOnDemoCompanies,
    externalJobPostingsUsingDemoResumes,
    coverLettersOnDemoApplications,
    interviewsOnDemoApplications,
    tasksOnDemoApplications,
  ] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: userId,
        primaryResumeId: {
          in: demoResumeIds,
        },
      },
      select: {
        primaryResumeId: true,
      },
    }),
    prisma.application.findMany({
      where: {
        userId,
        jobPostingId: {
          in: demoJobPostingIds,
        },
        id: {
          notIn: demoApplicationIds,
        },
      },
      select: {
        id: true,
      },
      take: 5,
    }),
    prisma.application.findMany({
      where: {
        userId,
        resumeId: {
          in: demoResumeIds,
        },
        id: {
          notIn: demoApplicationIds,
        },
      },
      select: {
        id: true,
      },
      take: 5,
    }),
    prisma.jobPosting.findMany({
      where: {
        userId,
        companyId: {
          in: demoCompanyIds,
        },
        id: {
          notIn: demoJobPostingIds,
        },
      },
      select: {
        id: true,
      },
      take: 5,
    }),
    prisma.jobPosting.findMany({
      where: {
        userId,
        id: {
          notIn: demoJobPostingIds,
        },
        OR: [
          {
            matchResumeId: {
              in: demoResumeIds,
            },
          },
          {
            tailoringResumeId: {
              in: demoResumeIds,
            },
          },
        ],
      },
      select: {
        id: true,
      },
      take: 5,
    }),
    prisma.coverLetter.findMany({
      where: {
        userId,
        applicationId: {
          in: demoApplicationIds,
        },
      },
      select: {
        id: true,
      },
      take: 5,
    }),
    prisma.interview.findMany({
      where: {
        userId,
        applicationId: {
          in: demoApplicationIds,
        },
      },
      select: {
        id: true,
      },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        userId,
        applicationId: {
          in: demoApplicationIds,
        },
      },
      select: {
        id: true,
      },
      take: 5,
    }),
  ]);

  const blockers = [
    primaryDemoResume
      ? "User.primaryResumeId points to a semantic demo resume."
      : null,
    externalApplicationsOnDemoJobs.length > 0
      ? "Non-demo applications reference semantic demo job postings."
      : null,
    externalApplicationsUsingDemoResumes.length > 0
      ? "Non-demo applications reference semantic demo resumes."
      : null,
    externalJobPostingsOnDemoCompanies.length > 0
      ? "Non-demo job postings belong to semantic demo companies."
      : null,
    externalJobPostingsUsingDemoResumes.length > 0
      ? "Non-demo job postings reference semantic demo resumes in AI match metadata."
      : null,
    coverLettersOnDemoApplications.length > 0
      ? "Cover letters reference semantic demo applications."
      : null,
    interviewsOnDemoApplications.length > 0
      ? "Interviews reference semantic demo applications."
      : null,
    tasksOnDemoApplications.length > 0
      ? "Tasks reference semantic demo applications."
      : null,
  ].filter(Boolean);

  if (blockers.length > 0) {
    throw new Error(
      [
        "Default cleanup would affect non-demo records or user metadata.",
        ...blockers.map((blocker) => `- ${blocker}`),
        "Delete those records manually, or use --reset-user-data only with a dedicated local/dev test user.",
      ].join("\n"),
    );
  }
}

async function assertDemoIdsAvailableForUser(
  prisma: PrismaClientInstance,
  userId: string,
) {
  const [companyConflicts, resumeConflicts, jobPostingConflicts, applicationConflicts] =
    await Promise.all([
      prisma.company.findMany({
        where: {
          id: {
            in: demoCompanyIds,
          },
          userId: {
            not: userId,
          },
        },
        select: {
          id: true,
          userId: true,
        },
        take: 5,
      }),
      prisma.resume.findMany({
        where: {
          id: {
            in: demoResumeIds,
          },
          userId: {
            not: userId,
          },
        },
        select: {
          id: true,
          userId: true,
        },
        take: 5,
      }),
      prisma.jobPosting.findMany({
        where: {
          id: {
            in: demoJobPostingIds,
          },
          userId: {
            not: userId,
          },
        },
        select: {
          id: true,
          userId: true,
        },
        take: 5,
      }),
      prisma.application.findMany({
        where: {
          id: {
            in: demoApplicationIds,
          },
          userId: {
            not: userId,
          },
        },
        select: {
          id: true,
          userId: true,
        },
        take: 5,
      }),
    ]);

  const conflictCount =
    companyConflicts.length +
    resumeConflicts.length +
    jobPostingConflicts.length +
    applicationConflicts.length;

  if (conflictCount > 0) {
    throw new Error(
      [
        "Semantic demo IDs already exist for another user in this database.",
        "The seed uses deterministic primary keys, so only one semantic demo user can be seeded per database at a time.",
        "Run cleanup for the user that currently owns the demo records, or use a separate database.",
      ].join("\n"),
    );
  }
}

async function deleteDemoRecords(
  prisma: PrismaClientInstance,
  userId: string,
): Promise<DemoDeletionCounts> {
  await assertSafeDemoCleanup(prisma, userId);

  const deletedApplications = await prisma.application.deleteMany({
    where: {
      id: {
        in: demoApplicationIds,
      },
      userId,
    },
  });

  const deletedJobPostings = await prisma.jobPosting.deleteMany({
    where: {
      id: {
        in: demoJobPostingIds,
      },
      userId,
    },
  });

  const deletedCompanies = await prisma.company.deleteMany({
    where: {
      id: {
        in: demoCompanyIds,
      },
      userId,
    },
  });

  const deletedResumes = await prisma.resume.deleteMany({
    where: {
      id: {
        in: demoResumeIds,
      },
      userId,
    },
  });

  return {
    applications: deletedApplications.count,
    jobPostings: deletedJobPostings.count,
    companies: deletedCompanies.count,
    resumes: deletedResumes.count,
  };
}

async function resetUserAppData(
  prisma: PrismaClientInstance,
  userId: string,
): Promise<ResetDeletionCounts> {
  const deletedTasks = await prisma.task.deleteMany({
    where: {
      userId,
    },
  });

  const deletedInterviews = await prisma.interview.deleteMany({
    where: {
      userId,
    },
  });

  const deletedCoverLetters = await prisma.coverLetter.deleteMany({
    where: {
      userId,
    },
  });

  const deletedApplications = await prisma.application.deleteMany({
    where: {
      userId,
    },
  });

  const deletedJobPostings = await prisma.jobPosting.deleteMany({
    where: {
      userId,
    },
  });

  const deletedCompanies = await prisma.company.deleteMany({
    where: {
      userId,
    },
  });

  const deletedResumes = await prisma.resume.deleteMany({
    where: {
      userId,
    },
  });

  return {
    tasks: deletedTasks.count,
    interviews: deletedInterviews.count,
    coverLetters: deletedCoverLetters.count,
    applications: deletedApplications.count,
    jobPostings: deletedJobPostings.count,
    companies: deletedCompanies.count,
    resumes: deletedResumes.count,
  };
}

async function createDemoRecords(
  prisma: PrismaClientInstance,
  userId: string,
): Promise<CreationCounts> {
  const createdCompanies = await prisma.company.createMany({
    data: companies.map((company) => ({
      ...company,
      userId,
    })),
  });

  const createdResumes = await prisma.resume.createMany({
    data: resumes.map((resume) => ({
      ...resume,
      userId,
    })),
  });

  const createdJobPostings = await prisma.jobPosting.createMany({
    data: jobPostings.map((jobPosting) => ({
      ...jobPosting,
      userId,
    })),
  });

  const createdApplications = await prisma.application.createMany({
    data: applications.map((application) => ({
      ...application,
      userId,
    })),
  });

  return {
    companies: createdCompanies.count,
    resumes: createdResumes.count,
    jobPostings: createdJobPostings.count,
    applications: createdApplications.count,
  };
}

async function updateSemanticDemoUserContext(
  prisma: PrismaClientInstance,
  userId: string,
) {
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: semanticDemoUserContext,
  });
}

function printDemoDeletionCounts(label: string, counts: DemoDeletionCounts) {
  console.log(`${label}:`);
  console.log(`  deleted applications: ${counts.applications}`);
  console.log(`  deleted job postings: ${counts.jobPostings}`);
  console.log(`  deleted companies: ${counts.companies}`);
  console.log(`  deleted resumes: ${counts.resumes}`);
}

function printResetDeletionCounts(counts: ResetDeletionCounts) {
  console.log("Deleted existing app records for target user:");
  console.log(`  deleted tasks: ${counts.tasks}`);
  console.log(`  deleted interviews: ${counts.interviews}`);
  console.log(`  deleted cover letters: ${counts.coverLetters}`);
  console.log(`  deleted applications: ${counts.applications}`);
  console.log(`  deleted job postings: ${counts.jobPostings}`);
  console.log(`  deleted companies: ${counts.companies}`);
  console.log(`  deleted resumes: ${counts.resumes}`);
}

function printCreationCounts(counts: CreationCounts) {
  console.log("Created semantic demo records:");
  console.log(`  created companies: ${counts.companies}`);
  console.log(`  created resumes: ${counts.resumes}`);
  console.log(`  created job postings: ${counts.jobPostings}`);
  console.log(`  created applications: ${counts.applications}`);
}

function printUserContextUpdate() {
  console.log("Updated selected user career context:");
  console.log(`  targetRole: ${semanticDemoUserContext.targetRole}`);
  console.log(`  currentRole: ${semanticDemoUserContext.currentRole}`);
  console.log(`  targetLocations: ${semanticDemoUserContext.targetLocations}`);
  console.log(
    `  yearsOfExperience: ${semanticDemoUserContext.yearsOfExperience}`,
  );
  console.log(`  preferredWorkMode: ${semanticDemoUserContext.preferredWorkMode}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const email = requireTargetEmail(options.email);

  assertRequiredEnv();

  const { prisma } = await import("../src/lib/prisma");
  disconnectPrisma = () => prisma.$disconnect();

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    throw new Error(
      `No user found for ${email}. Create or sign up that user first, then rerun this script.`,
    );
  }

  console.log(`Target user: ${user.email} (${user.id})`);

  if (options.resetUserData) {
    console.log(
      "--reset-user-data enabled: deleting all app records owned by the target user before seeding.",
    );
    const resetCounts = await resetUserAppData(prisma, user.id);
    printResetDeletionCounts(resetCounts);
  } else {
    const deletionCounts = await deleteDemoRecords(prisma, user.id);
    printDemoDeletionCounts("Deleted existing semantic demo records", deletionCounts);
  }

  if (options.cleanupOnly) {
    console.log("Cleanup only complete. No records were created.");
    return;
  }

  await assertDemoIdsAvailableForUser(prisma, user.id);

  const creationCounts = await createDemoRecords(prisma, user.id);
  printCreationCounts(creationCounts);

  await updateSemanticDemoUserContext(prisma, user.id);
  printUserContextUpdate();

  console.log("Embedding metadata is intentionally empty until pnpm backfill:embeddings runs.");
}

main()
  .catch((error) => {
    console.error(formatError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma?.();
  });
