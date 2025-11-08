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
import { formatMessage } from "./format-message.js";
import { Static } from "ink";

const ToElement = memo(
  ({
    message,
    role,
    fullMessage,
  }: {
    message: MessageView["content"];
    role?: "user" | "agent" | "system";
    fullMessage?: boolean;
  }) => {
    if (typeof message === "string") {
      return <>{formatMessage(message, role, fullMessage)}</>;
    }
    return <>{message}</>;
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
  ({
    content,
    index,
    fullMessage,
  }: {
    content: MessageView["content"];
    index?: number;
    fullMessage?: boolean;
  }) => {
    const agentResponseContainerKey = useMemo(
      () =>
        createKey(
          "agent-response-container",
          content.toString().slice(0, 10) + (index?.toString() || "")
        ),
      [content]
    );
    return (
      <Box
        flexGrow={1}
        flexShrink={1}
        overflow="hidden"
        key={agentResponseContainerKey}
      >
        <ToElement message={content} role="agent" fullMessage={fullMessage} />
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

const SystemMessage = memo(
  ({
    index,
    message,
    showMetadata,
    createKeyCallback,
  }: {
    index: number;
    message: MessageView;
    showMetadata: boolean;
    createKeyCallback: (...parts: string[]) => string;
  }) => {
    const systemMessageKey = useCallback(
      (ext: string | number) =>
        createKeyCallback("systemMessage", ext.toString()),
      []
    );
    const metadataKey = useMemo(() => createKeyCallback("metadata"), []);
    const systemMessageMetadataKey = useCallback(
      (ext: string | number) =>
        createKeyCallback("systemMessageMetadata", ext.toString()),
      []
    );
    return (
      <Box
        key={systemMessageKey(index)}
        flexDirection="column"
        rowGap={1}
        overflow="hidden"
        flexShrink={0}
        borderStyle="round"
        borderColor="yellow"
        width="100%"
        justifyContent="center"
      >
        <ToElement message={message.content} role="system" />
        {showMetadata && canDisplayMetadata(message) && (
          <>
            <Markdown key={metadataKey} color="whiteBright">
              <SystemMessageMetadata
                key={systemMessageMetadataKey(index)}
                content={message.metadata?.content || ""}
              />
            </Markdown>
          </>
        )}
      </Box>
    );
  }
);

const UserResponse = memo(({ message }: { message: MessageView }) => {
  return <ToElement message={message.content} role="user" fullMessage={true} />;
});

export const SystemMessages = memo(
  ({
    messages,
    createKeyCallback,
  }: {
    messages: MessageView[];
    createKeyCallback: (...parts: string[]) => string;
  }) => {
    const systemMessageKey = useCallback(
      (ext: string | number) =>
        createKeyCallback("systemMessage", ext.toString()),
      []
    );
    const metadataKey = useMemo(() => createKeyCallback("metadata"), []);
    const systemMessageMetadataKey = useCallback(
      (ext: string | number) =>
        createKeyCallback("systemMessageMetadata", ext.toString()),
      []
    );
    return messages.map((message, index) => (
      <Box
        key={systemMessageKey(index)}
        flexDirection="column"
        rowGap={1}
        overflow="hidden"
        flexShrink={0}
        borderStyle="round"
        borderColor="yellow"
        width="100%"
        justifyContent="center"
      >
        <ToElement message={message.content} />
        {index === messages.length - 1 && canDisplayMetadata(message) && (
          <>
            <Markdown key={metadataKey} color="whiteBright">
              <SystemMessageMetadata
                key={systemMessageMetadataKey(index)}
                content={message.metadata?.content || ""}
              />
            </Markdown>
          </>
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
          .reverse() ?? [
          {
            role: "system",
            content:
              "*You are now chatting with " +
              runtimeAgent?.definition.name +
              "*",
          },
        ],
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
      <>
        <Box
          key={containerKey}
          flexDirection="row"
          flexGrow={2}
          flexShrink={0}
          rowGap={1}
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
                <ToElement message={lastUserMessage.content} />
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
      </>
    );
  }
);

export const ChatSessionView = memo(
  ({ session }: { session: SessionView }): React.JSX.Element => {
    const baseKey = useMemo(
      () => createKey("chat-session-view", session.length.toString()),
      [session.length]
    );

    const createKeyCallback = useCallback(
      (...parts: string[]) => createKey(baseKey, ...parts),
      [baseKey]
    );
    const containerKey = useMemo(() => createKeyCallback("container"), []);
    const messageContainerKey = useMemo(
      () => createKeyCallback("messageContainer"),
      []
    );
    return (
      <Box key={containerKey} flexShrink={0}>
        <Static
          key={messageContainerKey}
          items={session}
          style={{
            flexGrow: 2,
            rowGap: 1,
            overflow: "hidden",
          }}
          children={(message: MessageView, index: number) => {
            return (
              <Box
                key={createKeyCallback("message", index.toString())}
                marginBottom={1}
                width="100%"
                alignItems="center"
                justifyContent="center"
              >
                <Box
                  flexGrow={1}
                  flexShrink={0}
                  width="80%"
                  flexWrap="wrap"
                  alignItems={
                    message.role === "user"
                      ? "flex-end"
                      : message.role === "agent"
                      ? "flex-start"
                      : "stretch"
                  }
                  justifyContent="center"
                >
                  {message.role === "agent" ? (
                    <AgentResponse content={message.content} />
                  ) : message.role === "system" ? (
                    <SystemMessage
                      index={index}
                      message={message}
                      showMetadata={index === session.length - 1}
                      createKeyCallback={createKeyCallback}
                    />
                  ) : (
                    <UserResponse message={message} />
                  )}
                </Box>
              </Box>
            );
          }}
        />
      </Box>
    );
  }
);
