import { useRef } from "react";
import { Image } from "expo-image";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  type ScrollView as ScrollViewType,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";

import {
  GlassMistBackdrop,
  GlassProgress,
  GlassSurface,
  supportsNativeLiquidGlass,
  useReduceTransparency,
} from "./glass-mist-shell";
import { MagicalAssistantText } from "./magical-assistant-text";

export type OnboardingInterviewMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export type OnboardingInterviewInsets = {
  top: number;
  bottom: number;
};

export type OnboardingInterviewProps = {
  messages: OnboardingInterviewMessage[];
  progress: number;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  isStreaming?: boolean;
  isSending?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  readyToCreate?: boolean;
  onCreateMap?: () => void;
  safeAreaInsets?: OnboardingInterviewInsets;
  reduceTransparency?: boolean;
  isRevealing?: boolean;
  presentationPhase?: "conversation" | "calculating" | "revealing";
  animatedAssistantMessageId?: string;
};

const INK = "#263d3d";
const QUIET_INK = "#607474";
const WARM_WHITE = "#fffaf0";
const CORAL = "#e67f5e";

function Message({
  animate,
  message,
}: {
  animate: boolean;
  message: OnboardingInterviewMessage;
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
            backgroundColor: "rgba(255, 250, 240, 0.9)",
            paddingHorizontal: 16,
            paddingVertical: 12,
            boxShadow: "0 6px 20px rgba(35, 68, 67, 0.08)",
          }}
        >
          <Text selectable style={{ color: INK, fontSize: 16, lineHeight: 23 }}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingRight: 22,
      }}
    >
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: 28,
          height: 28,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          backgroundColor: "rgba(255, 247, 225, 0.78)",
        }}
      >
        <Image
          source="sf:sparkles"
          style={{ width: 14, height: 14 }}
          tintColor={CORAL}
        />
      </View>
      <MagicalAssistantText animate={animate} style={{ paddingTop: 1 }}>
        {message.content}
      </MagicalAssistantText>
    </View>
  );
}

