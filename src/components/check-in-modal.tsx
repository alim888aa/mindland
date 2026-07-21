import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollView as ScrollViewType,
} from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";

import type { IslandId, RuntimeIslandWorld } from "../data/islands";
import { createIslandQuestionnaire } from "../lib/island-questionnaires";
import {
  questionnaireAnswer,
  type QuestionnaireAnswerRecord,
  type QuestionnaireSubmission,
} from "../lib/questionnaire-submission";
import {
  GLASS_CORAL,
  GLASS_INK,
  GLASS_QUIET_INK,
  GlassMistBackdrop,
  GlassProgress,
  GlassSurface,
  MIST_REVEAL_SETTLE_MS,
  supportsNativeLiquidGlass,
  useReduceTransparency,
} from "./glass-mist-shell";
import { MagicalAssistantText } from "./magical-assistant-text";

export type CheckInModalProps = {
  islandWorld: RuntimeIslandWorld;
  worldIsReady: boolean;
  visible: boolean;
  firstName?: string | null;
  conversationMessages: CheckInConversationMessage[];
  conversationDraft: string;
  conversationIsStreaming: boolean;
  conversationIsSending: boolean;
  conversationComplete: boolean;
  conversationApplicationStatus: "idle" | "calculating" | "applied" | "failed";
  conversationIsFinished: boolean;
  conversationErrorMessage?: string;
  questionnaireSubmissionStatus:
    | "idle"
    | "submitting"
    | "calculating"
    | "applied"
    | "failed";
  questionnaireErrorMessage?: string;
  animatedAssistantMessageId?: string;
  showConversationEntryChoices: boolean;
  onConversationDraftChange: (value: string) => void;
  onConversationSend: () => void;
  onConversationRetry?: () => void;
  onQuestionnaireRetry?: () => void;
  onQuestionnaireSubmit: (submission: QuestionnaireSubmission) => void;
  onClose: () => void;
  onQuestionnaireComplete: (islandId: IslandId) => void;
  onChatComplete?: () => void;
  onIslandFocusRequest?: (islandId: IslandId | null) => void;
  onRevealStart?: (islandId: IslandId | null) => void;
  onRevealComplete?: (islandId: IslandId | null) => void;
  reduceTransparency?: boolean;
  safeAreaInsets?: { top: number; bottom: number };
};

export type CheckInConversationMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

