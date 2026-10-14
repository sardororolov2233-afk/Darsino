import React from "react";
import { View } from "react-native";
import { Brand } from "../components/Brand";
import {
  AppText,
  Button,
  Card,
  Chip,
  Icon,
  Screen,
  uiStyles,
} from "../components/ui";
import { Feedback } from "../components/feedback";
import { useApp } from "../state/AppContext";
import { useAppNavigation } from "../navigation";
import { dateLabel, timeLabel } from "../state/domain";
import { TutorCard, GroupCard } from "./DiscoveryScreens";
import { C } from "../theme";
export function HomeScreen() {
  const {
      user,
      market,
      tutors,
      groups,
      notifications,
      setFilters,
      mode,
      syncError,
    } = useApp(),
    navigation = useAppNavigation();
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
  const goalWords =
    user.goal === "IELTS / CEFR"
      ? ["ielts", "cefr"]
      : user.goal === "Universitetga kirish"
        ? ["abituriyent", "dtm", "imtihon"]
        : user.goal === "Erkin muloqot"
          ? ["speaking", "muloqot", "gapirish"]
          : [user.goal.toLocaleLowerCase()];
  const score = (t: (typeof tutors)[number]) =>
    (t.area === user.area ? 2 : 0) +
    (goalWords.some((word) =>
      `${t.specialty} ${t.bio}`.toLocaleLowerCase().includes(word),
    )
      ? 3
      : 0);
  const recommended = tutors
    .filter((t) =>
      user.interests.some((s) => (t.subjects || [t.subject]).includes(s)),
    )
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3);
  return (
    <Screen>
      <View style={uiStyles.between}>
        <Brand width={150} />
        <Button
          title={`Xabarlar · ${notifications.filter((n) => !n.read).length}`}
          icon="bell"
          variant="soft"
          style={{ minHeight: 44 }}
          onPress={() => navigation.navigate("Notifications")}
        />
      </View>
      <AppText color={C.muted}>Salom, {user.name.split(" ")[0]} 👋</AppText>
      <AppText variant="display">Bugun nimani{`\n`}o‘rganamiz?</AppText>
      <Card
        style={{ backgroundColor: C.navy, borderColor: C.navy, padding: 22 }}
      >
        <View style={uiStyles.row}>
          <Icon name="target" color={C.gold} />
          <AppText variant="label" color="#CBD7E5">
            SIZNING MAQSADINGIZ
          </AppText>
        </View>
        <AppText variant="title" color={C.white}>
          {user.goal}
        </AppText>
        <AppText color="#CBD7E5">
          {user.interests.join(" · ")} · {user.area}
        </AppText>
        <Button
          title="Mos ustozni topish"
          variant="gold"
          icon="arrow-right"
          onPress={() => {
            setFilters({
              subject: user.interests[0] || "Barchasi",
              area: "Barcha hududlar",
            });
            navigation.navigate("Tutors");
          }}
        />
      </Card>
      <View style={uiStyles.row}>
        <Button
          title="Ustozlar"
          icon="search"
          variant="outline"
          style={{ flex: 1 }}
          onPress={() => navigation.navigate("Tutors")}
        />
        <Button
          title="Guruhlar"
          icon="users"
          variant="outline"
          style={{ flex: 1 }}
          onPress={() => navigation.navigate("Groups")}
        />
      </View>
      <Feedback error={syncError} />
      <AppText variant="heading">Keyingi darsingiz</AppText>
      {next ? (
        <Card
          onPress={() => navigation.navigate("Main", { screen: "Lessons" })}
          accessibilityLabel="Keyingi darsni ko‘rish"
        >
          <Chip label={dateLabel(next.startsAt)} tone="gold" />
          <AppText variant="heading">{next.title}</AppText>
          <AppText color={C.muted}>
            {timeLabel(next.startsAt)}–{timeLabel(next.endsAt)} ·{" "}
            {next.location}
          </AppText>
        </Card>
      ) : (
        <Card>
          <AppText variant="heading">Birinchi darsga tayyormisiz?</AppText>
          <AppText color={C.muted}>
            Ustoz arizangizni tasdiqlagach guruh va jadval «Darslarim»da paydo
            bo‘ladi.
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
        <AppText color={C.muted}>
          Tanlagan faningiz bo‘yicha ustozlar hozircha yo‘q. Boshqa fanlarni
          qidiruvdan ko‘ring.
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
          Sinov rejimi · namuna katalog va shu qurilmada saqlanadigan
          ma’lumotlar.
        </AppText>
      ) : null}
    </Screen>
  );
}
