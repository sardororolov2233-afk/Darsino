import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText, Icon } from "../components/ui";
import { Feedback, useAction } from "../components/feedback";
import { LocalizedPressable as Pressable } from "../i18n/native";
import { useAppNavigation } from "../navigation";
import { useApp } from "../state/AppContext";
import {
  DEMO_MODERATOR_EMAIL,
  DEMO_PASSWORD,
  DEMO_TUTOR_EMAIL,
} from "../state/demo";
import { ProviderButtons } from "../components/ProviderButtons";
import {
  OB,
  OnboardingButton,
  OnboardingField,
  OnboardingOption,
  OnboardingShell,
} from "../components/OnboardingUI";
export { SetupScreen } from "./SetupScreen";

export function WelcomeScreen() {
  const navigation = useAppNavigation();
  const { user, setUser, mode } = useApp();
  const choose = (role: "student" | "tutor") => {
    setUser({ role });
    navigation.navigate("Providers");
  };
  return (
    <OnboardingShell
      title="O‘qi kim uchun?"
      subtitle="Sizga mos imkoniyatlarni birga sozlaymiz."
    >
      <OnboardingOption
        title="O‘quvchi"
        description="Maqsadingizga mos darslar, ustozlar va o‘quv materiallari."
        icon="book-open"
        selected={user.role === "student"}
        onPress={() => choose("student")}
      />
      <OnboardingOption
        title="O‘qituvchi"
        description="Bilimingizni ulashing, guruh va darslaringizni boshqaring."
        icon="users"
        selected={user.role === "tutor"}
        onPress={() => choose("tutor")}
      />
      <AppText
        color={OB.muted}
        variant="caption"
        style={{ textAlign: "center", marginTop: 10 }}
      >
        Bilim sari birinchi qadam.
      </AppText>
      {mode === "demo" ? (
        <AppText variant="caption" color={OB.muted} style={styles.center}>
          Sinov akkauntlari. Ustoz: {DEMO_TUTOR_EMAIL}; moderator:{" "}
          {DEMO_MODERATOR_EMAIL}. Parol: {DEMO_PASSWORD}.
        </AppText>
      ) : null}
    </OnboardingShell>
  );
}

export function ProviderScreen() {
  const navigation = useAppNavigation();
  const { mode, signInWithProvider, syncError } = useApp();
  const action = useAction();
  return (
    <OnboardingShell
      title="Avval akkaunt ochamiz"
      subtitle="Tanlovlaringiz va darslaringiz bir joyda saqlanadi. Bu bir necha daqiqa vaqt oladi."
      onBack={action.busy ? undefined : () => navigation.goBack()}
    >
      <ProviderButtons
        providers={
          mode === "demo"
            ? ["google", "apple"]
            : [
                ...(process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED !== "false"
                  ? ["google" as const]
                  : []),
                ...(process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === "true"
                  ? ["apple" as const]
                  : []),
              ]
        }
        demo={mode === "demo"}
        busy={action.busy}
        onPress={(provider) => action.run(() => signInWithProvider(provider))}
      />
      <OnboardingButton
        title="Email orqali davom etish"
        secondary
        disabled={action.busy}
        onPress={() => navigation.navigate("SignIn")}
      />
      <Feedback error={action.error || syncError} />
      {mode === "demo" ? (
        <AppText variant="caption" color={OB.muted} style={styles.center}>
          Sinov rejimi: Google va Apple sinov akkauntini ochadi.
        </AppText>
      ) : null}
    </OnboardingShell>
  );
}

type AuthMode = "signup" | "login";

export function SignInScreen() {
  const { user } = useApp();
  const [email, setEmail] = useState(user.email || "");
  const [formMode, setFormMode] = useState<AuthMode>("signup");
  return (
    <PasswordForm
      // Switching forms drops password drafts, visibility and old feedback.
      key={formMode}
      formMode={formMode}
      email={email}
      onEmailChange={setEmail}
      onModeChange={setFormMode}
    />
  );
}

