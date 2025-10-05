/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */
import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { App } from "../components/app.js";
import { InputProvider } from "../contexts/InputContext.js";

export const launchManager = async () => {
  const { waitUntilExit } = render(
    React.createElement(InputProvider, null, React.createElement(App))
  );
  await waitUntilExit();
};

export const managerCommand = new Command("manager")
  .description("Launch the Agent Manager")
  .action(async () => {
    await launchManager();
  });
