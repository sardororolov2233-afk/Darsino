import React from "react";
import { StyleSheet, View } from "react-native";
import type { Diagnostic, OpenLesson } from "../data/learning";
import { useAppNavigation } from "../navigation";
import { useLearning } from "../state/LearningContext";
import { clubs } from "../data/learning";
import { useAction, Feedback } from "./feedback";
import { AppText, Button, Card, Chip, Icon, uiStyles } from "./ui";
import { C, font } from "../theme";
export function DiagnosticCard({ test }: { test: Diagnostic }) {
  const navigation = useAppNavigation();
  const { data } = useLearning();
  const done = data.attempts.some((a) => a.testId === test.id);
  return (
    <Card style={styles.test}>
      <View style={uiStyles.row}>
        <View style={styles.emoji}>
          <Icon name={test.icon} color={C.purple} size={24} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="label">{test.title}</AppText>
          <AppText variant="caption" color={C.muted}>
            {test.questions.length} savol · taxminan {test.minutes} daqiqa
          </AppText>
        </View>
      </View>
      <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
        <Chip
          label={done ? "Natija radarda" : "Har bir to‘g‘ri javob +20 XP"}
          tone="green"
        />
        <Button
          title={done ? "Qayta ishlash" : "Testni boshlash"}
          accessibilityLabel={`${test.title}: ${done ? "qayta ishlash" : "testni boshlash"}`}
          icon="arrow-right"
          variant="soft"
          style={{ minHeight: 44 }}
          onPress={() => navigation.navigate("Quiz", { id: test.id })}
        />
      </View>
    </Card>
  );
}
export function OpenLessonCard({ lesson }: { lesson: OpenLesson }) {
  const navigation = useAppNavigation();
  const { data } = useLearning();
  const completed = !!data.completedLessons[lesson.id];
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <View style={[styles.cover, { backgroundColor: lesson.color }]}>
        <View style={styles.coverTop}>
          <AppText variant="caption" color="white">
            {lesson.subject.toLocaleUpperCase()}
          </AppText>
          <View style={styles.play}>
            <Icon name="play" size={20} color={C.white} />
          </View>
        </View>
        <AppText
          color="white"
          style={{ fontFamily: font.extra, fontSize: 32, lineHeight: 42 }}
        >
          {lesson.icon}
        </AppText>
        <AppText variant="caption" color="#FFFFFFDD">
          {lesson.author} · {lesson.language}
        </AppText>
      </View>
      <View style={{ padding: 16, gap: 8 }}>
        <AppText variant="heading">{lesson.title}</AppText>
        <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
          <Chip
            label={completed ? "✓ O‘rganilgan" : "Ochiq video manba"}
            tone={completed ? "green" : "purple"}
          />
          <Button
            title="Darsni ochish"
            variant="soft"
            style={{ minHeight: 44 }}
            onPress={() => navigation.navigate("OpenLesson", { id: lesson.id })}
          />
        </View>
      </View>
    </Card>
  );
}
export function ClubCard({ club }: { club: (typeof clubs)[number] }) {
  const { data, toggleClub, ready } = useLearning();
  const navigation = useAppNavigation();
  const action = useAction();
  const following = data.followedClubs.includes(club.id);
  return (
    <Card style={{ borderLeftWidth: 4, borderLeftColor: club.color }}>
      <View style={uiStyles.row}>
        <View style={[styles.emoji, { backgroundColor: `${club.color}15` }]}>
          <Icon name={club.icon} color={club.color} size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{club.title}</AppText>
          <AppText variant="caption" color={C.muted}>
            {club.subject} · qiziqishlar klubi
          </AppText>
        </View>
      </View>
      <AppText variant="caption" color={C.muted}>
        {club.description}
      </AppText>
      <View style={[uiStyles.row, { flexWrap: "wrap" }]}>
        <Button
          title={following ? "Kuzatilmoqda" : "Klubni kuzatish"}
          icon={following ? "check" : "plus"}
          variant={following ? "soft" : "primary"}
          disabled={!ready}
          loading={action.busy}
          style={{ flexGrow: 1, minHeight: 44 }}
          onPress={() => action.run(() => toggleClub(club.id))}
        />
        {club.eventId ? (
          <Button
            title="Tadbirni ko‘rish"
            variant="outline"
            style={{ flexGrow: 1, minHeight: 44 }}
            onPress={() => navigation.navigate("Event", { id: club.eventId! })}
          />
        ) : null}
      </View>
      <Feedback {...action} />
    </Card>
  );
}
const styles = StyleSheet.create({
  test: { borderColor: "#DDDFFB", backgroundColor: "#FDFDFF" },
  emoji: {
    width: 48,
    height: 48,
    backgroundColor: C.blueSoft,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  cover: {
    padding: 18,
    minHeight: 150,
    justifyContent: "space-between",
    gap: 4,
  },
  coverTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  play: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF28",
    alignItems: "center",
    justifyContent: "center",
  },
});
