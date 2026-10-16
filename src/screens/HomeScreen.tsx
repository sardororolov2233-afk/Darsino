import React from "react";
import { Pressable, View } from "react-native";
import {
  AppText,
  Button,
  Card,
  Chip,
  Icon,
  Screen,
  uiStyles,
} from "../components/ui";
import { OqiHeader } from "../components/OqiHeader";
import { RadarChart } from "../components/RadarChart";
import { Feedback } from "../components/feedback";
import { useApp } from "../state/AppContext";
import { useLearning } from "../state/LearningContext";
import { learningStats } from "../state/learning";
import { useAppNavigation } from "../navigation";
import { dateLabel, timeLabel } from "../state/domain";
import { TutorCard, GroupCard } from "./DiscoveryScreens";
import { C, font } from "../theme";
const subjects = [
  { name: "Matematika", icon: "triangle" as const, color: "#EEF2FF" },
  { name: "Ingliz tili", icon: "globe" as const, color: "#FFF7E5" },
  { name: "Fizika", icon: "sun" as const, color: "#F3EFFE" },
  { name: "Kimyo", icon: "droplet" as const, color: "#E8FAF2" },
  { name: "IT", icon: "code" as const, color: "#E7F6FD" },
  { name: "Tarix", icon: "columns" as const, color: "#FFF0F3" },
];
export function HomeScreen() {
  const { user, market, tutors, groups, setFilters, mode, syncError } =
    useApp();
  const { data, error } = useLearning();
  const navigation = useAppNavigation();
  const stats = learningStats(data);
  const ids = new Set(
    market.enrollments
      .filter((e) => e.studentId === user.id && e.active)
      .map((e) => e.offeringId),
  );
  const next = market.sessions
    .filter(
      (s) => ids.has(s.offeringId) && new Date(s.endsAt).getTime() > Date.now(),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const recommended = tutors
    .filter((t) =>
      user.interests.some((s) => (t.subjects || [t.subject]).includes(s)),
    )
    .sort(
      (a, b) =>
        Number(b.area === user.area) - Number(a.area === user.area) ||
        b.rating - a.rating,
    )
    .slice(0, 2);
  return (
    <Screen top={<OqiHeader />}>
      <View style={{ gap: 4 }}>
        <AppText variant="caption" color={C.muted}>
          Salom, {user.name.split(" ")[0]}
        </AppText>
        <AppText variant="title">Maqsadingiz sari bir qadam</AppText>
      </View>
      <Card
        style={{ backgroundColor: C.navy, borderColor: C.navy, padding: 22 }}
      >
        <View style={uiStyles.between}>
          <View style={uiStyles.row}>
            <Icon name="target" color={C.mint} size={20} />
            <AppText variant="caption" color="#C6D5F1">
              MENING MAQSADIM
            </AppText>
          </View>
          <Icon name="bookmark" color={C.mint} size={18} />
        </View>
        <AppText variant="display" color="white">
          {user.goal || "Maqsadingizni belgilang"}
        </AppText>
        <AppText color="#C6D5F1">{user.interests.join(" · ")}</AppText>
        {user.studyMode || user.studySupport ? (
          <AppText variant="caption" color={C.mint}>
            {[user.studyMode, user.studySupport].filter(Boolean).join(" · ")}
          </AppText>
        ) : null}
        <AppText variant="caption" color="#C6D5F1">
          {user.city}, {user.area}
        </AppText>
        <Button
          title={
            user.studySupport === "Mustaqil"
              ? "Darslar va materiallarni ko‘rish"
              : "Maqsadimga mos ustoz topish"
          }
          icon="arrow-right"
          variant="gold"
          onPress={() => {
            if (user.studySupport === "Mustaqil")
              navigation.navigate("Main", { screen: "Lessons" });
            else {
              setFilters({
                subject: user.interests[0] || "Barchasi",
                mode: user.studyMode || "Barchasi",
                area: "Barcha hududlar",
              });
              navigation.navigate("Main", { screen: "Search" });
            }
          }}
        />
      </Card>
      <View style={uiStyles.between}>
        <AppText variant="heading">Fanlar olami</AppText>
        <AppText variant="caption" color={C.muted}>
          O‘zingizga mosini tanlang
        </AppText>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9 }}>
        {subjects.map((s) => (
          <Pressable
            key={s.name}
            accessibilityRole="button"
            accessibilityLabel={`${s.name} ustozlarini topish`}
            onPress={() => {
              setFilters({ subject: s.name, area: "Barcha hududlar" });
              navigation.navigate("Main", { screen: "Search" });
            }}
            style={{
              flexBasis: "30%",
              flexGrow: 1,
              paddingVertical: 14,
              paddingHorizontal: 5,
              borderRadius: 18,
              backgroundColor: C.white,
              alignItems: "center",
              gap: 5,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <View
              style={{
                width: 39,
                height: 39,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: s.color,
                borderRadius: 13,
              }}
            >
              <Icon name={s.icon} color={C.navy} size={23} />
            </View>
            <AppText variant="caption" style={{ fontFamily: font.bold }}>
              {s.name}
            </AppText>
            <AppText variant="caption" color={C.muted} style={{ fontSize: 10 }}>
              {
                tutors.filter((t) =>
                  (t.subjects || [t.subject]).includes(s.name),
                ).length
              }{" "}
              ustoz
            </AppText>
          </Pressable>
        ))}
      </View>
      <Card>
        <View style={uiStyles.between}>
          <View style={uiStyles.row}>
            <Icon name="activity" color={C.green} />
            <AppText variant="heading">Mening bilim radarim</AppText>
          </View>
          <Chip
            label={stats.score === null ? "Boshlang" : `${stats.score}%`}
            tone="purple"
          />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <RadarChart skills={stats.skills} compact />
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <AppText variant="caption" color={C.muted}>
              {stats.total
                ? `${stats.correct}/${stats.total} to‘g‘ri javob. Bugun yana bir qadam oldinga!`
                : "Nimalarni yaxshi bilasiz? Qisqa test bilan aniqlang."}
            </AppText>
            <Button
              title="Radarni ochish"
              icon="target"
              variant="soft"
              style={{ minHeight: 44, paddingHorizontal: 8 }}
              onPress={() => navigation.navigate("Main", { screen: "Radar" })}
            />
          </View>
        </View>
      </Card>
      <View style={uiStyles.row}>
        <Button
          title="Guruhlar"
          icon="users"
          variant="outline"
          style={{ flex: 1 }}
          onPress={() => navigation.navigate("Groups")}
        />
        <Button
          title="Tadbirlar"
          icon="compass"
          variant="outline"
          style={{ flex: 1 }}
          onPress={() => navigation.navigate("Events")}
        />
      </View>
      <Feedback error={syncError || error} />
      <AppText variant="heading">Keyingi darsingiz</AppText>
      {next ? (
        <Card
          onPress={() => navigation.navigate("Main", { screen: "Lessons" })}
          accessibilityLabel="Keyingi darsni ko‘rish"
        >
          <Chip label={dateLabel(next.startsAt)} tone="green" />
          <AppText variant="heading">{next.title}</AppText>
          <AppText color={C.muted}>
            {timeLabel(next.startsAt)}–{timeLabel(next.endsAt)} ·{" "}
            {next.location}
          </AppText>
        </Card>
      ) : (
        <Card>
          <AppText variant="heading">Birinchi darsga tayyormisiz?</AppText>
          <AppText variant="caption" color={C.muted}>
            Ustoz arizangizni tasdiqlagach, dars jadvalingiz shu yerda
            ko‘rinadi.
          </AppText>
          <Button
            title="Ochiq guruhlarni ko‘rish"
            variant="soft"
            onPress={() => navigation.navigate("Groups")}
          />
        </Card>
      )}
      <View style={uiStyles.between}>
        <AppText variant="heading">Sizga mos ustozlar</AppText>
        <Button
          title="Barchasi"
          variant="soft"
          style={{ minHeight: 44 }}
          onPress={() => navigation.navigate("Tutors")}
        />
      </View>
      {recommended.map((t) => (
        <TutorCard key={t.id} tutor={t} />
      ))}
      {!recommended.length ? (
        <AppText variant="caption" color={C.muted}>
          Tanlagan faningiz bo‘yicha ustozlar hozircha yo‘q. Boshqa fanlarni ham
          qidirib ko‘ring.
        </AppText>
      ) : null}
      <AppText variant="heading">Ochiq guruhlar</AppText>
      {groups
        .filter((g) => g.spots > 0 && user.interests.includes(g.subject))
        .slice(0, 2)
        .map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      {mode === "demo" ? (
        <AppText variant="caption" color={C.muted}>
          Sinov rejimi · ustoz va guruhlar namuna katalogidan.
        </AppText>
      ) : null}
    </Screen>
  );
}
