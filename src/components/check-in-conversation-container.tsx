import { useUIMessages } from "@convex-dev/agent/react";
import { useMutation, useQuery } from "convex/react";
import { useRef, useState, type ComponentProps } from "react";
import { View } from "react-native";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  CheckInModal,
  type CheckInConversationMessage,
} from "./check-in-modal";
import {
  answersForStructuredCheckIn,
  type QuestionnaireSubmission,
} from "../lib/questionnaire-submission";

type CheckInConversationContainerProps = Omit<
  ComponentProps<typeof CheckInModal>,
  | "animatedAssistantMessageId"
  | "conversationComplete"
  | "conversationDraft"
  | "conversationErrorMessage"
  | "conversationIsSending"
  | "conversationIsFinished"
  | "conversationIsStreaming"
  | "conversationMessages"
  | "conversationApplicationStatus"
  | "showConversationEntryChoices"
  | "onConversationDraftChange"
  | "onConversationRetry"
  | "onConversationSend"
  | "onQuestionnaireRetry"
  | "onQuestionnaireSubmit"
  | "questionnaireErrorMessage"
  | "questionnaireSubmissionStatus"
>;

type PendingMessage = {
  clientRequestId: string;
  promptMessageId?: string;
  text: string;
};

type PendingQuestionnaire = {
  clientRequestId: string;
  islandId: Id<"islands">;
  answers: ReturnType<typeof answersForStructuredCheckIn>;
  submissionId?: Id<"structuredCheckInSubmissions">;
};

function createClientRequestId() {
  const randomPart = Math.random().toString(36).slice(2);
  return `check-in-${Date.now().toString(36)}-${randomPart}`;
}

function createQuestionnaireRequestId() {
  const randomPart = Math.random().toString(36).slice(2);
  return `guided-${Date.now().toString(36)}-${randomPart}`;
}

function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
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

