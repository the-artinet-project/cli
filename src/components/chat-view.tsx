import { RuntimeAgent } from "../types/index.js";
import { GlobalRouter } from "../global.js";
import { useEffect, useState, memo, useMemo, useCallback } from "react";
import { useInput, Text, Box } from "ink";
import { TextInput, StatusMessage, Alert, Spinner } from "@inkjs/ui";
import { BaseProps } from "./base.js";
import { useInputContext } from "../contexts/InputContext.js";
import { addSession } from "../config/load-sessions.js";
import { v4 as uuidv4 } from "uuid";
import {
  getParts,
  Message,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
} from "@artinet/sdk";
import {
  ToolResponseSchema,
  AgentResponseSchema,
  ToolResponse,
  AgentResponse,
  Session,
} from "@artinet/types";
import { safeParse } from "../utils/parse.js";
import { logger } from "../utils/logger.js";

interface SessionProps extends BaseProps {
  agent: RuntimeAgent;
  sessionId?: string;
  initialSession?: Session;
  onExit?: () => void;
  onReturn?: () => void;
}

const formatMessage = (message: string): React.JSX.Element => {
  if (safeParse(message, ToolResponseSchema).success) {
    const toolResponse: ToolResponse = safeParse(
      message,
      ToolResponseSchema
    ).data;
    return (
      <Box
        flexDirection="column"
        alignSelf="center"
        alignItems="flex-start"
        marginLeft={1}
        columnGap={2}
      >
        <Text color={"grey"} bold italic>
          {"⚙️  " + toolResponse.id} : {toolResponse.name} {"->"}
        </Text>
        <Text backgroundColor={"grey"}>
          {toolResponse.callToolResult.content?.map((content) =>
            content?.type === "text" ? (
              <Text color="whiteBright">
                {content.text.slice(0, 150)}
                {content.text.length > 150 ? "..." : ""}
              </Text>
            ) : undefined
          )}
        </Text>
      </Box>
    );
  } else if (safeParse(message, AgentResponseSchema).success) {
    const a2aResponse: AgentResponse = safeParse(
      message,
      AgentResponseSchema
    ).data;
    return (
      <Box
        flexDirection="column"
        alignSelf="center"
        alignItems="flex-start"
        marginLeft={1}
        columnGap={2}
        rowGap={2}
      >
        <Text color={"grey"} bold italic>
          {"📞 " + a2aResponse.uri} : {a2aResponse.directive.slice(0, 250)}
          {a2aResponse.directive.length > 250 ? "..." : ""} {"->"}
        </Text>
        {a2aResponse.result &&
        a2aResponse.result !== "{}" &&
        a2aResponse.result !== "[]" &&
        a2aResponse.result !== "" ? (
          <Text backgroundColor={"whiteBright"}>
            {a2aResponse.result.slice(0, 500)}
            {a2aResponse.result.length > 500 ? "..." : ""}
          </Text>
        ) : (
          <StatusMessage variant="warning">
            no response from the agent
          </StatusMessage>
        )}
      </Box>
    );
  } else return <Text color="brightWhite">{message}</Text>;
};
const LoadingSpinner = memo(() => (
  <Box marginRight={2}>
    <Spinner type="boxBounce2" />
  </Box>
));

