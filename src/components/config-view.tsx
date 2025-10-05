/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Box, Text, useInput, useApp } from "ink";

export const InteractiveConfigWizard: React.FC = () => {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      exit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="gray" bold>
        ⚙️ Interactive Configuration Wizard
      </Text>
      <Text color="yellow">This feature is under development</Text>
      <Text color="gray">press [q] to exit</Text>

      <Box marginTop={2}>
        <Text color="white">This wizard will help you:</Text>
        <Text color="green">• Set up agent configurations</Text>
        <Text color="green">• Configure tool availability</Text>
        <Text color="green">• Create custom agent definitions</Text>
        <Text color="green">• Export configurations</Text>
      </Box>
    </Box>
  );
};
