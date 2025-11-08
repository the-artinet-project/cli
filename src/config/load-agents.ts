/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import {
  AgentDefinitionSchema,
  type AgentDefinition,
} from "../types/agent-definition.js";
import glob from "fast-glob";
import matter from "gray-matter";
import pLimit from "p-limit";
import path from "path";
import {
  AgentLoaderConfig,
  LoadError,
  LoadResults,
  RuntimeAgent,
  Team,
} from "../types/load.js";
import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { configManager } from "./manager.js";

/**
 * Loads and validates agent definitions from frontmatter markdown files
 */
export class AgentLoader {
  public config: AgentLoaderConfig;
  public errors: LoadError[] = [];
  public agentIds = new Set<string>();
  public agents: Record<string, RuntimeAgent> = {};
  public teams: Record<string, Team> = {};

  constructor(config: Partial<AgentLoaderConfig> = {}) {
    this.config = {
      threads: 10,
      availableTools: [],
      fileExtensions: [".md", ".markdown"],
      ...config,
    };
  }

  /**
   * Loads agents from a directory or single file
   * @param targetPath Path to directory or file
   * @returns Complete loading result with agents, teams, and errors
   */
  async loadAgents(targetPath: string): Promise<LoadResults> {
    this.reset();
    const absolutePath = path.resolve(targetPath);
    if (targetPath.endsWith(".md")) {
      await this.processFile(absolutePath);
      return {
        agents: this.agents,
        teams: this.teams,
        errors: this.errors,
      };
    }
    const files = await glob(`**/*.md`, {
      absolute: true,
      cwd: absolutePath,
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.git/**",
        "**/.DS_Store/**",
      ],
    });
    if (files.length === 0) {
      throw new Error(`No Agent definition files found in ${absolutePath}`);
    }
    const limit = pLimit(this.config.threads);
    await Promise.allSettled(
      files.map(
        async (file) =>
          await limit(async () => {
            await this.processFile(file);
          })
      )
    );
    return {
      agents: this.agents,
      teams: this.teams,
      errors: this.errors,
    };
  }

  /**
   * Resets internal state for fresh loading
   */
  private reset(): void {
    this.agents = {};
    this.teams = {};
    this.errors = [];
    this.agentIds.clear();
  }

  /**
   * Loads a single agent definition file
   */
  private async processFile(filePath: string): Promise<void> {
    let agentDef: AgentDefinition;
    let _errors: any[] = [];
    let agentId: string;
    try {
      const fileContent = await fs.readFile(filePath, "utf8");
      if (fileContent.trim() === "") {
        throw new Error("No content found in file");
      }

      const { data, content } = matter(fileContent);
      if (content.trim() === "") {
        throw new Error("No content found in file");
      }

      const parseResult = AgentDefinitionSchema.safeParse(data);
      if (!parseResult.success) {
        throw new Error(
          `Failed to parse agent definition: ${parseResult.error.message}`
        );
      }
      agentDef = parseResult.data;
      agentDef.id;
      if (!agentDef.id) {
        agentDef.id = agentDef.name ?? uuidv4();
      } else if (this.agentIds.has(agentDef.id)) {
        throw new Error(`Duplicate agent ID: ${agentDef.id}`);
      }
      agentId = agentDef.id;
      const missingTools = agentDef.tools.filter(
        (tool) => !this.config.availableTools.includes(tool)
      );

      if (missingTools.length > 0) {
        throw new Error(
          `Missing tools in configuration: ${missingTools.join(", ")}`
        );
      }

      agentDef.teams.forEach((team) => {
        if (!Object.keys(this.teams).includes(team.name)) {
          this.teams[team.name] = {
            name: team.name,
            memberIds: [agentId],
            leadId: team.role === "lead" ? agentId : undefined,
          };
        } else {
          if (team.role === "lead") {
            // if (agentDef.tools.length > 0) {
            //   throw new Error(`Team Lead ${agentId} cannot have tools.`);
            // }

            if (this.teams[team.name].leadId) {
              _errors.push(
                `Multiple leads for team: ${team.name} ${
                  this.teams[team.name].leadId
                } and ${agentId}\n - [ maintaining ${
                  this.teams[team.name].leadId
                } as lead ]`
              );
            } else {
              this.teams[team.name].leadId = agentId;
            }
          }
          this.teams[team.name].memberIds.push(agentId);
        }
      });

      this.agents[agentId] = {
        sourceFile: filePath,
        definition: agentDef,
        prompt: content.trim(),
        client: false,
      };

      this.agentIds.add(agentId);
    } catch (error) {
      _errors.push(error);
    }
    if (_errors.length > 0) {
      this.errors.push({ filePath, errors: _errors });
    }
  }
}

export async function loadAgents(
  stdioServers: Record<string, StdioServerParameters>
): Promise<AgentLoader> {
  // Ensure user config is initialized
  await configManager.ensureUserConfig();

  const agentDir = configManager.getConfigPath("agents");

  const agentLoader = new AgentLoader({
    availableTools: Object.keys(stdioServers),
  });

  try {
    await agentLoader.loadAgents(agentDir);
  } catch (error) {
    console.error(`Failed to load agents from ${agentDir}:`, error);
    throw error;
  }

  return agentLoader;
}