export const Chat: React.FC<SessionProps> = memo(
  ({
    agent,
    // onExit,
    sessionId,
    initialSession,
    onReturn,
    id = "chat",
  }) => {
    const displayName = agent.definition.id
      ?.replace(/^"/, "")
      ?.replace(/"$/, "")
      ?.replace(/"/g, "")
      ?.replace("-", " ")
      ?.replace("_", " ")
      ?.trim();
    const [session, setSession] = useState<
      {
        role: "user" | "agent" | "system";
        content: string | React.JSX.Element;
      }[]
    >(
      initialSession?.messages.map((message) => {
        return {
          role: message.role,
          content: formatMessage(message.content),
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

    // Handle non-text input (escape to exit)
    useInput(
      (_, key) => {
        if (key.escape) {
          onReturn?.();
        }
      },
      { isActive: isActive(id) }
    );

    // Memoize the handleSubmit function to prevent TextInput re-renders
    const handleSubmit = useCallback(
      async (value: string) => {
        if (value.trim()) {
          setSession((currentSession) => [
            ...currentSession,
            { role: "user", content: value.trim() },
          ]);

          let sessionId = taskId;
          if (!sessionId || sessionId === "") {
            sessionId = uuidv4();
            addSession(agent.definition.name, {
              taskId: sessionId,
              timestamp: new Date().toISOString(),
            }).catch((error) => {
              logger.error("Error adding session: ", error);
            });
            setTaskId(sessionId);
          }

          setIsLoading(true);
          try {
            const stream = GlobalRouter?.agents
              ?.getAgent(agent.definition.name)
              ?.streamMessage({
                message: {
                  kind: "message",
                  role: "user",
                  messageId: uuidv4(),
                  taskId: sessionId,
                  contextId: sessionId,
                  parts: [{ kind: "text", text: value.trim() }],
                },
              });

            if (stream) {
              for await (const update of stream) {
                if (update.kind === "task") {
                  continue;
                }
                const parts = getParts(
                  (update as Message)?.parts ??
                    (update as TaskStatusUpdateEvent)?.status?.message?.parts ??
                    (update as TaskArtifactUpdateEvent)?.artifact?.parts ??
                    []
                );

                let content: string | React.JSX.Element = "";
                if (parts.text) {
                  content = formatMessage(parts.text);
                } else if (parts.file) {
                  content = parts.file.map((file) => file.bytes).join("\n");
                } else if (parts.data) {
                  content = parts.data
                    .map((data) => JSON.stringify(data))
                    .join("\n");
                }

                if (
                  content &&
                  content !== "" &&
                  content !== "{}" &&
                  content !== "[]"
                ) {
                  setSession((currentSession) => [
                    ...currentSession,
                    {
                      role: "agent",
                      content: content,
                    },
                  ]);
                  continue;
                }
                await new Promise((resolve) => setTimeout(resolve, 1));
              }
            } else {
              setSession((currentSession) => [
                ...currentSession,
                {
                  role: "system",
                  content: (
                    <Alert variant="error">
                      Failed to get a response from the agent
                    </Alert>
                  ),
                },
              ]);
            }
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
            setIsLoading(false);
          }
        }
      },
      [taskId, agent.definition.name]
    ); // Dependencies for useCallback

    // Stable key for TextInput to prevent remounting
    const inputKey = useMemo(() => `chat-input-${id}`, [id]);

    return (
      <>
        {isActive(id) && (
          <Box flexDirection="column" padding={1} flexGrow={1}>
            <Text color="whiteBright" bold>
              Chat with {displayName}
            </Text>

            <Box marginTop={1} flexDirection="column" rowGap={1}>
              {session.map((message, index) => (
                <Box key={index} flexDirection="row" columnGap={2}>
                  <Text
                    key={message.role + index}
                    color={message.role === "user" ? "grey" : "white"}
                    bold
                    underline={message.role === "user"}
                    italic={message.role === "system"}
                  >
                    {message.role}:
                    {/* {typeof message.content === "string"
                    ? message.role + ":" //only show role for text messages
                    : ""} */}
                  </Text>
                  {typeof message.content === "string" ? (
                    <Text key={"content" + index} color="white">
                      {message.content}
                    </Text>
                  ) : (
                    message.content
                  )}
                </Box>
              ))}
            </Box>

            <Box
              marginTop={1}
              borderStyle="round"
              columnGap={1}
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Box flexDirection="row" columnGap={1}>
                <Text>{">".padStart(2)} </Text>
                <TextInput
                  key={inputKey}
                  defaultValue={""}
                  isDisabled={isLoading}
                  onSubmit={handleSubmit}
                  placeholder="Type your message..."
                />
              </Box>
              {isLoading && <LoadingSpinner />}
            </Box>
            <Box
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              flexGrow={1}
            >
              <Text color="grey" bold>
                *Type your message and Press [Enter] to send. Press [Escape] to
                exit.
              </Text>
            </Box>
          </Box>
        )}
      </>
    );
  }
);
