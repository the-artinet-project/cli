/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */
import { AgentLoader, loadAgents } from "./config/load-agents.js";
import { ScanConfig, getAgentCard } from "@artinet/agent-relay";
import { LocalRouter, EventBus } from "@artinet/router";
import { createAgentExecutor } from "./execution/instance.js";
import { Team, RuntimeAgent } from "./types/index.js";
import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { logger } from "./utils/logger.js";
import { loadAndSortTools } from "./config/load-tools.js";
import { FileStore } from "@artinet/sdk";
import { configManager } from "./config/manager.js";

//leveraging Singletons for now, but we should consider using a more robust solution for the future
let GlobalSessions: FileStore | undefined;
let GlobalRouter: LocalRouter | undefined;
let GlobalAgents: Record<string, RuntimeAgent> | undefined;
let GlobalTools: Record<string, StdioServerParameters> | undefined;
let GlobalTeams: Record<string, Team> | undefined;
let GlobalAbortController: AbortController | undefined;
let GlobalEventBus: EventBus | undefined;

async function discoverAgents(): Promise<void> {
  if (!GlobalAgents) {
    return;
  }
  const agentIds: string[] = (await GlobalRouter?.agents.getAgentIds()) ?? [];
  const discoveredAgents: string[] =
    agentIds.filter((agentId) => !GlobalAgents?.[agentId]) ?? [];
  if (discoveredAgents?.length > 0) {
    for (const agentId of discoveredAgents) {
      const agent = GlobalRouter?.agents.getAgent(agentId);
      if (!agent) {
        logger.warn("agent not found: ", agentId);
        continue;
      }
      const agentCard = await getAgentCard(agent);
      logger.warn("agentCard", agentCard);
      if (!agentCard) {
        logger.warn("agentCard not found: ", agentId);
        continue;
      }
      let teams: string[] = [];
      if (
        agentCard.capabilities.extensions?.find(
          (extension) => extension.uri === "artinet:symphony"
        )
      ) {
        teams = agentCard.capabilities.extensions?.find(
          (extension) => extension.uri === "artinet:symphony"
        )?.params?.teams as string[];
        teams.forEach((team) => {
          GlobalTeams?.[team]?.memberIds.push(agentId);
        });
      }
      GlobalAgents[agentId] = {
        sourceFile: agentCard?.url ?? "",
        definition: {
          ...agentCard,
          id: agentId,
          name: agentCard.name,
          description: agentCard.description,
          version: agentCard.version,
          skills: agentCard.skills,
          tools: [],
          teams: teams.map((team) => ({
            name: team,
            role: "member",
          })),
        },
        client: true,
        prompt:
          "You are a helpful assistant that can answer questions and help with tasks. Use the tools/agents available to you to respond to the user's request.",
      };
    }
  }
}

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

  const scanConfig: ScanConfig = {
    host: "localhost",
    startPort: 3000,
    endPort: 5000,
    threads: 25,
  };

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
    },
    scanConfig
  );

  await discoverAgents();

  // Use ConfigManager for sessions path
  const sessionsPath = configManager.getConfigPath("sessions");
  GlobalSessions = new FileStore(sessionsPath);

  Object.values(GlobalAgents).forEach(async (agent) => {
    if (agent.client) return;
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
