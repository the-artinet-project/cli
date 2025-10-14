/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Box, Text, useInput, useApp, useFocus } from "ink";
import { LoadError } from "../types/index.js";
import path from "path";
import { BaseProps } from "./lib/index.js";

interface ErrorDisplayProps extends BaseProps {
  errors: LoadError[];
  onExit?: () => void;
  title?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errors,
  onExit,
  title = "Validation Errors",
  id = "error-display",
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();
  const { isFocused } = useFocus({ id });
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(errors.length - 1, selectedIndex + 1));
    } else if (input === "q" || key.escape) {
      if (onExit) {
        onExit();
      } else {
        exit();
      }
    }
  });

  if (errors.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="green">✓ no errors found</Text>
        <Text color="gray">press [q] to exit</Text>
      </Box>
    );
  }

  // Group errors by type
  const errorsByType = errors.reduce((acc, error) => {
    if (!acc[error.filePath]) {
      acc[error.filePath] = [];
    }
    acc[error.filePath].push(error);
    return acc;
  }, {} as Record<string, LoadError[]>);

  return (
    <>
      {isFocused && (
        <Box flexDirection="column" padding={1}>
          <Text color="red" bold>
            {title} ({errors.length} errors)
          </Text>
          <Text color="gray">use ↑/↓ to navigate, [q] to exit</Text>

          {/* Error summary by type */}
          <Box marginTop={1} padding={1} borderStyle="round" borderColor="red">
            <Box flexDirection="column">
              <Text color="yellow" bold>
                error summary:
              </Text>
              {Object.entries(errorsByType).map(([type, errs]) => (
                <Text key={type} color="white">
                  • {type.replace(/_/g, " ")}: {errs.length} error(s)
                  {errs.map((err) => (
                    <Text key={err.filePath} color="white">
                      • {err.filePath}
                    </Text>
                  ))}
                </Text>
              ))}
            </Box>
          </Box>

          {/* Detailed error list */}
          <Box marginTop={1} flexDirection="column">
            {errors.map((error, index) => {
              const isSelected = index === selectedIndex;
              const fileName = path.basename(error.filePath);
              const blockInfo = 1;
              return (
                <Box key={index} flexDirection="column">
                  <Text
                    color={isSelected ? "black" : "white"}
                    backgroundColor={isSelected ? "red" : undefined}
                  >
                    {getErrorIcon(error.filePath)} {fileName}
                    {blockInfo}
                  </Text>
                  {isSelected && (
                    <Box
                      marginLeft={2}
                      padding={1}
                      borderStyle="single"
                      borderColor="gray"
                    >
                      <Box flexDirection="column">
                        <Text color="red">
                          error: {error.errors.join(", ")}
                        </Text>
                        <Text color="gray">type: {error.filePath}</Text>
                        <Text color="gray">file: {error.filePath}</Text>
                        {error.errors && (
                          <Box marginTop={1}>
                            <Text color="yellow">details:</Text>
                            <Text color="white">
                              {JSON.stringify(error.errors, null, 2)}
                            </Text>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>

          <Box marginTop={1}>
            <Text color="gray">
              showing error {selectedIndex + 1} of {errors.length}
            </Text>
          </Box>
        </Box>
      )}
    </>
  );
};

function getErrorIcon(errorType: string): string {
  switch (errorType) {
    case "file_read_error":
      return "📄";
    case "yaml_parse_error":
      return "📝";
    case "schema_validation_error":
      return "⚠️";
    case "missing_tool_error":
      return "🔧";
    case "markdown_parse_error":
      return "📋";
    case "duplicate_agent_id":
      return "🔄";
    default:
      return "❌";
  }
}
