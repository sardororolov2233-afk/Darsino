import React, { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppNavigation, type RootStackParamList } from "../navigation";
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  Header,
  Icon,
  Screen,
  uiStyles,
} from "../components/ui";
import { OqiHeader } from "../components/OqiHeader";
import { RadarChart } from "../components/RadarChart";
import {
  ClubCard,
  DiagnosticCard,
  OpenLessonCard,
} from "../components/LearningCards";
import { Feedback, useAction } from "../components/feedback";
import { clubs, diagnostics, openLessons, SKILLS } from "../data/learning";
import { learningStats, scoreAttempt } from "../state/learning";
import { useLearning } from "../state/LearningContext";
import { C, font } from "../theme";

export function LearningLibrary({
  section,
}: {
  section: "Video darslar" | "Klublar";
}) {
  const [subject, setSubject] = useState("Barchasi");
  return (
    <>
      <AppText variant="heading">
        {section === "Klublar"
          ? "Birga o‘rganish qiziqroq"
          : "Bilimga har kuni bir qadam"}
      </AppText>
      <AppText variant="caption" color={C.muted}>
        {section === "Klublar"
          ? "Qiziqishlaringizga mos klublarni kuzating. Bu namuna katalogi; kuzatish tadbirga ro‘yxatdan o‘tish hisoblanmaydi."
          : "Khan Academy va British Council ochiq videolari. Darslar manba saytida ochiladi."}
      </AppText>
      {section === "Video darslar" ? (
        <>
          <View style={uiStyles.wrap}>
            {["Barchasi", ...new Set(openLessons.map((l) => l.subject))].map(
              (s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={subject === s}
                  onPress={() => setSubject(s)}
                />
              ),
            )}
          </View>
          {openLessons
            .filter((l) => subject === "Barchasi" || l.subject === subject)
            .map((l) => (
              <OpenLessonCard key={l.id} lesson={l} />
            ))}
        </>
      ) : (
        clubs.map((c) => <ClubCard key={c.id} club={c} />)
      )}
    </>
  );
}
export function RadarScreen() {
  const { data, error } = useLearning();
  const [subject, setSubject] = useState("Umumiy");
  const stats = learningStats(data, subject);
  const sortedSkills = SKILLS.filter((s) => stats.skills[s].total).sort(
    (a, b) =>
      stats.skills[a].correct / stats.skills[a].total -
      stats.skills[b].correct / stats.skills[b].total,
  );
  return (
    <Screen top={<OqiHeader />}>
      <View style={uiStyles.between}>
        <View>
          <AppText variant="title">Bilim radari</AppText>
          <AppText variant="caption" color={C.muted}>
            Kuchli tomonlaringizni kashf eting
          </AppText>
        </View>
        <Chip icon="zap" label={`${stats.xp} XP`} tone="green" />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {["Umumiy", ...new Set(diagnostics.map((t) => t.subject))].map((s) => (
          <Chip
            key={s}
            label={s}
            selected={subject === s}
            onPress={() => setSubject(s)}
          />
        ))}
      </ScrollView>
      <Card style={{ alignItems: "stretch", padding: 18 }}>
        <View style={uiStyles.between}>
          <AppText variant="label">O‘zlashtirish xaritasi</AppText>
          <Chip
            label={
              stats.score === null
                ? "Hali test ishlanmagan"
                : `${stats.score}% to‘g‘ri`
            }
            tone="purple"
          />
        </View>
        <RadarChart skills={stats.skills} />
        <AppText
          variant="caption"
          color={C.muted}
          style={{ textAlign: "center" }}
        >
          {stats.total
            ? `${stats.total} savoldan ${stats.correct} tasi to‘g‘ri. Har bir testning oxirgi urinishi hisoblanadi.`
            : "Birinchi testni ishlang. Natijangiz shu yerda paydo bo‘ladi."}
        </AppText>
      </Card>
      <View style={uiStyles.row}>
        {[
          { label: "XP ball", value: stats.xp, icon: "zap" as const },
          {
            label: "Kun ketma-ket",
            value: stats.streak,
            icon: "trending-up" as const,
          },
          {
            label: "Test ishlangan",
            value: stats.completedTests,
            icon: "check-circle" as const,
          },
        ].map((m) => (
          <Card
            key={m.label}
            style={{
              flex: 1,
              alignItems: "center",
              paddingHorizontal: 5,
              gap: 4,
            }}
          >
            <Icon name={m.icon} color={C.green} size={18} />
            <AppText variant="title">{m.value}</AppText>
            <AppText
              variant="caption"
              color={C.muted}
              style={{ textAlign: "center", fontSize: 10 }}
            >
              {m.label}
            </AppText>
          </Card>
        ))}
      </View>
      {sortedSkills.length ? (
        <Card>
          <AppText variant="heading">Keyingi qadam</AppText>
          <AppText color={C.muted}>
            {sortedSkills[0]} yo‘nalishidagi savollarni qayta ko‘rib chiqing.
            Har bir javobdan keyin izoh beriladi.
          </AppText>
        </Card>
      ) : null}
      <AppText variant="heading">Qisqa diagnostika</AppText>
      {diagnostics
        .filter((t) => subject === "Umumiy" || t.subject === subject)
        .map((t) => (
          <DiagnosticCard key={t.id} test={t} />
        ))}
      {data.attempts.length ? (
        <Card>
          <AppText variant="heading">So‘nggi natijalar</AppText>
          {[...data.attempts]
            .reverse()
            .slice(0, 5)
            .map((a) => {
              const test = diagnostics.find((t) => t.id === a.testId)!;
              return (
                <View key={a.id} style={uiStyles.between}>
                  <AppText variant="caption" style={{ flex: 1 }}>
                    {test.subject}
                  </AppText>
                  <AppText variant="label" color={C.green}>
                    {scoreAttempt(a)}/{test.questions.length}
                  </AppText>
                </View>
              );
            })}
        </Card>
      ) : null}
      <Feedback error={error} />
      <AppText variant="caption" color={C.muted}>
        Bu qisqa mashqlar sertifikat yoki IELTS prognozi emas. Radar, XP va
        o‘quv progressi shu qurilmada, akkauntingiz uchun saqlanadi.
      </AppText>
    </Screen>
  );
}
export function QuizScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Quiz">) {
  const navigation = useAppNavigation();
  const { finishQuiz, ready } = useLearning();
  const test = diagnostics.find((t) => t.id === route.params.id);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);
  const action = useAction();
  if (!test)
    return (
      <Screen>
        <Header title="Test" onBack={() => navigation.goBack()} />
        <EmptyState
          title="Test topilmadi"
          subtitle="Radardan boshqa testni tanlang."
        />
      </Screen>
    );
  const index = answers.length;
  const question = test.questions[index];
  const finalAnswers = selected === null ? answers : [...answers, selected];
  const score = finalAnswers.filter(
    (a, i) => a === test.questions[i].correct,
  ).length;
  const advance = () => {
    if (selected === null) return;
    if (index === test.questions.length - 1) {
      void action.run(
        () => finishQuiz(test.id, finalAnswers),
        () => setDone(true),
      );
    } else {
      setAnswers(finalAnswers);
      setSelected(null);
      setChecked(false);
    }
  };
  return (
    <Screen>
      <Header
        title={done ? "Test natijasi" : test.subject}
        onBack={() => navigation.goBack()}
      />
      {done ? (
        <>
          <Card
            style={{
              alignItems: "center",
              padding: 28,
              backgroundColor: C.greenSoft,
            }}
          >
            <Icon name="award" size={48} color={C.green} />
            <AppText variant="display">
              {score}/{test.questions.length}
            </AppText>
            <AppText variant="heading">Natijangiz saqlandi!</AppText>
            <AppText color={C.muted} style={{ textAlign: "center" }}>
              Bilim radaringiz yangilandi. XP har bir testdagi eng yaxshi
              natijangizdan hisoblanadi.
            </AppText>
          </Card>
          <Button
            title="Radarga qaytish"
            icon="target"
            onPress={() => navigation.popTo("Main", { screen: "Radar" })}
          />
          <Button
            title="Qayta ishlash"
            variant="outline"
            onPress={() => {
              setAnswers([]);
              setSelected(null);
              setChecked(false);
              setDone(false);
            }}
          />
        </>
      ) : (
        <>
          <Chip label="QISQA DIAGNOSTIKA" tone="purple" />
          <AppText variant="title">{test.title}</AppText>
          <View style={uiStyles.between}>
            <AppText variant="caption" color={C.muted}>
              Savol {index + 1} / {test.questions.length}
            </AppText>
            <AppText variant="caption" color={C.green}>
              {question.skill}
            </AppText>
          </View>
          <View
            style={{ height: 6, borderRadius: 3, backgroundColor: C.border }}
          >
            <View
              style={{
                width: `${((index + 1) / test.questions.length) * 100}%`,
                height: 6,
                borderRadius: 3,
                backgroundColor: C.accent,
              }}
            />
          </View>
          <Card>
            <AppText variant="heading">{question.text}</AppText>
          </Card>
          {question.options.map((option, i) => {
            const correct = checked && question.correct === i;
            const wrong = checked && selected === i && i !== question.correct;
            return (
              <Pressable
                key={`${index}-${i}`}
                accessibilityRole="radio"
                accessibilityLabel={option}
                accessibilityState={{
                  selected: selected === i,
                  disabled: checked,
                }}
                disabled={checked}
                onPress={() => setSelected(i)}
                style={{
                  padding: 18,
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: correct
                    ? C.accent
                    : wrong
                      ? C.error
                      : selected === i
                        ? C.navy
                        : C.border,
                  backgroundColor: correct
                    ? C.greenSoft
                    : wrong
                      ? C.errorSoft
                      : selected === i
                        ? C.blueSoft
                        : C.white,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <AppText variant="label" color={C.muted}>
                  {String.fromCharCode(65 + i)}
                </AppText>
                <AppText style={{ flex: 1 }}>{option}</AppText>
                {correct ? (
                  <Icon name="check-circle" color={C.green} />
                ) : wrong ? (
                  <Icon name="x-circle" color={C.error} />
                ) : null}
              </Pressable>
            );
          })}
          {checked ? (
            <Card
              style={{
                backgroundColor:
                  selected === question.correct ? C.greenSoft : C.blueSoft,
              }}
            >
              <AppText variant="label">
                {selected === question.correct
                  ? "To‘g‘ri javob!"
                  : "Birgalikda tahlil qilamiz"}
              </AppText>
              <AppText>{question.explanation}</AppText>
            </Card>
          ) : null}
          <Button
            title={
              checked
                ? index === test.questions.length - 1
                  ? "Natijani saqlash"
                  : "Keyingi savol"
                : "Javobni tekshirish"
            }
            disabled={selected === null || !ready}
            loading={action.busy}
            variant="gold"
            onPress={() => (checked ? advance() : setChecked(true))}
          />
          <AppText variant="caption" color={C.muted}>
            Testni tugatib natijani saqlasangiz, u radaringizga qo‘shiladi.
          </AppText>
        </>
      )}
      <Feedback {...action} />
    </Screen>
  );
}
export function OpenLessonScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "OpenLesson">) {
  const navigation = useAppNavigation();
  const { data, completeLesson, ready } = useLearning();
  const lesson = openLessons.find((l) => l.id === route.params.id);
  const action = useAction();
  const [opened, setOpened] = useState(false);
  if (!lesson)
    return (
      <Screen>
        <Header title="Dars" onBack={() => navigation.goBack()} />
        <EmptyState
          title="Dars topilmadi"
          subtitle="Katalogdan boshqa darsni tanlang."
        />
      </Screen>
    );
  const done = !!data.completedLessons[lesson.id];
  return (
    <Screen>
      <Header title="Ochiq video dars" onBack={() => navigation.goBack()} />
      <Card style={{ backgroundColor: lesson.color, padding: 26, gap: 22 }}>
        <Chip label={lesson.subject} />
        <AppText
          color="white"
          style={{ fontFamily: font.extra, fontSize: 38, lineHeight: 48 }}
        >
          {lesson.icon}
        </AppText>
        <AppText variant="title" color="white">
          {lesson.title}
        </AppText>
        <AppText variant="caption" color="#FFFFFFDD">
          {lesson.author} · {lesson.language}
        </AppText>
      </Card>
      <AppText>{lesson.summary}</AppText>
      <Button
        title="Videoni manbada ochish"
        icon="external-link"
        variant="gold"
        loading={action.busy}
        onPress={() =>
          action.run(async () => {
            await Linking.openURL(lesson.url);
            setOpened(true);
          })
        }
      />
      <AppText variant="caption" color={C.muted}>
        Video {lesson.author} saytida ochiladi. O‘qi videoni avtomatik ko‘rilgan
        deb belgilamaydi.
      </AppText>
      <Button
        title={done ? "Dars o‘rganilgan ✓" : "O‘rgandim · +50 XP"}
        icon="check-circle"
        variant="outline"
        disabled={done || !ready || !opened}
        loading={action.busy}
        onPress={() =>
          action.run(
            () => completeLesson(lesson.id),
            () => action.setSuccess("O‘rganilgan darslarga qo‘shildi."),
          )
        }
      />
      <Button
        title="Bilimni testda tekshirish"
        icon="target"
        variant="soft"
        onPress={() => navigation.navigate("Quiz", { id: lesson.quizId })}
      />
      <Feedback {...action} />
    </Screen>
  );
}
