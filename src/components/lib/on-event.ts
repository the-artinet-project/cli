/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Update,
  State,
  Message,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  Task,
  TaskAndHistory,
} from "@artinet/sdk";
import { AgentResponse, ToolResponse } from "@artinet/types";
import { logger } from "../../utils/logger.js";
import { getParts } from "@artinet/sdk";
import {
  createToolMessage,
  createAgentMessage,
  formatMessage,
  extractResultContent,
} from "./format-message.js";
import { SessionView } from "./display-types.js";

export function onEvent({
  state,
  update,
  setSession,
}: {
  state: State | AgentResponse | ToolResponse | string;
  update: Update;
  setSession: React.Dispatch<React.SetStateAction<SessionView>>;
}) {
  // logger.log("onEvent", JSON.stringify({ state, update }, null, 2));
  try {
    if (!state && !update) {
      return;
    }
    if (
      update &&
      update.kind === "task" &&
      (update as Task)?.status?.state === "completed"
    ) {
      return;
    }
    //this may be a final state update so we can ignore it
    if (state && (state as TaskAndHistory)?.task && !update) {
      return;
    }

    let content: string | React.JSX.Element = "";
    let role: "user" | "agent" | "system" = "agent";
    let metadata: Record<string, string> = {};
    if (typeof state === "string") {
      content = formatMessage(state);
    } else if (
      "kind" in state &&
      (state.kind === "agent_response" || state.kind === "tool_response")
    ) {
      //special case for sequentialthinking tool response
      if (
        state.kind === "tool_response" &&
        state.name === "sequentialthinking"
      ) {
        if (!extractResultContent(state).includes("💭")) {
          return;
        } else {
          content = createToolMessage(state);
          metadata = {
            kind: state.kind,
            content: extractResultContent(state)
              .replaceAll("|", "")
              .replaceAll("─", "")
              .replaceAll("├", "")
              .replaceAll("┤", "")
              .replaceAll("┴", "")
              .replaceAll("┬", "")
              .replaceAll("┌", "")
              .replaceAll("┐", "")
              .replaceAll("└", "")
              .replaceAll("┘", "")
              .replaceAll("┼", "")
              .replaceAll("│", "")
              .trim(),
          };
          role = "system";
        }
      } else {
        content =
          state.kind === "agent_response"
            ? createAgentMessage(state)
            : createToolMessage(state);
        metadata = {
          kind: state.kind,
          content: extractResultContent(state),
        };
        role = "system";
      }
    } else if (
      update &&
      (update as TaskStatusUpdateEvent)?.status?.state !== "completed"
    ) {
      const _updateRole =
        (update as TaskStatusUpdateEvent)?.status?.message?.role ??
        (update as Message)?.role ??
        "agent";
      if (_updateRole === "user") {
        return;
      }
      const parts = getParts(
        (update as Message)?.parts ??
          (update as TaskStatusUpdateEvent)?.status?.message?.parts ??
          (update as TaskArtifactUpdateEvent)?.artifact?.parts ??
          []
      );

      if (parts.text) {
        content = formatMessage(parts.text);
      } else if (parts.file) {
        content = parts.file.map((file) => file.bytes).join("\n");
      } else if (parts.data) {
        content = parts.data.map((data) => JSON.stringify(data)).join("\n");
      }
    }
    if (content && content !== "" && content !== "{}" && content !== "[]") {
      setSession((currentSession) => {
        return [
          ...currentSession,
          {
            role: role,
            content: content,
            metadata: metadata,
          },
        ];
      });
    }
  } catch (error) {
    //The update handler is called on every update
    //So we don't want to throw an error
    //Stop the agent/tool from executing the next step
    //todo set a system message in the session to inform the user that the agent/tool has errored
    logger.error(
      `processUpdate: Error processing update: ${
        error instanceof Error ? error.message : JSON.stringify(error)
      }\n`,
      error
    );
  }
}