export function OnboardingInterview({
  messages,
  progress,
  draft,
  onDraftChange,
  onSend,
  isStreaming = false,
  isSending = false,
  errorMessage,
  onRetry,
  readyToCreate = false,
  onCreateMap,
  safeAreaInsets = { top: 58, bottom: 24 },
  reduceTransparency: reduceTransparencyOverride,
  isRevealing = false,
  presentationPhase = isRevealing ? "calculating" : "conversation",
  animatedAssistantMessageId,
}: OnboardingInterviewProps) {
  const reduceMotion = useReducedMotion();
  const reduceTransparency = useReduceTransparency(reduceTransparencyOverride);
  const transcriptRef = useRef<ScrollViewType>(null);
  const transcriptIsNearBottom = useRef(true);
  const supportsLiquidGlass = supportsNativeLiquidGlass();
  const canSend = draft.trim().length > 0 && !isSending && !isStreaming;
  const showsWaitingIndicator =
    isStreaming && messages.at(-1)?.role !== "assistant";
  const conversationHasUserMessage = messages.some(
    (message) => message.role === "user",
  );
  const chromeRevealStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isRevealing ? 0 : 1, {
      duration: reduceMotion ? 120 : 360,
      easing: Easing.out(Easing.cubic),
    }),
    transform: [
      {
        translateY: withTiming(isRevealing ? 10 : 0, {
          duration: reduceMotion ? 160 : 620,
          easing: Easing.out(Easing.cubic),
        }),
      },
    ],
  }));

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
    >
      <GlassMistBackdrop
        phase={presentationPhase}
        reduceTransparency={reduceTransparency}
        supportsLiquidGlass={supportsLiquidGlass}
      />

      <Animated.View
        accessibilityElementsHidden={isRevealing}
        importantForAccessibility={isRevealing ? "no-hide-descendants" : "auto"}
        pointerEvents={isRevealing ? "none" : "auto"}
        style={[
          {
            flex: 1,
            gap: 14,
            paddingTop: safeAreaInsets.top + 8,
            paddingBottom: Math.max(safeAreaInsets.bottom, 14),
            paddingHorizontal: 16,
          },
          chromeRevealStyle,
        ]}
      >
        <GlassProgress
          accessibilityLabel="Interview progress"
          label="Your world is taking shape"
          progress={progress}
          reduceTransparency={reduceTransparency}
          supportsLiquidGlass={supportsLiquidGlass}
        />

        <ScrollView
          ref={transcriptRef}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "flex-start",
            gap: 20,
            paddingHorizontal: 4,
            paddingBottom: 8,
            paddingTop: 28,
          }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (conversationHasUserMessage && transcriptIsNearBottom.current) {
              transcriptRef.current?.scrollToEnd({ animated: !isStreaming });
            }
          }}
          onScroll={({ nativeEvent }) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              nativeEvent;
            transcriptIsNearBottom.current =
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 72;
          }}
          scrollEventThrottle={32}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <Message
              animate={message.id === animatedAssistantMessageId}
              key={message.id}
              message={message}
            />
          ))}

          {showsWaitingIndicator ? (
            <View
              accessibilityLabel="Mindland is responding"
              accessibilityLiveRegion="polite"
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
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
                  backgroundColor: "rgba(255, 247, 225, 0.78)",
                }}
              >
                <Image
                  source="sf:sparkles"
                  style={{ width: 14, height: 14 }}
                  tintColor={CORAL}
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
                      backgroundColor: QUIET_INK,
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {errorMessage ? (
            <View
              accessibilityLiveRegion="polite"
              style={{
                gap: 10,
                borderRadius: 20,
                borderCurve: "continuous",
                backgroundColor: "rgba(255, 244, 231, 0.88)",
                padding: 14,
              }}
            >
              <Text
                selectable
                style={{ color: INK, fontSize: 15, lineHeight: 21 }}
              >
                {errorMessage}
              </Text>
              {onRetry ? (
                <Pressable
                  accessibilityLabel="Retry the last message"
                  accessibilityRole="button"
                  onPress={onRetry}
                  style={({ pressed }) => ({
                    alignSelf: "flex-start",
                    minHeight: 44,
                    justifyContent: "center",
                    borderRadius: 22,
                    backgroundColor: pressed
                      ? "rgba(230, 127, 94, 0.18)"
                      : "rgba(230, 127, 94, 0.11)",
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
        </ScrollView>

        {readyToCreate && onCreateMap ? (
          <GlassSurface
            isInteractive
            reduceTransparency={reduceTransparency}
            supportsLiquidGlass={supportsLiquidGlass}
            style={{
              borderRadius: 29,
              borderCurve: "continuous",
              boxShadow: "0 10px 28px rgba(37, 69, 66, 0.16)",
            }}
          >
            <Pressable
              accessibilityHint="Clears the mist and reveals the islands Mindland discovered"
              accessibilityLabel="Create my map"
              accessibilityRole="button"
              onPress={onCreateMap}
              style={({ pressed }) => ({
                minHeight: 58,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                borderRadius: 29,
                backgroundColor: pressed
                  ? "rgba(230, 127, 94, 0.14)"
                  : "transparent",
                paddingHorizontal: 22,
              })}
            >
              <Image
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                source="sf:wand.and.sparkles"
                style={{ width: 18, height: 18 }}
                tintColor={CORAL}
              />
              <Text style={{ color: INK, fontSize: 18, fontWeight: "700" }}>
                Create my map
              </Text>
            </Pressable>
          </GlassSurface>
        ) : null}

        <GlassSurface
          isInteractive
          reduceTransparency={reduceTransparency}
          supportsLiquidGlass={supportsLiquidGlass}
          style={{
            minHeight: 58,
            flexDirection: "row",
            alignItems: "flex-end",
            borderRadius: 29,
            borderCurve: "continuous",
            paddingLeft: 18,
            paddingRight: 7,
            paddingVertical: 7,
            boxShadow: "0 10px 28px rgba(37, 69, 66, 0.14)",
          }}
        >
          <TextInput
            accessibilityLabel="Message Mindland"
            editable={!isSending && !isStreaming}
            maxLength={2000}
            multiline
            onChangeText={onDraftChange}
            placeholder="Tell me what matters…"
            placeholderTextColor="#829190"
            style={{
              flex: 1,
              maxHeight: 120,
              minHeight: 44,
              color: INK,
              fontSize: 16,
              lineHeight: 22,
              paddingHorizontal: 0,
              paddingVertical: 10,
            }}
            value={draft}
          />
          <Pressable
            accessibilityLabel="Send message"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            hitSlop={6}
            onPress={onSend}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 22,
              backgroundColor: canSend
                ? pressed
                  ? "#cc684d"
                  : CORAL
                : "rgba(67, 92, 91, 0.12)",
            })}
          >
            <Image
              source="sf:arrow.up"
              style={{ width: 20, height: 20 }}
              tintColor={canSend ? WARM_WHITE : "rgba(54, 76, 75, 0.36)"}
            />
          </Pressable>
        </GlassSurface>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}