function PasswordForm({
  formMode,
  email,
  onEmailChange,
  onModeChange,
}: {
  formMode: AuthMode;
  email: string;
  onEmailChange: (email: string) => void;
  onModeChange: (mode: AuthMode) => void;
}) {
  const navigation = useAppNavigation();
  const { mode, signUpWithPassword, signInWithPassword, syncError } = useApp();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const action = useAction();
  const signup = formMode === "signup";
  const submit = () =>
    action.run(
      () =>
        signup
          ? signUpWithPassword(email, password, confirmation)
          : signInWithPassword(email, password),
      () => {
        setPassword("");
        setConfirmation("");
      },
    );
  const goBack = () => {
    setPassword("");
    setConfirmation("");
    navigation.goBack();
  };
  return (
    <OnboardingShell
      title={signup ? "Ro‘yxatdan o‘tish" : "Akkauntingizga kiring"}
      subtitle={
        signup
          ? "Email va parol bilan yangi akkaunt yarating."
          : "Davom etish uchun email va parolingizni kiriting."
      }
      onBack={action.busy ? undefined : goBack}
    >
      <View style={styles.modeSelector}>
        {(
          [
            ["signup", "Yangi akkaunt"],
            ["login", "Akkauntga kirish"],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{
              selected: formMode === value,
              disabled: action.busy,
            }}
            disabled={action.busy}
            onPress={() => onModeChange(value)}
            style={[
              styles.modeButton,
              formMode === value && styles.selectedMode,
            ]}
          >
            <AppText
              variant="label"
              color={formMode === value ? OB.ink : OB.muted}
            >
              {label}
            </AppText>
          </Pressable>
        ))}
      </View>
      <OnboardingField
        label="Email manzilingiz"
        value={email}
        onChangeText={onEmailChange}
        placeholder="ism@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!action.busy}
        returnKeyType="next"
      />
      <PasswordField
        label="Parol"
        value={password}
        onChangeText={setPassword}
        newPassword={signup}
        disabled={action.busy}
        onSubmit={signup ? undefined : submit}
      />
      {signup ? (
        <>
          <AppText variant="caption" color={OB.muted}>
            Parol kamida 8 ta belgidan iborat bo‘lsin.
          </AppText>
          <PasswordField
            label="Parolni qayta kiriting"
            value={confirmation}
            onChangeText={setConfirmation}
            newPassword
            confirmation
            disabled={action.busy}
            onSubmit={submit}
          />
        </>
      ) : null}
      {!signup ? (
        <OnboardingButton
          title="Parolni unutdingizmi?"
          secondary
          disabled={action.busy}
          onPress={() => navigation.navigate("RequestPasswordReset")}
        />
      ) : null}
      <Feedback error={action.error || syncError} />
      <OnboardingButton
        title={signup ? "Ro‘yxatdan o‘tish" : "Kirish"}
        busy={action.busy}
        disabled={!email.trim() || !password || (signup && !confirmation)}
        onPress={submit}
      />
      <AppText variant="caption" color={OB.muted} style={styles.center}>
        {signup
          ? "Akkauntingiz bormi? «Akkauntga kirish»ni tanlang."
          : "Hali akkauntingiz yo‘qmi? «Yangi akkaunt»ni tanlang."}
      </AppText>
      {mode === "demo" ? (
        <AppText variant="caption" color={OB.muted} style={styles.center}>
          Sinov rejimi: haqiqiy akkaunt yaratilmaydi. Haqiqiy parolingizni
          ishlatmang.
          {"\n"}Sinov akkauntlari uchun parol: {DEMO_PASSWORD}
        </AppText>
      ) : null}
    </OnboardingShell>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  newPassword = false,
  confirmation = false,
  disabled,
  onSubmit,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  newPassword?: boolean;
  confirmation?: boolean;
  disabled: boolean;
  onSubmit?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = confirmation
    ? visible
      ? "Takroriy parolni yashirish"
      : "Takroriy parolni ko‘rsatish"
    : visible
      ? "Parolni yashirish"
      : "Parolni ko‘rsatish";
  return (
    <View style={styles.passwordField}>
      <OnboardingField
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={confirmation ? "Parolni takrorlang" : "Parolingiz"}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        autoComplete={newPassword ? "new-password" : "current-password"}
        textContentType={newPassword ? "newPassword" : "password"}
        editable={!disabled}
        style={{ paddingRight: 60 }}
        returnKeyType={onSubmit ? "go" : "next"}
        onSubmitEditing={() => {
          if (!disabled) onSubmit?.();
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={toggleLabel}
        accessibilityState={{ disabled, selected: visible }}
        disabled={disabled}
        onPress={() => setVisible((current) => !current)}
        style={styles.visibilityToggle}
      >
        <Icon name={visible ? "eye-off" : "eye"} color={OB.muted} size={21} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: "center" },
  modeSelector: {
    flexDirection: "row",
    gap: 6,
    padding: 5,
    borderRadius: 18,
    backgroundColor: OB.card,
  },
  modeButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  selectedMode: { backgroundColor: OB.blue },
  passwordField: { position: "relative" },
  visibilityToggle: {
    position: "absolute",
    right: 4,
    bottom: 0,
    minWidth: 48,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
});
