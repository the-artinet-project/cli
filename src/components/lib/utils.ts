/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

export function createKey(...parts: string[]): string {
  return parts.join("-");
}

export function sanitizeName(name: string): string {
  return name
    .replace(/^"/, "")
    .replace(/"$/, "")
    .replace(/"/g, "")
    .replace("-", " ")
    .replace("_", " ")
    .trim();
}
