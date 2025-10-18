import { Box } from "ink";
import { TextInput } from "./text-input/text-input.js";
import { Text } from "ink";
import { Spinner } from "./spinner/index.js";
import { memo } from "react";
export interface ChatInputProps {
  displayName: string;
  sessionLength: number;
  isDisabled: boolean;
  onChange?: (value: string) => void;
  onSubmit: (value: string) => void;
}

const LoadingSpinner = memo(() => (
  <Box marginRight={2}>
    <Spinner type="boxBounce2" />
  </Box>
));

export const ChatInput = memo(
  ({
    displayName,
    sessionLength,
    isDisabled,
    onChange,
    onSubmit,
  }: ChatInputProps): React.JSX.Element => {
    return (
      <Box flexDirection="column" flexGrow={1} flexShrink={0} height="20%">
        <Box
          borderStyle="classic"
          borderLeft={false}
          borderRight={false}
          columnGap={1}
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box flexDirection="row" columnGap={2}>
            <Text>{">".padStart(2)} </Text>
            <TextInput
              key={`chat-input-${sessionLength}`}
              isDisabled={isDisabled}
              onChange={onChange}
              onSubmit={onSubmit}
              placeholder="Type your message..."
            />
          </Box>
          {isDisabled && <LoadingSpinner />}
        </Box>
        <Box flexDirection="row" columnGap={2} alignItems="flex-start">
          <Text color="whiteBright" bold>
            Chatting with {displayName}:
          </Text>
          <Text color="grey" bold>
            *Type your message and Press [Enter] to send. Press [Escape] to
            exit.
          </Text>
        </Box>
      </Box>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.displayName === nextProps.displayName &&
      prevProps.sessionLength === nextProps.sessionLength &&
      prevProps.isDisabled === nextProps.isDisabled &&
      prevProps.onSubmit === nextProps.onSubmit
    );
  }
);
