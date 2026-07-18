import { useAuth, useSession } from "@clerk/expo";
import { AuthView } from "@clerk/expo/native";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { DirectIslandWorld } from "./src/components/direct-island-world";
import { CheckInModal } from "./src/components/check-in-modal";
import { MapOverlay } from "./src/components/map-overlay";
import { IslandId } from "./src/data/islands";

export default function App() {
  const { isLoaded } = useAuth({ treatPendingAsSignedOut: false });
  const { session } = useSession();
  const [selectedIsland, setSelectedIsland] = useState<IslandId | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);

  if (!isLoaded) {
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

  if (session?.status !== "active") {
    return (
      <View style={{ flex: 1, backgroundColor: "#f8f2e8" }}>
        <StatusBar style="dark" />
        <AuthView isDismissible={false} mode="signInOrUp" />
      </View>
    );
  }

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