export function CheckInConversationContainer(
  props: CheckInConversationContainerProps,
) {
  const timeZone = deviceTimeZone();
  const checkIn = useQuery(api.checkIn.getToday, { timeZone });
  const startOrResume = useMutation(api.checkIn.startOrResumeToday);
  const submitMessage = useMutation(api.checkIn.submitMessage);
  const retryMessage = useMutation(api.checkIn.retryMessage);
  const resumeCompletedToday = useMutation(api.checkIn.resumeCompletedToday);
  const retryApplication = useMutation(
    api.activityApplication.retryMyCheckInApplication,
  );
  const submitStructuredCheckIn = useMutation(api.structuredCheckIn.submit);
  const threadMessages = useUIMessages(
    api.checkIn.listThreadMessages,
    checkIn ? { threadId: checkIn.threadId } : "skip",
    { initialNumItems: 40, stream: true },
  );
  const [pendingQuestionnaire, setPendingQuestionnaire] =
    useState<PendingQuestionnaire | null>(null);
  const pendingQuestionnaireRef = useRef<PendingQuestionnaire | null>(null);
  const structuredReceipt = useQuery(
    api.structuredCheckIn.getSubmission,
    pendingQuestionnaire?.submissionId
      ? {
          submissionId: pendingQuestionnaire.submissionId,
        }
      : "skip",
  );
  const conversationApplication = useQuery(
    api.activityApplication.getMyCheckInApplication,
    checkIn?.status === "complete" ? { checkInId: checkIn.checkInId } : "skip",
  );
  const startInFlight = useRef(false);
  const sendInFlight = useRef(false);
  const questionnaireInFlight = useRef(false);
  const completionRequestedHere = useRef(false);
  const openedOnCompletedCheckIn = useRef<boolean | null>(null);
  if (checkIn !== undefined && checkIn !== null && openedOnCompletedCheckIn.current === null) {
    openedOnCompletedCheckIn.current = checkIn.status === "complete";
  }
  const resumeInFlight = useRef(false);
  const [draft, setDraft] = useState("");
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(
    null,
  );
  const [isSending, setIsSending] = useState(false);
  const [localError, setLocalError] = useState<string>();
  const [questionnaireLocalError, setQuestionnaireLocalError] =
    useState<string>();
  const [questionnaireRetryExhausted, setQuestionnaireRetryExhausted] =
    useState(false);
  const [showFollowUpEntries, setShowFollowUpEntries] = useState(false);
  const [resumeFailed, setResumeFailed] = useState(false);

  const visibleThreadMessages = threadMessages.results
    .filter(
      (message) => message.role === "assistant" || message.role === "user",
    )
    .map((message) => ({
      id: message.key,
      sourceId: message.id,
      role: message.role as "assistant" | "user",
      content: textFromParts(message.parts),
      status: message.status,
    }));
  const messages: CheckInConversationMessage[] = visibleThreadMessages
    .filter((message) => message.content.length > 0)
    .map(({ id, role, content }) => ({ id, role, content }));
  const generationIsActive =
    checkIn?.generationState === "queued" ||
    checkIn?.generationState === "streaming" ||
    threadMessages.results.some((message) => message.status === "streaming");
  const generationFailed = checkIn?.generationState === "failed";
  const fallbackLatestUserIndex = visibleThreadMessages.findLastIndex(
    (message) => message.role === "user",
  );
  const pendingUserIndex = pendingMessage?.promptMessageId
    ? visibleThreadMessages.findLastIndex(
        (message) =>
          message.role === "user" &&
          message.sourceId === pendingMessage.promptMessageId,
      )
    : -1;
  const latestUserIndex = pendingMessage
    ? pendingUserIndex
    : fallbackLatestUserIndex;
  const pendingUserIsVisible = pendingMessage === null || pendingUserIndex >= 0;
  const currentAssistantMessage = pendingUserIsVisible
    ? visibleThreadMessages
        .slice(latestUserIndex + 1)
        .findLast(
          (message) =>
            message.role === "assistant" && message.content.length > 0,
        )
    : undefined;
  const animatedAssistantMessageId =
    generationIsActive && fallbackLatestUserIndex >= 0
      ? currentAssistantMessage?.id
      : undefined;
  const finalReplyIsVisible =
    currentAssistantMessage !== undefined && !generationIsActive;
  const conversationComplete =
    completionRequestedHere.current &&
    checkIn?.status === "complete" &&
    finalReplyIsVisible;
  const conversationApplicationStatus =
    checkIn?.status !== "complete"
      ? "idle"
      : conversationApplication?.status === "applied"
        ? "applied"
        : conversationApplication?.status === "failed"
          ? "failed"
          : "calculating";
  const errorMessage =
    localError ??
    (conversationApplicationStatus === "failed"
      ? conversationApplication?.errorMessage ??
        "Mindland could not apply today's activities yet."
      : undefined) ??
    (generationFailed
      ? "Mindland's reply was interrupted. Your message is safe."
      : undefined);
  const questionnaireSubmissionStatus = pendingQuestionnaire
    ? questionnaireLocalError
      ? "failed"
      : structuredReceipt?.status === "applied"
        ? "applied"
        : structuredReceipt?.status === "failed"
          ? "failed"
          : pendingQuestionnaire.submissionId
            ? "calculating"
            : "submitting"
    : "idle";
  const questionnaireErrorMessage =
    questionnaireLocalError ??
    (structuredReceipt?.status === "failed"
      ? structuredReceipt.errorMessage ??
        "Mindland could not apply that guided check-in yet."
      : undefined);

  const beginCheckIn = async () => {
    if (startInFlight.current || checkIn !== null) return;
    startInFlight.current = true;
    setLocalError(undefined);

    try {
      await startOrResume({ timeZone });
    } catch (error) {
      startInFlight.current = false;
      setLocalError(errorText(error));
    }
  };

  const sendPendingMessage = async (message: PendingMessage) => {
    if (!checkIn || sendInFlight.current) return;
    sendInFlight.current = true;
    completionRequestedHere.current = true;
    setIsSending(true);
    setLocalError(undefined);

    try {
      const receipt = await submitMessage({
        checkInId: checkIn.checkInId,
        clientRequestId: message.clientRequestId,
        text: message.text,
      });
      setPendingMessage((current) =>
        current?.clientRequestId === message.clientRequestId
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
      !checkIn ||
      text.length === 0 ||
      generationIsActive ||
      generationFailed ||
      checkIn.status === "complete"
    ) {
      return;
    }

    const message = { clientRequestId: createClientRequestId(), text };
    setPendingMessage(message);
    await sendPendingMessage(message);
  };

  const retry = async () => {
    if (!checkIn) {
      await beginCheckIn();
      return;
    }
    if (sendInFlight.current) return;

    sendInFlight.current = true;
    setIsSending(true);
    setLocalError(undefined);

    try {
      if (resumeFailed) {
        await resumeCompletedCheckIn();
      } else if (conversationApplicationStatus === "failed") {
        await retryApplication({ checkInId: checkIn.checkInId });
      } else if (generationFailed) {
        const receipt = await retryMessage({ checkInId: checkIn.checkInId });
        if (!receipt.accepted) {
          setLocalError(
            receipt.errorMessage ??
              "Mindland is still settling that reply. Give it a moment, then try again.",
          );
        }
      } else if (pendingMessage) {
        const receipt = await submitMessage({
          checkInId: checkIn.checkInId,
          clientRequestId: pendingMessage.clientRequestId,
          text: pendingMessage.text,
        });
        setPendingMessage((current) =>
          current?.clientRequestId === pendingMessage.clientRequestId
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

  const resumeCompletedCheckIn = async () => {
    if (!checkIn || resumeInFlight.current) return;
    resumeInFlight.current = true;
    openedOnCompletedCheckIn.current = false;
    setResumeFailed(false);
    setLocalError(undefined);
    try {
      await resumeCompletedToday({ checkInId: checkIn.checkInId });
      completionRequestedHere.current = false;
      setShowFollowUpEntries(true);
    } catch (error) {
      setResumeFailed(true);
      setLocalError(errorText(error));
    } finally {
      resumeInFlight.current = false;
    }
  };

  const submitPendingQuestionnaire = async (
    pending: PendingQuestionnaire,
  ) => {
    if (!checkIn || questionnaireInFlight.current) {
      if (!checkIn) {
        setQuestionnaireLocalError(
          "Mindland is still opening today's check-in. Please try again.",
        );
      }
      return;
    }
    questionnaireInFlight.current = true;
    setQuestionnaireLocalError(undefined);

    try {
      const receipt = await submitStructuredCheckIn({
        checkInId: checkIn.checkInId,
        islandId: pending.islandId,
        clientRequestId: pending.clientRequestId,
        answers: pending.answers,
      });
      const next = { ...pending, submissionId: receipt.submissionId };
      pendingQuestionnaireRef.current = next;
      setPendingQuestionnaire(next);
      if (receipt.status === "failed") {
        setQuestionnaireLocalError(
          receipt.errorMessage ??
            "Mindland could not apply that guided check-in yet.",
        );
        if (!receipt.accepted) setQuestionnaireRetryExhausted(true);
      }
    } catch (error) {
      setQuestionnaireLocalError(errorText(error));
    } finally {
      questionnaireInFlight.current = false;
    }
  };

  const submitQuestionnaire = (submission: QuestionnaireSubmission) => {
    if (pendingQuestionnaireRef.current !== null) return;
    const pending: PendingQuestionnaire = {
      clientRequestId: createQuestionnaireRequestId(),
      islandId: submission.islandId as Id<"islands">,
      answers: answersForStructuredCheckIn(submission.answers),
    };
    pendingQuestionnaireRef.current = pending;
    setPendingQuestionnaire(pending);
    setQuestionnaireLocalError(undefined);
    setQuestionnaireRetryExhausted(false);
    void submitPendingQuestionnaire(pending);
  };

  const retryQuestionnaire = () => {
    const pending = pendingQuestionnaireRef.current;
    if (!pending || questionnaireRetryExhausted) return;
    void submitPendingQuestionnaire(pending);
  };

  return (
    <View
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
      }}
    >
      {checkIn === null ? (
        <View
          key="start-check-in"
          accessibilityElementsHidden
          onLayout={() => {
            void beginCheckIn();
          }}
          pointerEvents="none"
          style={{ position: "absolute", width: 1, height: 1 }}
        />
      ) : null}
      {openedOnCompletedCheckIn.current === true &&
      checkIn?.status === "complete" &&
      conversationApplicationStatus === "applied" ? (
        <View
          accessibilityElementsHidden
          onLayout={() => void resumeCompletedCheckIn()}
          pointerEvents="none"
          style={{ position: "absolute", width: 1, height: 1 }}
        />
      ) : null}
      <CheckInModal
        {...props}
        animatedAssistantMessageId={animatedAssistantMessageId}
        conversationComplete={conversationComplete}
        conversationApplicationStatus={conversationApplicationStatus}
        conversationDraft={draft}
        conversationErrorMessage={errorMessage}
        conversationIsSending={
          isSending || generationIsActive || generationFailed || !checkIn
        }
        conversationIsFinished={
          checkIn?.status === "complete" || resumeInFlight.current
        }
        conversationIsStreaming={generationIsActive}
        conversationMessages={messages}
        questionnaireErrorMessage={questionnaireErrorMessage}
        questionnaireSubmissionStatus={questionnaireSubmissionStatus}
        showConversationEntryChoices={showFollowUpEntries}
        onConversationDraftChange={setDraft}
        onConversationRetry={errorMessage ? retry : undefined}
        onConversationSend={sendDraft}
        onQuestionnaireRetry={
          questionnaireSubmissionStatus === "failed" &&
          !questionnaireRetryExhausted
            ? retryQuestionnaire
            : undefined
        }
        onQuestionnaireSubmit={submitQuestionnaire}
      />
    </View>
  );
}
