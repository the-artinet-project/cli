/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */
import { AgentLoader, loadAgents } from "./config/load-agents.js";
import { LocalRouter, EventBus } from "@artinet/router";
import { createAgentExecutor } from "./execution/instance.js";
import { Team, RuntimeAgent } from "./types/index.js";
import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { logger } from "./utils/logger.js";
import { loadAndSortTools } from "./config/load-tools.js";
import { FileStore } from "@artinet/sdk";
import { configManager } from "./config/manager.js";

let GlobalSessions: FileStore | undefined;
let GlobalRouter: LocalRouter | undefined;
let GlobalAgents: Record<string, RuntimeAgent> | undefined;
let GlobalTools: Record<string, StdioServerParameters> | undefined;
let GlobalTeams: Record<string, Team> | undefined;
let GlobalAbortController: AbortController | undefined;
let GlobalEventBus: EventBus | undefined;

async function loadEnv() {
  GlobalTools = await loadAndSortTools();

  const agentLoader: AgentLoader = await loadAgents(GlobalTools);
  GlobalAgents = agentLoader.agents;
  GlobalTeams = agentLoader.teams;

  if (Object.keys(GlobalAgents).length === 0) {
    logger.error("No agents loaded");
    throw new Error("No agents loaded");
  }

  if (Object.keys(GlobalTools).length === 0) {
    logger.error("No tools loaded");
    throw new Error("No tools loaded");
  }

  GlobalEventBus = new EventBus();
  GlobalAbortController = new AbortController();

  GlobalRouter = await LocalRouter.createRouter(
    {
      mcpServers: {
        stdioServers: Object.values(GlobalTools) as StdioServerParameters[],
      },
    },
    GlobalEventBus,
    undefined,
    undefined,
    {
      abortSignal: GlobalAbortController.signal,
    }
  );

  // Use ConfigManager for sessions path
  const sessionsPath = configManager.getConfigPath("sessions");
  GlobalSessions = new FileStore(sessionsPath);

  Object.values(GlobalAgents).forEach(async (agent) => {
    await GlobalRouter?.createAgent({
      engine: await createAgentExecutor(agentLoader, GlobalRouter, agent),
      agentCard: {
        ...agent.definition,
        protocolVersion: "0.3.0",
        url: agent.definition.url ?? "https://agents.artinet.io",
        capabilities: agent.definition.capabilities ?? {
          extensions: [],
          streaming: true,
          pushNotifications: false,
          stateTransitionHistory: false,
        },
        defaultInputModes: agent.definition.defaultInputModes ?? ["text"],
        defaultOutputModes: agent.definition.defaultOutputModes ?? ["text"],
      },
      tasks: GlobalSessions,
    });
  });
  if (agentLoader.errors.length > 0) {
    logger.error("Load Errors", agentLoader.errors);
  }
}

if (!GlobalRouter) {
  await loadEnv();
}

export {
  GlobalRouter,
  GlobalAgents,
  GlobalTools,
  GlobalTeams,
  GlobalSessions,
  GlobalEventBus,
  GlobalAbortController,
};
