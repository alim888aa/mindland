import { useUIMessages } from "@convex-dev/agent/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { type ComponentProps, useRef, useState } from "react";
import { AccessibilityInfo, View } from "react-native";

import { api } from "../../convex/_generated/api";
import {
  OnboardingInterview,
  type OnboardingInterviewInsets,
  type OnboardingInterviewMessage,
} from "./onboarding-interview";
import { MIST_REVEAL_SETTLE_MS } from "./glass-mist-shell";

type PendingAnswer = {
  clientRequestId: string;
  promptMessageId?: string;
  text: string;
};

type StreamAwareInterviewProps = ComponentProps<typeof OnboardingInterview> & {
  generationIsActive: boolean;
};

export type OnboardingInterviewReveal = {
  interviewId: string;
  islandNames: string[];
};

export type OnboardingInterviewContainerProps = {
  onReveal: (reveal: OnboardingInterviewReveal) => void;
  readyWorldKey?: string | null;
  safeAreaInsets?: OnboardingInterviewInsets;
  reduceTransparency?: boolean;
  worldKey?: string;
};

function createClientRequestId() {
  const randomPart = Math.random().toString(36).slice(2);
  return `onboarding-${Date.now().toString(36)}-${randomPart}`;
}

function errorText(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Mindland could not finish that message. Please try again.";
}

function textFromParts(parts: readonly { type: string; text?: string }[]) {
  return parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("");
}

