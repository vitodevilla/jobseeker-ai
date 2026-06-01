import type { ContextualAssistantPageContextInput } from "@/lib/assistant/contextual-assistant-types";

export type AssistantPageContextDescriptor =
  ContextualAssistantPageContextInput;

export function createJobPostingAssistantPageContext(
  id: string,
): Extract<AssistantPageContextDescriptor, { type: "jobPosting" }> {
  return {
    type: "jobPosting",
    id,
  };
}

export function createApplicationAssistantPageContext(
  id: string,
): Extract<AssistantPageContextDescriptor, { type: "application" }> {
  return {
    type: "application",
    id,
  };
}

export function createResumeAssistantPageContext(
  id: string,
): Extract<AssistantPageContextDescriptor, { type: "resume" }> {
  return {
    type: "resume",
    id,
  };
}

function getPathSegments(pathname: string | null | undefined) {
  if (!pathname) {
    return [];
  }

  const pathOnly = pathname.split(/[?#]/, 1)[0] ?? "";

  return pathOnly.split("/").filter(Boolean);
}

function decodeRouteSegment(value: string) {
  try {
    const decodedValue = decodeURIComponent(value);

    return decodedValue.trim() ? decodedValue : null;
  } catch {
    return null;
  }
}

export function resolveAssistantPageContextFromPathname(
  pathname: string | null | undefined,
): AssistantPageContextDescriptor | undefined {
  const segments = getPathSegments(pathname);

  if (segments.length !== 3 || segments[2] !== "edit") {
    return undefined;
  }

  const id = decodeRouteSegment(segments[1]);

  if (!id) {
    return undefined;
  }

  if (segments[0] === "job-postings") {
    return createJobPostingAssistantPageContext(id);
  }

  if (segments[0] === "applications") {
    return createApplicationAssistantPageContext(id);
  }

  if (segments[0] === "resumes") {
    return createResumeAssistantPageContext(id);
  }

  return undefined;
}

export function getAssistantPageContextKey(
  pageContext: AssistantPageContextDescriptor | undefined,
) {
  return pageContext ? `${pageContext.type}:${pageContext.id}` : "dashboard";
}
