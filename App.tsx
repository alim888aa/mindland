import { useAuth, useSession, useUser } from "@clerk/expo";
import { AuthView } from "@clerk/expo/native";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { ActivityIndicator, Modal, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { DirectIslandWorld } from "./src/components/direct-island-world";
import { CheckInConversationContainer } from "./src/components/check-in-conversation-container";
import { DevelopmentBackendProbe } from "./src/components/development-backend-probe";
import { DevelopmentSignIn } from "./src/components/development-sign-in";
import { MapOverlay } from "./src/components/map-overlay";
import { IslandInsightsSheet } from "./src/components/island-insights-sheet";
import { OnboardingInterviewContainer } from "./src/components/onboarding-interview-container";
import {
  createRuntimeIslandWorld,
  needsIslandMaterializationRepair,
  selectVisibleIslandWorld,
  type IslandId,
  type RuntimeIslandWorld,
} from "./src/data/islands";
import { api } from "./convex/_generated/api";
import type { Id } from "./convex/_generated/dataModel";

const EMPTY_ISLAND_WORLD = createRuntimeIslandWorld([]);

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MindlandApp />
    </GestureHandlerRootView>
  );
}

function MindlandApp() {
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
      content = <AuthenticatedMindlandExperience />;
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
          {sessionState.session?.status === "pending" ? (
            <AuthView isDismissible={false} mode="signInOrUp" />
          ) : (
            <DevelopmentSignIn />
          )}
        </View>
      </Modal>
    </View>
  );
}

function AuthenticatedMindlandExperience() {
  const interview = useQuery(api.onboardingInterview.getCurrent, {});
  const ownedIslands = useQuery(api.islands.listMine, {});
  const islandGrowth = useQuery(api.activityApplication.listMyGrowth, {});
  const { user } = useUser();

  if (
    interview === undefined ||
    ownedIslands === undefined ||
    islandGrowth === undefined
  ) {
    return <OceanLoadingState />;
  }

  const onboardingActive =
    interview === null ||
    interview.status === "interviewing" ||
    interview.status === "readyToCreate";

  const islandWorld = selectVisibleIslandWorld(
    ownedIslands,
    {
      onboardingActive,
      candidateCount: interview?.candidates.count ?? 0,
    },
    islandGrowth,
  );
  const repairLegacyIslands =
    interview !== null &&
    needsIslandMaterializationRepair({
      interviewStatus: interview.status,
      candidateCount: interview.candidates.count,
      ownedIslandCount: ownedIslands.length,
    });

  return (
    <View style={{ flex: 1 }}>
      <MindlandExperience
        firstName={user?.firstName}
        islandWorld={islandWorld}
        onboardingActive={onboardingActive}
      />
      {repairLegacyIslands ? (
        <LegacyIslandRepair interviewId={interview.interviewId} />
      ) : null}
      {!onboardingActive &&
      ownedIslands.some((island) => island.questionnaire === null) ? (
        <QuestionnaireBackfill />
      ) : null}
    </View>
  );
}

function QuestionnaireBackfill() {
  const ensureQuestionnaires = useAction(
    api.islandQuestionnaireActions.ensureMine,
  );
  const attempted = useRef(false);
  const backfill = () => {
    if (attempted.current) return;
    attempted.current = true;
    void ensureQuestionnaires({}).catch(() => undefined);
  };

  return (
    <View
      accessibilityElementsHidden
      onLayout={backfill}
      pointerEvents="none"
      style={{ position: "absolute", width: 1, height: 1 }}
    />
  );
}

function LegacyIslandRepair({
  interviewId,
}: {
  interviewId: Id<"onboardingInterviews">;
}) {
  const materializeIslands = useMutation(
    api.onboardingInterview.revealCandidateNames,
  );
  const attempted = useRef(false);
  const repair = () => {
    if (attempted.current) return;
    attempted.current = true;
    void materializeIslands({ interviewId }).catch(() => undefined);
  };

  return (
    <View
      accessibilityElementsHidden
      onLayout={repair}
      pointerEvents="none"
      style={{ position: "absolute", width: 1, height: 1 }}
    />
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

function MindlandExperience({
  firstName,
  islandWorld = EMPTY_ISLAND_WORLD,
  onboardingActive = false,
}: {
  firstName?: string | null;
  islandWorld?: RuntimeIslandWorld;
  onboardingActive?: boolean;
}) {
  const [readyWorldKey, setReadyWorldKey] = useState<string | null>(null);
  const [onboardingOverlayVisible, setOnboardingOverlayVisible] =
    useState(onboardingActive);
  const onboardingPresentationActive =
    onboardingActive || onboardingOverlayVisible;

  return (
    <View style={{ flex: 1, backgroundColor: "#73d4da" }}>
      <StatusBar style="dark" />
      <WorldOwnedExperience
        key={islandWorld.identityKey}
        firstName={firstName}
        islandWorld={islandWorld}
        onboardingActive={onboardingPresentationActive}
        onWorldReady={setReadyWorldKey}
        readyWorldKey={readyWorldKey}
      />
      {onboardingPresentationActive ? (
        <OnboardingInterviewContainer
          onReveal={() => setOnboardingOverlayVisible(false)}
          readyWorldKey={readyWorldKey}
          worldKey={islandWorld.key}
        />
      ) : null}
    </View>
  );
}

function WorldOwnedExperience({
  firstName,
  islandWorld,
  onboardingActive,
  onWorldReady,
  readyWorldKey,
}: {
  firstName?: string | null;
  islandWorld: RuntimeIslandWorld;
  onboardingActive: boolean;
  onWorldReady: (worldKey: string) => void;
  readyWorldKey: string | null;
}) {
  const [selectedIsland, setSelectedIsland] = useState<IslandId | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [inspectedIsland, setInspectedIsland] = useState<IslandId | null>(null);

  return (
    <>
      <DirectIslandWorld
        key={islandWorld.key}
        islandWorld={islandWorld}
        navigationEnabled={!onboardingActive && !checkInOpen && inspectedIsland === null}
        onReady={onWorldReady}
        onRequestOverview={() => setSelectedIsland(null)}
        selectedIsland={onboardingActive ? null : selectedIsland}
      >
        {onboardingActive || checkInOpen ? null : (
          <MapOverlay
            islandWorld={islandWorld}
            selectedIsland={selectedIsland}
            onSelect={setSelectedIsland}
            onOpenInfo={setInspectedIsland}
            onCheckIn={() => {
              setSelectedIsland(null);
              setCheckInOpen(true);
            }}
          />
        )}
      </DirectIslandWorld>
      {checkInOpen ? (
        <CheckInConversationContainer
          firstName={firstName}
          islandWorld={islandWorld}
          worldIsReady={readyWorldKey === islandWorld.key}
          visible={!onboardingActive}
          onClose={() => {
            setCheckInOpen(false);
            setSelectedIsland(null);
          }}
          onIslandFocusRequest={setSelectedIsland}
          onChatComplete={() => {
            setCheckInOpen(false);
            setSelectedIsland(null);
          }}
          onQuestionnaireComplete={(islandId) => {
            setCheckInOpen(false);
            setSelectedIsland(islandId);
          }}
        />
      ) : null}
      {inspectedIsland ? (
        <IslandInsightsSheet
          islandId={inspectedIsland}
          onClose={() => setInspectedIsland(null)}
        />
      ) : null}
    </>
  );
}
