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
  TaskState,
  getContent,
} from "@artinet/sdk";
import { LocalRouter, logger } from "@artinet/router";
import { Session, SessionMessage } from "@artinet/types";
import { AgentLoader } from "../config/index.js";
import { RuntimeAgent } from "../types/index.js";
import { getHistory } from "./history.js";

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
The assistant must always create or update a plan.md file in the current directory with the plan for the tasks.
The assistant must indicate the status of the tasks in the plan.md file and provide its name whenever it updates the plan.md file.
The assistant must always read the plan.md file before starting a new task and update the file with the status of the tasks before taking any other action.
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
    const taskId =
      context.State().task.id ?? context.command.message.taskId ?? uuidv4();
    const contextId =
      context.contextId ?? context.command.message.contextId ?? uuidv4();
    const message: string | undefined = getContent(context.command.message);
    if (!message) {
      logger.error("agent[" + agentName + "]: no message detected");
      const failedEvent: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId: taskId,
        contextId: contextId,
        status: {
          state: TaskState.failed,
          message: {
            kind: "message",
            role: "agent",
            messageId: uuidv4(),
            parts: [{ kind: "text", text: "no message detected" }],
          },
        },
        final: true,
      };
      yield failedEvent;
      return;
    }
    logger.log("agent[" + agentName + "]: message recieved: ", message);
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
    const history: Session = {
      id: taskId,
      messages: getHistory(context.State().task, (message: SessionMessage) => {
        return (
          !message.content.includes("tool_response") &&
          !message.content.includes("agent_response")
        );
      }),
    };
    logger.log("agent[" + agentName + "]: history: ", history);
    logger.log("agent[" + agentName + "]: agents: ", agents);
    //then we connect to the router
    try {
      const responseMessage = await router
        .connect({
          message: {
            identifier: baseAgent.definition.model ?? "deepseek-ai/Deepseek-R1",
            preferredEndpoint: "open-router",
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
