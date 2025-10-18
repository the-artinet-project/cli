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
import { logger } from "../../utils/logger.js";

const ToElement = memo(
  ({
    baseKey,
    message,
  }: {
    baseKey: string;
    message: MessageView["content"];
  }) => {
    const contentKey = useMemo(() => createKey(baseKey, "content"), [baseKey]);
    if (typeof message === "string") {
      return <Markdown key={contentKey}>{message}</Markdown>;
    }
    return message;
  }
);

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
export const AgentResponse = memo(
  ({ content }: { content: MessageView["content"] }) => {
    const agentResponseContainerKey = useMemo(
      () =>
        createKey("agent-response-container", content.toString().slice(0, 10)),
      []
    );
    return (
      <Box
        flexGrow={0}
        flexShrink={0}
        overflow="hidden"
        key={agentResponseContainerKey}
      >
        <ToElement baseKey="agent-response" message={content} />
      </Box>
    );
  }
);
const SystemMessageMetadata = memo(({ content }: { content: string }) => {
  return (
    <>
      {content.slice(0, 1000).replaceAll("\n", " ")}
      {content?.length && content?.length > 1000 && "..."}
    </>
  );
});
export const SystemMessages = memo(
  ({
    messages,
    createKeyCallback,
  }: {
    messages: MessageView[];
    createKeyCallback: (...parts: string[]) => string;
  }) => {
    const systemMessageKey = useMemo(
      () => createKeyCallback("systemMessage"),
      []
    );
    const systemTileKey = useMemo(() => createKeyCallback("systemTile"), []);
    const metadataKey = useMemo(() => createKeyCallback("metadata"), []);
    const systemMessageMetadataKey = useMemo(
      () => createKeyCallback("systemMessageMetadata"),
      []
    );
    return messages.map((message, index) => (
      <Box
        key={systemMessageKey}
        flexDirection="column"
        rowGap={1}
        overflow="hidden"
        flexShrink={0}
        borderStyle="round"
        borderColor="yellow"
        width="100%"
        justifyContent="center"
      >
        <ToElement baseKey={systemTileKey} message={message.content} />
        {index === messages.length - 1 && canDisplayMetadata(message) && (
          <Markdown key={metadataKey} color="whiteBright">
            <SystemMessageMetadata
              key={systemMessageMetadataKey}
              content={message.metadata?.content || ""}
            />
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
    logger.info("Dashboard", { session, runtimeAgent });
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
    const containerKey = useMemo(() => createKeyCallback("container"), []);
    const displayContainerKey = useMemo(
      () => createKeyCallback("displayContainer"),
      []
    );
    const titleContainerKey = useMemo(
      () => createKeyCallback("titleContainer"),
      []
    );
    const titleKey = useMemo(() => createKeyCallback("title"), []);
    const userMessageContainerKey = useMemo(
      () => createKeyCallback("userMessageContainer"),
      []
    );
    const agentMessageContainerKey = useMemo(
      () => createKeyCallback("agentMessageContainer"),
      []
    );
    const systemMessagesContainerKey = useMemo(
      () => createKeyCallback("systemMessagesContainer"),
      []
    );
    const runtimeAgentContainerKey = useMemo(
      () => createKeyCallback("runtimeAgentContainer"),
      []
    );
    const runtimeAgentKey = useMemo(
      () => createKeyCallback("runtimeAgent"),
      []
    );
    const systemTitleKey = useMemo(() => createKeyCallback("systemTitle"), []);

    const tools = useMemo(
      () =>
        runtimeAgent?.definition.tools
          .join(", ")
          .replaceAll("-", " ")
          .replaceAll("_", " ") || "None",
      [runtimeAgent?.definition.tools]
    );
    const teams = useMemo(
      () =>
        runtimeAgent?.definition.teams
          .map((team) => team.name.replaceAll("-", " ").replaceAll("_", " "))
          .join(", ") || "None",
      [runtimeAgent?.definition.teams]
    );
    return (
      <Box
        key={containerKey}
        flexDirection="row"
        flexShrink={0}
        rowGap={1}
        borderStyle="round"
        borderColor="gray"
        padding={1}
        columnGap={2}
        height="80%"
        width="100%"
        position="relative"
      >
        <Box
          key={displayContainerKey}
          flexDirection="column"
          rowGap={2}
          width="70%"
          overflow="hidden"
          height="100%"
        >
          <Box
            key={titleContainerKey}
            flexDirection="row"
            width="100%"
            columnGap={2}
          >
            <Text key={titleKey} color="whiteBright" bold>
              Dashboard:
            </Text>
            {lastUserMessage && (
              <ToElement
                baseKey={userMessageContainerKey}
                message={lastUserMessage.content}
              />
            )}
          </Box>
          <Spacer />
          <Box
            key={agentMessageContainerKey}
            flexDirection="row"
            columnGap={2}
            alignItems="center"
            width="100%"
            height="100%"
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
          key={systemMessagesContainerKey}
          flexDirection="column"
          rowGap={1}
          width="30%"
          height="100%"
          overflow="hidden"
          alignItems="stretch"
          padding={1}
          flexShrink={0}
          flexGrow={0}
        >
          <Box
            key={runtimeAgentContainerKey}
            borderBottom={true}
            borderLeft={false}
            borderRight={false}
            borderTop={false}
            borderStyle={"classic"}
            paddingBottom={1}
            alignItems="flex-start"
          >
            {runtimeAgent && (
              <Text key={runtimeAgentKey} color="whiteBright" bold>
                Tools: {tools}
                <Newline />
                <Newline />
                Teams: {teams}
              </Text>
            )}
          </Box>
          {lastestSystemMessages && lastestSystemMessages.length !== 0 && (
            <>
              <Text key={systemTitleKey} color="whiteBright" bold>
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
