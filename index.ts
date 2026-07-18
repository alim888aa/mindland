import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { registerRootComponent } from "expo";
import { createElement } from "react";

import App from "./App";
import "./src/global.css";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing from .env");
}

const MindlandRoot = () =>
  createElement(
    ClerkProvider,
    { publishableKey, tokenCache },
    createElement(App),
  );

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(MindlandRoot);
