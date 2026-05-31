export type DashboardAssistantPageContextInput =
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
