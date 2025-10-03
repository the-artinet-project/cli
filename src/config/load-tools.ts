import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Config, ConfigSchema } from "@artinet/types";
import { sortServersWithName } from "@artinet/router";
import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toolConfigPath = join(
  __dirname,
  process.env.SYMPHONY_MCP_CONFIG || "../../../config/mcp.json"
);

export function loadTools(): Config {
  if (!toolConfigPath) {
    throw new Error("No tool config file found");
  }
  if (!toolConfigPath.endsWith(".json")) {
    throw new Error("Tool config file must be a JSON file");
  }
  const toolConfig = require(toolConfigPath);
  const parsedToolConfig = ConfigSchema.safeParse(toolConfig);
  if (!parsedToolConfig.success) {
    throw new Error("Invalid tool config");
  }
  return parsedToolConfig.data;
}

export function loadAndSortTools(): Record<string, StdioServerParameters> {
  const tools = loadTools();
  const sortedTools = sortServersWithName(tools);
  return sortedTools.stdioServers;
}
