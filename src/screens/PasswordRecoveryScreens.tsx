import React, { useState } from "react";
import { useAppNavigation } from "../navigation";
import {
  OnboardingShell,
  OnboardingField,
  OnboardingButton,
} from "../components/OnboardingUI";
import { AppText } from "../components/ui";
import { useAction, Feedback } from "../components/feedback";
import { useApp } from "../state/AppContext";
import { requireBackend } from "../services/backend";
import { createPasswordRecovery } from "../services/authFlow";
import { authRedirectUrl } from "../services/auth";
import { C } from "../theme";
export function RequestPasswordResetScreen() {
  const nav = useAppNavigation(),
    { mode } = useApp(),
    action = useAction(),
    [email, setEmail] = useState("");
  return (
    <OnboardingShell
      title="Parolni tiklash"
      subtitle="Email manzilingizga yangi parol qo‘yish uchun havola yuboramiz."
      onBack={() => nav.goBack()}
    >
      <OnboardingField
        label="Tiklash uchun email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!action.busy}
      />
      <OnboardingButton
        title="Tiklash havolasini yuborish"
        busy={action.busy}
        disabled={!email.trim()}
        onPress={() =>
          action.run(async () => {
            if (mode === "demo")
              throw new Error("Tiklash xati haqiqiy akkauntda yuboriladi.");
            await createPasswordRecovery(requireBackend()).request(
              email,
              authRedirectUrl(),
            );
            action.setSuccess(
              "Agar bu email bilan akkaunt mavjud bo‘lsa, tiklash havolasi yuborildi. Spam papkasini ham tekshiring.",
            );
          })
        }
      />
      <Feedback {...action} />
      <AppText color={C.muted} variant="caption">
        Havolani O‘qi o‘rnatilgan shu qurilmada oching.
      </AppText>
    </OnboardingShell>
  );
}
export function ResetPasswordScreen() {
  const action = useAction(),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  return (
    <OnboardingShell
      title="Yangi parol yarating"
      subtitle="Yangi parolingizni saqlang, so‘ng qayta kiring."
    >
      <OnboardingField
        label="Yangi parol"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        editable={!action.busy}
      />
      <OnboardingField
        label="Yangi parolni takrorlang"
        value={confirmation}
        onChangeText={setConfirmation}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        editable={!action.busy}
      />
      <OnboardingButton
        title="Yangi parolni saqlash"
        busy={action.busy}
        disabled={!password || !confirmation}
        onPress={() =>
          action.run(
            () =>
              createPasswordRecovery(requireBackend()).update(
                password,
                confirmation,
              ),
            () => {
              setPassword("");
              setConfirmation("");
            },
          )
        }
      />
      <Feedback {...action} />
    </OnboardingShell>
  );
}

export function RestoreSessionScreen() {
  const { retrySession, signOut, syncError } = useApp(),
    action = useAction();
  const message = /fetch|network|timeout/i.test(syncError)
    ? "Internetga ulanishni tekshiring va qayta urinib ko‘ring."
    : syncError;
  return (
    <OnboardingShell
      title="Akkauntga ulanish"
      subtitle="Akkauntingizni ochish uchun server bilan ulanishni tiklaymiz."
    >
      <Feedback error={action.error || message} />
      <OnboardingButton
        title="Qayta ulanish"
        busy={action.busy}
        onPress={() => action.run(retrySession)}
      />
      <OnboardingButton
        title="Hisobdan chiqish"
        secondary
        disabled={action.busy}
        onPress={() => action.run(signOut)}
      />
    </OnboardingShell>
  );
}
