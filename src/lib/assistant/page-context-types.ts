export type ContextualAssistantPageContextInput =
  | {
      type: "jobPosting";
      id: string;
    }
  | {
      type: "application";
      id: string;
    }
  | {
      type: "resume";
      id: string;
    };

export type DashboardAssistantPageContextInput =
  ContextualAssistantPageContextInput;
