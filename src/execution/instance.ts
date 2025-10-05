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
    // first we extract the user message
    //todo bug, on first invocation, the incoming message is included in the history.
    //todo on second invocation, the incoming message is NOT included in the history.
    const parts = getParts(context.command.message.parts);
    const message: string =
      parts.text ??
      parts.file.map((file) => file.bytes).join("\n") ??
      parts.data.map((data) => JSON.stringify(data)).join("\n");
    logger.log(
      "agent[" + baseAgent.definition.name + "]: message recieved: ",
      message
    );
    //then we extract the session history
    //the user message is included in the history
    const history: Session = {
      id: context.command.message.taskId ?? undefined,
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
              content.includes("a2a_response") ||
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
    logger.log("agent[" + baseAgent.definition.name + "]: history: ", history);
    let messages: string[] = [];
    const logFunction: (...args: any[]) => void = (...args: any[]) => {
      messages.push(
        args
          .map((arg) => {
            if (typeof arg === "object") {
              return JSON.stringify(arg);
            }
            return arg.toString();
          })
          .join(" ") //hmmm? maybe not needed?
      );
      logger.log(
        "agent[" + baseAgent.definition.name + "]: update recieved: ",
        args
      );
    };
    logger.log("agent[" + baseAgent.definition.name + "]: agents: ", agents);
    let agentCompleted = false;
    //then we connect to the router
    const response = router
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
        callbackFunction: logFunction,
      })
      .catch((error) => {
        logger.error("error calling router: ", error);
        return (
          "error calling agent: " + (error.message ?? JSON.stringify(error))
        );
      })
      .finally(() => {
        agentCompleted = true;
      });

    while (!agentCompleted || messages.length > 0) {
      if (messages.length > 0) {
        logger.log(
          "agent[" + baseAgent.definition.name + "]: yielding update: ",
          messages[0]
        );
        yield {
          kind: "status-update",
          taskId: context.command.message.taskId ?? "",
          contextId: context.command.message.contextId ?? "",
          status: {
            state: TaskState.working,
            message: {
              kind: "message",
              role: "agent",
              messageId: uuidv4(),
              parts: [{ text: messages.shift() ?? "", kind: "text" }],
            },
          },
          final: false,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    const responseText = await response;
    logger.log(
      "agent[" + baseAgent.definition.name + "]: response: ",
      responseText
    );
    //then we yield the final task state
    try {
      const taskHistory: TaskAndHistory = context.events.getState();
      const updateEvent: TaskStatusUpdateEvent = {
        taskId: taskHistory.task.id,
        contextId: context.command.message.contextId ?? "",
        kind: "status-update",
        status: {
          state: "completed",
          message: {
            ...taskHistory.task.status.message,
            messageId: uuidv4(),
            kind: "message",
            role: "agent",
            parts: [
              {
                text: responseText,
                kind: "text",
              },
            ],
          },
        },
        final: true,
      };
      logger.log(
        "agent[" + baseAgent.definition.name + "]: yielding final state: ",
        updateEvent
      );
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
  //if the agent is a lead, we add all members to the router
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
