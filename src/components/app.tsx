/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import React, { useState, useCallback, useMemo } from "react";
import { Session } from "@artinet/types";
import { Box, Text, useInput, useApp } from "ink";
import { RuntimeAgent, Team } from "../types/index.js";
import {
  GlobalAgents,
  GlobalTeams,
  GlobalTools,
  GlobalSessions,
} from "../global.js";
import { AgentView } from "./agent-view.js";
import { TeamView } from "./team-view.js";
import { Chat } from "./chat-view.js";
import { ChatSessionView } from "./chat-session-view.js";
import { useInputContext } from "../contexts/InputContext.js";
import { ToolView } from "./tool-view.js";
import { Select } from "@inkjs/ui";
import { TaskAndHistory, getParts } from "@artinet/sdk";
import { configManager } from "../config/manager.js";

function Item({ id, label }: { id: string; label: string }) {
  const { isActive } = useInputContext();
  return <>{isActive(id) && <Text>{label}</Text>}</>;
}

async function getInitialSession(taskId: string): Promise<Session | undefined> {
  const task: TaskAndHistory | undefined = await GlobalSessions?.getState(
    taskId
  );
  if (
    !task ||
    !task.task ||
    !task.task.history ||
    task.task.history.length === 0
  ) {
    return undefined;
  }
  const session: Session = {
    id: taskId,
    messages: task.task.history
      .map((message) => {
        if (
          message.role === "user" ||
          message.role === "agent" ||
          message.role === "system"
        ) {
          return {
            role: message.role,
            content:
              getParts(message.parts).text ??
              getParts(message.parts)
                .file.map((file) => file.bytes)
                .join("\n") ??
              getParts(message.parts)
                .data.map((data) => JSON.stringify(data))
                .join("\n"),
          };
        }
        return undefined;
      })
      .filter((message) => message !== undefined),
  };
  return session;
}

