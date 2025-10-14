/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import { RuntimeAgent } from "../types/index.js";
import { useEffect, useState, memo, useCallback, useMemo } from "react";
import { useInput, Text, Box, Spacer /*Spacer*/ } from "ink";
import { TextInput, Spinner } from "@inkjs/ui";
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

interface SessionProps extends BaseProps {
  agent: RuntimeAgent;
  sessionId?: string;
  initialSession?: Session;
  onExit?: () => void;
  onReturn?: () => void;
}

const LoadingSpinner = memo(() => (
  <Box marginRight={2}>
    <Spinner type="boxBounce2" />
  </Box>
));

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
    const { isActive } = useInputContext();

    useEffect(() => {}, [isActive, id, session.length]);
    useInput(
      (_, key) => {
        if (key.escape) {
          onReturn?.();
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

    return (
      <>
        {isActive(id) && (
          <Box flexDirection="column" flexGrow={0} rowGap={1} height="100%">
            {Dashboard(session, agent)}
            <Spacer />
            <Box flexDirection="column" flexGrow={1}>
              <Box
                borderStyle="classic"
                borderLeft={false}
                borderRight={false}
                columnGap={1}
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box flexDirection="row" columnGap={2}>
                  <Text>{">"} </Text>
                  <TextInput
                    key={`chat-input-${session.length}`}
                    isDisabled={isLoading}
                    onChange={undefined}
                    onSubmit={handleSubmit}
                    placeholder="Type your message..."
                  />
                </Box>
                {isLoading && <LoadingSpinner />}
              </Box>
              <Box flexDirection="row" columnGap={2} alignItems="flex-start">
                <Text color="whiteBright" bold>
                  Chatting with {displayName}:
                </Text>
                <Text color="grey" bold>
                  *Type your message and Press [Enter] to send. Press [Escape]
                  to exit.
                </Text>
              </Box>
            </Box>
          </Box>
        )}
      </>
    );
  }
);
