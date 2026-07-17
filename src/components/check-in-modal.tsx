import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  type ScrollView as RNScrollView,
} from "react-native";

import { ISLAND_BY_ID, ISLANDS, type IslandId } from "../data/islands";
import { cn } from "../lib/cn";
import { Pressable, ScrollView, Text, TextInput, View } from "../tw";

type CheckInModalProps = {
  visible: boolean;
  onClose: () => void;
  onQuestionnaireComplete: (islandId: IslandId) => void;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type ChoiceQuestion = {
  id: string;
  prompt: string;
  detail?: string;
  kind: "choice";
  options: string[];
};

type WrittenQuestion = {
  id: string;
  prompt: string;
  detail?: string;
  kind: "text" | "number";
  placeholder: string;
  unit?: string;
};

type Question = ChoiceQuestion | WrittenQuestion;

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Hey — how did today go?",
  },
  {
    id: "choice",
    role: "assistant",
    content:
      "Tell me whatever mattered, or choose an island for a quick guided check-in.",
  },
];

const QUESTIONNAIRES: Record<IslandId, Question[]> = {
  health: [
    {
      id: "health-feeling",
      prompt: "How did your health feel today?",
      kind: "choice",
      options: ["Good", "Okay", "Rough"],
    },
    {
      id: "health-support",
      prompt: "What supported it most?",
      detail: "Choose the closest answer.",
      kind: "choice",
      options: ["Movement", "Food", "Rest", "Something else"],
    },
    {
      id: "health-friction",
      prompt: "Did anything work against your health?",
      kind: "choice",
      options: ["No", "A little", "Yes"],
    },
    {
      id: "health-note",
      prompt: "Anything else worth remembering?",
      detail: "A short note is plenty.",
      kind: "text",
      placeholder: "I felt more energetic after…",
    },
  ],
  relationships: [
    {
      id: "relationships-feeling",
      prompt: "How connected did you feel today?",
      kind: "choice",
      options: ["Very", "Somewhat", "Not much"],
    },
    {
      id: "relationships-moment",
      prompt: "What moment stood out?",
      kind: "text",
      placeholder: "I called a friend and…",
    },
    {
      id: "relationships-effect",
      prompt: "How did it leave you feeling?",
      kind: "choice",
      options: ["Lighter", "Neutral", "Drained"],
    },
  ],
  work: [
    {
      id: "work-progress",
      prompt: "Did something move forward at work?",
      kind: "choice",
      options: ["Yes", "A little", "No"],
    },
    {
      id: "work-focus",
      prompt: "How long did you get to focus?",
      detail: "An estimate is fine.",
      kind: "number",
      placeholder: "45",
      unit: "minutes",
    },
    {
      id: "work-note",
      prompt: "What should this island remember?",
      kind: "text",
      placeholder: "I finally finished…",
    },
  ],
  learning: [
    {
      id: "learning-action",
      prompt: "Did you practise or learn today?",
      kind: "choice",
      options: ["Yes", "A little", "Not today"],
    },
    {
      id: "learning-time",
      prompt: "Roughly how long?",
      kind: "number",
      placeholder: "30",
      unit: "minutes",
    },
    {
      id: "learning-note",
      prompt: "What clicked for you?",
      kind: "text",
      placeholder: "I understood why…",
    },
  ],
};

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  if (message.role === "user") {
    return (
      <View className="mb-5 items-end">
        <View
          className="max-w-[84%] rounded-[24px] rounded-br-[8px] bg-[#EDE6DC] px-4 py-3"
          style={{ borderCurve: "continuous" }}
        >
          <Text className="font-sans text-[16px] leading-6 text-[#312C28]">
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-5 flex-row items-start gap-3 pr-8">
      <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-[#F5D8C8]">
        <Text className="text-[15px] text-[#BC6749]">✦</Text>
      </View>
      <Text className="flex-1 pt-1 font-sans text-[16px] leading-6 text-[#312C28]">
        {message.content}
      </Text>
    </View>
  );
};

export const CheckInModal = ({
  visible,
  onClose,
  onQuestionnaireComplete,
}: CheckInModalProps) => {
  const chatScrollRef = useRef<RNScrollView>(null);
  const [mode, setMode] = useState<"chat" | "questionnaire">("chat");
  const [selectedIsland, setSelectedIsland] = useState<IslandId | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);

  const resetQuestionnaire = () => {
    setMode("chat");
    setSelectedIsland(null);
    setQuestionIndex(0);
    setWrittenAnswer("");
  };

  const close = () => {
    resetQuestionnaire();
    setDraft("");
    onClose();
  };

  const openQuestionnaire = (islandId: IslandId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedIsland(islandId);
    setQuestionIndex(0);
    setWrittenAnswer("");
    setMode("questionnaire");
  };

  const finishQuestionnaire = (islandId: IslandId) => {
    resetQuestionnaire();
    setMessages((current) => [
      ...current,
      {
        id: `questionnaire-${Date.now()}`,
        role: "assistant",
        content: `${ISLAND_BY_ID[islandId].name} is checked in. I’ll add the new detail to its island.`,
      },
    ]);
    onQuestionnaireComplete(islandId);
  };

  const advanceQuestionnaire = () => {
    if (!selectedIsland) return;

    const questions = QUESTIONNAIRES[selectedIsland];
    if (questionIndex >= questions.length - 1) {
      finishQuestionnaire(selectedIsland);
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setQuestionIndex((current) => current + 1);
    setWrittenAnswer("");
  };

  const sendWrittenAnswer = () => {
    if (!writtenAnswer.trim()) return;
    advanceQuestionnaire();
  };

  const sendMessage = () => {
    const content = draft.trim();
    if (!content) return;

    const createdAt = Date.now();
    setMessages((current) => [
      ...current,
      { id: `user-${createdAt}`, role: "user", content },
      {
        id: `assistant-${createdAt}`,
        role: "assistant",
        content:
          "Got it. What else felt meaningful today? I’ll connect the pieces before updating your map.",
      },
    ]);
    setDraft("");
  };

  const question = selectedIsland
    ? QUESTIONNAIRES[selectedIsland][questionIndex]
    : null;

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: "#FBF8F2" }}
      >
        {mode === "chat" ? (
          <View className="flex-1 bg-[#FBF8F2] pt-14">
            <View className="flex-row items-center justify-between border-b border-[#E8E1D7] px-5 pb-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close check in"
                className="h-11 w-11 items-center justify-center rounded-full bg-[#EFE9E0] active:bg-[#E3DBD0]"
                onPress={close}
              >
                <Text className="text-[22px] leading-6 text-[#4A433D]">‹</Text>
              </Pressable>

              <View className="items-center">
                <Text className="font-rounded text-[17px] font-semibold text-[#302B27]">
                  Daily check-in
                </Text>
                <Text className="mt-0.5 font-sans text-[12px] text-[#8B8177]">
                  Your map is listening
                </Text>
              </View>

              <View className="h-11 w-11" />
            </View>

            <ScrollView
              ref={chatScrollRef}
              className="flex-1"
              contentContainerClassName="px-5 pb-6 pt-7"
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() =>
                chatScrollRef.current?.scrollToEnd({ animated: true })
              }
            >
              <View className="mb-7 items-center">
                <View className="rounded-full bg-[#F0EAE2] px-3 py-1.5">
                  <Text className="font-sans text-[12px] font-medium text-[#746A61]">
                    Today
                  </Text>
                </View>
              </View>

              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </ScrollView>

            <View className="border-t border-[#E8E1D7] bg-[#FBF8F2] px-4 pb-7 pt-3">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-3"
                contentContainerClassName="gap-2 px-1"
                keyboardShouldPersistTaps="handled"
              >
                {ISLANDS.map((island) => (
                  <Pressable
                    key={island.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${island.name} questionnaire`}
                    className="min-h-11 justify-center rounded-full border border-[#DDD4C8] bg-[#FFFDF9] px-4 active:bg-[#F1EAE1]"
                    onPress={() => openQuestionnaire(island.id)}
                  >
                    <Text className="font-sans text-[14px] font-medium text-[#5D554E]">
                      {island.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View
                className="min-h-[58px] flex-row items-end rounded-[28px] border border-[#DDD4C8] bg-white px-4 py-2.5"
                style={{
                  borderCurve: "continuous",
                  boxShadow: "0 6px 18px rgba(76, 61, 48, 0.08)",
                }}
              >
                <TextInput
                  accessibilityLabel="Message Mindland"
                  className="max-h-28 min-h-9 flex-1 py-1 font-sans text-[16px] leading-6 text-[#312C28]"
                  multiline
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={sendMessage}
                  placeholder="How did today go?"
                  placeholderTextColor="#968C82"
                  returnKeyType="send"
                  submitBehavior="submit"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                  className={cn(
                    "will-change-pressable ml-2 h-11 w-11 items-center justify-center rounded-full",
                    draft.trim()
                      ? "bg-[#DB7655] active:bg-[#C96749]"
                      : "bg-[#E7E0D7]",
                  )}
                  disabled={!draft.trim()}
                  onPress={sendMessage}
                >
                  <Text
                    className={cn(
                      "text-[21px] font-semibold",
                      draft.trim() ? "text-white" : "text-[#AAA097]",
                    )}
                  >
                    ↑
                  </Text>
                </Pressable>
              </View>
              <Text className="mt-2 text-center font-sans text-[11px] text-[#A0968C]">
                You can correct anything before it changes your map.
              </Text>
            </View>
          </View>
        ) : (
          <View className="flex-1 bg-[#FBF8F2] px-6 pb-8 pt-14">
            <View className="flex-row items-center justify-between">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Return to chat"
                className="h-11 w-11 items-center justify-center rounded-full bg-[#EFE9E0] active:bg-[#E3DBD0]"
                onPress={resetQuestionnaire}
              >
                <Text className="text-[22px] leading-6 text-[#4A433D]">‹</Text>
              </Pressable>

              <View className="rounded-full bg-[#F1E8DD] px-4 py-2">
                <Text className="font-sans text-[13px] font-semibold text-[#62584F]">
                  {selectedIsland ? ISLAND_BY_ID[selectedIsland].name : "Island"}
                </Text>
              </View>

              <View className="h-11 w-11" />
            </View>

            {selectedIsland && question ? (
              <>
                <View className="mt-9">
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="font-sans text-[12px] font-medium text-[#91867B]">
                      {questionIndex + 1} of {QUESTIONNAIRES[selectedIsland].length}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Skip question"
                      className="min-h-11 min-w-11 items-center justify-center px-1"
                      onPress={advanceQuestionnaire}
                    >
                      <Text className="font-sans text-[13px] font-semibold text-[#8C6B5D]">
                        Skip
                      </Text>
                    </Pressable>
                  </View>
                  <View className="h-1.5 overflow-hidden rounded-full bg-[#E8E0D6]">
                    <View
                      className="h-full rounded-full bg-[#DC7A59]"
                      style={{
                        width: `${((questionIndex + 1) / QUESTIONNAIRES[selectedIsland].length) * 100}%`,
                      }}
                    />
                  </View>
                </View>

                <ScrollView
                  className="flex-1"
                  contentContainerClassName="grow justify-center pb-16 pt-8"
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text className="text-center font-rounded text-[31px] font-semibold leading-[39px] text-[#302B27]">
                    {question.prompt}
                  </Text>
                  {question.detail ? (
                    <Text className="mt-3 text-center font-sans text-[15px] leading-6 text-[#887E74]">
                      {question.detail}
                    </Text>
                  ) : null}

                  {question.kind === "choice" ? (
                    <View className="mt-10 gap-3">
                      {question.options.map((option) => (
                        <Pressable
                          key={option}
                          accessibilityRole="button"
                          className="min-h-[58px] items-center justify-center rounded-[20px] border border-[#DED5CA] bg-[#FFFDF9] px-5 active:border-[#D78364] active:bg-[#F9E9DF]"
                          onPress={advanceQuestionnaire}
                          style={{ borderCurve: "continuous" }}
                        >
                          <Text className="font-sans text-[16px] font-semibold text-[#514942]">
                            {option}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View
                      className="mt-10 flex-row items-end rounded-[24px] border border-[#DED5CA] bg-white px-4 py-3"
                      style={{
                        borderCurve: "continuous",
                        boxShadow: "0 8px 24px rgba(76, 61, 48, 0.08)",
                      }}
                    >
                      <TextInput
                        autoFocus
                        accessibilityLabel="Question answer"
                        className={cn(
                          "min-h-10 flex-1 py-1 font-sans text-[17px] leading-6 text-[#312C28]",
                          question.kind === "text" && "max-h-32",
                        )}
                        keyboardType={
                          question.kind === "number" ? "number-pad" : "default"
                        }
                        multiline={question.kind === "text"}
                        onChangeText={setWrittenAnswer}
                        onSubmitEditing={sendWrittenAnswer}
                        placeholder={question.placeholder}
                        placeholderTextColor="#9D9389"
                        returnKeyType="done"
                        value={writtenAnswer}
                      />
                      {question.unit ? (
                        <Text className="mb-2 mr-2 font-sans text-[14px] text-[#8B8177]">
                          {question.unit}
                        </Text>
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Submit answer"
                        className={cn(
                          "will-change-pressable ml-2 h-11 w-11 items-center justify-center rounded-full",
                          writtenAnswer.trim()
                            ? "bg-[#DB7655] active:bg-[#C96749]"
                            : "bg-[#E7E0D7]",
                        )}
                        disabled={!writtenAnswer.trim()}
                        onPress={sendWrittenAnswer}
                      >
                        <Text
                          className={cn(
                            "text-[21px] font-semibold",
                            writtenAnswer.trim()
                              ? "text-white"
                              : "text-[#AAA097]",
                          )}
                        >
                          ↑
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </ScrollView>

                <Text className="text-center font-sans text-[12px] leading-5 text-[#9B9187]">
                  Your answers are combined into one daily island node.
                </Text>
              </>
            ) : null}
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};
