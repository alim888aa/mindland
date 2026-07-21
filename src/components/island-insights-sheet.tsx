import { usePaginatedQuery, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { IslandId } from "../data/islands";
import { ClearMapGlass } from "./account-button";

type InsightsTab = "summary" | "history";

const DETAIL_LABELS: Readonly<Record<string, string>> = {
  sapling: "Sapling",
  flowerPatch: "Flower patch",
  gardenBed: "Garden bed",
  trailMarker: "Trail marker",
  restBench: "Rest bench",
  bookStack: "Book stack",
  practiceMarker: "Practice marker",
  warmLantern: "Warm lantern",
  grove: "Grove",
  hill: "Hill",
  windingPath: "Winding path",
  smallShelter: "Small shelter",
  lookout: "Lookout",
};

const detailLabel = (key: string) => DETAIL_LABELS[key] ?? key;

const dayLabel = (localDate: string) => {
  const date = new Date(`${localDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return localDate;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <View
    style={{
      flex: 1,
      minWidth: 128,
      gap: 3,
      borderRadius: 18,
      borderCurve: "continuous",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: "rgba(255, 255, 255, 0.24)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.42)",
    }}
  >
    <Text selectable style={{ color: "#274743", fontSize: 22, fontWeight: "800" }}>
      {value}
    </Text>
    <Text selectable style={{ color: "rgba(39, 71, 67, 0.68)", fontSize: 13 }}>
      {label}
    </Text>
  </View>
);

const EmptyState = ({ children }: { children: string }) => (
  <View style={{ alignItems: "center", gap: 10, paddingHorizontal: 28, paddingVertical: 44 }}>
    <Image source="sf:water.waves" style={{ width: 28, height: 28 }} tintColor="#6f918c" />
    <Text
      selectable
      style={{ color: "rgba(39, 71, 67, 0.68)", fontSize: 15, lineHeight: 22, textAlign: "center" }}
    >
      {children}
    </Text>
  </View>
);

export function IslandInsightsSheet({
  islandId,
  onClose,
}: {
  islandId: IslandId;
  onClose: () => void;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const [tab, setTab] = useState<InsightsTab>("summary");
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const sheetOffset = useRef(new Animated.Value(windowHeight)).current;
  const summary = useQuery(api.islandHistory.getMyIslandSummary, {
    islandId: islandId as Id<"islands">,
  });
  const history = usePaginatedQuery(
    api.islandHistory.listMyIslandHistory,
    { islandId: islandId as Id<"islands"> },
    { initialNumItems: 10 },
  );

  const collapsedOffset = sheetHeight * 0.44;
  const settleSheet = (nextExpanded: boolean) => {
    setExpanded(nextExpanded);
    Animated.spring(sheetOffset, {
      toValue: nextExpanded ? 0 : collapsedOffset,
      damping: 24,
      stiffness: 210,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  };
  const dismiss = () => {
    Animated.timing(sheetOffset, {
      toValue: Math.max(sheetHeight, windowHeight),
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };
  const drag = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
    onPanResponderMove: (_, gesture) => {
      const origin = expanded ? 0 : collapsedOffset;
      sheetOffset.setValue(Math.max(0, origin + gesture.dy));
    },
    onPanResponderRelease: (_, gesture) => {
      if (!expanded && gesture.dy > 130) {
        dismiss();
        return;
      }
      if (gesture.dy < -55) {
        settleSheet(true);
        return;
      }
      if (gesture.dy > 55) {
        settleSheet(false);
        return;
      }
      settleSheet(expanded);
    },
    onPanResponderTerminate: () => settleSheet(expanded),
  });

  const onSheetLayout = (event: { nativeEvent: { layout: { height: number } } }) => {
    if (sheetHeight > 0) return;
    const measuredHeight = event.nativeEvent.layout.height;
    setSheetHeight(measuredHeight);
    Animated.spring(sheetOffset, {
      toValue: 0,
      damping: 25,
      stiffness: 190,
      mass: 0.85,
      useNativeDriver: true,
    }).start();
  };

  const details = summary
    ? [...summary.milestoneDetailKeys, ...summary.smallDetailKeys]
    : [];

  return (
    <Modal
      animationType="fade"
      onRequestClose={dismiss}
      presentationStyle="overFullScreen"
      transparent
      visible
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityLabel="Close island information"
          onPress={dismiss}
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(23, 65, 65, 0.12)" }}
        />
        <Animated.View
          onLayout={onSheetLayout}
          style={{
            height: windowHeight * 0.96,
            paddingHorizontal: 10,
            paddingBottom: 8,
            transform: [{ translateY: sheetOffset }],
          }}
        >
          <ClearMapGlass
            isInteractive={false}
            variant="readable"
            style={{
              flex: 1,
              borderRadius: 34,
              borderCurve: "continuous",
              boxShadow: "0 -8px 34px rgba(29, 73, 70, 0.22)",
            }}
          >
            <View {...drag.panHandlers} style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
              <View
                style={{
                  width: 42,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: "rgba(46, 76, 73, 0.28)",
                }}
              />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 10 }}>
              <View style={{ width: 42 }} />
              <Text
                selectable
                numberOfLines={1}
                style={{ flex: 1, color: "#264541", fontSize: 23, fontWeight: "800", textAlign: "center" }}
              >
                {summary?.name ?? "Island"}
              </Text>
              <Pressable
                accessibilityLabel="Close island information"
                accessibilityRole="button"
                hitSlop={10}
                onPress={dismiss}
                style={({ pressed }) => ({
                  width: 42,
                  height: 42,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 21,
                  backgroundColor: "rgba(255, 255, 255, 0.25)",
                  opacity: pressed ? 0.62 : 1,
                })}
              >
                <Image source="sf:xmark" style={{ width: 15, height: 15 }} tintColor="#365753" />
              </Pressable>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 4,
                marginHorizontal: 18,
                marginBottom: 8,
                borderRadius: 18,
                borderCurve: "continuous",
                padding: 4,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              {(["summary", "history"] as const).map((value) => (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === value }}
                  key={value}
                  onPress={() => setTab(value)}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: "center",
                    borderRadius: 14,
                    paddingVertical: 9,
                    backgroundColor: tab === value ? "rgba(255, 255, 255, 0.5)" : "transparent",
                    opacity: pressed ? 0.68 : 1,
                  })}
                >
                  <Text style={{ color: "#31514d", fontSize: 15, fontWeight: "700" }}>
                    {value === "summary" ? "Summary" : "History"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {tab === "summary" ? (
              <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{ gap: 18, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 52 }}
                showsVerticalScrollIndicator={false}
              >
                {summary === undefined ? (
                  <ActivityIndicator color="#527c76" size="large" style={{ paddingTop: 48 }} />
                ) : (
                  <>
                    <View style={{ gap: 7 }}>
                      <Text selectable style={{ color: "#31514d", fontSize: 14, fontWeight: "700" }}>
                        What you’re growing
                      </Text>
                      <Text selectable style={{ color: "#274743", fontSize: 18, lineHeight: 26 }}>
                        {summary.purpose}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                      <Stat
                        label="Current condition"
                        value={summary.condition === "sunk" ? "Submerged" : "Growing"}
                      />
                      <Stat label="Positive points" value={summary.lifetimePositivePoints} />
                      <Stat label="Negative points" value={summary.lifetimeNegativePoints} />
                      <Stat label="Rocks" value={summary.rockCount} />
                      <Stat label="Growth steps" value={summary.growthStepCount} />
                      <Stat label="Visible props" value={details.length} />
                    </View>
                    <View style={{ gap: 10 }}>
                      <Text selectable style={{ color: "#31514d", fontSize: 14, fontWeight: "700" }}>
                        On this island
                      </Text>
                      {details.length > 0 ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                          {details.map((detail, index) => (
                            <View
                              key={`${detail}-${index}`}
                              style={{
                                borderRadius: 18,
                                paddingHorizontal: 13,
                                paddingVertical: 8,
                                backgroundColor: "rgba(255, 255, 255, 0.3)",
                              }}
                            >
                              <Text selectable style={{ color: "#31514d", fontSize: 14, fontWeight: "600" }}>
                                {detailLabel(detail)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <EmptyState>Your first visible details will appear as this island grows.</EmptyState>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>
            ) : (
              <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{ gap: 10, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 52 }}
                showsVerticalScrollIndicator={false}
              >
                {history.status === "LoadingFirstPage" ? (
                  <ActivityIndicator color="#527c76" size="large" style={{ paddingTop: 48 }} />
                ) : history.results.length === 0 ? (
                  <EmptyState>Your check-ins will collect here as this island changes.</EmptyState>
                ) : (
                  history.results.map((day) => {
                    const isExpanded = expandedDayId === day.dailySummaryId;
                    return (
                      <View
                        key={day.dailySummaryId}
                        style={{
                          overflow: "hidden",
                          borderRadius: 22,
                          borderCurve: "continuous",
                          backgroundColor: "rgba(255, 255, 255, 0.25)",
                          borderWidth: 1,
                          borderColor: "rgba(255, 255, 255, 0.38)",
                        }}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ expanded: isExpanded }}
                          onPress={() => setExpandedDayId(isExpanded ? null : day.dailySummaryId)}
                          style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 15,
                            opacity: pressed ? 0.68 : 1,
                          })}
                        >
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text selectable style={{ color: "#274743", fontSize: 16, fontWeight: "800" }}>
                              {dayLabel(day.localDate)}
                            </Text>
                            <Text
                              selectable
                              numberOfLines={isExpanded ? undefined : 2}
                              style={{ color: "rgba(39, 71, 67, 0.7)", fontSize: 14, lineHeight: 20 }}
                            >
                              {day.summary}
                            </Text>
                          </View>
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            {day.hasPositiveNode ? (
                              <Image source="sf:leaf.fill" style={{ width: 16, height: 16 }} tintColor="#5c8b64" />
                            ) : null}
                            {day.hasNegativePoint ? (
                              <Image source="sf:circle.fill" style={{ width: 13, height: 13 }} tintColor="#7d776d" />
                            ) : null}
                          </View>
                          <Image
                            source={isExpanded ? "sf:chevron.up" : "sf:chevron.down"}
                            style={{ width: 14, height: 14 }}
                            tintColor="#64817d"
                          />
                        </Pressable>
                        {isExpanded ? (
                          <View
                            style={{
                              gap: 15,
                              borderTopWidth: 1,
                              borderTopColor: "rgba(58, 88, 84, 0.1)",
                              paddingHorizontal: 16,
                              paddingTop: 14,
                              paddingBottom: 18,
                            }}
                          >
                            {day.activities.map((activity) => (
                              <View key={activity.activityId} style={{ gap: 4 }}>
                                <Text selectable style={{ color: "#31514d", fontSize: 15, fontWeight: "700" }}>
                                  {activity.activity}
                                </Text>
                                <Text selectable style={{ color: "rgba(49, 81, 77, 0.68)", fontSize: 13 }}>
                                  {activity.effect === "both"
                                    ? "Helped and harmed"
                                    : activity.effect === "supportive"
                                      ? "Helped this island"
                                      : "Weighed on this island"}
                                  {activity.durationMinutes ? ` · ${activity.durationMinutes} min` : ""}
                                </Text>
                              </View>
                            ))}
                            {day.originalEntries.length > 0 ? (
                              <View style={{ gap: 7 }}>
                                <Text selectable style={{ color: "#31514d", fontSize: 13, fontWeight: "800" }}>
                                  What you shared
                                </Text>
                                {day.originalEntries.map((entry) => (
                                  <Text
                                    selectable
                                    key={`${entry.messageId}-${entry.text}`}
                                    style={{ color: "#274743", fontSize: 15, fontStyle: "italic", lineHeight: 21 }}
                                  >
                                    “{entry.text}”
                                  </Text>
                                ))}
                              </View>
                            ) : null}
                            {day.structuredSources.flatMap((source) => source.answers).length > 0 ? (
                              <View style={{ gap: 9 }}>
                                <Text selectable style={{ color: "#31514d", fontSize: 13, fontWeight: "800" }}>
                                  Questionnaire
                                </Text>
                                {day.structuredSources.flatMap((source) => source.answers).map((answer) => (
                                  <View key={answer.questionId} style={{ gap: 2 }}>
                                    <Text selectable style={{ color: "rgba(49, 81, 77, 0.68)", fontSize: 13 }}>
                                      {answer.question}
                                    </Text>
                                    <Text selectable style={{ color: "#274743", fontSize: 14, fontWeight: "600" }}>
                                      {answer.answer ?? "Skipped"}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                )}
                {history.status === "CanLoadMore" ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => history.loadMore(10)}
                    style={({ pressed }) => ({ alignItems: "center", paddingVertical: 14, opacity: pressed ? 0.64 : 1 })}
                  >
                    <Text style={{ color: "#31514d", fontSize: 15, fontWeight: "700" }}>Show earlier days</Text>
                  </Pressable>
                ) : history.status === "LoadingMore" ? (
                  <ActivityIndicator color="#527c76" style={{ paddingVertical: 14 }} />
                ) : null}
              </ScrollView>
            )}
          </ClearMapGlass>
        </Animated.View>
      </View>
    </Modal>
  );
}
