/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import { createRequire } from "module";
import { Config, ConfigSchema } from "@artinet/types";
import { sortServersWithName } from "@artinet/router";
import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { configManager } from "./manager.js";

const require = createRequire(import.meta.url);

export async function loadTools(): Promise<Config> {
  // Ensure user config is initialized
  await configManager.ensureUserConfig();

  const toolConfigPath = configManager.getConfigPath("mcp");

  if (!toolConfigPath) {
    throw new Error("No tool config file found");
  }
  if (!toolConfigPath.endsWith(".json")) {
    throw new Error("Tool config file must be a JSON file");
  }

  try {
    const toolConfig = require(toolConfigPath);
    const parsedToolConfig = ConfigSchema.safeParse(toolConfig);
    if (!parsedToolConfig.success) {
      throw new Error(`Invalid tool config: ${parsedToolConfig.error.message}`);
    }
    return parsedToolConfig.data;
  } catch (error) {
    throw new Error(
      `Failed to load tool config from ${toolConfigPath}: ${error}`
    );
  }
}

export async function loadAndSortTools(): Promise<
  Record<string, StdioServerParameters>
> {
  const tools = await loadTools();
  const sortedTools = sortServersWithName(tools);
  return sortedTools.stdioServers;
}
