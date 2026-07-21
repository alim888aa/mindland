import { requireOptionalNativeModule } from "expo-modules-core";
import { type ReactNode, useSyncExternalStore } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";

const glassEffect = requireOptionalNativeModule("ExpoGlassEffect")
  ? (require("expo-glass-effect") as typeof import("expo-glass-effect"))
  : null;
const blurEffect = requireOptionalNativeModule("ExpoBlur")
  ? (require("expo-blur") as typeof import("expo-blur"))
  : null;

export const GLASS_INK = "#263d3d";
export const GLASS_QUIET_INK = "#607474";
export const GLASS_CORAL = "#e67f5e";
export const MIST_REVEAL_DURATION_MS = 200;
export const MIST_REVEAL_SETTLE_MS = 220;

let systemReduceTransparency = false;
let reduceTransparencySubscription: ReturnType<
  typeof AccessibilityInfo.addEventListener
> | null = null;
const reduceTransparencyListeners = new Set<() => void>();

const publishReduceTransparency = (enabled: boolean) => {
  if (systemReduceTransparency === enabled) return;
  systemReduceTransparency = enabled;
  reduceTransparencyListeners.forEach((listener) => listener());
};

const subscribeToReduceTransparency = (listener: () => void) => {
  reduceTransparencyListeners.add(listener);

  if (process.env.EXPO_OS === "ios" && reduceTransparencyListeners.size === 1) {
    reduceTransparencySubscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      publishReduceTransparency,
    );
    void AccessibilityInfo.isReduceTransparencyEnabled().then(
      publishReduceTransparency,
    );
  }

  return () => {
    reduceTransparencyListeners.delete(listener);
    if (reduceTransparencyListeners.size === 0) {
      reduceTransparencySubscription?.remove();
      reduceTransparencySubscription = null;
    }
  };
};

const getReduceTransparencySnapshot = () => systemReduceTransparency;

export function useReduceTransparency(override?: boolean) {
  const systemPreference = useSyncExternalStore(
    subscribeToReduceTransparency,
    getReduceTransparencySnapshot,
    getReduceTransparencySnapshot,
  );
  return override ?? systemPreference;
}

export function supportsNativeLiquidGlass() {
  return (
    process.env.EXPO_OS === "ios" &&
    glassEffect !== null &&
    glassEffect.isGlassEffectAPIAvailable() &&
    glassEffect.isLiquidGlassAvailable()
  );
}

export function GlassSurface({
  children,
  isInteractive = false,
  reduceTransparency,
  supportsLiquidGlass,
  style,
}: {
  children: ReactNode;
  isInteractive?: boolean;
  reduceTransparency: boolean;
  supportsLiquidGlass: boolean;
  style: StyleProp<ViewStyle>;
}) {
  if (!reduceTransparency && supportsLiquidGlass) {
    const GlassView = glassEffect!.GlassView;
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive={isInteractive}
        style={style}
        tintColor="rgba(255, 248, 232, 0.16)"
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        {
          overflow: "hidden",
          borderWidth: 1,
          borderColor: reduceTransparency
            ? "rgba(52, 74, 72, 0.12)"
            : "rgba(255, 255, 255, 0.58)",
          backgroundColor: reduceTransparency
            ? "#fffaf1"
            : "rgba(255, 252, 242, 0.54)",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function MistCloud({
  color,
  directionX,
  directionY,
  visible,
  reduceMotion,
  size,
  style,
}: {
  color: string;
  directionX: number;
  directionY: number;
  visible: boolean;
  reduceMotion: boolean;
  size: number;
  style: ViewStyle;
}) {
  const duration = reduceMotion ? 100 : MIST_REVEAL_DURATION_MS;
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, {
      duration: reduceMotion ? 80 : visible ? 160 : MIST_REVEAL_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    }),
    transform: [
      { translateX: withTiming(visible ? 0 : directionX, { duration }) },
      { translateY: withTiming(visible ? 0 : directionY, { duration }) },
      { scale: withTiming(visible ? 1 : 1.12, { duration }) },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
        animatedStyle,
      ]}
    />
  );
}

