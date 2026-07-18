import { useClerk, useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";

import { api } from "../../convex/_generated/api";

type ProbeStatus = "idle" | "saving" | "success" | "error";

export function DevelopmentBackendProbe() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const records = useQuery(api.privateProofRecords.listMine);
  const saveRecord = useMutation(api.privateProofRecords.saveMine);
  const [status, setStatus] = useState<ProbeStatus>("idle");
  const [message, setMessage] = useState("Ready for a private backend check.");

  async function savePrivateMarker() {
    setStatus("saving");
    setMessage("Saving a marker owned by this Clerk user…");

    try {
      await saveRecord({ value: `privacy-proof-${Date.now()}` });
      setStatus("success");
      setMessage("Private marker saved and returned to this user.");
    } catch {
      setStatus("error");
      setMessage("The private marker check failed.");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#73d4da" }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          gap: 18,
          paddingHorizontal: 28,
        }}
      >
        <Text style={{ color: "#173f47", fontSize: 28, fontWeight: "700" }}>
          Private backend proof
        </Text>
        <Text style={{ color: "#24545d", fontSize: 16 }}>
          Signed in as {user?.primaryEmailAddress?.emailAddress ?? user?.id}
        </Text>
        <Text style={{ color: "#24545d", fontSize: 16 }}>
          Visible markers: {records === undefined ? "loading" : records.length}
        </Text>
        <Text
          style={{
            color: status === "error" ? "#8b2f2f" : "#173f47",
            fontSize: 16,
            lineHeight: 23,
          }}
        >
          {message}
        </Text>

        <ProbeButton
          disabled={status === "saving" || records === undefined}
          label="Save my private marker"
          onPress={savePrivateMarker}
        />
        <ProbeButton label="Sign out to test another user" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}

function ProbeButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        borderRadius: 22,
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: disabled ? "#d8d2c5" : "#fff1d7",
      }}
    >
      <Text style={{ color: "#263b3e", fontSize: 16, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}
