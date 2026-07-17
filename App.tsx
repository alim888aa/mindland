import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { View } from "react-native";

import { DirectIslandWorld } from "./src/components/direct-island-world";
import { CheckInModal } from "./src/components/check-in-modal";
import { MapOverlay } from "./src/components/map-overlay";
import { IslandId } from "./src/data/islands";

export default function App() {
  const [selectedIsland, setSelectedIsland] = useState<IslandId | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: "#73d4da" }}>
      <StatusBar style="dark" />
      <DirectIslandWorld selectedIsland={selectedIsland} />
      <MapOverlay
        selectedIsland={selectedIsland}
        onSelect={setSelectedIsland}
        onClear={() => setSelectedIsland(null)}
        onCheckIn={() => setCheckInOpen(true)}
      />
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