export function GlassMistBackdrop({
  phase,
  reduceTransparency,
  supportsLiquidGlass,
}: {
  phase: "conversation" | "calculating" | "revealing";
  reduceTransparency: boolean;
  supportsLiquidGlass: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const mistIsVisible = phase !== "revealing";
  const duration = reduceMotion ? 100 : MIST_REVEAL_DURATION_MS;
  const fallbackStyle = useAnimatedStyle(() => ({
    opacity: withTiming(phase === "revealing" ? 0 : 1, {
      duration,
      easing: Easing.out(Easing.cubic),
    }),
  }));
  const nativeGlassRevealStyle = useAnimatedStyle(() => ({
    opacity: withTiming(phase === "revealing" ? 0 : 1, {
      duration,
      easing: Easing.out(Easing.cubic),
    }),
  }));
  const revealVeilStyle = useAnimatedStyle(() => ({
    opacity: withTiming(
      phase === "calculating" ? 0.78 : phase === "conversation" ? 0.42 : 0,
      {
      duration: phase === "revealing" ? duration : reduceMotion ? 80 : 160,
      easing: Easing.out(Easing.cubic),
      },
    ),
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {!reduceTransparency && supportsLiquidGlass ? (
        (() => {
          const GlassView = glassEffect!.GlassView;
          return (
            <Animated.View
              style={[StyleSheet.absoluteFill, nativeGlassRevealStyle]}
            >
              <GlassView
                glassEffectStyle={{
                  style:
                    phase === "revealing" ? "none" : "regular",
                  animate: true,
                  animationDuration: duration / 1000,
                }}
                style={StyleSheet.absoluteFill}
                tintColor={
                  phase === "conversation"
                    ? "rgba(245, 255, 250, 0.10)"
                    : "rgba(235, 252, 246, 0.14)"
                }
              />
            </Animated.View>
          );
        })()
      ) : (
        <Animated.View style={[StyleSheet.absoluteFill, fallbackStyle]}>
          {reduceTransparency ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: phase === "calculating" ? "rgba(247, 250, 240, 0.96)" : "rgba(255, 250, 241, 0.82)" },
              ]}
            />
          ) : blurEffect ? (
            <blurEffect.BlurView
              intensity={phase === "calculating" ? 34 : 12}
              style={StyleSheet.absoluteFill}
              tint="systemUltraThinMaterialLight"
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: phase === "calculating" ? "rgba(239, 247, 239, 0.68)" : "rgba(255, 250, 241, 0.24)" },
              ]}
            />
          )}
        </Animated.View>
      )}

      {reduceTransparency ? null : (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgb(231, 252, 248)" },
            revealVeilStyle,
          ]}
        />
      )}

      {reduceTransparency ? null : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={StyleSheet.absoluteFill}
        >
          <MistCloud
            color="rgba(250,255,251,0.18)"
            directionX={-70}
            directionY={-24}
            visible={mistIsVisible}
            reduceMotion={reduceMotion}
            size={260}
            style={{ left: -104, top: 138 }}
          />
          <MistCloud
            color="rgba(239,255,250,0.16)"
            directionX={74}
            directionY={-18}
            visible={mistIsVisible}
            reduceMotion={reduceMotion}
            size={250}
            style={{ right: -116, top: 214 }}
          />
          <MistCloud
            color="rgba(255,250,237,0.14)"
            directionX={-66}
            directionY={34}
            visible={mistIsVisible}
            reduceMotion={reduceMotion}
            size={270}
            style={{ bottom: 76, left: -116 }}
          />
          <MistCloud
            color="rgba(249,255,251,0.17)"
            directionX={72}
            directionY={38}
            visible={mistIsVisible}
            reduceMotion={reduceMotion}
            size={278}
            style={{ bottom: 30, right: -128 }}
          />
        </View>
      )}

      {phase === "calculating" ? (
        <View
          accessibilityLabel="Mindland is updating your islands"
          accessibilityLiveRegion="polite"
          style={[
            StyleSheet.absoluteFill,
            { alignItems: "center", justifyContent: "center" },
          ]}
        >
          <ActivityIndicator color={GLASS_INK} size="large" />
        </View>
      ) : null}
    </View>
  );
}

export function GlassProgress({
  accessibilityLabel,
  label,
  progress,
  reduceTransparency,
  supportsLiquidGlass,
}: {
  accessibilityLabel: string;
  label?: string;
  progress: number;
  reduceTransparency: boolean;
  supportsLiquidGlass: boolean;
}) {
  const percent = Math.round(Math.max(0, Math.min(progress, 1)) * 100);
  return (
    <GlassSurface
      reduceTransparency={reduceTransparency}
      supportsLiquidGlass={supportsLiquidGlass}
      style={{
        borderRadius: 22,
        borderCurve: "continuous",
        paddingHorizontal: 15,
        paddingVertical: label ? 11 : 10,
        boxShadow: "0 8px 26px rgba(31, 73, 72, 0.12)",
      }}
    >
      <View style={{ gap: label ? 9 : 0 }}>
        {label ? (
          <Text style={{ color: GLASS_INK, fontSize: 14, fontWeight: "600" }}>
            {label}
          </Text>
        ) : null}
        <View
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          style={{
            height: 6,
            overflow: "hidden",
            borderRadius: 3,
            backgroundColor: "rgba(53,89,87,0.14)",
          }}
        >
          <View
            style={{
              width: `${percent}%`,
              height: "100%",
              borderRadius: 3,
              backgroundColor: GLASS_CORAL,
            }}
          />
        </View>
      </View>
    </GlassSurface>
  );
}
