import { Box } from "ink";
import { TextInput } from "./text-input/text-input.js";
import { Text } from "ink";
import { Spinner } from "./spinner/index.js";
import { memo, useMemo } from "react";
export interface ChatInputProps {
  displayName: string;
  sessionLength: number;
  isDisabled: boolean;
  continueButton: boolean;
  onChange?: (value: string) => void;
  onSubmit: (value: string) => void;
}

const LoadingSpinner = memo(({ sessionLength }: { sessionLength: number }) => {
  const loadingSpinnerKey = useMemo(
    () => `chat-input-loading-spinner-${sessionLength.toString()}`,
    []
  );
  return (
    <Box key={loadingSpinnerKey} marginRight={2}>
      <Spinner type="boxBounce2" />
    </Box>
  );
});

const ContinueButton = memo(({ sessionLength }: { sessionLength: number }) => {
  const continueButtonKey = useMemo(
    () => `chat-input-continue-button-${sessionLength.toString()}`,
    []
  );
  return (
    <Box
      key={continueButtonKey}
      marginRight={2}
      backgroundColor={"green"}
      paddingLeft={1}
      paddingRight={1}
    >
      <Text key={continueButtonKey} color="whiteBright" bold>
        Ctrl + → to continue...
      </Text>
    </Box>
  );
});

export const ChatInput = memo(
  ({
    displayName,
    sessionLength,
    isDisabled,
    continueButton,
    onChange,
    onSubmit,
  }: ChatInputProps): React.JSX.Element => {
    const inputKey = useMemo(
      () => `chat-input-${sessionLength.toString()}`,
      []
    );
    const inputContainerKey = useMemo(
      () => `chat-input-container-${sessionLength.toString()}`,
      []
    );
    const inputBoxKey = useMemo(
      () => `chat-input-box-${sessionLength.toString()}`,
      []
    );
    const textInputContainerKey = useMemo(
      () => `chat-input-text-container-${sessionLength.toString()}`,
      []
    );
    const textRowStartKey = useMemo(
      () => `chat-input-text-row-start-${sessionLength.toString()}`,
      []
    );
    const textRowContainerKey = useMemo(
      () => `chat-input-text-row-container-${sessionLength.toString()}`,
      []
    );
    const textRowEndKey = useMemo(
      () => `chat-input-text-row-end-${sessionLength.toString()}`,
      []
    );
    const textRowEndDescriptionKey = useMemo(
      () => `chat-input-text-row-end-description-${sessionLength.toString()}`,
      []
    );
    return (
      <Box
        key={inputContainerKey}
        flexDirection="column"
        flexGrow={2}
        flexShrink={0}
        height="20%"
        position="relative"
      >
        <Box
          key={inputBoxKey}
          borderStyle="classic"
          borderLeft={false}
          borderRight={false}
          columnGap={1}
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Box key={textInputContainerKey} flexDirection="row" columnGap={2}>
            <Text key={textRowStartKey}>{">".padStart(2)} </Text>
            <TextInput
              key={inputKey}
              isDisabled={isDisabled}
              onChange={onChange}
              onSubmit={onSubmit}
              placeholder="Type your message..."
            />
          </Box>
          {isDisabled && <LoadingSpinner sessionLength={sessionLength} />}
          {continueButton && !isDisabled && (
            <ContinueButton sessionLength={sessionLength} />
          )}
        </Box>
        <Box
          key={textRowContainerKey}
          flexDirection="row"
          columnGap={2}
          alignItems="flex-start"
        >
          <Text key={textRowEndKey} color="whiteBright" bold>
            Chatting with {displayName}:
          </Text>
          <Text key={textRowEndDescriptionKey} color="grey" bold>
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
      prevProps.continueButton === nextProps.continueButton &&
      prevProps.onSubmit === nextProps.onSubmit
    );
  }
);
