"use server";

import { askContextualAssistant } from "@/app/assistant/actions";
import type {
  ContextualAssistantActionInput,
  ContextualAssistantActionState,
  ContextualAssistantHistoryMessage,
} from "@/lib/assistant/contextual-assistant-types";

export type DashboardAssistantHistoryMessage =
  ContextualAssistantHistoryMessage;
export type DashboardAssistantActionInput = ContextualAssistantActionInput;
export type DashboardAssistantActionState = ContextualAssistantActionState;

export async function askDashboardAssistant(
  input: DashboardAssistantActionInput,
): Promise<DashboardAssistantActionState> {
  return askContextualAssistant(input);
}
