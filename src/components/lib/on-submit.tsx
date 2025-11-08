/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  State,
  Update,
  getContent,
  SendMessageSuccessResult,
} from "@artinet/sdk";
import { AgentResponse, ToolResponse } from "@artinet/types";
import { GlobalRouter } from "../../global.js";
import { logger } from "../../utils/logger.js";
import { addConfigSession } from "../../config/load-sessions.js";
import { v4 as uuidv4 } from "uuid";
import { Alert } from "@inkjs/ui";
import React from "react";
import { RuntimeAgent } from "../../types/index.js";
import { SessionView } from "./display-types.js";
import { formatMessage } from "./format-message.js";

export async function onSubmit(
  message: string,
  taskId: string | undefined,
  agent: RuntimeAgent,
  setSession: React.Dispatch<React.SetStateAction<SessionView>>,
  setTaskId: React.Dispatch<React.SetStateAction<string | undefined>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  handleEvent: (
    state: State | AgentResponse | ToolResponse | string,
    update: Update
  ) => void
): Promise<void> {
  if (message.trim()) {
    setSession((currentSession) => [
      ...currentSession,
      { role: "user", content: formatMessage(message.trim(), "user") },
    ]);
    let sessionId = taskId;
    if (!sessionId || sessionId === "") {
      sessionId = uuidv4();
      addConfigSession(agent.definition.name, {
        taskId: sessionId,
        timestamp: new Date().toISOString(),
      }).catch((error) => {
        logger.error("processMessage: Error adding session: ", error);
      });
      setTaskId(sessionId);
    }

    setIsLoading(true);
    try {
      GlobalRouter?.on("update", handleEvent);
      const result: SendMessageSuccessResult | null | undefined =
        await GlobalRouter?.agents
          ?.getAgent(agent.definition.name)
          ?.sendMessage({
            message: {
              kind: "message",
              role: "user",
              messageId: uuidv4(),
              taskId: sessionId,
              contextId: sessionId,
              parts: [{ kind: "text", text: message.trim() }],
            },
          })
          .catch((error) => {
            logger.error(
              `processMessage: Error sending message: agent[${agent.definition.name}]: ${error.message}\n`,
              error
            );
            return undefined;
          });
      if (!result) {
        logger.error(
          "onSubmit: No result from agent: " +
            JSON.stringify(agent.definition.name, null, 2)
        );
        throw new Error("No result from agent");
      }
      const content = getContent(result);
      if (!content || content === "" || content === "{}" || content === "[]") {
        logger.error(
          "onSubmit: No content from agent response: " +
            JSON.stringify(result, null, 2)
        );
        throw new Error("No content from agent response");
      }
      setSession((currentSession) => [
        ...currentSession,
        {
          role: "agent",
          content: content,
        },
      ]);
    } catch (error) {
      setSession((currentSession) => [
        ...currentSession,
        {
          role: "system",
          content: (
            <Alert variant="error">
              {error instanceof Error
                ? error.message
                : JSON.stringify(error, null, 2)}
            </Alert>
          ),
        },
      ]);
    } finally {
      GlobalRouter?.off("update", handleEvent);
      setIsLoading(false);
    }
  }
}
