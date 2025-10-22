#!/usr/bin/env node

/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */
import { launchManager } from "./commands/index.js";

try {
  console.clear();
  await launchManager();
} catch (error) {
  console.error("Symphony failed with the following error: ", error);
  process.exit(1);
}
