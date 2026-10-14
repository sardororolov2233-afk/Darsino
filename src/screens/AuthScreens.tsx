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
  DEMO_MODERATOR_PHONE,
  DEMO_TUTOR_PHONE,
} from "../state/demo";
import { C } from "../theme";

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
          onPress={() => navigation.navigate("Phone")}
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
          Sinov rejimi · SMS kodi {DEMO_CODE}. Repetitor: {DEMO_TUTOR_PHONE};
          moderator: {DEMO_MODERATOR_PHONE}. Boshqa raqam bilan yangi akkaunt
          ochiladi.
        </AppText>
      ) : null}
    </Screen>
  );
}
export function PhoneScreen() {
  const navigation = useAppNavigation();
  const { user, mode, requestCode } = useApp();
  const [phone, setPhone] = useState(user.phone.replace(/^\+998/, ""));
  const action = useAction();
  function next() {
    action.run(
      async () => {
        const digits = phone.replace(/\D/g, "");
        if (
          digits.length !== 9 &&
          !(digits.length === 12 && digits.startsWith("998"))
        )
          throw new Error("Telefon raqamingizni 9 ta raqam bilan kiriting.");
        await requestCode(`+${digits.length === 9 ? "998" : ""}${digits}`);
      },
      () => navigation.navigate("Verify"),
    );
  }
  return (
    <Screen
      background={C.white}
      bottom={
        <Button title="Davom etish" loading={action.busy} onPress={next} />
      }
    >
      <Header
        title="Telefon orqali kirish"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.symbol}>
        <Icon name="smartphone" size={32} />
      </View>
      <AppText variant="display">
        Birinchi qadam —{`\n`}telefon raqamingiz.
      </AppText>
      <AppText color={C.muted}>
        {mode === "demo"
          ? "Sinov kodi bilan ilova oqimini tekshiring."
          : "Raqamingizga SMS tasdiqlash kodi yuboramiz."}
      </AppText>
      <View style={uiStyles.row}>
        <AppText variant="heading">+998</AppText>
        <View style={{ flex: 1 }}>
          <Field
            label="Telefon raqamingiz"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="90 123 45 67"
          />
        </View>
      </View>
      <Feedback {...action} />
      <AppText variant="caption" color={C.muted}>
        Avval ro‘yxatdan o‘tgan bo‘lsangiz, shu raqam bilan akkauntingizga
        qaytasiz.
      </AppText>
    </Screen>
  );
}
export function VerifyScreen() {
  const navigation = useAppNavigation();
  const { user, mode, requestCode, verifyCode } = useApp();
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
              if (code.length !== 6)
                throw new Error("6 xonali kodni kiriting.");
              return verifyCode(code);
            })
          }
        />
      }
    >
      <Header title="Raqamni tasdiqlash" onBack={() => navigation.goBack()} />
      <View style={styles.symbol}>
        <Icon name="shield" size={32} />
      </View>
      <AppText variant="display">Tasdiqlash kodini{`\n`}kiriting.</AppText>
      <AppText color={C.muted}>
        {user.phone}{" "}
        {mode === "demo"
          ? `· sinov kodi ${DEMO_CODE}`
          : "raqamiga yuborilgan kod."}
      </AppText>
      <Field
        label="SMS tasdiqlash kodi"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={6}
        style={{ fontSize: 26, letterSpacing: 12, textAlign: "center" }}
      />
      <Feedback {...action} />
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
            () => requestCode(user.phone),
            () => setRemaining(60),
          )
        }
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
          title={isTutor ? "Profilni tekshiruvga yuborish" : "Darsinoga kirish"}
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
