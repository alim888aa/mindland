import { useSignIn, useSignUp } from "@clerk/expo";
import { useSignInWithApple } from "@clerk/expo/apple";
import { AuthView } from "@clerk/expo/native";
import * as AppleAuthentication from "expo-apple-authentication";
import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  GlassSurface,
  supportsNativeLiquidGlass,
  useReduceTransparency,
} from "./glass-mist-shell";

const INK = "#234548";
const CORAL = "#df7658";

type AuthStep =
  | "signIn"
  | "signUp"
  | "verifySignIn"
  | "verifySignUp"
  | "resetRequest"
  | "resetVerify"
  | "resetPassword";

type MfaStrategy = "email_code" | "phone_code" | "totp" | "backup_code";

function clerkErrorText(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { longMessage?: unknown; message?: unknown };

    if (typeof candidate.longMessage === "string") {
      return candidate.longMessage;
    }

    if (typeof candidate.message === "string") {
      return candidate.message;
    }
  }

  return "Mindland could not finish that account step. Please try again.";
}

export function DevelopmentSignIn() {
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const [step, setStep] = useState<AuthStep>("signIn");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [mfaStrategy, setMfaStrategy] = useState<MfaStrategy>("email_code");
  const [availableMfaStrategies, setAvailableMfaStrategies] = useState<
    MfaStrategy[]
  >([]);
  const [needsNativeCompletion, setNeedsNativeCompletion] = useState(false);
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const reduceTransparency = useReduceTransparency();
  const supportsLiquidGlass = supportsNativeLiquidGlass();
  const busy =
    signInFetchStatus === "fetching" || signUpFetchStatus === "fetching";
  const verifying =
    step === "verifySignIn" ||
    step === "verifySignUp" ||
    step === "resetVerify";
  const canSubmit = (() => {
    if (busy) return false;
    if (verifying) return verificationCode.trim().length > 0;
    if (step === "resetRequest") return emailAddress.trim().length > 0;
    if (step === "resetPassword") return password.length > 0;
    return emailAddress.trim().length > 0 && password.length > 0;
  })();

  const finishSignIn = async () => {
    const finalized = await signIn.finalize();

    if (finalized.error) {
      setErrorMessage(clerkErrorText(finalized.error));
    }
  };

  const finishSignUp = async () => {
    const finalized = await signUp.finalize();

    if (finalized.error) {
      setErrorMessage(clerkErrorText(finalized.error));
    }
  };

  const beginSecondFactor = async (strategy: MfaStrategy) => {
    setMfaStrategy(strategy);
    setVerificationCode("");
    setErrorMessage(undefined);
    setStep("verifySignIn");

    const sent =
      strategy === "email_code"
        ? await signIn.mfa.sendEmailCode()
        : strategy === "phone_code"
          ? await signIn.mfa.sendPhoneCode()
          : null;

    if (sent?.error) {
      setErrorMessage(clerkErrorText(sent.error));
    }
  };

  const prepareSecondFactor = async () => {
    const strategies = (
      ["email_code", "phone_code", "totp", "backup_code"] as const
    ).filter((candidate) =>
      signIn.supportedSecondFactors.some(
        (factor) => factor.strategy === candidate,
      ),
    );

    if (strategies.length === 0) {
      setErrorMessage(
        "This account needs a security method that is unavailable on this device.",
      );
      return;
    }

    setAvailableMfaStrategies([...strategies]);
    await beginSecondFactor(strategies[0]);
  };

  const submitSignIn = async () => {
    const result = await signIn.password({
      emailAddress: emailAddress.trim(),
      password,
    });

    if (result.error) {
      setErrorMessage(clerkErrorText(result.error));
      return;
    }

    if (signIn.status === "complete") {
      await finishSignIn();
      return;
    }

    if (
      signIn.status === "needs_client_trust" ||
      signIn.status === "needs_second_factor"
    ) {
      await prepareSecondFactor();
      return;
    }

    setErrorMessage(
      "This account needs a sign-in step Mindland cannot show yet.",
    );
  };

  const submitSignUp = async () => {
    const result = await signUp.password({
      emailAddress: emailAddress.trim(),
      password,
    });

    if (result.error) {
      setErrorMessage(clerkErrorText(result.error));
      return;
    }

    if (signUp.status === "complete") {
      await finishSignUp();
      return;
    }

    if (
      signUp.status === "missing_requirements" &&
      signUp.unverifiedFields.includes("email_address")
    ) {
      const sent = await signUp.verifications.sendEmailCode();

      if (sent.error) {
        setErrorMessage(clerkErrorText(sent.error));
        return;
      }

      setVerificationCode("");
      setStep("verifySignUp");
      return;
    }

    setNeedsNativeCompletion(true);
  };

  const submitVerification = async () => {
    const code = verificationCode.trim();

    if (step === "verifySignUp") {
      const verified = await signUp.verifications.verifyEmailCode({ code });

      if (verified.error) {
        setErrorMessage(clerkErrorText(verified.error));
        return;
      }

      if (signUp.status === "complete") {
        await finishSignUp();
        return;
      }

      if (signUp.status === "missing_requirements") {
        setNeedsNativeCompletion(true);
        return;
      }
    }

    if (step === "verifySignIn") {
      const verified =
        mfaStrategy === "email_code"
          ? await signIn.mfa.verifyEmailCode({ code })
          : mfaStrategy === "phone_code"
            ? await signIn.mfa.verifyPhoneCode({ code })
            : mfaStrategy === "totp"
              ? await signIn.mfa.verifyTOTP({ code })
              : await signIn.mfa.verifyBackupCode({ code });

      if (verified.error) {
        setErrorMessage(clerkErrorText(verified.error));
        return;
      }

      if (signIn.status === "complete") {
        await finishSignIn();
        return;
      }
    }

    if (step === "resetVerify") {
      const verified = await signIn.resetPasswordEmailCode.verifyCode({ code });

      if (verified.error) {
        setErrorMessage(clerkErrorText(verified.error));
        return;
      }

      if (signIn.status === "needs_new_password") {
        setPassword("");
        setStep("resetPassword");
        return;
      }
    }

    setErrorMessage(
      "Clerk could not finish verification. Please request a new code.",
    );
  };

  const requestPasswordReset = async () => {
    const created = await signIn.create({
      identifier: emailAddress.trim(),
    });

    if (created.error) {
      setErrorMessage(clerkErrorText(created.error));
      return;
    }

    const sent = await signIn.resetPasswordEmailCode.sendCode();
    if (sent.error) {
      setErrorMessage(clerkErrorText(sent.error));
      return;
    }

    setVerificationCode("");
    setStep("resetVerify");
  };

  const submitNewPassword = async () => {
    const result = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    });

    if (result.error) {
      setErrorMessage(clerkErrorText(result.error));
      return;
    }

    if (signIn.status === "complete") {
      await finishSignIn();
      return;
    }

    if (
      signIn.status === "needs_client_trust" ||
      signIn.status === "needs_second_factor"
    ) {
      await prepareSecondFactor();
      return;
    }

    setErrorMessage("Clerk needs another security step before signing in.");
  };

  const submit = async () => {
    if (!canSubmit) {
      return;
    }

    setErrorMessage(undefined);

    try {
      if (verifying) {
        await submitVerification();
      } else if (step === "resetRequest") {
        await requestPasswordReset();
      } else if (step === "resetPassword") {
        await submitNewPassword();
      } else if (step === "signUp") {
        await submitSignUp();
      } else {
        await submitSignIn();
      }
    } catch (error) {
      setErrorMessage(clerkErrorText(error));
    }
  };

  const changeStep = async (nextStep: "signIn" | "signUp") => {
    setErrorMessage(undefined);
    setVerificationCode("");
    setPassword("");
    await signIn.reset();
    await signUp.reset();
    setStep(nextStep);
  };

  const resendCode = async () => {
    setErrorMessage(undefined);
    const result =
      step === "verifySignUp"
        ? await signUp.verifications.sendEmailCode()
      : step === "resetVerify"
          ? await signIn.resetPasswordEmailCode.sendCode()
        : mfaStrategy === "phone_code"
          ? await signIn.mfa.sendPhoneCode()
          : await signIn.mfa.sendEmailCode();

    if (result.error) {
      setErrorMessage(clerkErrorText(result.error));
    }
  };

  const continueWithApple = async () => {
    setErrorMessage(undefined);

    try {
      const { createdSessionId, setActive, signIn: appleSignIn, signUp: appleSignUp } =
        await startAppleAuthenticationFlow();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      } else if (
        appleSignUp?.status === "missing_requirements" ||
        appleSignIn?.status === "needs_client_trust" ||
        appleSignIn?.status === "needs_second_factor" ||
        appleSignIn?.status === "needs_new_password" ||
        appleSignIn?.status === "needs_protect_check"
      ) {
        setNeedsNativeCompletion(true);
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ERR_REQUEST_CANCELED"
      ) {
        return;
      }

      setErrorMessage(clerkErrorText(error));
    }
  };

  if (needsNativeCompletion) {
    return (
      <View style={{ flex: 1, backgroundColor: "#78d4d7" }}>
        <Image
          contentFit="cover"
          source={require("../../assets/water-texture.png")}
          style={StyleSheet.absoluteFill}
        />
        <AuthView
          isDismissible
          mode="signInOrUp"
          onDismiss={() => {
            setNeedsNativeCompletion(false);
          }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#78d4d7" }}
    >
      <Image
        contentFit="cover"
        source={require("../../assets/water-texture.png")}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(96, 213, 211, 0.16)" },
        ]}
      />
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 22,
          paddingVertical: 48,
        }}
      >
        <View style={{ alignItems: "center", gap: 7, marginBottom: 24 }}>
          <Text
            style={{
              color: "#fef8e9",
              fontSize: 35,
              fontWeight: "700",
              textShadowColor: "rgba(42, 105, 103, 0.38)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 12,
            }}
          >
            Mindland
          </Text>
          <Text
            style={{
              color: "rgba(247, 255, 249, 0.92)",
              fontSize: 16,
              textShadowColor: "rgba(28, 83, 82, 0.35)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 8,
            }}
          >
            Your life, growing into a world
          </Text>
        </View>

        <GlassSurface
          reduceTransparency={reduceTransparency}
          supportsLiquidGlass={supportsLiquidGlass}
          style={{
            borderRadius: 34,
            borderCurve: "continuous",
            overflow: "hidden",
            paddingHorizontal: 20,
            paddingVertical: 24,
          }}
        >
          <View style={{ gap: 17 }}>
            <View style={{ alignItems: "center", gap: 5 }}>
              <Text style={{ color: INK, fontSize: 25, fontWeight: "700" }}>
                {verifying
                  ? step === "verifySignIn" &&
                    (mfaStrategy === "totp" ||
                      mfaStrategy === "backup_code" ||
                      mfaStrategy === "phone_code")
                    ? "Security check"
                    : "Check your email"
                  : step === "resetRequest"
                    ? "Reset your password"
                    : step === "resetPassword"
                      ? "Choose a new password"
                  : step === "signUp"
                    ? "Create your world"
                    : "Welcome back"}
              </Text>
              <Text
                style={{
                  color: "#577171",
                  fontSize: 15,
                  lineHeight: 21,
                  textAlign: "center",
                }}
              >
                {verifying
                  ? step === "verifySignIn" && mfaStrategy === "totp"
                    ? "Enter the code from your authenticator app"
                    : step === "verifySignIn" && mfaStrategy === "backup_code"
                      ? "Enter one of your saved backup codes"
                      : step === "verifySignIn" && mfaStrategy === "phone_code"
                        ? "Enter the security code sent to your phone"
                        : `Enter the code sent to ${emailAddress.trim()}`
                  : step === "resetRequest"
                    ? "We’ll send a private reset code to your email"
                    : step === "resetPassword"
                      ? "Use a password you haven’t used here before"
                  : step === "signUp"
                    ? "Your map and conversations stay private to you"
                    : "Continue growing your islands"}
              </Text>
            </View>

            {!verifying &&
            step !== "resetRequest" &&
            step !== "resetPassword" &&
            Platform.OS === "ios" ? (
              <AppleAuthentication.AppleAuthenticationButton
                accessibilityLabel="Continue with Apple"
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                }
                cornerRadius={14}
                onPress={() => {
                  void continueWithApple();
                }}
                style={{ width: "100%", height: 52 }}
              />
            ) : null}

            {!verifying &&
            step !== "resetRequest" &&
            step !== "resetPassword" ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: "rgba(49, 78, 77, 0.26)",
                  }}
                />
                <Text style={{ color: "#6d8281", fontSize: 13 }}>
                  or use email
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: "rgba(49, 78, 77, 0.26)",
                  }}
                />
              </View>
            ) : null}

            <View style={{ gap: 11 }}>
              {verifying ? (
                <TextInput
                  accessibilityLabel="Verification code"
                  autoComplete="one-time-code"
                  keyboardType={
                    step === "verifySignIn" && mfaStrategy === "backup_code"
                      ? "default"
                      : "number-pad"
                  }
                  onChangeText={setVerificationCode}
                  onSubmitEditing={() => {
                    void submit();
                  }}
                  placeholder="Verification code"
                  placeholderTextColor="#839392"
                  style={inputStyle}
                  value={verificationCode}
                />
              ) : step === "resetRequest" ? (
                <TextInput
                  accessibilityLabel="Email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmailAddress}
                  onSubmitEditing={() => {
                    void submit();
                  }}
                  placeholder="Email address"
                  placeholderTextColor="#839392"
                  style={inputStyle}
                  value={emailAddress}
                />
              ) : step === "resetPassword" ? (
                <TextInput
                  accessibilityLabel="New password"
                  autoComplete="new-password"
                  onChangeText={setPassword}
                  onSubmitEditing={() => {
                    void submit();
                  }}
                  placeholder="New password"
                  placeholderTextColor="#839392"
                  secureTextEntry
                  style={inputStyle}
                  value={password}
                />
              ) : (
                <>
                  <TextInput
                    accessibilityLabel="Email address"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={setEmailAddress}
                    placeholder="Email address"
                    placeholderTextColor="#839392"
                    style={inputStyle}
                    value={emailAddress}
                  />
                  <TextInput
                    accessibilityLabel="Password"
                    autoComplete={
                      step === "signUp" ? "new-password" : "password"
                    }
                    onChangeText={setPassword}
                    onSubmitEditing={() => {
                      void submit();
                    }}
                    placeholder="Password"
                    placeholderTextColor="#839392"
                    secureTextEntry
                    style={inputStyle}
                    value={password}
                  />
                </>
              )}
            </View>

            <View nativeID="clerk-captcha" />

            {errorMessage ? (
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: "#a94536", fontSize: 14, lineHeight: 20 }}
              >
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              disabled={!canSubmit}
              onPress={() => {
                void submit();
              }}
              style={({ pressed }) => ({
                minHeight: 54,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 27,
                borderCurve: "continuous",
                backgroundColor: canSubmit
                  ? pressed
                    ? "#ca654a"
                    : CORAL
                  : "rgba(109, 130, 126, 0.25)",
                transform: [{ scale: pressed ? 0.985 : 1 }],
              })}
            >
              {busy ? (
                <ActivityIndicator color="#fffaf0" />
              ) : (
                <Text
                  style={{ color: "#fffaf0", fontSize: 17, fontWeight: "700" }}
                >
                  {verifying
                    ? "Verify and continue"
                    : step === "resetRequest"
                      ? "Send reset code"
                      : step === "resetPassword"
                        ? "Save new password"
                    : step === "signUp"
                      ? "Create account"
                      : "Sign in"}
                </Text>
              )}
            </Pressable>

            {verifying ? (
              <View style={{ alignItems: "center", gap: 7 }}>
                {step !== "verifySignIn" ||
                mfaStrategy === "email_code" ||
                mfaStrategy === "phone_code" ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => {
                      void resendCode();
                    }}
                    style={{ minHeight: 36, justifyContent: "center" }}
                  >
                    <Text
                      style={{ color: CORAL, fontSize: 15, fontWeight: "600" }}
                    >
                      Send a new code
                    </Text>
                  </Pressable>
                ) : null}
                {step === "verifySignIn" &&
                availableMfaStrategies.length > 1 ? (
                  <View style={{ alignItems: "center", gap: 2 }}>
                    <Text style={{ color: "#617877", fontSize: 13 }}>
                      Use another security method
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {availableMfaStrategies
                        .filter((strategy) => strategy !== mfaStrategy)
                        .map((strategy) => (
                          <Pressable
                            key={strategy}
                            accessibilityRole="button"
                            disabled={busy}
                            onPress={() => {
                              void beginSecondFactor(strategy);
                            }}
                            style={{
                              minHeight: 38,
                              justifyContent: "center",
                              paddingHorizontal: 9,
                            }}
                          >
                            <Text
                              style={{
                                color: CORAL,
                                fontSize: 14,
                                fontWeight: "600",
                              }}
                            >
                              {strategy === "backup_code"
                                ? "Backup code"
                                : strategy === "totp"
                                  ? "Authenticator"
                                  : strategy === "phone_code"
                                    ? "Text message"
                                    : "Email"}
                            </Text>
                          </Pressable>
                        ))}
                    </View>
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => {
                    void changeStep(
                      step === "verifySignUp" ? "signUp" : "signIn",
                    );
                  }}
                  style={{ minHeight: 36, justifyContent: "center" }}
                >
                  <Text style={{ color: "#617877", fontSize: 15 }}>
                    Use a different email
                  </Text>
                </Pressable>
              </View>
            ) : step === "resetRequest" || step === "resetPassword" ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => {
                  void changeStep("signIn");
                }}
                style={{
                  alignSelf: "center",
                  minHeight: 40,
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#526e6c", fontSize: 15 }}>
                  Return to sign in
                </Text>
              </Pressable>
            ) : (
              <View style={{ alignItems: "center", gap: 2 }}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                void changeStep(step === "signUp" ? "signIn" : "signUp");
              }}
              style={{
                alignSelf: "center",
                minHeight: 40,
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#526e6c", fontSize: 15 }}>
                {step === "signUp"
                  ? "Already have an account? Sign in"
                  : "New to Mindland? Create an account"}
              </Text>
            </Pressable>
                {step === "signIn" ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => {
                      setErrorMessage(undefined);
                      setPassword("");
                      setStep("resetRequest");
                    }}
                    style={{ minHeight: 38, justifyContent: "center" }}
                  >
                    <Text style={{ color: CORAL, fontSize: 14, fontWeight: "600" }}>
                      Forgot password?
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        </GlassSurface>
      </View>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  minHeight: 54,
  borderRadius: 17,
  borderCurve: "continuous" as const,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: "rgba(255, 255, 255, 0.62)",
  backgroundColor: "rgba(255, 253, 247, 0.58)",
  color: INK,
  fontSize: 16,
  paddingHorizontal: 17,
};
