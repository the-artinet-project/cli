/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import { join, dirname } from "path";
import fs from "fs/promises";
import { logger } from "../utils/logger.js";
import {
  AgentSessionMapSchema,
  AgentSessionMap,
  AgentSession,
} from "../types/index.js";
import { configManager } from "./manager.js";

let GlobalSessionMap: AgentSessionMap | undefined = undefined;
let agentSessionFile: string | undefined = undefined;

async function getAgentSessionFile(): Promise<string> {
  if (!agentSessionFile) {
    // Handle environment variable override first
    if (process.env.AGENT_SESSION_FILE) {
      agentSessionFile = process.env.AGENT_SESSION_FILE;
    } else {
      // Ensure user config is initialized
      await configManager.ensureUserConfig();
      const sessionsDir = configManager.getConfigPath("sessions");
      agentSessionFile = join(sessionsDir, "agents-session.json");
    }
  }
  return agentSessionFile;
}

export async function loadSessionMap(): Promise<AgentSessionMap> {
  const sessionFile = await getAgentSessionFile();

  // Ensure directory exists
  const dir = dirname(sessionFile);
  try {
    await fs.access(dir);
  } catch {
    // Directory does not exist, so create it
    await fs.mkdir(dir, { recursive: true });
  }

  // Ensure file exists, create if not
  try {
    await fs.access(sessionFile);
  } catch {
    // File does not exist, so create it with an empty object
    await fs.writeFile(sessionFile, "{}", "utf8");
  }

  try {
    await fs.access(sessionFile);
  } catch {
    throw new Error(
      `session map file does not exist or is not accessible: ${sessionFile}`
    );
  }

  const sessionMap = await fs.readFile(sessionFile, "utf8");
  if (sessionMap.trim() === "") {
    throw new Error("session map file is empty");
  }

  const parsedSessionMap = AgentSessionMapSchema.safeParse(
    JSON.parse(sessionMap)
  );
  if (parsedSessionMap.error) {
    throw new Error(
      "invalid session map file: " + parsedSessionMap.error.message
    );
  }
  return parsedSessionMap.data;
}

export async function saveSessionMap(): Promise<void> {
  const sessionFile = await getAgentSessionFile();

  if (!GlobalSessionMap || Object.keys(GlobalSessionMap).length === 0) {
    return;
  }

  await fs.writeFile(
    sessionFile,
    JSON.stringify(GlobalSessionMap, null, 2),
    "utf8"
  );
}

export async function getSessionMap(): Promise<AgentSessionMap> {
  if (GlobalSessionMap) {
    return GlobalSessionMap;
  }
  return await loadSessionMap().catch((error) => {
    logger.warn("error loading session map: " + error.message);
    return (GlobalSessionMap = {});
  });
}

export async function getSessions(agentId: string): Promise<AgentSession[]> {
  let sessionMap = await getSessionMap();
  if (!sessionMap || Object.keys(sessionMap).length === 0) {
    return [];
  }
  return sessionMap[agentId] ?? [];
}

export async function addConfigSession(
  agentId: string,
  session: AgentSession
): Promise<void> {
  const sessionMap: AgentSessionMap = await getSessionMap();
  if (!sessionMap || Object.keys(sessionMap).length === 0) {
    GlobalSessionMap = { [agentId]: [session] };
  } else {
    sessionMap[agentId] = [...(sessionMap[agentId] ?? []), session];
    GlobalSessionMap = sessionMap;
  }
  await saveSessionMap();
}
