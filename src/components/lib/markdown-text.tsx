/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import { Text } from "ink";
import { parse, setOptions } from "marked";
// @ts-ignore
import TerminalRenderer, { TerminalRendererOptions } from "marked-terminal";
import dedent from "dedent";
export type MarkdownProps = TerminalRendererOptions & {
  children: string;
};
//todo: remove unsafe Markdown Calls
const Markdown = ({ children, ...options }: MarkdownProps) => {
  setOptions({
    renderer: new TerminalRenderer(options),
    async: false,
  });
  try {
    return <Text>{parse(dedent(children), { async: false }).trim()}</Text>;
  } catch (error) {
    try {
      return <Text>{parse(children, { async: false }).trim()}</Text>;
    } catch (error) {
      return <Text>{children}</Text>;
    }
  }
};

export default Markdown;