function ChatMessage({
  animate,
  message,
}: {
  animate: boolean;
  message: CheckInConversationMessage;
}) {
  if (message.role === "user") {
    return (
      <View style={{ alignItems: "flex-end", paddingLeft: 48 }}>
        <View
          style={{
            maxWidth: "92%",
            borderRadius: 23,
            borderBottomRightRadius: 8,
            borderCurve: "continuous",
            backgroundColor: "rgba(255,250,240,0.9)",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Text
            selectable
            style={{ color: GLASS_INK, fontSize: 16, lineHeight: 23 }}
          >
            {message.content}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingRight: 22 }}>
      <View
        style={{
          width: 28,
          height: 28,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          backgroundColor: "rgba(255,247,225,0.78)",
        }}
      >
        <Image
          source="sf:sparkles"
          style={{ width: 14, height: 14 }}
          tintColor={GLASS_CORAL}
        />
      </View>
      <MagicalAssistantText animate={animate}>
        {message.content}
      </MagicalAssistantText>
    </View>
  );
}

export function CheckInModal({
  islandWorld,
  worldIsReady,
  visible,
  firstName,
  conversationMessages,
  conversationDraft,
  conversationIsStreaming,
  conversationIsSending,
  conversationComplete,
  conversationApplicationStatus,
  conversationIsFinished,
  conversationErrorMessage,
  questionnaireSubmissionStatus,
  questionnaireErrorMessage,
  animatedAssistantMessageId,
  showConversationEntryChoices,
  onConversationDraftChange,
  onConversationSend,
  onConversationRetry,
  onQuestionnaireRetry,
  onQuestionnaireSubmit,
  onClose,
  onQuestionnaireComplete,
  onChatComplete,
  onIslandFocusRequest,
  onRevealStart,
  onRevealComplete,
  reduceTransparency: reduceTransparencyOverride,
  safeAreaInsets = { top: 58, bottom: 24 },
}: CheckInModalProps) {
  const [mode, setMode] = useState<"chat" | "questionnaire">("chat");
  const [selectedIsland, setSelectedIsland] = useState<IslandId | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<
    QuestionnaireAnswerRecord[]
  >([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const [mistPhase, setMistPhase] = useState<
    "conversation" | "calculating" | "revealing"
  >("conversation");
  const [isOpening, setIsOpening] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const transcriptRef = useRef<ScrollViewType>(null);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupRef = useRef<((node: View | null) => void) | null>(null);
  if (cleanupRef.current === null) {
    cleanupRef.current = (node) => {
      if (node !== null) return;
      if (completionTimer.current) clearTimeout(completionTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      completionTimer.current = null;
      closeTimer.current = null;
    };
  }
  const completionInFlight = useRef(false);
  const conversationApplicationHandled = useRef(false);
  const questionnaireApplicationHandled = useRef(false);
  const isVisible = useRef(visible);
  isVisible.current = visible;
  const reduceMotion = useReducedMotion();
  const reduceTransparency = useReduceTransparency(reduceTransparencyOverride);
  const supportsLiquidGlass = supportsNativeLiquidGlass();
  const modalMotionStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withTiming(
          isClosing ? 900 : isOpening && !reduceMotion ? 900 : 0,
          {
          duration: reduceMotion ? 120 : 280,
          easing: Easing.inOut(Easing.cubic),
          },
        ),
      },
    ],
  }));
  const selectedIslandDefinition = selectedIsland
    ? islandWorld.islandById[selectedIsland]
    : undefined;
  const questionnaire = selectedIslandDefinition
    ? createIslandQuestionnaire(selectedIslandDefinition)
    : [];
  const question = questionnaire[questionIndex] ?? null;

  const reset = (clearIslandFocus = true) => {
    if (completionTimer.current) clearTimeout(completionTimer.current);
    completionTimer.current = null;
    completionInFlight.current = false;
    conversationApplicationHandled.current = false;
    setMode("chat");
    setSelectedIsland(null);
    setQuestionIndex(0);
    setAnswer("");
    setQuestionnaireAnswers([]);
    setIsRevealing(false);
    setMistPhase("conversation");
    if (clearIslandFocus) onIslandFocusRequest?.(null);
  };
  const close = () => {
    if (
      conversationApplicationStatus === "calculating" ||
      questionnaireSubmissionStatus === "submitting" ||
      questionnaireSubmissionStatus === "calculating"
    ) {
      return;
    }
    setIsClosing(true);
    closeTimer.current = setTimeout(
      () => {
        closeTimer.current = null;
        reset();
        setIsClosing(false);
        onClose();
      },
      reduceMotion ? 120 : 280,
    );
  };
  const openQuestionnaire = (islandId: IslandId) => {
    setSelectedIsland(islandId);
    setQuestionIndex(0);
    setAnswer("");
    setQuestionnaireAnswers([]);
    questionnaireApplicationHandled.current = false;
    setMode("questionnaire");
    onIslandFocusRequest?.(islandId);
  };
  const beginQuestionnaireCalculation = (
    islandId: IslandId,
    answers: QuestionnaireAnswerRecord[],
  ) => {
    if (completionInFlight.current) return;
    completionInFlight.current = true;
    questionnaireApplicationHandled.current = false;
    setIsRevealing(true);
    setMistPhase("calculating");
    onRevealStart?.(islandId);
    onQuestionnaireSubmit({ islandId, answers });
  };
  const advance = (nextAnswer: string | null, skipped: boolean) => {
    if (!selectedIsland || !question) return;
    const completedAnswers = [
      ...questionnaireAnswers,
      questionnaireAnswer(question, nextAnswer, skipped),
    ];
    setQuestionnaireAnswers(completedAnswers);
    if (questionIndex === questionnaire.length - 1) {
      beginQuestionnaireCalculation(selectedIsland, completedAnswers);
      return;
    }
    setQuestionIndex((value) => value + 1);
    setAnswer("");
  };
  const completeQuestionnaireReveal = () => {
    if (
      questionnaireSubmissionStatus !== "applied" ||
      questionnaireApplicationHandled.current ||
      !selectedIsland ||
      !worldIsReady
    ) {
      return;
    }
    questionnaireApplicationHandled.current = true;
    setMistPhase("revealing");
    completionTimer.current = setTimeout(
      () => {
        if (!isVisible.current) {
          reset();
          return;
        }
        const completedIsland = selectedIsland;
        reset(false);
        onRevealComplete?.(completedIsland);
        onQuestionnaireComplete(completedIsland);
      },
      reduceMotion ? 140 : MIST_REVEAL_SETTLE_MS,
    );
  };
  const hasConversationStarted =
    conversationDraft.length > 0 ||
    conversationMessages.some((message) => message.role === "user");
  const showsWaitingIndicator =
    conversationIsStreaming &&
    conversationMessages.at(-1)?.role !== "assistant";
  const triggerConversationCompletion = () => {
    if (!conversationComplete || completionInFlight.current) return;
    completionInFlight.current = true;
    conversationApplicationHandled.current = false;
    setIsRevealing(true);
    setMistPhase("calculating");
    onRevealStart?.(null);
  };
  const completeConversationReveal = () => {
    if (
      conversationApplicationStatus !== "applied" ||
      conversationApplicationHandled.current ||
      !completionInFlight.current ||
      !worldIsReady
    ) {
      return;
    }
    conversationApplicationHandled.current = true;
    setMistPhase("revealing");
    completionTimer.current = setTimeout(
      () => {
        if (!isVisible.current) {
          reset();
          return;
        }
        reset(false);
        onRevealComplete?.(null);
        onChatComplete?.();
      },
      reduceMotion ? 140 : MIST_REVEAL_SETTLE_MS,
    );
  };
  const showConversationApplicationFailure = () => {
    if (conversationApplicationStatus !== "failed") return;
    completionInFlight.current = false;
    setIsRevealing(false);
    setMistPhase("conversation");
  };
  const questionnaireBlocksContent =
    isRevealing && questionnaireSubmissionStatus !== "failed";

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
      style={StyleSheet.absoluteFill}
    >
      <GlassMistBackdrop
        phase={mistPhase}
        reduceTransparency={reduceTransparency}
        supportsLiquidGlass={supportsLiquidGlass}
      />
      <View ref={cleanupRef.current} style={{ position: "absolute" }} />
      {questionnaireBlocksContent ? null : (
        <Animated.View
          accessibilityElementsHidden={questionnaireBlocksContent}
          importantForAccessibility={
            questionnaireBlocksContent ? "no-hide-descendants" : "auto"
          }
          onLayout={() => {
            if (isOpening) setIsOpening(false);
          }}
          pointerEvents={questionnaireBlocksContent ? "none" : "auto"}
          style={[
            {
              flex: 1,
              gap: 14,
              paddingTop: safeAreaInsets.top + 8,
              paddingBottom: Math.max(safeAreaInsets.bottom, 14),
              paddingHorizontal: 16,
            },
            modalMotionStyle,
          ]}
        >
          <View
            style={{
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              {mode === "questionnaire" &&
              questionnaireSubmissionStatus === "idle" ? (
                <GlassSurface
                  isInteractive
                  reduceTransparency={reduceTransparency}
                  supportsLiquidGlass={supportsLiquidGlass}
                  style={{ borderRadius: 22 }}
                >
                  <Pressable
                    accessibilityLabel="Return to chat"
                    accessibilityRole="button"
                    onPress={() => {
                      setMode("chat");
                      setSelectedIsland(null);
                      onIslandFocusRequest?.(null);
                    }}
                    style={{
                      width: 44,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Image
                      source="sf:chevron.left"
                      style={{ width: 12, height: 18 }}
                      tintColor={GLASS_INK}
                    />
                  </Pressable>
                </GlassSurface>
              ) : null}
              <GlassSurface
                isInteractive
                reduceTransparency={reduceTransparency}
                supportsLiquidGlass={supportsLiquidGlass}
                style={{ borderRadius: 22 }}
              >
                <Pressable
                  accessibilityLabel="Close check in"
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: conversationApplicationStatus === "calculating",
                  }}
                  disabled={conversationApplicationStatus === "calculating"}
                  onPress={close}
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    source="sf:xmark"
                    style={{ width: 16, height: 16 }}
                    tintColor={GLASS_INK}
                  />
                </Pressable>
              </GlassSurface>
            </View>
          </View>

          {mode === "questionnaire" && selectedIsland && question ? (
            <>
              <GlassProgress
                accessibilityLabel="Questionnaire progress"
                progress={(questionIndex + 1) / questionnaire.length}
                reduceTransparency={reduceTransparency}
                supportsLiquidGlass={supportsLiquidGlass}
              />
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                  gap: 28,
                  paddingHorizontal: 8,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={{ gap: 10 }}>
                  <Text
                    selectable
                    style={{
                      color: GLASS_INK,
                      textAlign: "center",
                      fontSize: 31,
                      fontWeight: "700",
                      lineHeight: 39,
                    }}
                  >
                    {question.prompt}
                  </Text>
                  {question.detail ? (
                    <Text
                      selectable
                      style={{
                        color: GLASS_QUIET_INK,
                        textAlign: "center",
                        fontSize: 15,
                        lineHeight: 22,
                      }}
                    >
                      {question.detail}
                    </Text>
                  ) : null}
                </View>
                {question.kind === "choice" ? (
                  <View style={{ gap: 12 }}>
                    {question.options.map((option) => (
                      <GlassSurface
                        key={option}
                        isInteractive
                        reduceTransparency={reduceTransparency}
                        supportsLiquidGlass={supportsLiquidGlass}
                        style={{ borderRadius: 22 }}
                      >
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => advance(option, false)}
                          style={({ pressed }) => ({
                            minHeight: 58,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 22,
                            backgroundColor: pressed
                              ? "rgba(230,127,94,0.14)"
                              : "transparent",
                            paddingHorizontal: 18,
                          })}
                        >
                          <Text
                            style={{
                              color: GLASS_INK,
                              fontSize: 16,
                              fontWeight: "600",
                            }}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      </GlassSurface>
                    ))}
                  </View>
                ) : (
                  <GlassSurface
                    isInteractive
                    reduceTransparency={reduceTransparency}
                    supportsLiquidGlass={supportsLiquidGlass}
                    style={{
                      minHeight: 58,
                      flexDirection: "row",
                      alignItems: "flex-end",
                      borderRadius: 29,
                      paddingLeft: 18,
                      paddingRight: 7,
                      paddingVertical: 7,
                    }}
                  >
                    <TextInput
                      autoFocus
                      accessibilityLabel="Question answer"
                      keyboardType={
                        question.kind === "number"
                          ? "number-pad"
                          : question.kind === "time"
                            ? "numbers-and-punctuation"
                            : "default"
                      }
                      multiline={question.kind === "text"}
                      onChangeText={setAnswer}
                      onSubmitEditing={() =>
                        answer.trim() && advance(answer, false)
                      }
                      placeholder={question.placeholder}
                      placeholderTextColor="#829190"
                      value={answer}
                      style={{
                        flex: 1,
                        minHeight: 44,
                        maxHeight: 120,
                        color: GLASS_INK,
                        fontSize: 16,
                        paddingVertical: 10,
                      }}
                    />
                    {question.unit ? (
                      <Text
                        style={{ color: GLASS_QUIET_INK, paddingBottom: 13 }}
                      >
                        {question.unit}
                      </Text>
                    ) : null}
                    <Pressable
                      accessibilityLabel="Submit answer"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !answer.trim() }}
                      disabled={!answer.trim()}
                      onPress={() => advance(answer, false)}
                      style={{
                        width: 44,
                        height: 44,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 22,
                        backgroundColor: answer.trim()
                          ? GLASS_CORAL
                          : "rgba(67,92,91,0.12)",
                      }}
                    >
                      <Image
                        source="sf:arrow.up"
                        style={{ width: 19, height: 19 }}
                        tintColor="white"
                      />
                    </Pressable>
                  </GlassSurface>
                )}
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Skip question"
                onPress={() => advance(null, true)}
                style={{
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: GLASS_QUIET_INK,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  Skip
                </Text>
              </Pressable>
              {questionnaireErrorMessage ? (
                <GlassSurface
                  reduceTransparency={reduceTransparency}
                  supportsLiquidGlass={supportsLiquidGlass}
                  style={{ borderRadius: 22, padding: 14, gap: 8 }}
                >
                  <Text
                    accessibilityLiveRegion="polite"
                    selectable
                    style={{ color: GLASS_INK, fontSize: 15, lineHeight: 21 }}
                  >
                    {questionnaireErrorMessage}
                  </Text>
                  {onQuestionnaireRetry ? (
                    <Pressable
                      accessibilityLabel="Retry guided check in"
                      accessibilityRole="button"
                      onPress={() => void onQuestionnaireRetry()}
                      style={{ minHeight: 44, justifyContent: "center" }}
                    >
                      <Text
                        style={{
                          color: "#ad533b",
                          fontSize: 15,
                          fontWeight: "600",
                        }}
                      >
                        Try again
                      </Text>
                    </Pressable>
                  ) : null}
                </GlassSurface>
              ) : null}
            </>
          ) : (
            <>
              <ScrollView
                ref={transcriptRef}
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "flex-start",
                  gap: 20,
                  paddingHorizontal: 4,
                  paddingVertical: 20,
                }}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() =>
                  hasConversationStarted
                    ? transcriptRef.current?.scrollToEnd({ animated: true })
                    : undefined
                }
                showsVerticalScrollIndicator={false}
              >
                <Animated.View
                  layout={LinearTransition.duration(reduceMotion ? 0 : 240)}
                  style={{ gap: 20 }}
                >
                  {!hasConversationStarted || showConversationEntryChoices ? (
                    <Text
                      selectable
                      style={{
                        color: GLASS_INK,
                        fontSize: 30,
                        fontWeight: "700",
                        lineHeight: 37,
                      }}
                    >
                      Good to see you
                      {firstName?.trim() ? `, ${firstName.trim()}` : ""}.
                    </Text>
                  ) : null}
                  {conversationMessages.map((message) => (
                    <ChatMessage
                      animate={message.id === animatedAssistantMessageId}
                      key={message.id}
                      message={message}
                    />
                  ))}
                  {showsWaitingIndicator ? (
                    <View
                      accessibilityLabel="Mindland is responding"
                      accessibilityLiveRegion="polite"
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        style={{
                          width: 28,
                          height: 28,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 14,
                          backgroundColor: "rgba(255,247,225,0.78)",
                        }}
                      >
                        <Image
                          source="sf:sparkles"
                          style={{ width: 14, height: 14 }}
                          tintColor={GLASS_CORAL}
                        />
                      </View>
                      <View
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        style={{ flexDirection: "row", gap: 5 }}
                      >
                        {[0, 1, 2].map((dot) => (
                          <View
                            key={dot}
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 3,
                              backgroundColor: GLASS_QUIET_INK,
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  ) : null}
                  {conversationErrorMessage ? (
                    <View
                      accessibilityLiveRegion="polite"
                      style={{
                        gap: 10,
                        borderRadius: 20,
                        borderCurve: "continuous",
                        backgroundColor: "rgba(255,244,231,0.88)",
                        padding: 14,
                      }}
                    >
                      <Text
                        selectable
                        style={{
                          color: GLASS_INK,
                          fontSize: 15,
                          lineHeight: 21,
                        }}
                      >
                        {conversationErrorMessage}
                      </Text>
                      {onConversationRetry ? (
                        <Pressable
                          accessibilityLabel="Retry the last message"
                          accessibilityRole="button"
                          onPress={() => void onConversationRetry()}
                          style={({ pressed }) => ({
                            alignSelf: "flex-start",
                            minHeight: 44,
                            justifyContent: "center",
                            borderRadius: 22,
                            backgroundColor: pressed
                              ? "rgba(230,127,94,0.18)"
                              : "rgba(230,127,94,0.11)",
                            paddingHorizontal: 16,
                          })}
                        >
                          <Text
                            style={{
                              color: "#ad533b",
                              fontSize: 15,
                              fontWeight: "600",
                            }}
                          >
                            Try again
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                  {!hasConversationStarted || showConversationEntryChoices ? (
                    <View style={{ gap: 4, paddingTop: 10 }}>
                      {islandWorld.islands.map((island) => (
                        <Pressable
                          key={island.id}
                          accessibilityLabel={`Open ${island.name} questionnaire`}
                          accessibilityRole="button"
                          onPress={() => openQuestionnaire(island.id)}
                          style={({ pressed }) => ({
                            minHeight: 54,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderBottomWidth: 1,
                            borderBottomColor: "rgba(48,78,76,0.12)",
                            opacity: pressed ? 0.62 : 1,
                            paddingHorizontal: 4,
                          })}
                        >
                          <Text
                            style={{
                              color: GLASS_INK,
                              fontSize: 18,
                              fontWeight: "600",
                            }}
                          >
                            {island.name}
                          </Text>
                          <Image
                            source="sf:chevron.right"
                            style={{ width: 11, height: 17 }}
                            tintColor={GLASS_QUIET_INK}
                          />
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </Animated.View>
              </ScrollView>
              <GlassSurface
                isInteractive
                reduceTransparency={reduceTransparency}
                supportsLiquidGlass={supportsLiquidGlass}
                style={{
                  minHeight: 58,
                  flexDirection: "row",
                  alignItems: "flex-end",
                  borderRadius: 29,
                  paddingLeft: 18,
                  paddingRight: 7,
                  paddingVertical: 7,
                }}
              >
                <TextInput
                  accessibilityLabel="Message Mindland"
                  editable={!conversationIsSending && !conversationIsFinished}
                  multiline
                  onChangeText={onConversationDraftChange}
                  onSubmitEditing={() => void onConversationSend()}
                  placeholder={
                    conversationIsFinished
                      ? "Today's check-in is complete"
                      : "How did today go?"
                  }
                  placeholderTextColor="#829190"
                  returnKeyType="send"
                  submitBehavior="submit"
                  value={conversationDraft}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    maxHeight: 120,
                    color: GLASS_INK,
                    fontSize: 16,
                    paddingVertical: 10,
                  }}
                />
                <Pressable
                  accessibilityLabel="Send message"
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled:
                      !conversationDraft.trim() ||
                      conversationIsSending ||
                      conversationIsFinished,
                  }}
                  disabled={
                    !conversationDraft.trim() ||
                    conversationIsSending ||
                    conversationIsFinished
                  }
                  onPress={() => void onConversationSend()}
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 22,
                    backgroundColor: conversationDraft.trim()
                      ? GLASS_CORAL
                      : "rgba(67,92,91,0.12)",
                  }}
                >
                  <Image
                    source="sf:arrow.up"
                    style={{ width: 19, height: 19 }}
                    tintColor="white"
                  />
                </Pressable>
              </GlassSurface>
            </>
          )}
        </Animated.View>
      )}
      {conversationComplete &&
      conversationApplicationStatus !== "failed" &&
      !isRevealing ? (
        <View
          accessibilityElementsHidden
          onLayout={triggerConversationCompletion}
          pointerEvents="none"
          style={{ position: "absolute", width: 1, height: 1 }}
        />
      ) : null}
      {conversationApplicationStatus === "applied" &&
      isRevealing &&
      worldIsReady ? (
        <View
          accessibilityElementsHidden
          onLayout={completeConversationReveal}
          pointerEvents="none"
          style={{ position: "absolute", width: 1, height: 1 }}
        />
      ) : null}
      {conversationApplicationStatus === "failed" && isRevealing ? (
        <View
          accessibilityElementsHidden
          onLayout={showConversationApplicationFailure}
          pointerEvents="none"
          style={{ position: "absolute", width: 1, height: 1 }}
        />
      ) : null}
      {questionnaireSubmissionStatus === "applied" &&
      isRevealing &&
      worldIsReady ? (
        <View
          accessibilityElementsHidden
          onLayout={completeQuestionnaireReveal}
          pointerEvents="none"
          style={{ position: "absolute", width: 1, height: 1 }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}
