import { Image } from "expo-image";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { ISLAND_BY_ID, ISLANDS, type IslandId } from "../data/islands";

type CheckInModalProps = {
  visible: boolean;
  onClose: () => void;
};

const QUESTION_BY_ISLAND: Record<IslandId, string> = {
  health: "What did you do for your health today?",
  relationships: "How did you connect with someone today?",
  work: "What moved forward at work today?",
  learning: "What did you learn or practise today?",
};

export const CheckInModal = ({ visible, onClose }: CheckInModalProps) => {
  const [selectedIsland, setSelectedIsland] = useState<IslandId | null>(null);
  const [entry, setEntry] = useState("");

  const close = () => {
    setSelectedIsland(null);
    setEntry("");
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="fullScreen"
      visible={visible}
      onRequestClose={close}
    >
      <View style={{ flex: 1, backgroundColor: "#72d7d7" }}>
        <Image
          source={require("../../assets/water-texture.png")}
          contentFit="cover"
          style={{ position: "absolute", inset: 0, opacity: 0.72 }}
        />
        <View style={{ flex: 1, paddingTop: 48, paddingBottom: 12 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 18 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close check in"
              onPress={close}
              style={({ pressed }) => ({
                alignSelf: "flex-end",
                minWidth: 72,
                height: 42,
                borderRadius: 21,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? "#f5e4c5" : "#fff1d7",
              })}
            >
              <Text style={{ color: "#5d5145", fontSize: 15, fontWeight: "700" }}>Close</Text>
            </Pressable>

            <View style={{ flex: 1, justifyContent: "center" }}>
              <View
                style={{
                  padding: 24,
                  borderRadius: 28,
                  borderCurve: "continuous",
                  backgroundColor: "#fff4df",
                  boxShadow: "0 10px 30px rgba(42, 89, 86, 0.2)",
                }}
              >
                <Text
                  style={{
                    color: "#4f473f",
                    fontFamily: "Chalkboard SE",
                    fontSize: 27,
                    fontWeight: "700",
                    lineHeight: 34,
                    textAlign: "center",
                  }}
                >
                  {selectedIsland
                    ? QUESTION_BY_ISLAND[selectedIsland]
                    : "How did it go today?"}
                </Text>

                {selectedIsland ? (
                  <View style={{ marginTop: 22, gap: 14 }}>
                    <TextInput
                      accessibilityLabel="Check in entry"
                      multiline
                      value={entry}
                      onChangeText={setEntry}
                      placeholder={`Tell me about ${ISLAND_BY_ID[selectedIsland].name.toLowerCase()}…`}
                      placeholderTextColor="#958777"
                      style={{
                        minHeight: 122,
                        padding: 16,
                        borderRadius: 18,
                        borderCurve: "continuous",
                        backgroundColor: "#fffaf0",
                        color: "#4f473f",
                        fontSize: 17,
                        lineHeight: 23,
                        textAlignVertical: "top",
                      }}
                    />
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Pressable
                        onPress={() => setSelectedIsland(null)}
                        style={{
                          flex: 1,
                          height: 50,
                          borderRadius: 25,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#ead9bb",
                        }}
                      >
                        <Text style={{ color: "#66594d", fontWeight: "700" }}>Back</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Save check in"
                        onPress={close}
                        style={({ pressed }) => ({
                          flex: 1.5,
                          height: 50,
                          borderRadius: 25,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: pressed ? "#df7654" : "#eb825e",
                        })}
                      >
                        <Text style={{ color: "#fffaf0", fontWeight: "800" }}>Add to island</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={{ marginTop: 22, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    {ISLANDS.map((island) => (
                      <Pressable
                        key={island.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Check in to ${island.name}`}
                        onPress={() => setSelectedIsland(island.id)}
                        style={({ pressed }) => ({
                          width: "48%",
                          minHeight: 58,
                          borderRadius: 17,
                          borderCurve: "continuous",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: pressed ? "#ead8b9" : "#f3e3c5",
                        })}
                      >
                        <Text
                          style={{
                            color: "#665448",
                            fontFamily: "Chalkboard SE",
                            fontSize: island.id === "relationships" ? 15 : 17,
                            fontWeight: "700",
                          }}
                        >
                          {island.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};
