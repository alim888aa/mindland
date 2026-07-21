import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { registerRootComponent } from "expo";
import { createElement } from "react";

import App from "./App";
import "./src/global.css";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const clerkTokenCache =
  __DEV__ && process.env.EXPO_PUBLIC_DEV_MEMORY_TOKEN_CACHE === "true"
    ? undefined
    : tokenCache;

if (!publishableKey) {
  throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing from .env");
}

if (!convexUrl) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is missing from .env.local");
}

const convex = new ConvexReactClient(convexUrl);

const MindlandRoot = () =>
  createElement(
    ClerkProvider,
    {
      publishableKey,
      tokenCache: clerkTokenCache,
      children: createElement(ConvexProviderWithClerk, {
        client: convex,
        useAuth,
        children: createElement(App),
      }),
    },
  );

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(MindlandRoot);
