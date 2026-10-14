import React from "react";
import { View } from "react-native";
import { AppText, Chip, Field, uiStyles } from "./ui";
import type { TutorInput } from "../state/domain";
import { C } from "../theme";
export const SUBJECTS = [
  "Ingliz tili",
  "Matematika",
  "Tarix",
  "IT",
  "Rus tili",
  "Fizika",
];
export const AREAS = [
  "Yunusobod",
  "Mirzo Ulug‘bek",
  "Chilonzor",
  "Samarqand",
  "Boshqa hudud",
];
export const GOALS = [
  "IELTS / CEFR",
  "Universitetga kirish",
  "Maktab fanlari",
  "Kasbiy rivojlanish",
  "Erkin muloqot",
];
export const initialTutor: TutorInput = {
  subjects: ["Ingliz tili"],
  specialty: "",
  experience: 0,
  proof: "",
  bio: "",
  price: 90000,
  modes: ["Onlayn"],
  availability: ["18:00"],
};
export function TutorFields({
  value,
  onChange,
}: {
  value: TutorInput;
  onChange: (value: TutorInput) => void;
}) {
  const update = (patch: Partial<TutorInput>) =>
    onChange({ ...value, ...patch });
  return (
    <View style={{ gap: 16 }}>
      <AppText variant="heading">Mutaxassislik va tajriba</AppText>
      <View style={uiStyles.wrap}>
        {SUBJECTS.map((s) => (
          <Chip
            key={s}
            label={s}
            selected={value.subjects.includes(s)}
            onPress={() =>
              update({
                subjects: value.subjects.includes(s)
                  ? value.subjects.filter((v) => v !== s)
                  : [...value.subjects, s],
              })
            }
          />
        ))}
      </View>
      <Field
        label="Yo‘nalish"
        placeholder="Masalan, IELTS yoki algebra"
        value={value.specialty}
        onChangeText={(specialty) => update({ specialty })}
      />
      <Field
        label="Tajriba (yil)"
        keyboardType="number-pad"
        value={String(value.experience)}
        onChangeText={(v) =>
          update({ experience: Number(v.replace(/\D/g, "")) })
        }
      />
      <Field
        label="Tasdiqlash ma’lumoti"
        placeholder="Diplom / sertifikat raqami yoki havolasi"
        multiline
        value={value.proof}
        onChangeText={(proof) => update({ proof })}
      />
      <AppText variant="caption" color={C.muted}>
        Bu ma’lumot faqat siz va moderatorga ko‘rinadi.
      </AppText>
      <Field
        label="Darslaringiz haqida"
        placeholder="Kimlar uchun va qanday dars o‘tasiz?"
        multiline
        value={value.bio}
        onChangeText={(bio) => update({ bio })}
        style={{ minHeight: 88 }}
      />
      <Field
        label="Individual dars narxi (so‘m)"
        keyboardType="number-pad"
        value={String(value.price)}
        onChangeText={(v) => update({ price: Number(v.replace(/\D/g, "")) })}
      />
      <AppText variant="label">Dars shakli</AppText>
      <View style={uiStyles.wrap}>
        {["Onlayn", "Oflayn"].map((mode) => (
          <Chip
            key={mode}
            label={mode}
            selected={value.modes.includes(mode)}
            onPress={() =>
              update({
                modes: value.modes.includes(mode)
                  ? value.modes.filter((v) => v !== mode)
                  : [...value.modes, mode],
              })
            }
          />
        ))}
      </View>
      <Field
        label="Qabul vaqtlari (HH:MM)"
        placeholder="16:00, 18:00, 20:00"
        value={value.availability.join(", ")}
        onChangeText={(v) =>
          update({ availability: v.split(",").map((t) => t.trim()) })
        }
      />
    </View>
  );
}
