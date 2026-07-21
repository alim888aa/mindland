import { Image } from "expo-image";
import { useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";

import type { IslandId, RuntimeIslandWorld } from "../data/islands";
import {
  getWorldViewSnapshot,
  subscribeToWorldView,
} from "../lib/world-view-store";
import { AccountButton, ClearMapGlass } from "./account-button";

type MapOverlayProps = {
  islandWorld: RuntimeIslandWorld;
  selectedIsland: IslandId | null;
  onSelect: (id: IslandId) => void;
  onCheckIn: () => void;
  onOpenInfo: (id: IslandId) => void;
};

const CheckInControl = ({ onCheckIn }: { onCheckIn: () => void }) => (
  <ClearMapGlass
    style={{
      minWidth: 144,
      height: 52,
      borderRadius: 26,
      borderCurve: "continuous",
      boxShadow: "0 7px 22px rgba(53, 88, 84, 0.24)",
    }}
  >
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Start daily check in"
      onPress={onCheckIn}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <Image
        source="sf:heart.fill"
        style={{ width: 19, height: 19 }}
        tintColor="#e77c58"
      />
      <Text style={{ color: "#365753", fontSize: 17, fontWeight: "800" }}>
        Check in
      </Text>
    </Pressable>
  </ClearMapGlass>
);

const CheckInButton = ({ onCheckIn }: { onCheckIn: () => void }) => (
  <View style={{ position: "absolute", bottom: 16, alignSelf: "center" }}>
    <CheckInControl onCheckIn={onCheckIn} />
  </View>
);

export const MapOverlay = ({
  islandWorld,
  selectedIsland,
  onSelect,
  onCheckIn,
  onOpenInfo,
}: MapOverlayProps) => {
  const worldView = useSyncExternalStore(
    subscribeToWorldView,
    getWorldViewSnapshot,
    getWorldViewSnapshot,
  );

  if (selectedIsland) {
    const island = islandWorld.islandById[selectedIsland];
    if (!island) return null;
    return (
      <View pointerEvents="box-none" style={{ position: "absolute", inset: 0 }}>
        <View
          style={{
            position: "absolute",
            top: 62,
            alignSelf: "center",
            paddingHorizontal: 18,
            paddingVertical: 8,
          }}
        >
          <Text
            style={{
              color: "#fafffd",
              fontSize: 22,
              fontWeight: "800",
              textShadowColor: "rgba(24, 72, 69, 0.72)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 9,
            }}
          >
            {island.name}
          </Text>
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 16,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ClearMapGlass
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              borderCurve: "continuous",
              boxShadow: "0 7px 22px rgba(53, 88, 84, 0.2)",
            }}
          >
            <Pressable
              accessibilityLabel={`Open ${island.name} summary and history`}
              accessibilityRole="button"
              onPress={() => onOpenInfo(selectedIsland)}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.68 : 1,
              })}
            >
              <Image source="sf:book.pages" style={{ width: 20, height: 20 }} tintColor="#365753" />
            </Pressable>
          </ClearMapGlass>
          <CheckInControl onCheckIn={onCheckIn} />
        </View>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", inset: 0 }}>
      <AccountButton />

      {islandWorld.islands.map((island) => {
        const point = worldView.islandPoints[island.id];
        if (!point?.visible) return null;
        const landGrowthRatio = island.landScale / 0.42;
        const touchSize = Math.min(
          156,
          Math.max(72, 76 * worldView.labelScale * landGrowthRatio),
        );
        return (
          <Pressable
            accessible={false}
            collapsable={false}
            hitSlop={6}
            key={`land-${island.id}`}
            onPress={() => onSelect(island.id)}
            style={({ pressed }) => ({
              position: "absolute",
              top: point.y - touchSize / 2,
              left: point.x - touchSize / 2,
              width: touchSize,
              height: touchSize,
              borderRadius: touchSize / 2,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          />
        );
      })}

      {islandWorld.islands.map((island) => {
        if (!island.name) return null;
        const point = worldView.islandPoints[island.id];
        if (!point?.visible || !worldView.labelsVisible) return null;
        const width = Math.min(168, Math.max(92, island.name.length * 10 + 32));
        return (
          <Pressable
            key={island.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${island.name} island`}
            onPress={() => onSelect(island.id)}
            hitSlop={30}
            style={({ pressed }) => ({
              position: "absolute",
              top: point.y - 58,
              left: point.x - width / 2,
              width,
              minHeight: 38,
              paddingHorizontal: 12,
              paddingVertical: 7,
              alignItems: "center",
              justifyContent: "center",
              transform: [
                { rotate: island.labelRotation },
                {
                  scale:
                    worldView.labelScale * (pressed ? 0.97 : 1),
                },
              ],
            })}
          >
            {({ pressed }) => (
              <Text
                style={{
                  color: pressed ? "#dffff8" : "#fafffd",
                  fontSize: island.name.length > 13 ? 15 : 17,
                  fontWeight: "800",
                  letterSpacing: 0.2,
                  textShadowColor: "rgba(18, 70, 68, 0.88)",
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 8,
                }}
              >
                {island.name}
              </Text>
            )}
          </Pressable>
        );
      })}

      <CheckInButton onCheckIn={onCheckIn} />
    </View>
  );
};
