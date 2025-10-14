/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { AgentSession, RuntimeAgent } from "../types/index.js";
import { getSessions } from "../config/load-sessions.js";
import { BaseProps } from "./lib/index.js";
import { useInputContext } from "../contexts/InputContext.js";
import { Select } from "@inkjs/ui";

interface ChatSessionViewProps extends BaseProps {
  agent: RuntimeAgent;
  onSelect: (taskId: string | undefined) => void;
  onExit: () => void;
}

export const ChatSessionView: React.FC<ChatSessionViewProps> = ({
  agent,
  onSelect,
  onExit,
  id = "chat-sessions",
}) => {
  const [sessions, setSessions] = useState<AgentSession[]>([]);

  const getSessionsList = async () => {
    const sessions = await getSessions(agent.definition.name ?? "");
    return Object.values(sessions || {});
  };

  const { isActive } = useInputContext();

  useEffect(() => {
    getSessionsList().then((_sessions) => {
      if (_sessions.length === 0) {
        onExit?.();
      }
      setSessions(_sessions);
    });
  }, [isActive, id]);

  useInput(
    (input, key) => {
      if (input === "q" || key.escape) {
        if (onExit) {
          onExit();
        }
      }
    },
    { isActive: isActive(id) }
  );

  return (
    <>
      {isActive(id) && (
        <Box
          flexDirection="column"
          padding={1}
          borderStyle="round"
          borderColor="blackBright"
          flexWrap="nowrap"
        >
          <Text color="whiteBright" bold>
            📚 {agent.definition.name} chat sessions [{sessions.length}]
          </Text>

          <Box marginTop={1} flexDirection="column" columnGap={2} rowGap={1}>
            {isActive(id) && (
              <Box flexDirection="column" columnGap={2} rowGap={1}>
                <Select
                  defaultValue={`sessions-agent-${agent.definition.name}`}
                  options={sessions.map((session: AgentSession) => ({
                    label:
                      "Started @ " +
                      new Date(session.timestamp).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "numeric",
                      }) +
                      " " +
                      new Date(session.timestamp).toLocaleDateString("en-US"),
                    value: session.taskId,
                  }))}
                  highlightText="blackBright"
                  onChange={(value) => {
                    onSelect?.(value);
                  }}
                  isDisabled={!isActive(id)}
                />
                <Text color="gray">
                  use ↑/↓ to navigate, [enter] to load a previous session, or
                  [q] to start a new chat
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </>
  );
};
