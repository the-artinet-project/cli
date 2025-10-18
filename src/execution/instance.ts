/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */
import { v4 as uuidv4 } from "uuid";
import {
  AgentEngine,
  Context,
  TaskAndHistory,
  TaskStatusUpdateEvent,
  getParts,
  Message,
  TaskState,
} from "@artinet/sdk";
import { LocalRouter, logger } from "@artinet/router";
import { Session } from "@artinet/types";
import { AgentLoader } from "../config/index.js";
import { RuntimeAgent } from "../types/index.js";

function fullAgentPrompt(basePrompt: string, userMessage: string): string {
  return `
The assistant must follow these instructions exactly and never deviate from them:

${basePrompt}

The assistant must use the above instructions to generate a response to the following user message:

${userMessage}

The assistant must use whatever tools or agents that are available to fulfill the users request exactly.
The assistant must reason step by step and think carefully about how to best fulfill the users request.
The assistant must always check the allowed directories and files before reading or writing any files and never assume anything about the file system.
If the assistant cannot find a file or directory, the assistant must ask the user for clarification.
The assistant must always check and read files before editing them.
The assistmant must always check previous responses before providing a new response to ensure that the assistant is not repeating itself and calling tools and agents unnecessarily.
The assistant must avoid recursive calls whenever possible.
`;
}

function createRoutedExecutor(
  router: LocalRouter,
  baseAgent: RuntimeAgent,
  agents: string[]
): AgentEngine {
  const agentExecutor: AgentEngine = async function* (context: Context) {
    logger.log("agent[" + baseAgent.definition.name + "]: starting");
    const agentName: string = baseAgent.definition.name;
    // first we extract the user message
    //todo bug, on first invocation, the incoming message is included in the history.
    //todo on second invocation, the incoming message is NOT included in the history(may be an sdk bug).
    const parts = getParts(context.command.message.parts);
    const message: string =
      parts.text ??
      parts.file.map((file) => file.bytes).join("\n") ??
      parts.data.map((data) => JSON.stringify(data)).join("\n");
    logger.log("agent[" + agentName + "]: message recieved: ", message);
    const taskId =
      context.State().task.id ?? context.command.message.taskId ?? uuidv4();
    const contextId =
      context.contextId ?? context.command.message.contextId ?? uuidv4();
    logger.log("agent[" + agentName + "]: taskId: ", taskId);
    logger.log("agent[" + agentName + "]: contextId: ", contextId);
    yield {
      kind: "status-update",
      taskId: taskId,
      contextId: contextId,
      status: {
        state: TaskState.submitted,
        message: context.command.message,
        timestamp: new Date().toISOString(),
      },
      final: false,
    };
    //then we extract the session history
    //the user message is included in the history
    const history: Session = {
      id: taskId,
      messages:
        context
          .State()
          .task.history?.map((msg: Message) => {
            const parts = getParts(msg.parts);
            const content =
              parts.text ??
              parts.file.map((file) => file.bytes).join("\n") ??
              parts.data.map((data) => JSON.stringify(data)).join("\n");
            if (
              content.includes("tool_response") ||
              content.includes("agent_response") ||
              content === "" ||
              content === "{}" ||
              content === "[]" ||
              content === message
            ) {
              return { __skip: true } as any;
            }
            return {
              role: msg.role,
              content: content,
            };
          })
          .filter((item) => !(item as any).__skip) ?? [],
    };
    logger.log("agent[" + agentName + "]: history: ", history);
    logger.log("agent[" + agentName + "]: agents: ", agents);
    //then we connect to the router
    const responseMessage = await router
      .connect({
        message: {
          identifier:
            baseAgent.definition.model ??
            "0xf7dcee219e1a4027191508511c99ea64fe7202c71df416b5e5ed03cc2e6b386f",
          preferredEndpoint: "hf-inference",
          session: {
            ...history,
            messages: [
              {
                role: "system",
                content: fullAgentPrompt(baseAgent.prompt, message),
              },
              ...history.messages,
              { role: "user", content: message },
            ],
          },
          options: {
            isAuthRequired: false,
            isFallbackAllowed: false,
          },
        },
        tools: baseAgent.definition.tools,
        agents: agents,
        options: {
          taskId: taskId,
          abortSignal: context.signal,
        },
      })
      .catch((error) => {
        logger.error("error calling router: ", error);
        return (
          "error calling agent: " + (error.message ?? JSON.stringify(error))
        );
      });
    logger.log("agent[" + agentName + "]: response: ", responseMessage);

    //then we yield the final task state
    try {
      const taskHistory: TaskAndHistory = context.State();
      const updateEvent: TaskStatusUpdateEvent = {
        taskId: taskId,
        contextId: contextId,
        kind: "status-update",
        status: {
          state: TaskState.completed,
          message: {
            ...taskHistory.task.status.message,
            messageId: uuidv4(),
            kind: "message",
            role: "agent",
            parts: [
              {
                text: responseMessage,
                kind: "text",
              },
            ],
          },
        },
        final: true,
      };
      yield updateEvent;
    } catch (error) {
      logger.error("error getting state: ", error);
    }
    return;
  };
  return agentExecutor;
}

export function createAgentExecutor(
  loader: AgentLoader,
  router: LocalRouter,
  baseAgent: RuntimeAgent
): AgentEngine {
  //if the agent is a lead, we add all team members to the router
  const teamLead: string[] =
    baseAgent.definition.teams
      .filter((team) => team.role === "lead")
      .map((team) => team.name) ?? [];
  let agents: string[] = [];
  teamLead.forEach((team) => {
    loader.teams[team].memberIds.forEach((member) => {
      if (member === baseAgent.definition.id) return;
      agents.push(member);
    });
  });
  return createRoutedExecutor(router, baseAgent, agents);
}

export function createCoreAgentExecutor(
  loader: AgentLoader,
  router: LocalRouter,
  baseAgent: RuntimeAgent
): AgentEngine {
  //we extract all team leads
  let agents: string[] = [];
  Object.values(loader.teams).forEach((team) => {
    if (team.leadId) {
      agents.push(team.leadId);
    }
  });
  return createRoutedExecutor(router, baseAgent, agents);
}
