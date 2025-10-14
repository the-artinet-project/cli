/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { cp, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ConfigManager {
  private readonly userConfigDir: string;
  private mcpConfigPath: string = "";
  private agentsConfigPath: string = "";
  private sessionsConfigDir: string = "";
  private sessionsConfigFilePath: string = "";
  private readonly bundledConfigDir: string;
  private _initialized = false;

  constructor() {
    // User config directory (follows XDG spec)
    this.userConfigDir =
      process.env.SYMPHONY_CONFIG_DIR ||
      (process.env.XDG_CONFIG_HOME
        ? join(process.env.XDG_CONFIG_HOME, "symphony")
        : join(homedir(), ".config", "symphony"));

    // Bundled config (read-only, in package)
    this.bundledConfigDir = join(__dirname, "../../../config");
  }

  async ensureUserConfig(): Promise<void> {
    if (this._initialized) return;

    if (!existsSync(this.userConfigDir)) {
      console.log(`Initializing Symphony config at: ${this.userConfigDir}`);

      // Create base directory
      mkdirSync(this.userConfigDir, { recursive: true });

      // Copy mcp.json if it doesn't exist
      const mcpSource = join(this.bundledConfigDir, "mcp.json");
      const mcpDest = join(this.userConfigDir, "mcp.json");
      if (existsSync(mcpSource) && !existsSync(mcpDest)) {
        await cp(mcpSource, mcpDest);
      }
      this.mcpConfigPath = mcpDest;
      // Copy agents directory if it doesn't exist
      const agentsSource = join(this.bundledConfigDir, "agents");
      const agentsDest = join(this.userConfigDir, "agents");
      if (existsSync(agentsSource) && !existsSync(agentsDest)) {
        await cp(agentsSource, agentsDest, { recursive: true });
      }
      this.agentsConfigPath = agentsDest;
      // Create empty sessions directory
      const sessionsDir = join(this.userConfigDir, "sessions");
      if (!existsSync(sessionsDir)) {
        mkdirSync(sessionsDir, { recursive: true });
      }
      this.sessionsConfigDir = sessionsDir;
      // Create empty agents-session.json file
      const agentsSessionFile = join(sessionsDir, "agents-session.json");
      if (!existsSync(agentsSessionFile)) {
        await writeFile(agentsSessionFile, "{}", "utf8");
      }
      this.sessionsConfigFilePath = agentsSessionFile;
      logger.log(`✅ Symphony config initialized`);
      logger.log(`   Config: ${this.userConfigDir}`);
      logger.log(`   Edit your configs and restart Symphony to apply changes.`);
    }

    this._initialized = true;
  }

  /**
   * Get config path with environment variable override support
   */
  getConfigPath(configType: "mcp" | "agents" | "sessions"): string {
    // Handle environment variable overrides first
    if (configType === "mcp" && process.env.SYMPHONY_MCP_CONFIG) {
      return process.env.SYMPHONY_MCP_CONFIG;
    }

    if (configType === "agents" && process.env.SYMPHONY_AGENT_DIR) {
      return process.env.SYMPHONY_AGENT_DIR;
    }

    if (configType === "sessions" && process.env.SESSION_DIR) {
      return process.env.SESSION_DIR;
    }

    if (configType === "sessions" && process.env.AGENT_SESSION_FILE) {
      return process.env.AGENT_SESSION_FILE;
    }

    // Use user config directory paths
    const userPath = join(
      this.userConfigDir,
      configType === "mcp" ? "mcp.json" : configType
    );

    // For mcp.json, fall back to bundled if user doesn't have it yet
    if (configType === "mcp" && !existsSync(userPath)) {
      const bundledPath = join(this.bundledConfigDir, "mcp.json");
      if (existsSync(bundledPath)) {
        return bundledPath;
      }
    }

    // For agents, fall back to bundled if user doesn't have it yet
    if (configType === "agents" && !existsSync(userPath)) {
      const bundledPath = join(this.bundledConfigDir, "agents");
      if (existsSync(bundledPath)) {
        return bundledPath;
      }
    }

    return userPath;
  }

  /**
   * Get the user config directory path
   */
  getUserConfigDir(): string {
    return this.userConfigDir;
  }

  getMcpConfigPath(): string {
    return this.mcpConfigPath;
  }

  getAgentsConfigPath(): string {
    return this.agentsConfigPath;
  }

  getSessionsConfigDir(): string {
    return this.sessionsConfigDir;
  }

  getSessionsConfigFilePath(): string {
    return this.sessionsConfigFilePath;
  }

  /**
   * Check if user config exists
   */
  hasUserConfig(): boolean {
    return existsSync(this.userConfigDir);
  }
}

// Singleton instance
export const configManager = new ConfigManager();
