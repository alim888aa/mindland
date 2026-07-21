import { useClerk, useUser } from "@clerk/expo";
import { UserProfileView } from "@clerk/expo/native";
import { Image } from "expo-image";
import { GlassView } from "expo-glass-effect";
import { type ReactNode, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  supportsNativeLiquidGlass,
  useReduceTransparency,
} from "./glass-mist-shell";

export const ClearMapGlass = ({
  children,
  isInteractive = true,
  variant = "clear",
  style,
}: {
  children: ReactNode;
  isInteractive?: boolean;
  variant?: "clear" | "readable";
  style?: StyleProp<ViewStyle>;
}) => {
  const reduceTransparency = useReduceTransparency();
  if (!reduceTransparency && supportsNativeLiquidGlass()) {
    return (
      <GlassView
        glassEffectStyle={variant === "readable" ? "regular" : "clear"}
        isInteractive={isInteractive}
        style={[{ overflow: "hidden" }, style]}
        tintColor={
          variant === "readable"
            ? "rgba(240, 252, 247, 0.24)"
            : "rgba(235, 252, 246, 0.08)"
        }
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        {
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.58)",
          backgroundColor: reduceTransparency
            ? "#fffaf1"
            : variant === "readable"
              ? "rgba(246, 255, 252, 0.84)"
              : "rgba(246, 255, 252, 0.72)",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const AccountButton = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [profileOpen, setProfileOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const initial = user?.firstName?.slice(0, 1) ?? "M";
  const fullName = user?.fullName ?? user?.firstName ?? "Mindland explorer";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const closeProfile = () => {
    setManageOpen(false);
    setProfileOpen(false);
  };

  const handleSignOut = async () => {
    closeProfile();
    await signOut();
  };

  return (
    <>
      <ClearMapGlass
        style={{
          position: "absolute",
          top: 56,
          right: 22,
          width: 48,
          height: 48,
          borderRadius: 24,
          borderCurve: "continuous",
          boxShadow: "0 4px 14px rgba(52, 91, 87, 0.18)",
        }}
      >
        <Pressable
          accessibilityLabel="Open account settings"
          accessibilityRole="button"
          onPress={() => setProfileOpen(true)}
          style={({ pressed }) => ({
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={{ width: 40, height: 40, borderRadius: 20 }}
            />
          ) : (
            <Text style={{ color: "#365753", fontSize: 18, fontWeight: "800" }}>
              {initial}
            </Text>
          )}
        </Pressable>
      </ClearMapGlass>

      <Modal
        animationType="slide"
        onRequestClose={closeProfile}
        presentationStyle="pageSheet"
        visible={profileOpen}
      >
        <View style={{ flex: 1, backgroundColor: "#77d3d7" }}>
          <Image
            contentFit="cover"
            source={require("../../assets/water-texture.png")}
            style={{ position: "absolute", inset: 0 }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(104, 210, 209, 0.16)",
            }}
          />
          <View style={{ flex: 1, gap: 12, padding: 16, paddingTop: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ClearMapGlass
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderCurve: "continuous",
                }}
              >
                <Pressable
                  accessibilityLabel={manageOpen ? "Back to account" : "Close account settings"}
                  accessibilityRole="button"
                  onPress={() => {
                    if (manageOpen) {
                      setManageOpen(false);
                      return;
                    }
                    closeProfile();
                  }}
                  style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                >
                  <Image
                    source={manageOpen ? "sf:chevron.left" : "sf:xmark"}
                    style={{ width: 16, height: 16 }}
                    tintColor="#365753"
                  />
                </Pressable>
              </ClearMapGlass>
              <Text
                style={{
                  flex: 1,
                  color: "#fafffd",
                  fontSize: 21,
                  fontWeight: "800",
                  textAlign: "center",
                  textShadowColor: "rgba(24, 72, 69, 0.58)",
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 8,
                }}
              >
                {manageOpen ? "Manage account" : "Your account"}
              </Text>
              <View style={{ width: 44 }} />
            </View>
            {manageOpen ? (
              <ClearMapGlass
                isInteractive={false}
                style={{
                  flex: 1,
                  borderRadius: 30,
                  borderCurve: "continuous",
                  boxShadow: "0 10px 30px rgba(39, 82, 80, 0.18)",
                }}
              >
                <UserProfileView
                  isDismissible={false}
                  onDismiss={() => setManageOpen(false)}
                  style={{ flex: 1 }}
                />
              </ClearMapGlass>
            ) : (
              <View style={{ flex: 1, justifyContent: "center", paddingBottom: 72 }}>
                <ClearMapGlass
                  isInteractive={false}
                  style={{
                    alignItems: "center",
                    borderRadius: 34,
                    borderCurve: "continuous",
                    boxShadow: "0 14px 38px rgba(28, 77, 74, 0.2)",
                    paddingHorizontal: 24,
                    paddingVertical: 30,
                  }}
                >
                  <View
                    style={{
                      width: 92,
                      height: 92,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 46,
                      backgroundColor: "rgba(255, 255, 255, 0.3)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.72)",
                      boxShadow: "0 8px 24px rgba(48, 94, 89, 0.2)",
                    }}
                  >
                    {user?.imageUrl ? (
                      <Image
                        contentFit="cover"
                        source={{ uri: user.imageUrl }}
                        style={{ width: 82, height: 82, borderRadius: 41 }}
                      />
                    ) : (
                      <Text
                        style={{ color: "#365753", fontSize: 32, fontWeight: "800" }}
                      >
                        {initial}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{
                      marginTop: 18,
                      color: "#254844",
                      fontSize: 25,
                      fontWeight: "800",
                      textAlign: "center",
                    }}
                  >
                    {fullName}
                  </Text>
                  {email ? (
                    <Text
                      style={{
                        marginTop: 5,
                        color: "rgba(37, 72, 68, 0.68)",
                        fontSize: 15,
                        textAlign: "center",
                      }}
                    >
                      {email}
                    </Text>
                  ) : null}

                  <View style={{ width: "100%", gap: 11, marginTop: 30 }}>
                    <ClearMapGlass
                      style={{ height: 56, borderRadius: 28, borderCurve: "continuous" }}
                    >
                      <Pressable
                        accessibilityLabel="Manage account"
                        accessibilityRole="button"
                        onPress={() => setManageOpen(true)}
                        style={({ pressed }) => ({
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 9,
                          opacity: pressed ? 0.68 : 1,
                        })}
                      >
                        <Image
                          source="sf:person.crop.circle.badge.gearshape"
                          style={{ width: 19, height: 19 }}
                          tintColor="#365753"
                        />
                        <Text style={{ color: "#365753", fontSize: 17, fontWeight: "700" }}>
                          Manage account
                        </Text>
                      </Pressable>
                    </ClearMapGlass>

                    <Pressable
                      accessibilityLabel="Sign out"
                      accessibilityRole="button"
                      onPress={() => void handleSignOut()}
                      style={({ pressed }) => ({
                        height: 52,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 26,
                        opacity: pressed ? 0.62 : 1,
                      })}
                    >
                      <Text style={{ color: "#9d5049", fontSize: 16, fontWeight: "700" }}>
                        Sign out
                      </Text>
                    </Pressable>
                  </View>
                </ClearMapGlass>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};