function waitFor(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function StreamAwareInterview({
  generationIsActive,
  messages,
  ...interviewProps
}: StreamAwareInterviewProps) {
  return (
    <OnboardingInterview
      {...interviewProps}
      isStreaming={generationIsActive}
      messages={messages}
    />
  );
}

export function OnboardingInterviewContainer({
  onReveal,
  readyWorldKey = null,
  safeAreaInsets,
  reduceTransparency = false,
  worldKey,
}: OnboardingInterviewContainerProps) {
  const currentInterview = useQuery(api.onboardingInterview.getCurrent, {});
  const startOrResume = useMutation(api.onboardingInterview.startOrResume);
  const submitAnswer = useMutation(api.onboardingInterview.submitAnswer);
  const retryAnswer = useMutation(api.onboardingInterview.retryAnswer);
  const revealCandidateNames = useMutation(
    api.onboardingInterview.revealCandidateNames,
  );
  const generateQuestionnaires = useAction(
    api.islandQuestionnaireActions.generateForInterview,
  );
  const threadMessages = useUIMessages(
    api.onboardingInterview.listThreadMessages,
    currentInterview ? { threadId: currentInterview.threadId } : "skip",
    { initialNumItems: 30, stream: true },
  );
  const startAttempted = useRef(false);
  const sendInFlight = useRef(false);
  const revealInFlight = useRef(false);
  const worldReadiness = useRef({ readyWorldKey, worldKey });
  worldReadiness.current = { readyWorldKey, worldKey };
  const [draft, setDraft] = useState("");
  const [pendingAnswer, setPendingAnswer] = useState<PendingAnswer | null>(
    null,
  );
  const [isSending, setIsSending] = useState(false);
  const [presentationPhase, setPresentationPhase] = useState<
    "conversation" | "calculating" | "revealing"
  >("conversation");
  const [localError, setLocalError] = useState<string>();

  const visibleThreadMessages = threadMessages.results
    .filter(
      (message) => message.role === "assistant" || message.role === "user",
    )
    .map((message) => ({
      id: message.key,
      sourceId: message.id,
      role: message.role as "assistant" | "user",
      content: textFromParts(message.parts),
    }));
  const messages: OnboardingInterviewMessage[] = visibleThreadMessages.filter(
    (message) => message.content.length > 0,
  );
  const generationIsActive =
    currentInterview?.generationState === "queued" ||
    currentInterview?.generationState === "streaming" ||
    threadMessages.results.some((message) => message.status === "streaming");
  const fallbackLatestUserIndex = visibleThreadMessages.findLastIndex(
    (message) => message.role === "user",
  );
  const pendingUserIndex = pendingAnswer?.promptMessageId
    ? visibleThreadMessages.findLastIndex(
        (message) =>
          message.role === "user" &&
          message.sourceId === pendingAnswer.promptMessageId,
      )
    : -1;
  const latestUserIndex = pendingAnswer
    ? pendingUserIndex
    : fallbackLatestUserIndex;
  const pendingUserIsVisible = pendingAnswer === null || pendingUserIndex >= 0;
  const currentAssistantMessage = pendingUserIsVisible
    ? visibleThreadMessages
        .slice(latestUserIndex + 1)
        .findLast(
          (message) =>
            message.role === "assistant" && message.content.length > 0,
        )
    : undefined;
  const currentAssistantReply = currentAssistantMessage
    ? {
        id: currentAssistantMessage.id,
        text: currentAssistantMessage.content,
      }
    : undefined;
  const animatedAssistantMessageId =
    pendingAnswer || (startAttempted.current && fallbackLatestUserIndex < 0)
      ? currentAssistantReply?.id
      : undefined;
  const generationFailed = currentInterview?.generationState === "failed";
  const errorMessage =
    localError ??
    (generationFailed
      ? "Mindland's reply was interrupted. Your answer is safe."
      : undefined);

  const beginInterview = async () => {
    if (startAttempted.current || currentInterview !== null) {
      return;
    }

    startAttempted.current = true;
    setLocalError(undefined);

    try {
      await startOrResume({});
    } catch (error) {
      startAttempted.current = false;
      setLocalError(errorText(error));
    }
  };

  const sendPendingAnswer = async (answer: PendingAnswer) => {
    if (!currentInterview || sendInFlight.current) {
      return;
    }

    sendInFlight.current = true;
    setIsSending(true);
    setLocalError(undefined);

    try {
      const receipt = await submitAnswer({
        interviewId: currentInterview.interviewId,
        clientRequestId: answer.clientRequestId,
        text: answer.text,
      });
      setPendingAnswer((current) =>
        current?.clientRequestId === answer.clientRequestId
          ? { ...current, promptMessageId: receipt.promptMessageId }
          : current,
      );
      setDraft("");
    } catch (error) {
      setLocalError(errorText(error));
    } finally {
      sendInFlight.current = false;
      setIsSending(false);
    }
  };

  const sendDraft = async () => {
    const text = draft.trim();

    if (
      !currentInterview ||
      text.length === 0 ||
      generationIsActive ||
      generationFailed
    ) {
      return;
    }

    const answer = {
      clientRequestId: createClientRequestId(),
      text,
    };
    setPendingAnswer(answer);
    await sendPendingAnswer(answer);
  };

  const retry = async () => {
    if (!currentInterview) {
      await beginInterview();
      return;
    }

    if (sendInFlight.current) {
      return;
    }

    sendInFlight.current = true;
    setIsSending(true);
    setLocalError(undefined);

    try {
      if (generationFailed) {
        await retryAnswer({
          interviewId: currentInterview.interviewId,
        });
      } else if (pendingAnswer) {
        const receipt = await submitAnswer({
          interviewId: currentInterview.interviewId,
          clientRequestId: pendingAnswer.clientRequestId,
          text: pendingAnswer.text,
        });
        setPendingAnswer((current) =>
          current?.clientRequestId === pendingAnswer.clientRequestId
            ? { ...current, promptMessageId: receipt.promptMessageId }
            : current,
        );
      }
    } catch (error) {
      setLocalError(errorText(error));
    } finally {
      sendInFlight.current = false;
      setIsSending(false);
    }
  };

  const reveal = async () => {
    if (!currentInterview || revealInFlight.current) {
      return;
    }

    revealInFlight.current = true;
    setPresentationPhase("calculating");
    setLocalError(undefined);

    try {
      const previousWorldKey = worldReadiness.current.worldKey;
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      await waitFor(reduceMotion ? 120 : 420);
      await revealCandidateNames({
        interviewId: currentInterview.interviewId,
      });
      const revealed = await generateQuestionnaires({
        interviewId: currentInterview.interviewId,
      });

      if (previousWorldKey !== undefined) {
        const readyDeadline = Date.now() + 12_000;
        while (
          (worldReadiness.current.worldKey === previousWorldKey ||
            worldReadiness.current.readyWorldKey !==
              worldReadiness.current.worldKey) &&
          Date.now() < readyDeadline
        ) {
          await waitFor(50);
        }

      }

      setPresentationPhase("revealing");
      await waitFor(reduceMotion ? 140 : MIST_REVEAL_SETTLE_MS);
      onReveal({
        interviewId: revealed.interviewId,
        islandNames: revealed.islandNames,
      });
    } catch (error) {
      setLocalError(errorText(error));
    } finally {
      revealInFlight.current = false;
      setPresentationPhase("conversation");
    }
  };

  return (
    <View
      key={
        currentInterview === undefined
          ? "loading"
          : currentInterview === null
            ? "start"
            : "interview"
      }
      onLayout={
        currentInterview === null
          ? () => {
              void beginInterview();
            }
          : undefined
      }
      style={{ flex: 1 }}
    >
      <StreamAwareInterview
        animatedAssistantMessageId={animatedAssistantMessageId}
        draft={draft}
        errorMessage={errorMessage}
        generationIsActive={generationIsActive}
        isRevealing={presentationPhase !== "conversation"}
        isSending={
          isSending ||
          presentationPhase !== "conversation" ||
          generationIsActive ||
          generationFailed
        }
        messages={messages}
        onCreateMap={
          currentInterview?.status === "readyToCreate" ? reveal : undefined
        }
        onDraftChange={setDraft}
        onRetry={errorMessage ? retry : undefined}
        onSend={sendDraft}
        progress={(currentInterview?.progressPercent ?? 0) / 100}
        presentationPhase={presentationPhase}
        readyToCreate={currentInterview?.status === "readyToCreate"}
        reduceTransparency={reduceTransparency}
        safeAreaInsets={safeAreaInsets}
      />
    </View>
  );
}
