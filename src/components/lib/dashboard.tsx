/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, memo, useMemo } from "react";
import { Box, Newline, Spacer, Text } from "ink";
import { SessionView, MessageView } from "./display-types.js";
import { createKey } from "./utils.js";
import { RuntimeAgent } from "../../types/index.js";
import Markdown from "./markdown-text.js";

function toElement(
  baseKey: string,
  message: MessageView["content"]
): React.JSX.Element {
  if (typeof message === "string") {
    return <Markdown key={createKey(baseKey, "content")}>{message}</Markdown>;
  }
  return message;
}

function canDisplayMetadata(message: MessageView): boolean {
  return (
    (message.metadata &&
      typeof message.metadata === "object" &&
      "kind" in message.metadata &&
      (message.metadata.kind === "agent_response" ||
        message.metadata.kind === "tool_response") &&
      "content" in message.metadata &&
      typeof message.metadata.content === "string") ||
    false
  );
}
const AgentResponse = memo(
  ({ content }: { content: MessageView["content"] }) => {
    return (
      <Box
        flexGrow={0}
        flexShrink={0}
        overflow="hidden"
        key={createKey(
          "agent-response-container",
          content.toString().slice(0, 10)
        )}
      >
        {toElement("agent-response", content)}
      </Box>
    );
  }
);
const SystemMessages = memo(
  ({
    messages,
    createKeyCallback,
  }: {
    messages: MessageView[];
    createKeyCallback: (...parts: string[]) => string;
  }) => {
    return messages.map((message, index) => (
      <Box
        key={createKeyCallback("systemMessage", index.toString())}
        flexDirection="column"
        rowGap={1}
        overflow="hidden"
        flexShrink={0}
        borderStyle="round"
        borderColor="yellow"
        width="100%"
        justifyContent="center"
      >
        {toElement(
          createKeyCallback("systemTile", index.toString()),
          message.content
        )}
        {index === messages.length - 1 && canDisplayMetadata(message) && (
          <Markdown
            key={createKeyCallback("metadata", index.toString())}
            color="whiteBright"
          >
            {message.metadata?.content.slice(0, 1000).replaceAll("\n", " ")}
            {message.metadata?.content?.length &&
              message.metadata?.content?.length > 1000 &&
              "..."}
          </Markdown>
        )}
      </Box>
    ));
  }
);
export const Dashboard = memo(
  ({
    session,
    runtimeAgent,
  }: {
    session: SessionView;
    runtimeAgent?: RuntimeAgent;
  }): React.JSX.Element => {
    const lastAgentMessage = useMemo(
      () => session.filter((message) => message.role === "agent").at(-1),
      [session]
    );
    const lastUserMessage = useMemo(
      () => session.filter((message) => message.role === "user").at(-1),
      [session]
    );
    const lastestSystemMessages = useMemo(
      () =>
        session
          .filter((message) => message.role === "system")
          .reverse()
          .slice(0, 5)
          .reverse(),
      [session]
    );

    const baseKey = useMemo(
      () => createKey("dashboard", session.length.toString()),
      [session.length]
    );

    const createKeyCallback = useCallback(
      (...parts: string[]) => createKey(baseKey, ...parts),
      [baseKey]
    );
    return (
      <Box
        key={createKeyCallback("container")}
        flexDirection="row"
        flexShrink={0}
        rowGap={1}
        borderStyle="round"
        borderColor="gray"
        padding={1}
        columnGap={2}
        height="80%"
      >
        <Box
          key={createKeyCallback("displayContainer")}
          flexDirection="column"
          rowGap={2}
          width="70%"
          overflow="hidden"
          height="100%"
        >
          <Box
            key={createKeyCallback("titleContainer")}
            flexDirection="row"
            columnGap={2}
          >
            <Text key={createKeyCallback("title")} color="whiteBright" bold>
              Dashboard:
            </Text>
            {lastUserMessage &&
              toElement(
                createKeyCallback("userMessage"),
                lastUserMessage.content
              )}
          </Box>
          <Spacer />
          <Box
            key={createKeyCallback("agentMessageContainer")}
            flexDirection="row"
            columnGap={2}
            alignItems="center"
            width="100%"
            justifyContent="flex-start"
          >
            {lastAgentMessage && (
              <AgentResponse content={lastAgentMessage.content} />
            )}
          </Box>
        </Box>
        <Box
          borderStyle="round"
          borderColor="whiteBright"
          key={createKeyCallback("systemContainer")}
          flexDirection="column"
          rowGap={1}
          width="30%"
          overflow="hidden"
          alignItems="stretch"
          padding={1}
        >
          <Box
            key={createKeyCallback("runtimeAgentContainer")}
            borderBottom={true}
            borderLeft={false}
            borderRight={false}
            borderTop={false}
            borderStyle={"classic"}
            paddingBottom={1}
            alignItems="flex-start"
          >
            {runtimeAgent && (
              <Text
                key={createKeyCallback("runtimeAgent")}
                color="whiteBright"
                bold
              >
                Tools:{" "}
                {runtimeAgent.definition.tools
                  .join(", ")
                  .replaceAll("-", " ")
                  .replaceAll("_", " ") || "None"}
                <Newline />
                <Newline />
                Teams:{" "}
                {runtimeAgent.definition.teams
                  .map((team) =>
                    team.name.replaceAll("-", " ").replaceAll("_", " ")
                  )
                  .join(", ") || "None"}
              </Text>
            )}
          </Box>
          {lastestSystemMessages && lastestSystemMessages.length !== 0 && (
            <>
              <Text
                key={createKeyCallback("systemTitle")}
                color="whiteBright"
                bold
              >
                Updates:
              </Text>
              <SystemMessages
                messages={lastestSystemMessages}
                createKeyCallback={createKeyCallback}
              />
            </>
          )}
          <Spacer />
        </Box>
        <Spacer />
      </Box>
    );
  }
);
