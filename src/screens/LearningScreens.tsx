import { uid, dateLabel } from "../state/domain";
import { useClassroom } from "../state/ClassroomContext";
import {
  studentResults,
  studentWorkspace,
  comparableGrowth,
} from "../state/studentWorkspace";
import { RadarChart } from "../components/RadarChart";
import { MockTestCards } from "../components/MockTestCards";
import { MetricTile } from "../components/WorkspaceCards";
import { LocalizedPressable as Pressable } from "../i18n/native";
import React, { useRef, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
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
import {
  FilterSelect,
  FilterOptions,
  filterChoices,
} from "../components/FilterControls";
import {
  ClubCard,
  LearningSync,
  DiagnosticCard,
  OpenLessonCard,
} from "../components/LearningCards";
import { Feedback, useAction } from "../components/feedback";
import { clubs, diagnostics, openLessons, SKILLS } from "../data/learning";
import { learningStats, scoreAttempt } from "../state/learning";
import { useLearning } from "../state/LearningContext";
import { useApp } from "../state/AppContext";
import { GroupCard } from "./DiscoveryScreens";
import { isClubOffering } from "../state/teacher";
import { encodeAssessment, validInvitation } from "../state/assessments";
import { C, font } from "../theme";
import { LessonMaterials } from "../components/LessonMaterials";

export function LearningLibrary({
  section,
}: {
  section: "Video darslar" | "Klublar";
}) {
  const [subject, setSubject] = useState("Barchasi");
  const { groups, mode } = useApp();
  const publicClubs = groups.filter(isClubOffering);
  return (
    <>
      <AppText variant="heading">
        {section === "Klublar"
          ? "Birga o‘rganish qiziqroq"
          : "Bilimga har kuni bir qadam"}
      </AppText>
      <AppText variant="caption" color={C.muted}>
        {section === "Klublar"
          ? mode === "demo"
            ? "Namuna klublar va haqiqiy guruhlarga kirish oqimini sinang."
            : "Ustozlar e’lon qilgan klublarga ariza yuboring."
          : "Khan Academy va British Council ochiq videolari. Darslar manba saytida ochiladi."}
      </AppText>
      {section === "Klublar" && publicClubs.length ? (
        <>
          <AppText variant="heading">Ustozlar ochgan klublar</AppText>
          {publicClubs.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
          <AppText variant="heading">Qiziqishlar katalogi</AppText>
        </>
      ) : null}
      {section === "Video darslar" ? (
        <>
          <LessonMaterials videosOnly />
          <AppText variant="heading">Ochiq manbalar</AppText>
          <FilterOptions
            label="Dars fani"
            options={filterChoices([
              "Barchasi",
              ...new Set(openLessons.map((l) => l.subject)),
            ])}
            value={subject}
            onChange={setSubject}
          />
          {openLessons
            .filter((l) => subject === "Barchasi" || l.subject === subject)
            .map((l) => (
              <OpenLessonCard key={l.id} lesson={l} />
            ))}
        </>
      ) : mode === "demo" ? (
        clubs.map((c) => <ClubCard key={c.id} club={c} />)
      ) : !publicClubs.length ? (
        <EmptyState
          title="Klublar hali ochilmagan"
          subtitle="Ustoz e’lon qilgan klublar shu yerda ko‘rinadi."
        />
      ) : null}
    </>
  );
}
export function RadarScreen() {
  const { market, user } = useApp();
  const classroom = useClassroom(),
    learning = useLearning();
  const navigation = useAppNavigation();
  const [subject, setSubject] = useState("Barchasi");
  const incoming = market.messages.flatMap((message) => {
    const invite = validInvitation(market, message);
    return invite?.studentId === user.id ? [{ message, invite }] : [];
  });
  const results = studentResults(
    user.id,
    classroom.data,
    learning.data.attempts,
  ).filter((r) => subject === "Barchasi" || r.subject === subject);
  const latestResult = results[0];
  const growth = comparableGrowth(results);
  const stats = studentWorkspace(market, user.id, classroom.data);
  const skills = learningStats(
    learning.data,
    subject === "Barchasi" ? "Umumiy" : subject,
  );
  return (
    <Screen top={<OqiHeader />}>
      <AppText variant="title">Bilimim</AppText>
      <LearningSync />
      <Card
        style={{
          backgroundColor: C.action,
          borderColor: C.primaryBorder,
          padding: 24,
        }}
      >
        <AppText variant="caption" color={C.primary}>
          SO‘NGGI NATIJAM
        </AppText>
        <AppText variant="display" color={C.navy}>
          {!latestResult ? "Hali o‘lchanmagan" : `${latestResult.percentage}%`}
        </AppText>
        <AppText color={C.primary}>
          {results.length
            ? `${latestResult.title} · ${latestResult.method}`
            : "Birinchi testni ishlang. Natijalar shu yerda saqlanadi."}
        </AppText>
      </Card>
      <View style={uiStyles.wrap}>
        <MetricTile
          title="Tugallangan testlar"
          value={results.length}
          icon="check-square"
        />
        <MetricTile
          title="Davomat"
          value={
            stats.attendancePercent === null
              ? "—"
              : `${stats.attendancePercent}%`
          }
          icon="calendar"
          tone="green"
          onPress={() => navigation.navigate("StudentAttendance")}
        />
      </View>
      {skills.total ? (
        <Card>
          <AppText variant="heading">Bilim ko‘nikmalari</AppText>
          <RadarChart skills={skills.skills} />
          <AppText variant="caption" color={C.muted}>
            Mustaqil diagnostika savollari bo‘yicha o‘lchangan ko‘nikmalar.
          </AppText>
        </Card>
      ) : null}
      {growth ? (
        <Card>
          <AppText variant="heading">Bir xil testdagi o‘zgarish</AppText>
          <AppText color={C.primary}>
            {growth.delta > 0 ? "+" : ""}
            {growth.delta} foiz punkt
          </AppText>
          <AppText variant="caption" color={C.muted}>
            {growth.current.title} · faqat shu testning oldingi urinishi bilan
            taqqoslandi.
          </AppText>
        </Card>
      ) : null}
      <MockTestCards />
      <AppText variant="heading">
        Ustoz yuborgan testlar · {incoming.length}
      </AppText>
      {incoming
        .slice(-10)
        .reverse()
        .map(({ message, invite }) => (
          <Card key={message.id}>
            <AppText variant="label">{invite.title}</AppText>
            <AppText variant="caption" color={C.muted}>
              {market.offerings.find((g) => g.id === invite.offeringId)?.title}
            </AppText>
            <Button
              title="Testni ishlash"
              icon="play"
              variant="gold"
              onPress={() =>
                navigation.navigate("Quiz", {
                  id: invite.testId,
                  invitationMessageId: message.id,
                })
              }
            />
          </Card>
        ))}
      {!incoming.length ? (
        <AppText color={C.muted}>
          Ustozingiz test yuborganda shu yerda va suhbatda ko‘rinadi.
        </AppText>
      ) : null}
      <Button
        title="Suhbatlarim"
        icon="message-circle"
        variant="soft"
        onPress={() => navigation.navigate("Chats")}
      />
      {results.length ? (
        <>
          <AppText variant="heading">So‘nggi natijalar</AppText>
          {results.slice(0, 5).map((result) => (
            <Card key={result.id}>
              <View style={uiStyles.between}>
                <AppText variant="label" localize={false} style={{ flex: 1 }}>
                  {result.title}
                </AppText>
                <Chip label={`${result.percentage}%`} tone="green" />
              </View>
              <AppText variant="caption" color={C.muted}>
                {result.score}/{result.maxScore} ball · {result.subject} ·{" "}
                {result.method}
                {" · "}
                {dateLabel(result.date)}
              </AppText>
            </Card>
          ))}
        </>
      ) : null}
      <AppText variant="heading">Mustaqil bilim diagnostikasi</AppText>
      <FilterSelect
        label="Test fani"
        value={subject}
        onChange={setSubject}
        options={filterChoices([
          "Barchasi",
          ...new Set(diagnostics.map((t) => t.subject)),
        ])}
      />
      {diagnostics
        .filter((t) => subject === "Barchasi" || t.subject === subject)
        .map((t) => (
          <DiagnosticCard key={t.id} test={t} />
        ))}
    </Screen>
  );
}
export function QuizScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Quiz">) {
  const navigation = useAppNavigation();
  const { finishQuiz, ready } = useLearning();
  const { market, user, sendMessage } = useApp();
  const [shared, setShared] = useState(false);
  const inviteMessage = market.messages.find(
    (m) => m.id === route.params.invitationMessageId,
  );
  const invite = inviteMessage && validInvitation(market, inviteMessage);
  const test = diagnostics.find((t) => t.id === route.params.id);
  const attemptId = useRef(uid("quiz"));
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
          subtitle="Diagnostika bo‘limidan boshqa testni tanlang."
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
        () => finishQuiz(test.id, finalAnswers, attemptId.current),
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
              Test natijangiz saqlandi. Ustoz topshirig‘i bo‘lsa, quyidagi tugma
              bilan natijani ulashing.
            </AppText>
          </Card>
          {invite &&
          inviteMessage &&
          user.role === "student" &&
          invite.studentId === user.id &&
          invite.testId === test.id ? (
            <Button
              title={
                shared
                  ? "Natija ustozga yuborildi"
                  : "Natijani ustozga yuborish"
              }
              disabled={shared}
              loading={action.busy}
              icon="send"
              variant="gold"
              onPress={() =>
                action.run(
                  () =>
                    sendMessage(
                      inviteMessage.conversationId,
                      encodeAssessment({
                        kind: "result",
                        invitationId: invite.id,
                        answers: finalAnswers,
                      }),
                    ),
                  () => setShared(true),
                )
              }
            />
          ) : null}
          <Button
            title="Bilimimga qaytish"
            icon="target"
            onPress={() => navigation.popTo("Main", { screen: "Radar" })}
          />
          <Button
            title="Qayta ishlash"
            variant="outline"
            onPress={() => {
              attemptId.current = uid("quiz");
              setAnswers([]);
              setSelected(null);
              setChecked(false);
              setDone(false);
              setShared(false);
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
            Test yakunida natijani saqlash va ustozingizga ulashish mumkin.
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
      <Card style={{ backgroundColor: C.action, padding: 26, gap: 22 }}>
        <Chip label={lesson.subject} />
        <AppText
          color={C.navy}
          style={{ fontFamily: font.extra, fontSize: 38, lineHeight: 48 }}
        >
          {lesson.icon}
        </AppText>
        <AppText variant="title" color={C.navy}>
          {lesson.title}
        </AppText>
        <AppText variant="caption" color={C.primary}>
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
