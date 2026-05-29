import { formatStatus } from "@/lib/assistant/context-formatters";

export type DashboardAssistantSourceType =
  | "jobPosting"
  | "resume"
  | "application"
  | "task"
  | "interview"
  | "company"
  | "coverLetter";

export type DashboardAssistantReferencedRecord = {
  key: string;
  type: DashboardAssistantSourceType;
  label: string;
  href: string;
  description: string | null;
};

type SourceInput = {
  type: DashboardAssistantSourceType;
  id: string;
  label: string;
  href: string;
  description?: string | null;
};

type CompanySourceInput = {
  id: string;
  name: string;
  industry?: string | null;
};

type JobPostingSourceInput = {
  id: string;
  title: string;
  company: CompanySourceInput;
  location?: string | null;
};

type ResumeSourceInput = {
  id: string;
  name: string;
};

type ApplicationSourceInput = {
  id: string;
  jobPosting: JobPostingSourceInput;
};

type TaskSourceInput = {
  id: string;
  title: string;
};

type InterviewSourceInput = {
  id: string;
  type: string;
  application: ApplicationSourceInput;
};

type CoverLetterSourceInput = {
  id: string;
  title: string;
  mode?: string | null;
};

export function createSourceRegistry() {
  const sourceMap = new Map<string, DashboardAssistantReferencedRecord>();

  function addSource({ type, id, label, href, description }: SourceInput) {
    const key = `${type}:${id}`;

    if (!sourceMap.has(key)) {
      sourceMap.set(key, {
        key,
        type,
        label,
        href,
        description: description ?? null,
      });
    }

    return key;
  }

  function addCompanySource(company: CompanySourceInput) {
    return addSource({
      type: "company",
      id: company.id,
      label: company.name,
      href: `/companies/${company.id}/edit`,
      description: company.industry,
    });
  }

  function addJobPostingSource(jobPosting: JobPostingSourceInput) {
    addCompanySource(jobPosting.company);

    return addSource({
      type: "jobPosting",
      id: jobPosting.id,
      label: `${jobPosting.title} at ${jobPosting.company.name}`,
      href: `/job-postings/${jobPosting.id}/edit`,
      description: jobPosting.location ?? jobPosting.company.industry ?? null,
    });
  }

  function addResumeSource(resume: ResumeSourceInput) {
    return addSource({
      type: "resume",
      id: resume.id,
      label: resume.name,
      href: `/resumes/${resume.id}/edit`,
    });
  }

  function addApplicationSource(application: ApplicationSourceInput) {
    addJobPostingSource(application.jobPosting);

    return addSource({
      type: "application",
      id: application.id,
      label: `${application.jobPosting.title} at ${application.jobPosting.company.name}`,
      href: `/applications/${application.id}/edit`,
      description: "Application",
    });
  }

  function addTaskSource(task: TaskSourceInput) {
    return addSource({
      type: "task",
      id: task.id,
      label: task.title,
      href: `/tasks/${task.id}/edit`,
    });
  }

  function addInterviewSource(interview: InterviewSourceInput) {
    addApplicationSource(interview.application);

    return addSource({
      type: "interview",
      id: interview.id,
      label: `${formatStatus(interview.type)} interview for ${interview.application.jobPosting.title}`,
      href: `/interviews/${interview.id}/edit`,
      description: interview.application.jobPosting.company.name,
    });
  }

  function addCoverLetterSource(coverLetter: CoverLetterSourceInput) {
    return addSource({
      type: "coverLetter",
      id: coverLetter.id,
      label: coverLetter.title,
      href: `/cover-letters/${coverLetter.id}/edit`,
      description: coverLetter.mode ? formatStatus(coverLetter.mode) : null,
    });
  }

  return {
    sourceMap,
    addCompanySource,
    addJobPostingSource,
    addResumeSource,
    addApplicationSource,
    addTaskSource,
    addInterviewSource,
    addCoverLetterSource,
  };
}

export type DashboardAssistantSourceRegistry = ReturnType<
  typeof createSourceRegistry
>;
