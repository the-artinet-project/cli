/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolResponse, ToolResponseSchema } from "@artinet/types";
import { safeParse } from "../../utils/parse.js";
import { Box, Text } from "ink";
import { AgentResponse, AgentResponseSchema } from "@artinet/types";
import { MessageView } from "./display-types.js";
import { createKey } from "./utils.js";
import Markdown from "./markdown-text.js";
import { logger } from "@artinet/router";

export function extractResultContent(
  response: AgentResponse | ToolResponse
): string {
  if (AgentResponseSchema.safeParse(response).success) {
    return (response as AgentResponse).result;
  } else if (ToolResponseSchema.safeParse(response).success) {
    const result = (response as ToolResponse).callToolResult.content
      .map((content) => content.text)
      .join("\n");
    return result;
  }
  return "";
}

export const createToolMessage = (
  toolResponse: ToolResponse
): MessageView["content"] => {
  const baseKey = createKey(
    toolResponse.id.slice(0, 10),
    toolResponse.name.slice(0, 10),
    new Date().getTime().toString()
  );
  return (
    <Box
      key={createKey("container", baseKey)}
      flexDirection="column"
      overflow="hidden"
      alignItems="flex-start"
      marginLeft={1}
      columnGap={2}
    >
      <Text
        key={createKey("uri", baseKey)}
        color={"grey"}
        bold
        italic
        wrap="truncate"
      >
        {`🔧 ${toolResponse.name.replaceAll("-", " ").replaceAll("_", " ")} `}
      </Text>
    </Box>
  );
};

export const createAgentMessage = (
  agentResponse: AgentResponse
): MessageView["content"] => {
  const baseKey = createKey(
    agentResponse.uri.slice(0, 10),
    agentResponse.directive.slice(0, 10),
    new Date().getTime().toString()
  );
  return (
    <Box
      key={createKey("container", baseKey)}
      flexDirection="column"
      overflow="hidden"
      alignItems="flex-start"
      marginLeft={1}
      columnGap={2}
    >
      <Text
        key={createKey("uri", baseKey)}
        color={"grey"}
        bold
        italic
        wrap="truncate"
      >
        {`📞 ${agentResponse.uri.replaceAll("-", " ").replaceAll("_", " ")} `}
      </Text>
    </Box>
  );
};

export const formatMessage = (
  message: string,
  role?: "user" | "agent" | "system",
  fullMessage: boolean = false
): MessageView["content"] => {
  try {
    if (safeParse(message, ToolResponseSchema).success) {
      logger.log("formatMessage: ToolResponse: ", message);
      const toolResponse: ToolResponse = safeParse(
        message,
        ToolResponseSchema
      ).data;
      return createToolMessage(toolResponse);
    } else if (safeParse(message, AgentResponseSchema).success) {
      logger.log("formatMessage: AgentResponse: ", message);
      const a2aResponse: AgentResponse = safeParse(
        message,
        AgentResponseSchema
      ).data;
      return createAgentMessage(a2aResponse);
    } else if (typeof message === "string") {
      const isUser = role === "user";
      return (
        <Markdown
          italic={isUser}
          underline={isUser}
          key={createKey("message", message.slice(0, 10))}
          color="brightWhite"
        >
          {`${
            fullMessage
              ? message
              : message.slice(0, 3125).trim() +
                (message.length > 3125 ? "..." : "")
          }`}
        </Markdown>
      );
    } else {
      return <Text color="white">{JSON.stringify(message)}</Text>;
    }
  } catch (error) {
    logger.error("formatMessage: Error formatting message: ", error);
    return <Text color="white">{message}</Text>;
  }
};
