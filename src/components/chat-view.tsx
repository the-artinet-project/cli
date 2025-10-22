/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import { RuntimeAgent } from "../types/index.js";
import { useState, memo, useCallback, useMemo, useEffect } from "react";
import { useInput, Box, Spacer } from "ink";
import { BaseProps } from "./lib/index.js";
import { useInputContext } from "../contexts/InputContext.js";
import { State, Update } from "@artinet/sdk";
import { ToolResponse, AgentResponse, Session } from "@artinet/types";
import {
  onEvent,
  formatMessage,
  onSubmit,
  sanitizeName,
  SessionView,
  Dashboard,
} from "./lib/index.js";
import { ChatInput } from "./lib/chat-input.js";

interface SessionProps extends BaseProps {
  agent: RuntimeAgent;
  sessionId?: string;
  initialSession?: Session;
  onExit?: () => void;
  onReturn?: () => void;
}

export const Chat: React.FC<SessionProps> = memo(
  ({ agent, sessionId, initialSession, onReturn, id = "chat" }) => {
    const displayName = useMemo(
      () => sanitizeName(agent.definition.name),
      [agent.definition.name]
    );
    const [session, setSession] = useState<SessionView>(
      initialSession?.messages.map((message) => {
        return {
          role: message.role,
          content: formatMessage(message.content, message.role),
        };
      }) ?? [
        {
          role: "system",
          content: "*You are now chatting with " + displayName + "*",
        },
      ]
    );

    const [taskId, setTaskId] = useState<string | undefined>(sessionId);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [continueButton, setContinueButton] = useState<boolean>(false);
    const { isActive } = useInputContext();

    useEffect(() => {
      if (session.at(-1)?.role === "agent") {
        setContinueButton(true);
      }
    }, [session.length]);

    useInput(
      (_, key) => {
        if (key.escape) {
          onReturn?.();
        } else if (key.ctrl && key.rightArrow) {
          handleSubmit("Please continue...");
        }
      },
      { isActive: isActive(id) }
    );

    const handleEvent = useCallback(
      (
        state: State | AgentResponse | ToolResponse | string,
        update: Update
      ) => {
        onEvent({ state, update, setSession });
      },
      []
    );

    const handleSubmit = useCallback(
      (value: string) =>
        onSubmit(
          value,
          taskId,
          agent,
          setSession,
          setTaskId,
          setIsLoading,
          handleEvent
        ),
      [taskId, agent, handleEvent]
    );
    const chatInputProps = useMemo(
      () => ({
        displayName,
        sessionLength: session.length,
        isDisabled: isLoading,
        continueButton,
      }),
      [displayName, session.length, isLoading, continueButton]
    );
    const chatInputContainerKey = useMemo(
      () => `chat-input-container-${session.length.toString()}`,
      [session.length]
    );
    return (
      <>
        {isActive(id) && (
          <>
            <Spacer />
            <Box
              key={chatInputContainerKey}
              flexDirection="column"
              flexGrow={2}
              rowGap={1}
              height="100%"
              width="100%"
            >
              <Dashboard session={session} runtimeAgent={agent} />
              <ChatInput {...chatInputProps} onSubmit={handleSubmit} />
            </Box>
            <Spacer />
          </>
        )}
      </>
    );
  }
);
