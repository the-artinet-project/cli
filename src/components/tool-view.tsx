/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { BaseProps } from "./lib/index.js";
import { useInputContext } from "../contexts/InputContext.js";
import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { GlobalTools } from "../global.js";

interface ToolViewProps extends BaseProps {
  onSelect?: (tool: StdioServerParameters) => void;
  onExit?: () => void;
  title?: string;
}

export const ToolView: React.FC<ToolViewProps> = ({
  onSelect,
  onExit,
  title = "Tool List",
  id = "tool-view",
}) => {
  const tools = GlobalTools || {};
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { isActive } = useInputContext();
  useEffect(() => {}, [isActive, id]);
  useInput(
    (input, key) => {
      if (key.upArrow) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (key.downArrow) {
        setSelectedIndex(
          Math.min(Object.keys(tools).length - 1, selectedIndex + 1)
        );
      } else if (key.return && onSelect) {
        onSelect(tools[Object.keys(tools)[selectedIndex]]);
      } else if (input === "q" || key.escape) {
        if (onExit) {
          onExit();
        }
      }
    },
    { isActive: isActive(id) }
  );

  if (Object.keys(tools).length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">no tools found</Text>
        <Text color="gray">press [q] to return to the main menu</Text>
      </Box>
    );
  }

  return (
    <>
      {isActive(id) && (
        <Box flexDirection="column" padding={1}>
          <Text color="brightWhite" bold>
            🔧 {title} [{Object.keys(tools).length} tool(s)]
          </Text>
          <Text color="gray">
            use ↑/↓ to navigate, [q] to return to the main menu
          </Text>

          <Box marginTop={1} flexDirection="column">
            {Object.entries(tools)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([name, value], index) => {
                const isSelected = index === selectedIndex;

                return (
                  <Box key={name} flexDirection="row" columnGap={2}>
                    <Text
                      color={isSelected ? "black" : "gray"}
                      backgroundColor={isSelected ? "gray" : undefined}
                    >
                      {name.padEnd(20)}
                    </Text>
                    <Text
                      color={isSelected ? "black" : "gray"}
                      backgroundColor={isSelected ? "gray" : undefined}
                    >
                      command: {value.command}
                    </Text>
                    <Text
                      color={isSelected ? "black" : "gray"}
                      backgroundColor={isSelected ? "gray" : undefined}
                    >
                      args: {value.args?.join(" ")}
                    </Text>
                  </Box>
                );
              })}
          </Box>
        </Box>
      )}
    </>
  );
};
