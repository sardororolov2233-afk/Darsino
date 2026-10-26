import { TutorVerificationFields } from "../components/TutorVerificationFields";
import {
  validateTutorApplication,
  normalizeTutorPhone,
} from "../state/tutorApplication";
import React, { useEffect, useRef, useState } from "react";
import { BackHandler, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppText, Avatar } from "../components/ui";
import { Feedback, useAction } from "../components/feedback";
import { initialTutor } from "../components/TutorForm";
import {
  OB,
  OnboardingButton,
  OnboardingField,
  OnboardingOption,
  OnboardingSelect,
  OnboardingShell,
} from "../components/OnboardingUI";
import { useApp } from "../state/AppContext";
import { REGIONS } from "../data/regions";
import {
  ONBOARDING_GOALS,
  ONBOARDING_SUBJECTS,
  needsSubjects,
  validateGoal,
  validatePreferences,
  validateName,
  validateTeaching,
} from "../state/onboarding";
import type { User } from "../state/domain";
import { pickAvatar, type AvatarPhoto } from "../services/avatar";

function initialDraft(user: User) {
  return {
    step: 0,
    goal: "",
    subjects: [] as string[],
    city: "",
    area: "",
    studyMode: "" as "" | NonNullable<User["studyMode"]>,
    studySupport: "" as "" | NonNullable<User["studySupport"]>,
    firstName: user.name.split(" ")[0] || "",
    lastName: user.name.split(" ").slice(1).join(" "),
    tutor: { ...initialTutor },
  };
}
export function SetupScreen() {
  const { user, completeOnboarding, updateAvatar, signOut } = useApp();
  const [draft, setDraft] = useState(() => initialDraft(user));
  const [loaded, setLoaded] = useState(false),
    [draftError, setDraftError] = useState("");
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [photo, setPhoto] = useState<AvatarPhoto | null>(null);
  const action = useAction();
  const isTutor = user.role === "tutor";
  const finalStep = isTutor ? 3 : 2;
  const key = `@oqi/onboarding-v1/${user.id}/${user.role}`;
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!live || !raw) return;
        try {
          const value = JSON.parse(raw);
          // Only accept this version's own shape; never adopt role/identity from a draft.
          const base = initialDraft(user);
          if (
            Object.keys(base).every(
              (k) => typeof value[k] === typeof base[k as keyof typeof base],
            ) &&
            Array.isArray(value.subjects) &&
            value.subjects.every((s: unknown) => typeof s === "string") &&
            value.tutor &&
            Object.keys(base.tutor).every(
              (k) =>
                typeof value.tutor[k] ===
                typeof base.tutor[k as keyof typeof base.tutor],
            ) &&
            Array.isArray(value.tutor.availability) &&
            value.tutor.availability.every(
              (t: unknown) => typeof t === "string",
            )
          )
            setDraft({
              ...base,
              ...value,
              step: Math.min(
                finalStep,
                Math.max(0, Math.floor(Number(value.step)) || 0),
              ),
            });
        } catch {
          setDraftError(
            "Saqlangan qoralama ochilmadi. Tanlovlarni qayta kiriting.",
          );
        }
      })
      .catch(() => {
        if (live) setDraftError("Qoralamani o‘qib bo‘lmadi.");
      })
      .finally(() => {
        if (live) setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [key]);
  useEffect(() => {
    if (!loaded) return;
    writes.current = writes.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, JSON.stringify(draft)))
      .catch(() =>
        setDraftError(
          "Tanlovlarni qurilmada saqlab bo‘lmadi. Ilovani yopmasdan yakunlang.",
        ),
      );
  }, [draft, key, loaded]);
  const update = (patch: Partial<typeof draft>) =>
    setDraft((d) => ({ ...d, ...patch }));
  const back = () => {
    if (action.busy || uploadingCertificate) return;
    if (draft.step > 0) update({ step: draft.step - 1 });
    else action.run(signOut);
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        back();
        return true;
      },
    );
    return () => subscription.remove();
  });
  const preferences = {
    city: draft.city,
    area: draft.area,
    studyMode: draft.studyMode || undefined,
    studySupport: draft.studySupport || undefined,
  };
  const teaching = {
    ...draft.tutor,
    subjects: draft.subjects,
    modes: [draft.studyMode || "Onlayn"],
  };
  const next = () =>
    action.run(async () => {
      if (draft.step === 0) validateGoal(draft.goal, draft.subjects, isTutor);
      if (draft.step === 1) validatePreferences(preferences);
      if (isTutor && draft.step === 2) {
        validateTutorApplication(teaching);
        validateTeaching(teaching);
      }
      if (draft.step < finalStep) {
        update({ step: draft.step + 1 });
        return;
      }
      validateGoal(draft.goal, draft.subjects, isTutor);
      validatePreferences(preferences);
      validateName(draft.firstName, draft.lastName);
      if (isTutor) {
        validateTutorApplication(teaching);
        validateTeaching(teaching);
        teaching.contactPhone = normalizeTutorPhone(
          teaching.contactPhone || "",
        );
      }
      // Upload before setting onboarded: a failed photo upload keeps the user here.
      if (photo) await updateAvatar(photo);
      await writes.current;
      await completeOnboarding(
        {
          name: `${draft.firstName.trim()} ${draft.lastName.trim()}`,
          ...preferences,
          goal: draft.goal,
          interests:
            isTutor || needsSubjects(draft.goal)
              ? draft.subjects
              : ["Ingliz tili"],
        },
        isTutor ? teaching : undefined,
      );
      await AsyncStorage.removeItem(key).catch(() => {});
    });
  const subjectGrid = (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {ONBOARDING_SUBJECTS.map((subject) => (
        <OnboardingOption
          key={subject}
          compact
          title={subject}
          selected={draft.subjects.includes(subject)}
          onPress={() =>
            update({
              subjects: draft.subjects.includes(subject)
                ? draft.subjects.filter((s) => s !== subject)
                : [...draft.subjects, subject],
            })
          }
        />
      ))}
    </View>
  );
  const titles = [
    isTutor ? "Qaysi maqsadga tayyorlaysiz?" : "Maqsadingiz nima?",
    isTutor ? "Qayerda dars berasiz?" : "Qanday tayyorlanasiz?",
    ...(isTutor ? ["Tajribangiz haqida"] : []),
    "Siz bilan tanishamiz",
  ];
  return (
    <OnboardingShell
      title={loaded ? titles[draft.step] : "Tanlovlar yuklanmoqda…"}
      subtitle={
        draft.step === 0
          ? "Sizga mos yo‘lni tanlang."
          : draft.step === 1
            ? "Sizga qulay shakl va hududni belgilang."
            : draft.step === finalStep
              ? "Oxirgi qadam. Profilingizni yakunlang."
              : "Bu ma’lumotlar ustoz profilingizni tekshirishga yordam beradi."
      }
      step={draft.step + 3}
      total={finalStep + 3}
      onBack={action.busy || uploadingCertificate ? undefined : back}
      footer={
        <>
          <Feedback error={action.error || draftError} />
          <OnboardingButton
            title={draft.step === finalStep ? "Saqlash" : "Davom etish"}
            busy={action.busy || uploadingCertificate}
            disabled={!loaded || uploadingCertificate}
            onPress={next}
          />
        </>
      }
    >
      {loaded ? (
        <View pointerEvents={action.busy ? "none" : "auto"} style={{ gap: 16 }}>
          {draft.step === 0 ? (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {ONBOARDING_GOALS.map((goal) => (
                  <OnboardingOption
                    key={goal.title}
                    compact
                    title={goal.title}
                    icon={goal.icon}
                    selected={draft.goal === goal.title}
                    onPress={() =>
                      update({
                        goal: goal.title,
                        subjects:
                          draft.goal === goal.title ? draft.subjects : [],
                      })
                    }
                  />
                ))}
              </View>
              {needsSubjects(draft.goal) || (isTutor && draft.goal) ? (
                <>
                  <AppText variant="heading" color="white">
                    {isTutor
                      ? "Qaysi fanlardan dars berasiz?"
                      : "Qaysi fanlar kerak?"}
                  </AppText>
                  <AppText variant="caption" color={OB.muted}>
                    Bir yoki bir nechta fanni tanlashingiz mumkin.
                  </AppText>
                  {subjectGrid}
                </>
              ) : null}
            </>
          ) : null}
          {draft.step === 1 ? (
            <>
              <AppText variant="label" color="white">
                Ta’lim shakli
              </AppText>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {(["Oflayn", "Onlayn"] as const).map((v) => (
                  <OnboardingOption
                    key={v}
                    compact
                    dense
                    title={v}
                    icon={v === "Onlayn" ? "video" : "map-pin"}
                    selected={draft.studyMode === v}
                    onPress={() =>
                      update({
                        studyMode: v,
                        ...(isTutor
                          ? { studySupport: "Ustoz bilan" as const }
                          : {}),
                      })
                    }
                  />
                ))}
              </View>
              {!isTutor ? (
                <>
                  <AppText variant="label" color="white">
                    Tayyorgarlik usuli
                  </AppText>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    {(["Mustaqil", "Ustoz bilan"] as const).map((v) => (
                      <OnboardingOption
                        key={v}
                        compact
                        dense
                        title={v}
                        icon={v === "Mustaqil" ? "book" : "users"}
                        selected={draft.studySupport === v}
                        onPress={() => update({ studySupport: v })}
                      />
                    ))}
                  </View>
                </>
              ) : null}
              <OnboardingSelect
                label="Viloyat"
                value={draft.city}
                options={REGIONS.map((r) => r.name)}
                onChange={(city) => update({ city, area: "" })}
              />
              <OnboardingSelect
                label="Tuman / shahar"
                value={draft.area}
                disabled={!draft.city}
                options={
                  REGIONS.find((r) => r.name === draft.city)?.districts || []
                }
                onChange={(area) => update({ area })}
              />
            </>
          ) : null}
          {isTutor && draft.step === 2 ? (
            <>
              <TutorVerificationFields
                value={teaching}
                dark
                onBusyChange={setUploadingCertificate}
                onChange={(patch) => {
                  action.setError("");
                  setDraft((old) => ({
                    ...old,
                    tutor: { ...old.tutor, ...patch },
                  }));
                }}
              />
              <OnboardingField
                label="Yo‘nalish"
                placeholder="Masalan, IELTS yoki algebra"
                value={draft.tutor.specialty}
                onChangeText={(specialty) =>
                  update({ tutor: { ...draft.tutor, specialty } })
                }
              />
              <OnboardingField
                label="Tajriba (yil)"
                keyboardType="number-pad"
                value={String(draft.tutor.experience)}
                onChangeText={(v) =>
                  update({
                    tutor: {
                      ...draft.tutor,
                      experience: Number(v.replace(/\D/g, "")),
                    },
                  })
                }
              />
              <OnboardingField
                label="Sertifikat izohi (ixtiyoriy)"
                placeholder="Sertifikat nomi yoki izohi"
                value={draft.tutor.proof}
                onChangeText={(proof) =>
                  update({ tutor: { ...draft.tutor, proof } })
                }
              />
              <AppText color={OB.muted} variant="caption">
                Tasdiqlash ma’lumoti faqat siz va moderatorga ko‘rinadi.
              </AppText>
              <OnboardingField
                label="Darslaringiz haqida"
                multiline
                value={draft.tutor.bio}
                onChangeText={(bio) =>
                  update({ tutor: { ...draft.tutor, bio } })
                }
              />
              <OnboardingField
                label="Individual dars narxi (so‘m)"
                keyboardType="number-pad"
                value={String(draft.tutor.price)}
                onChangeText={(v) =>
                  update({
                    tutor: {
                      ...draft.tutor,
                      price: Number(v.replace(/\D/g, "")),
                    },
                  })
                }
              />
              <OnboardingField
                label="Qabul vaqtlari (HH:MM)"
                value={draft.tutor.availability.join(",")}
                onChangeText={(v) =>
                  update({
                    tutor: {
                      ...draft.tutor,
                      availability: v.split(",").map((t) => t.trim()),
                    },
                  })
                }
              />
            </>
          ) : null}
          {draft.step === finalStep ? (
            <>
              <View style={{ alignItems: "center", gap: 8 }}>
                <Avatar
                  initials={
                    `${draft.firstName[0] || ""}${draft.lastName[0] || ""}`.toUpperCase() ||
                    "O‘"
                  }
                  size={100}
                  uri={photo?.previewUri || user.demoAvatarUri}
                  label="Profil rasmi"
                />
                <OnboardingButton
                  title={
                    photo ? "Boshqa rasm tanlash" : "Rasm yuklash (ixtiyoriy)"
                  }
                  secondary
                  onPress={() =>
                    action.run(async () => {
                      const result = await pickAvatar();
                      if (result) setPhoto(result);
                    })
                  }
                />
                {photo ? (
                  <OnboardingButton
                    title="Tanlangan rasmni olib tashlash"
                    secondary
                    onPress={() => setPhoto(null)}
                  />
                ) : null}
              </View>
              <OnboardingField
                label="Ism"
                value={draft.firstName}
                onChangeText={(firstName) => update({ firstName })}
                autoComplete="given-name"
                textContentType="givenName"
                maxLength={50}
              />
              <OnboardingField
                label="Familiya"
                value={draft.lastName}
                onChangeText={(lastName) => update({ lastName })}
                autoComplete="family-name"
                textContentType="familyName"
                maxLength={50}
              />
              <View
                style={{
                  backgroundColor: OB.card,
                  borderRadius: 20,
                  padding: 18,
                  gap: 8,
                }}
              >
                <AppText variant="label" color="white">
                  {draft.goal}
                </AppText>
                <AppText color={OB.muted} variant="caption">
                  {(isTutor || needsSubjects(draft.goal)
                    ? draft.subjects
                    : ["Ingliz tili"]
                  ).join(" · ")}
                </AppText>
                <AppText color={OB.muted} variant="caption">
                  {draft.studyMode} · {draft.studySupport}
                </AppText>
                <AppText color={OB.muted} variant="caption">
                  {draft.city}, {draft.area}
                </AppText>
              </View>
              {isTutor ? (
                <AppText color={OB.muted} variant="caption">
                  Saqlangach ustoz kabineti ochiladi. Dars e’lon qilish uchun
                  profilingiz moderator tomonidan tasdiqlanishi kerak.
                </AppText>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </OnboardingShell>
  );
}
