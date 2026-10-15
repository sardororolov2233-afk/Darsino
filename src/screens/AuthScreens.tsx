import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  AppText,
  Button,
  Card,
  Chip,
  Field,
  Header,
  Icon,
  Screen,
  uiStyles,
} from "../components/ui";
import { Brand } from "../components/Brand";
import { WelcomeIllustration } from "../components/Illustrations";
import { Feedback, useAction } from "../components/feedback";
import {
  AREAS,
  GOALS,
  SUBJECTS,
  TutorFields,
  initialTutor,
} from "../components/TutorForm";
import { useAppNavigation } from "../navigation";
import { useApp } from "../state/AppContext";
import {
  DEMO_CODE,
  DEMO_MODERATOR_EMAIL,
  DEMO_TUTOR_EMAIL,
} from "../state/demo";
import { C } from "../theme";
import { ProviderButtons } from "../components/ProviderButtons";

export function SplashScreen() {
  const navigation = useAppNavigation();
  useEffect(() => {
    const timeout = setTimeout(() => navigation.replace("Welcome"), 500);
    return () => clearTimeout(timeout);
  }, [navigation]);
  return (
    <Screen scroll={false} background={C.white} style={styles.center}>
      <Brand width={260} />
      <AppText color={C.muted}>Bilim sari ochiq yo‘l</AppText>
    </Screen>
  );
}
export function WelcomeScreen() {
  const navigation = useAppNavigation();
  const { user, setUser, mode } = useApp();
  return (
    <Screen
      background={C.white}
      bottom={
        <Button
          title="Boshlash"
          icon="arrow-right"
          variant="gold"
          onPress={() => navigation.navigate("SignIn")}
        />
      }
    >
      <Brand width={170} />
      <WelcomeIllustration height={230} />
      <Chip label="USTOZ VA O‘QUVCHI BIR JOYDA" tone="gold" />
      <AppText variant="display">
        Maqsadingizga mos{`\n`}ustozni toping.
      </AppText>
      <AppText color={C.muted}>
        Repetitor bilan gaplashing, guruhga ariza yuboring va darslaringizni bir
        joyda kuzating.
      </AppText>
      <View style={uiStyles.wrap}>
        {[
          { role: "student" as const, label: "O‘quvchi" },
          { role: "tutor" as const, label: "Repetitor" },
        ].map((r) => (
          <Chip
            key={r.role}
            label={r.label}
            selected={user.role === r.role}
            onPress={() => setUser({ role: r.role })}
          />
        ))}
      </View>
      {mode === "demo" ? (
        <AppText variant="caption" color={C.muted}>
          Sinov rejimi · email kodi {DEMO_CODE}. Repetitor: {DEMO_TUTOR_EMAIL};
          moderator: {DEMO_MODERATOR_EMAIL}. Boshqa email bilan yangi akkaunt
          ochiladi.
        </AppText>
      ) : null}
    </Screen>
  );
}
export function SignInScreen() {
  const navigation = useAppNavigation();
  const { user, mode, requestCode, signInWithProvider, syncError } = useApp();
  const [email, setEmail] = useState(user.email || "");
  const action = useAction();
  const next = () =>
    action.run(
      () => requestCode(email),
      () => navigation.navigate("VerifyEmail"),
    );
  return (
    <Screen
      background={C.white}
      bottom={
        <Button
          title="Emailga kod yuborish"
          icon="mail"
          loading={action.busy}
          onPress={next}
        />
      }
    >
      <Header
        title="Kirish yoki ro‘yxatdan o‘tish"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.symbol}>
        <Icon name="log-in" size={30} />
      </View>
      <AppText variant="display">O‘qiga{`\n`}xush kelibsiz.</AppText>
      <AppText color={C.muted}>
        Google yoki Apple akkauntingiz bilan davom eting. Email orqali ham tez
        kirishingiz mumkin.
      </AppText>
      <ProviderButtons
        demo={mode === "demo"}
        busy={action.busy}
        onPress={(provider) => action.run(() => signInWithProvider(provider))}
      />
      <View style={[uiStyles.row, { marginVertical: 6 }]}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        <AppText variant="caption" color={C.muted}>
          yoki email orqali
        </AppText>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      </View>
      <Field
        label="Email manzilingiz"
        value={email}
        onChangeText={setEmail}
        placeholder="ism@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={next}
        returnKeyType="send"
      />
      <AppText variant="caption" color={C.muted}>
        Parol kerak emas. Emailingizga bir martalik tasdiqlash kodi yuboramiz.
        Mavjud akkauntingiz bo‘lsa, shu email bilan qaytasiz.
      </AppText>
      <Feedback error={action.error || syncError} />
      {mode === "demo" ? (
        <Card style={{ backgroundColor: C.goldSoft }}>
          <AppText variant="caption">
            Sinov rejimi: email yuborilmaydi, kod {DEMO_CODE}. Google va Apple
            tugmalari ham sinov akkauntini ochadi.
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}
export function VerifyEmailScreen() {
  const navigation = useAppNavigation();
  const { user, mode, requestCode, verifyCode, syncError } = useApp();
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(60);
  const action = useAction();
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  return (
    <Screen
      background={C.white}
      bottom={
        <Button
          title="Tasdiqlash"
          loading={action.busy}
          onPress={() =>
            action.run(async () => {
              if (!/^\d{6,8}$/.test(code))
                throw new Error("Emaildagi 6–8 xonali kodni kiriting.");
              return verifyCode(code);
            })
          }
        />
      }
    >
      <Header title="Emailni tasdiqlash" onBack={() => navigation.goBack()} />
      <View style={styles.symbol}>
        <Icon name="mail" size={32} />
      </View>
      <AppText variant="display">Emailingizni{`\n`}tekshiring.</AppText>
      <AppText color={C.muted}>
        {user.email}{" "}
        {mode === "demo"
          ? `· sinov kodi ${DEMO_CODE}`
          : "manziliga yuborilgan kodni kiriting."}
      </AppText>
      <Field
        label="Email tasdiqlash kodi"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 8))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={8}
        style={{ fontSize: 24, letterSpacing: 5, textAlign: "center" }}
      />
      <Feedback error={action.error || syncError} />
      <AppText variant="caption" color={C.muted}>
        Xat ko‘rinmasa, Spam jildini tekshiring. Kodning amal qilish muddati
        emailda ko‘rsatiladi.
      </AppText>
      <Button
        title={
          remaining
            ? `Kodni qayta yuborish · ${remaining}s`
            : "Kodni qayta yuborish"
        }
        variant="soft"
        disabled={remaining > 0 || action.busy}
        onPress={() =>
          action.run(
            () => requestCode(user.email || ""),
            () => setRemaining(60),
          )
        }
      />
      <Button
        title="Emailni o‘zgartirish"
        variant="outline"
        disabled={action.busy}
        onPress={() => navigation.goBack()}
      />
    </Screen>
  );
}
export function SetupScreen() {
  const { user, setUser, completeOnboarding } = useApp();
  const [name, setName] = useState(user.name),
    [city, setCity] = useState(user.city),
    [area, setArea] = useState(user.area);
  const [interests, setInterests] = useState(user.interests),
    [goal, setGoal] = useState(user.goal);
  const [tutor, setTutor] = useState(initialTutor);
  const action = useAction();
  const isTutor = user.role === "tutor";
  return (
    <Screen
      bottom={
        <Button
          title={isTutor ? "Profilni tekshiruvga yuborish" : "O‘qiga kirish"}
          loading={action.busy}
          onPress={() =>
            action.run(async () => {
              if (name.trim().length < 2)
                throw new Error("Ism va familiyangizni kiriting.");
              await completeOnboarding(
                {
                  name,
                  city,
                  area,
                  interests: isTutor ? tutor.subjects : interests,
                  goal: isTutor ? "Dars berish" : goal,
                },
                isTutor ? tutor : undefined,
              );
            })
          }
        />
      }
    >
      <Header title={isTutor ? "Repetitor profili" : "Siz haqingizda"} />
      <AppText color={C.muted}>
        {isTutor
          ? "Profilingiz tekshirilgach dars va guruh e’lon qilasiz."
          : "Tavsiyalarni faningiz, hududingiz va maqsadingizga moslaymiz."}
      </AppText>
      <View style={uiStyles.wrap}>
        <Chip
          label="O‘quvchi"
          selected={!isTutor}
          onPress={() => setUser({ role: "student" })}
        />
        <Chip
          label="Repetitor"
          selected={isTutor}
          onPress={() => setUser({ role: "tutor" })}
        />
      </View>
      <Card>
        <Field
          label="Ism va familiya"
          value={name}
          onChangeText={setName}
          autoComplete="name"
        />
        <Field label="Shahar" value={city} onChangeText={setCity} />
        <Field label="Hudud" value={area} onChangeText={setArea} />
        <View style={uiStyles.wrap}>
          {AREAS.slice(0, 3).map((v) => (
            <Chip
              key={v}
              label={v}
              selected={area === v}
              onPress={() => setArea(v)}
            />
          ))}
        </View>
      </Card>
      {isTutor ? (
        <Card>
          <TutorFields value={tutor} onChange={setTutor} />
        </Card>
      ) : (
        <>
          <AppText variant="heading">Qaysi fanlarni o‘rganasiz?</AppText>
          <View style={uiStyles.wrap}>
            {SUBJECTS.map((v) => (
              <Chip
                key={v}
                label={v}
                selected={interests.includes(v)}
                onPress={() =>
                  setInterests((p) =>
                    p.includes(v) ? p.filter((s) => s !== v) : [...p, v],
                  )
                }
              />
            ))}
          </View>
          <AppText variant="heading">O‘qish maqsadingiz</AppText>
          <View style={uiStyles.wrap}>
            {GOALS.map((v) => (
              <Chip
                key={v}
                label={v}
                selected={goal === v}
                onPress={() => setGoal(v)}
              />
            ))}
          </View>
        </>
      )}
      <Feedback {...action} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", gap: 24 },
  symbol: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: C.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
});
