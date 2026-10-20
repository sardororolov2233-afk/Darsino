import { LocalizedPressable as Pressable } from "../i18n/native";
import React from "react";
import { View } from "react-native";
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
import { Feedback } from "../components/feedback";
import { useApp } from "../state/AppContext";
import { useLearning } from "../state/LearningContext";
import { useAppNavigation } from "../navigation";
import { dateLabel, timeLabel } from "../state/domain";
import { TutorCard, GroupCard } from "./DiscoveryScreens";
import { openLessons } from "../data/learning";
import { C, font } from "../theme";

const subjects = [
  {
    name: "Matematika",
    icon: "triangle" as const,
    emoji: "📐",
    color: "#EEF2FF",
  },
  {
    name: "Fizika",
    icon: "sun" as const,
    emoji: "⚛️",
    color: "#F3EFFE",
  },
  {
    name: "Ingliz tili",
    icon: "globe" as const,
    emoji: "🇬🇧",
    color: "#FFF7E5",
  },
  {
    name: "Kimyo",
    icon: "droplet" as const,
    emoji: "🧪",
    color: "#E8FAF2",
  },
  {
    name: "Dasturlash",
    icon: "code" as const,
    emoji: "💻",
    color: "#E7F6FD",
  },
  {
    name: "Tarix",
    icon: "columns" as const,
    emoji: "🏛️",
    color: "#FFF0F3",
  },
];

export function HomeScreen() {
  const { user, market, tutors, groups, setFilters, mode, syncError } =
    useApp();
  const { error } = useLearning();
  const navigation = useAppNavigation();
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

      {/* Selected learning goal */}
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

      <Card style={{ backgroundColor: C.purpleSoft }}>
        <View style={uiStyles.row}>
          <Icon name="target" color={C.purple} />
          <AppText variant="heading" style={{ flex: 1 }}>
            Bilim radari
          </AppText>
          <Chip label="Tez kunda" tone="purple" />
        </View>
        <AppText color={C.muted}>
          Bilim radari tez kunda ishga tushadi. Hozir ustoz yuborgan testlarni
          bajarishingiz mumkin.
        </AppText>
        <Button
          title="Radar va testlar"
          icon="arrow-up-right"
          variant="soft"
          onPress={() => navigation.navigate("Main", { screen: "Radar" })}
        />
      </Card>

      {/* 4. Fanlar Olami (6 Categories from Prototype) */}
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
              setFilters({
                subject: s.name === "Dasturlash" ? "IT" : s.name,
                area: "Barcha hududlar",
              });
              navigation.navigate("Main", { screen: "Search" });
            }}
            style={{
              flexBasis: "30%",
              flexGrow: 1,
              paddingVertical: 14,
              paddingHorizontal: 6,
              borderRadius: 18,
              backgroundColor: C.white,
              alignItems: "center",
              gap: 4,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: s.color,
                borderRadius: 13,
              }}
            >
              <AppText style={{ fontSize: 20 }}>{s.emoji}</AppText>
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

      {/* 5. Geolocation Banner */}
      <Pressable
        onPress={() => {
          setFilters({ area: "Chilonzor" });
          navigation.navigate("Main", { screen: "Search" });
        }}
        style={{
          backgroundColor: "#EEF2FF",
          borderColor: "#C7D2FE",
          borderWidth: 1,
          borderRadius: 18,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: "#E0E7FF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="map-pin" color={C.navy} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText
              variant="caption"
              style={{ fontFamily: font.bold, color: C.navy }}
            >
              {user.area}, {user.city}
            </AppText>
            <AppText variant="caption" color={C.muted}>
              {tutors.filter((t) => t.area === user.area).length} ustoz sizning
              hududingizda
            </AppText>
          </View>
        </View>
        <AppText variant="label" color={C.navy}>
          Xaritada ko‘rish →
        </AppText>
      </Pressable>

      {/* 6. Quick Action Links */}
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

      {/* 7. Next Lesson */}
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

      {/* 8. Jonli va Ochiq Darslar (Video Preview) */}
      <View style={uiStyles.between}>
        <AppText variant="heading">Jonli va ochiq darslar</AppText>
        <Button
          title="Barchasi"
          variant="soft"
          style={{ minHeight: 40 }}
          onPress={() => navigation.navigate("Main", { screen: "Lessons" })}
        />
      </View>
      <View style={{ gap: 10 }}>
        {openLessons.slice(0, 2).map((l) => (
          <Card
            key={l.id}
            onPress={() => navigation.navigate("Main", { screen: "Lessons" })}
          >
            <View style={uiStyles.between}>
              <Chip label={l.subject} tone="purple" />
              {l.live ? (
                <Chip label="Hozir jonli 🔴" tone="green" />
              ) : (
                <AppText variant="caption" color={C.muted}>
                  {l.views || "1.2k"} ko‘rildi
                </AppText>
              )}
            </View>
            <AppText variant="heading">{l.title}</AppText>
            <AppText variant="caption" color={C.muted}>
              {l.author} • {l.duration}
            </AppText>
          </Card>
        ))}
      </View>

      {/* 9. Recommended Tutors */}
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

      {/* 10. Open Groups */}
      <AppText variant="heading">Ochiq guruhlar</AppText>
      {groups
        .filter((g) => g.spots > 0)
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
