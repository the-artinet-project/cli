import { AgentLoader, loadAgents } from "./config/load-agents.js";
import { LocalRouter } from "@artinet/router";
import { createAgentExecutor } from "./execution/instance.js";
import { Team, RuntimeAgent } from "./types/index.js";
import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { logger } from "./utils/logger.js";
import { loadAndSortTools } from "./config/load-tools.js";
import { logger as sdkLogger } from "@artinet/sdk";
import { PatchedFileStore } from "./utils/storage-patch.js";
import { configManager } from "./config/manager.js";

sdkLogger.level = "silent";

let GlobalSessions: PatchedFileStore | undefined;
let GlobalRouter: LocalRouter | undefined;
let GlobalAgents: Record<string, RuntimeAgent> | undefined;
let GlobalTools: Record<string, StdioServerParameters> | undefined;
let GlobalTeams: Record<string, Team> | undefined;

async function loadEnv() {
  logger.log("Loading Environment Tools");
  GlobalTools = await loadAndSortTools();
  logger.log("Global Tools Loaded");
  const agentLoader: AgentLoader = await loadAgents(GlobalTools);
  GlobalAgents = agentLoader.agents;
  GlobalTeams = agentLoader.teams;
  logger.log("Global Agents Loaded");
  if (Object.keys(GlobalAgents).length === 0) {
    logger.error("No agents loaded");
    throw new Error("No agents loaded");
  }
  if (Object.keys(GlobalTools).length === 0) {
    logger.error("No tools loaded");
    throw new Error("No tools loaded");
  }
  GlobalRouter = await LocalRouter.createRouter({
    mcpServers: {
      stdioServers: Object.values(GlobalTools) as StdioServerParameters[],
    },
  });
  logger.log("Global Router Loaded");

  // Use ConfigManager for sessions path
  const sessionsPath = configManager.getConfigPath("sessions");
  GlobalSessions = new PatchedFileStore(sessionsPath);

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
  logger.log("Loading Environment");
  await loadEnv();
}

export { GlobalRouter, GlobalAgents, GlobalTools, GlobalTeams, GlobalSessions };
