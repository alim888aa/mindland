import { useSmoothText } from "@convex-dev/agent/react";
import { Text, type TextStyle } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

export function MagicalAssistantText({
  animate = false,
  children,
  style,
}: {
  animate?: boolean;
  children: string;
  style?: TextStyle;
}) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion;
  const [visibleText] = useSmoothText(children, {
    startStreaming: shouldAnimate,
  });

  return (
    <Animated.View
      entering={shouldAnimate ? FadeIn.duration(220) : undefined}
      style={{ flex: 1 }}
    >
      <Text
        accessibilityLabel={children}
        selectable
        style={[
          {
            color: "#263d3d",
            fontSize: 17,
            lineHeight: 25,
            textShadowColor: shouldAnimate
              ? "rgba(255, 240, 184, 0.48)"
              : reduceMotion
              ? "transparent"
              : "rgba(255, 247, 218, 0.18)",
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: reduceMotion ? 0 : shouldAnimate ? 7 : 3,
          },
          style,
        ]}
      >
        {shouldAnimate ? visibleText : children}
      </Text>
    </Animated.View>
  );
}
