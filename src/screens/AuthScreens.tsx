import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText } from "../components/ui";
import { Feedback, useAction } from "../components/feedback";
import { useAppNavigation } from "../navigation";
import { useApp } from "../state/AppContext";
import {
  DEMO_CODE,
  DEMO_MODERATOR_EMAIL,
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
    navigation.navigate("SignIn");
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
        <AppText
          variant="caption"
          color={OB.muted}
          style={{ textAlign: "center" }}
        >
          Sinov rejimi · kod {DEMO_CODE}. Ustoz: {DEMO_TUTOR_EMAIL}; moderator:{" "}
          {DEMO_MODERATOR_EMAIL}.
        </AppText>
      ) : null}
    </OnboardingShell>
  );
}
export function SignInScreen() {
  const navigation = useAppNavigation();
  const { user, mode, requestCode, signInWithProvider, syncError } = useApp();
  const [email, setEmail] = useState(user.email || ""),
    [showEmail, setShowEmail] = useState(false);
  const action = useAction();
  const next = () =>
    action.run(
      () => requestCode(email),
      () => navigation.navigate("VerifyEmail"),
    );
  return (
    <OnboardingShell
      title="Avval akkaunt ochamiz"
      subtitle="Tanlovlaringiz va darslaringiz bir joyda saqlanadi. Bu bir necha daqiqa vaqt oladi."
      onBack={action.busy ? undefined : () => navigation.goBack()}
    >
      <ProviderButtons
        dark
        demo={mode === "demo"}
        busy={action.busy}
        onPress={(provider) => action.run(() => signInWithProvider(provider))}
      />
      <OnboardingButton
        title="Email orqali davom etish"
        secondary
        disabled={action.busy}
        onPress={() => setShowEmail(true)}
      />
      {showEmail ? (
        <View style={{ gap: 16 }}>
          <OnboardingField
            label="Email manzilingiz"
            value={email}
            onChangeText={setEmail}
            placeholder="ism@example.com"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!action.busy}
            onSubmitEditing={() => {
              if (!action.busy) next();
            }}
            returnKeyType="send"
          />
          <OnboardingButton
            title="Emailga kod yuborish"
            busy={action.busy}
            onPress={next}
          />
        </View>
      ) : null}
      <AppText
        variant="caption"
        color={OB.muted}
        style={{ textAlign: "center" }}
      >
        Akkauntingiz bormi? Shu email yoki avvalgi Google / Apple akkauntingiz
        bilan kiring.
      </AppText>
      <Feedback error={action.error || syncError} />
      {mode === "demo" ? (
        <AppText
          variant="caption"
          color={OB.muted}
          style={{ textAlign: "center" }}
        >
          Sinov rejimi: email yuborilmaydi, kod {DEMO_CODE}. Google va Apple
          sinov akkauntini ochadi.
        </AppText>
      ) : null}
    </OnboardingShell>
  );
}
export function VerifyEmailScreen() {
  const navigation = useAppNavigation();
  const { user, mode, requestCode, verifyCode, syncError } = useApp();
  const [code, setCode] = useState(""),
    [remaining, setRemaining] = useState(60);
  const action = useAction();
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  const verify = () =>
    action.run(async () => {
      if (!/^\d{6,8}$/.test(code))
        throw new Error("Emaildagi 6–8 xonali kodni kiriting.");
      return verifyCode(code);
    });
  return (
    <OnboardingShell
      title="Emailingizni tekshiring"
      subtitle={`${user.email} ${mode === "demo" ? `· sinov kodi ${DEMO_CODE}` : "manziliga yuborilgan kodni kiriting."}`}
      onBack={action.busy ? undefined : () => navigation.goBack()}
      footer={
        <OnboardingButton
          title="Tasdiqlash"
          busy={action.busy}
          onPress={verify}
        />
      }
    >
      <OnboardingField
        label="Email tasdiqlash kodi"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 8))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={8}
        editable={!action.busy}
        style={{ fontSize: 24, letterSpacing: 5, textAlign: "center" }}
        onSubmitEditing={() => {
          if (!action.busy) verify();
        }}
      />
      <AppText
        color={OB.muted}
        variant="caption"
        style={{ textAlign: "center" }}
      >
        Xat ko‘rinmasa, Spam jildini tekshiring.
      </AppText>
      <Feedback error={action.error || syncError} />
      <OnboardingButton
        title={
          remaining
            ? `Kodni qayta yuborish · ${remaining}s`
            : "Kodni qayta yuborish"
        }
        secondary
        disabled={remaining > 0 || action.busy}
        onPress={() =>
          action.run(
            () => requestCode(user.email || ""),
            () => setRemaining(60),
          )
        }
      />
      <OnboardingButton
        title="Emailni o‘zgartirish"
        secondary
        disabled={action.busy}
        onPress={() => navigation.goBack()}
      />
    </OnboardingShell>
  );
}
