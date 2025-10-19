/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Box, Newline, Text, useInput } from "ink";
import { StatusMessage } from "@inkjs/ui";
import { Team } from "../types/index.js";
import { BaseProps } from "./lib/index.js";
import { useInputContext } from "../contexts/InputContext.js";

interface TeamViewProps extends BaseProps {
  teams: Team[];
  onSelect?: (team: Team) => void;
  onExit?: () => void;
  title?: string;
}

export const TeamView: React.FC<TeamViewProps> = ({
  teams,
  onSelect,
  onExit,
  title = "Team List",
  id = "team-view",
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { isActive } = useInputContext();
  useEffect(() => {}, [isActive, id]);
  useInput(
    (input, key) => {
      if (key.upArrow) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (key.downArrow) {
        setSelectedIndex(Math.min(teams.length - 1, selectedIndex + 1));
      } else if (key.return && onSelect) {
        onSelect(teams[selectedIndex]);
      } else if (input === "q" || key.escape) {
        if (onExit) {
          onExit();
        }
      }
    },
    { isActive: isActive(id) }
  );

  if (teams.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">no teams found</Text>
        <Text color="gray">press [q] to return to the main menu</Text>
      </Box>
    );
  }

  return (
    <>
      {isActive(id) && (
        <Box flexDirection="column" padding={1}>
          <Text color="brightWhite" bold>
            {title} [{teams.length} team(s)]
          </Text>
          <Text color="gray">
            use ↑/↓ to navigate, [enter] to select, [q] to return to the main
            menu
          </Text>

          <Box marginTop={1} flexDirection="column">
            {teams
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((team, index) => {
                const isSelected = index === selectedIndex;
                const totalMembers = team.memberIds.length;

                return (
                  <Box key={team.name} flexDirection="row">
                    <Text
                      color={isSelected ? "black" : "gray"}
                      backgroundColor={isSelected ? "gray" : undefined}
                    >
                      {team.name.padEnd(20)}
                      {/* {`Lead: ${team.leadId}`.padEnd(12)} */}
                      {/* {`${team.memberIds.length} members`.padEnd(15)} */}
                      {totalMembers} members{" "}
                    </Text>
                    {!team.leadId && (
                      <StatusMessage variant="warning">{``}</StatusMessage>
                    )}
                  </Box>
                );
              })}
          </Box>

          {teams[selectedIndex] && (
            <Box
              marginTop={1}
              padding={1}
              borderStyle="round"
              borderColor="gray"
            >
              <Box flexDirection="column">
                <Text color="brightWhite" bold>
                  {teams[selectedIndex].name}
                </Text>

                {teams[selectedIndex].leadId && (
                  <Box marginTop={1}>
                    <Text color="yellow">lead:</Text>
                    {teams[selectedIndex].leadId && (
                      <Text
                        key={teams[selectedIndex].leadId}
                        color="brightWhite"
                      >
                        <Newline />• {teams[selectedIndex].leadId}
                      </Text>
                    )}
                  </Box>
                )}

                {teams[selectedIndex].memberIds.length > 0 && (
                  <Box marginTop={1} flexDirection="column">
                    <Text color="blue">members:</Text>
                    {teams[selectedIndex].memberIds
                      .slice(0, 5)
                      .map((member) => (
                        <Text key={member} color="brightWhite">
                          <Newline />• {member}
                        </Text>
                      ))}
                    {teams[selectedIndex].memberIds.length > 5 && (
                      <Text color="gray">
                        ... and {teams[selectedIndex].memberIds.length - 5} more
                      </Text>
                    )}
                  </Box>
                )}
                <Box marginTop={1} />
                {!teams[selectedIndex].leadId && (
                  <StatusMessage variant="error">
                    {`this team has no lead`}
                  </StatusMessage>
                  // </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </>
  );
};
