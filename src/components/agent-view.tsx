/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { RuntimeAgent } from "../types/index.js";
import { GlobalAgents } from "../global.js";
import { BaseProps } from "./lib/index.js";
import { useInputContext } from "../contexts/InputContext.js";

interface AgentViewProps extends BaseProps {
  onSelect?: (agent: RuntimeAgent) => void;
  onExit?: () => void;
  title?: string;
  allowMultiSelect?: boolean;
}

export const AgentView: React.FC<AgentViewProps> = ({
  onSelect,
  onExit,
  id = "agent-list",
  title = "Agent List",
}) => {
  const agents = Object.values(GlobalAgents || {});
  if (agents.length === 0) {
    return null;
  }
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<RuntimeAgent | null>(null);
  const { isActive } = useInputContext();
  useEffect(() => {}, [isActive, id]);
  useInput(
    (input, key) => {
      if (key.upArrow) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (key.downArrow) {
        setSelectedIndex(Math.min(agents.length - 1, selectedIndex + 1));
      } else if (key.return) {
        onSelect?.(agents[selectedIndex]);
      } else if (input === " ") {
        setSelectedAgent(agents[selectedIndex]);
      } else if (input === "q" || key.escape) {
        if (onExit) {
          onExit();
        }
      }
    },
    { isActive: isActive(id) }
  );

  if (Object.values(GlobalAgents || {}).length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">no agents found</Text>
        <Text color="gray">press [q] to return to the main menu</Text>
      </Box>
    );
  }

  return (
    <>
      {isActive(id) && (
        <Box flexDirection="column" padding={1}>
          <Text color="brightWhite" bold>
            {title} [{agents.length} Agent(s)]
          </Text>
          <Text color="gray">
            use ↑/↓ to navigate, [enter] to select , [q] to return to the main
            menu
          </Text>
          <Box marginTop={1} flexDirection="column">
            {agents
              .sort((a, b) =>
                a.definition.name.localeCompare(b.definition.name)
              )
              .map((agent, index) => {
                const isSelected = index === selectedIndex;
                const isMarked =
                  selectedAgent?.definition.id === agents[index].definition.id;

                return (
                  <Box key={agent.definition.id} flexDirection="row">
                    <Text
                      color={isSelected ? "black" : "brightWhite"}
                      backgroundColor={isSelected ? "gray" : undefined}
                    >
                      {isMarked ? "✓ " : "  "}
                      {agent.definition.id?.padEnd(25)}
                      {agent.definition.name.padEnd(30)}
                      {agent.definition.teams.length} teams |{" "}
                      {agent.definition.tools.length} tools
                    </Text>
                  </Box>
                );
              })}
          </Box>

          {selectedAgent && (
            <Box marginTop={1}>
              <Text color="brightWhite">
                selected: {selectedAgent.definition.id}
              </Text>
            </Box>
          )}

          <Box marginTop={1}>
            <Text color="gray">
              {agents[selectedIndex] &&
                `preview: ${agents[
                  selectedIndex
                ].definition.description.substring(0, 80)}...`}
            </Text>
          </Box>
        </Box>
      )}
    </>
  );
};
