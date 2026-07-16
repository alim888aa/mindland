import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { ISLAND_BY_ID, ISLANDS, IslandId } from "../data/islands";

type MapOverlayProps = {
  selectedIsland: IslandId | null;
  onSelect: (id: IslandId) => void;
  onClear: () => void;
  onCheckIn: () => void;
};

export const MapOverlay = ({
  selectedIsland,
  onSelect,
  onClear,
  onCheckIn,
}: MapOverlayProps) => {
  if (selectedIsland) {
    const island = ISLAND_BY_ID[selectedIsland];
    return (
      <View pointerEvents="box-none" style={{ position: "absolute", inset: 0 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to full map"
          onPress={onClear}
          style={({ pressed }) => ({
            position: "absolute",
            top: 58,
            left: 20,
            minHeight: 44,
            paddingHorizontal: 17,
            borderRadius: 22,
            borderCurve: "continuous",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? "#f6e6c8" : "#fff3dc",
            boxShadow: "0 5px 18px rgba(55, 81, 76, 0.2)",
          })}
        >
          <Text style={{ color: "#5d5145", fontSize: 16, fontWeight: "700" }}>
            Back to map
          </Text>
        </Pressable>

        <View
          style={{
            position: "absolute",
            top: 62,
            alignSelf: "center",
            paddingHorizontal: 22,
            paddingVertical: 10,
            borderRadius: 8,
            borderCurve: "continuous",
            backgroundColor: "#9a663d",
            borderWidth: 2,
            borderColor: "#bc8958",
            transform: [{ rotate: "1deg" }],
            boxShadow: "0 5px 12px rgba(73, 55, 42, 0.24)",
          }}
        >
          <Text style={{ color: "#fff7e9", fontSize: 22, fontWeight: "800" }}>
            {island.name}
          </Text>
        </View>

        <View
          style={{
            position: "absolute",
            bottom: 47,
            left: 24,
            right: 24,
            flexDirection: "row",
            gap: 12,
          }}
        >
          {[
            ["Summary", "A quick view of this island"],
            ["History", "See how it has changed"],
          ].map(([title, subtitle]) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flex: 1,
                padding: 15,
                gap: 3,
                borderRadius: 18,
                borderCurve: "continuous",
                backgroundColor: pressed
                  ? "rgba(255, 242, 218, 0.96)"
                  : "rgba(255, 248, 232, 0.9)",
                boxShadow: "0 7px 22px rgba(45, 93, 94, 0.18)",
              })}
            >
              <Text style={{ color: "#554b40", fontSize: 16, fontWeight: "800" }}>
                {title}
              </Text>
              <Text style={{ color: "#7c7064", fontSize: 12, lineHeight: 16 }}>
                {subtitle}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", inset: 0 }}>
      <View
        style={{
          position: "absolute",
          top: 56,
          right: 22,
          width: 46,
          height: 46,
          borderRadius: 23,
          borderCurve: "continuous",
          backgroundColor: "rgba(255, 244, 221, 0.9)",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 14px rgba(52, 91, 87, 0.18)",
        }}
      >
        <Image
          source="sf:location.north.fill"
          style={{ width: 22, height: 22 }}
          tintColor="#d67652"
        />
      </View>

      {ISLANDS.map((island) => (
        <Pressable
          key={island.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${island.name} island`}
          onPress={() => onSelect(island.id)}
          hitSlop={36}
          style={({ pressed }) => ({
            position: "absolute",
            top: island.labelTop,
            left: island.labelLeft,
            paddingHorizontal: 15,
            paddingVertical: 8,
            borderRadius: 7,
            borderCurve: "continuous",
            backgroundColor: pressed ? "#845332" : "#9c673e",
            borderWidth: 2,
            borderColor: "#bd8a58",
            transform: [
              { rotate: island.labelRotation },
              { scale: pressed ? 0.97 : 1 },
            ],
            boxShadow: "0 5px 12px rgba(67, 51, 38, 0.28)",
          })}
        >
          <Text
            style={{
              color: "#fff7e8",
              fontSize: island.id === "relationships" ? 15 : 17,
              fontFamily: "Chalkboard SE",
              fontWeight: "700",
              letterSpacing: 0.1,
            }}
          >
            {island.name}
          </Text>
        </Pressable>
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start daily check in"
        onPress={onCheckIn}
        style={({ pressed }) => ({
          position: "absolute",
          bottom: 16,
          alignSelf: "center",
          minWidth: 144,
          height: 52,
          borderRadius: 26,
          borderCurve: "continuous",
          backgroundColor: pressed ? "#f8e3c2" : "#fff0d4",
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(130, 98, 70, 0.14)",
          boxShadow: "0 7px 22px rgba(53, 88, 84, 0.24)",
        })}
      >
        <Image
          source="sf:heart.fill"
          style={{ width: 19, height: 19 }}
          tintColor="#e77c58"
        />
        <Text
          style={{
            color: "#554b42",
            fontFamily: "Chalkboard SE",
            fontSize: 17,
            fontWeight: "700",
          }}
        >
          Check in
        </Text>
      </Pressable>
    </View>
  );
};