export const App: React.FC = () => {
  const [agents] = useState<Record<string, RuntimeAgent>>(GlobalAgents || {});
  const [teams] = useState<Team[]>(Object.values(GlobalTeams || {}));
  const [tools] = useState<StdioServerParameters[]>(
    Object.values(GlobalTools || {})
  );
  const [selectedAgent, setSelectedAgent] = useState<RuntimeAgent>(
    Object.values(GlobalAgents || {})[0]
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    undefined
  );
  const [initialSession, setInitialSession] = useState<Session | undefined>(
    undefined
  );
  const { exit } = useApp();
  const { setActiveComponent, isActive } = useInputContext();

  //todo rerun loadAgents & Tools etc
  // const loadData = async () => {
  //   try {
  //     setActiveComponent("loading-spinner");
  //   } catch (err) {
  //     setActiveComponent("agent-list");
  //   }
  // };

  const returnToCommon = useCallback(() => {
    setActiveComponent("app");
  }, [setActiveComponent]);

  const switchToComponent = useCallback(
    (componentId: string) => {
      setActiveComponent(componentId);
    },
    [setActiveComponent]
  );

  useInput(
    (input, key) => {
      if (input === "1") {
        switchToComponent("agent-list");
        return;
      } else if (input === "2") {
        switchToComponent("team-view");
        return;
      } else if (input === "3") {
        switchToComponent("tool-view");
        return;
      } else if (input === "r" && key.ctrl) {
        // loadData();
        // return;
      } else if (input === "q" || key.escape) {
        exit();
        return;
      }
    },
    { isActive: isActive("app") }
  );

  const handleChatReturn = useCallback(() => {
    setInitialSession(undefined);
    setSelectedTaskId(undefined);
    returnToCommon();
  }, [returnToCommon]);
  const handleAgentSelect = useCallback(
    (agent: RuntimeAgent) => {
      if (agent) {
        setSelectedAgent(agent);
        setSelectedTaskId(undefined);
        setInitialSession(undefined);
        switchToComponent("chat-sessions");
      }
    },
    [switchToComponent]
  );

  const handleTeamSelect = useCallback(
    (team: Team) => {
      if (team.leadId) {
        setSelectedAgent(agents[team.leadId]);
        setSelectedTaskId("");
        setInitialSession(undefined);
        switchToComponent("chat-sessions");
      }
    },
    [agents, switchToComponent]
  );

  const handleSessionSelect = useCallback(
    async (taskId: string | undefined) => {
      if (taskId) {
        setSelectedTaskId(taskId);
        setInitialSession(await getInitialSession(taskId));
        switchToComponent("chat");
      } else {
        setSelectedTaskId(undefined);
        setInitialSession(undefined);
        switchToComponent("chat");
      }
    },
    [switchToComponent]
  );

  const handleSessionExit = useCallback(() => {
    setInitialSession(undefined);
    setSelectedTaskId(undefined);
    switchToComponent("chat");
  }, [switchToComponent]);

  const renderHeader = useMemo(() => {
    return (
      <Box
        flexDirection="column"
        padding={1}
        borderStyle="doubleSingle"
        borderColor="blackBright"
        flexWrap="nowrap"
      >
        <Text color="whiteBright" bold>
          👩 Symphony
        </Text>

        <Box marginTop={1} flexDirection="column" columnGap={2} rowGap={1}>
          {isActive("app") && (
            <Box flexDirection="column" columnGap={2} rowGap={1}>
              <Text color="gray" bold={true} underline={true} italic={true}>
                Main Menu:
              </Text>
              <Select
                defaultValue="app"
                options={[
                  { label: "Agents", value: "agent-list" },
                  { label: "Teams", value: "team-view" },
                  { label: "Tools", value: "tool-view" },
                ]}
                highlightText="blackBright"
                onChange={(value: string) => {
                  switch (value) {
                    case "agent-list":
                      switchToComponent("agent-list");
                      break;
                    case "team-view":
                      switchToComponent("team-view");
                      break;
                    case "tool-view":
                      switchToComponent("tool-view");
                      break;
                    default:
                      switchToComponent("app");
                      break;
                  }
                  return;
                }}
                isDisabled={!isActive("app")}
              />
              <Text color="gray">
                Use the ↑/↓ keys to navigate, Press [Enter] to select an option,
                & Press [Q] to exit.
              </Text>
            </Box>
          )}
          <Box flexDirection="row" columnGap={2}>
            <Text color="gray">Agents: ( {Object.keys(agents).length} )</Text>
            <Text color="gray">Teams: ( {teams.length} )</Text>
            <Text color="gray">Tools: ( {tools.length} )</Text>
          </Box>
        </Box>
      </Box>
    );
  }, [agents, teams, tools, isActive("app")]);

  const configDir = useMemo(
    () => configManager.getUserConfigDir(),
    [configManager]
  );
  return (
    <Box
      key="app-container"
      flexDirection="column"
      height="100%"
      flexGrow={2}
      flexShrink={0}
    >
      {!isActive("chat") && renderHeader}
      <Box
        key="app-components-container"
        flexGrow={2}
        flexShrink={0}
        marginTop={1}
      >
        {isActive("app") && (
          <Box
            key="app-details"
            flexDirection="row"
            columnGap={2}
            rowGap={1}
            justifyContent="flex-start"
            alignSelf="flex-start"
          >
            <Item id="app" label="Agents: select an agent to chat with" />
            <Text color="gray">|</Text>
            <Item id="app" label="Teams: browse teams" />
            <Text color="gray">|</Text>
            <Item id="app" label="Tools: view available tools" />
            <Text color="gray">|</Text>
            <Item id="app" label={`Config: ${configDir}`} />
          </Box>
        )}
        {isActive("agent-list") && (
          <AgentView
            key={`agent-list`}
            title={`Agents`}
            onSelect={handleAgentSelect}
            onExit={returnToCommon}
            id="agent-list"
          />
        )}
        {isActive("chat") && (
          <Chat
            key={`chat`}
            agent={selectedAgent}
            sessionId={selectedTaskId}
            initialSession={initialSession}
            onReturn={handleChatReturn}
            id="chat"
          />
        )}
        {isActive("team-view") && (
          <TeamView
            key={`team-view`}
            teams={teams}
            title={`Teams`}
            onSelect={handleTeamSelect}
            onExit={returnToCommon}
            id="team-view"
          />
        )}
        {isActive("tool-view") && (
          <ToolView
            key={`tool-view`}
            title={`Tools`}
            onExit={returnToCommon}
            id="tool-view"
          />
        )}
        {isActive("chat-sessions") && (
          <ChatSessionView
            key={`chat-sessions`}
            agent={selectedAgent}
            onSelect={handleSessionSelect}
            onExit={handleSessionExit}
            id="chat-sessions"
          />
        )}
      </Box>
    </Box>
  );
};
