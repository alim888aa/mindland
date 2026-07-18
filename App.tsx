import { useAuth, useSession } from "@clerk/expo";
import { AuthView } from "@clerk/expo/native";
import { useConvexAuth } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, Modal, Text, View } from "react-native";

import { DirectIslandWorld } from "./src/components/direct-island-world";
import { CheckInModal } from "./src/components/check-in-modal";
import { DevelopmentBackendProbe } from "./src/components/development-backend-probe";
import { MapOverlay } from "./src/components/map-overlay";
import { IslandId } from "./src/data/islands";

export default function App() {
  const { isLoaded, isSignedIn } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const sessionState = useSession();
  const convexAuth = useConvexAuth();
  const bypassAuth =
    __DEV__ && process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === "true";

  if (bypassAuth) {
    return <MindlandExperience />;
  }

  const clerkAuthResolved =
    isLoaded && sessionState.isLoaded && typeof isSignedIn === "boolean";
  const hasActiveClerkSession =
    isSignedIn && sessionState.session?.status === "active";
  const showAuth = clerkAuthResolved && !hasActiveClerkSession;

  let content = <OceanLoadingState />;

  if (hasActiveClerkSession && !convexAuth.isLoading) {
    if (!convexAuth.isAuthenticated) {
      content = <PrivateDataUnavailableState />;
    } else if (
      __DEV__ &&
      process.env.EXPO_PUBLIC_SHOW_BACKEND_PROBE === "true"
    ) {
      content = <DevelopmentBackendProbe />;
    } else {
      content = <MindlandExperience />;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#73d4da" }}>
      {content}
      <Modal
        animationType="fade"
        presentationStyle="fullScreen"
        visible={showAuth}
      >
        <View style={{ flex: 1, backgroundColor: "#f8f2e8" }}>
          <StatusBar style="dark" />
          <AuthView isDismissible={false} mode="signInOrUp" />
        </View>
      </Modal>
    </View>
  );
}

function PrivateDataUnavailableState() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 36,
        backgroundColor: "#73d4da",
      }}
    >
      <StatusBar style="dark" />
      <Text
        style={{
          color: "#173f47",
          fontSize: 18,
          lineHeight: 26,
          textAlign: "center",
        }}
      >
        Mindland could not open your private island data. Please reopen the app
        and try again.
      </Text>
    </View>
  );
}

function OceanLoadingState() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#73d4da",
      }}
    >
      <StatusBar style="dark" />
      <ActivityIndicator color="#fff3dc" size="large" />
    </View>
  );
}

function MindlandExperience() {
  const [selectedIsland, setSelectedIsland] = useState<IslandId | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: "#73d4da" }}>
      <StatusBar style="dark" />
      <DirectIslandWorld selectedIsland={selectedIsland}>
        <MapOverlay
          selectedIsland={selectedIsland}
          onSelect={setSelectedIsland}
          onClear={() => setSelectedIsland(null)}
          onCheckIn={() => setCheckInOpen(true)}
        />
      </DirectIslandWorld>
      <CheckInModal
        visible={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        onQuestionnaireComplete={(islandId) => {
          setCheckInOpen(false);
          setSelectedIsland(islandId);
        }}
      />
    </View>
  );
}
