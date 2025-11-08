import { AgentDefinition } from "./agent-definition.js";
import { z } from "zod";

export interface Team {
  name: string;
  memberIds: string[];
  leadId: string | undefined;
}

export interface RuntimeAgent {
  sourceFile: string;
  definition: AgentDefinition;
  prompt: string;
  client?: boolean;
}

export interface LoadError {
  filePath: string;
  errors: any[];
}

export interface LoadResults {
  agents: Record<string, RuntimeAgent>;
  teams: Record<string, Team>;
  errors: LoadError[];
}

export interface AgentLoaderConfig {
  threads: number;
  availableTools: string[];
  fileExtensions: string[];
}

export const AgentSessionSchema = z.object({
  taskId: z.string().describe("the task id"),
  timestamp: z.string().datetime().describe("the timestamp"),
});
export type AgentSession = z.infer<typeof AgentSessionSchema>;
export const AgentSessionMapSchema = z.record(
  z.string().describe("the agent id"),
  z
    .array(AgentSessionSchema)
    .describe("the agent sessions; FIRST IN, FIRST OUT")
);
export type AgentSessionMap = z.infer<typeof AgentSessionMapSchema>;
