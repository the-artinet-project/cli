/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BaseProps {
  id: string;
}

export type MessageContent = string | React.JSX.Element;
export type MessageView = {
  role: "user" | "agent" | "system";
  content: MessageContent;
  metadata?: Record<string, string>;
};
export type SessionView = MessageView[];
