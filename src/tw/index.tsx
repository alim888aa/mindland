import type React from "react";
import {
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from "react-native";
import { useCssElement } from "react-native-css";

export type ViewProps = React.ComponentProps<typeof RNView> & {
  className?: string;
};

export const View = (props: ViewProps) =>
  useCssElement(RNView, props, { className: "style" });

View.displayName = "CSS(View)";

export const Text = (
  props: React.ComponentProps<typeof RNText> & { className?: string },
) => useCssElement(RNText, props, { className: "style" });

Text.displayName = "CSS(Text)";

export const Pressable = (
  props: React.ComponentProps<typeof RNPressable> & { className?: string },
) => useCssElement(RNPressable, props, { className: "style" });

Pressable.displayName = "CSS(Pressable)";

export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  },
) =>
  useCssElement(RNScrollView, props, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  });

ScrollView.displayName = "CSS(ScrollView)";

export const TextInput = (
  props: React.ComponentProps<typeof RNTextInput> & { className?: string },
) => useCssElement(RNTextInput, props, { className: "style" });

TextInput.displayName = "CSS(TextInput)";
