/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from "zod";
import { AgentCardSchema } from "@artinet/sdk";

/**
 * Team role enum
 */
export const TeamRoleSchema = z.enum(["member", "lead"]);
export type TeamRole = z.infer<typeof TeamRoleSchema>;

/**
 * Team membership definition
 */
export const TeamMembershipSchema = z.object({
  name: z.string().describe("Team name"),
  role: TeamRoleSchema.describe("Role in the team: member or lead"),
});
export type TeamMembership = z.infer<typeof TeamMembershipSchema>;

/**
 * Agent definition frontmatter schema
 */
export const AgentDefinitionSchema = AgentCardSchema.partial({
  protocolVersion: true,
  url: true,
  capabilities: true,
  defaultInputModes: true,
  defaultOutputModes: true,
}).extend({
  /**
   * Optional agent ID - will be generated if not provided
   */
  id: z.string().optional().describe("Unique agent identifier"),

  /**
   * Optional model specification
   */
  model: z.string().optional().describe("Model identifier or specification"),

  /**
   * List of MCP server tools this agent uses
   */
  tools: z
    .array(z.string())
    .default([])
    .describe("List of MCP server tools by name"),

  /**
   * Teams this agent belongs to
   */
  teams: z
    .array(TeamMembershipSchema)
    .default([])
    .describe("Team memberships with roles"),
});
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
