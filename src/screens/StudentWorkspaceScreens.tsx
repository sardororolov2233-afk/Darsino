import React, { useState } from "react";
import { View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useApp } from "../state/AppContext";
import { useClassroom } from "../state/ClassroomContext";
import { useLearning } from "../state/LearningContext";
import { useAppNavigation, type RootStackParamList } from "../navigation";
import { studentWorkspace, studentResults } from "../state/studentWorkspace";
import { dateLabel, timeLabel, dmId } from "../state/domain";
import { matchesSearch } from "../state/learning";
import { formatPrice } from "../data/catalog";
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Screen,
  uiStyles,
} from "../components/ui";
import { WorkspaceHeader } from "../components/ClassroomUI";
import { MetricTile } from "../components/WorkspaceCards";
import { MockTestCards } from "../components/MockTestCards";
import { StudentPayments } from "../components/GroupPayments";
import { LessonMaterials } from "../components/LessonMaterials";
import {
  FilterOptions,
  FilterSelect,
  filterChoices,
} from "../components/FilterControls";
import { Feedback } from "../components/feedback";
import { LearningLibrary } from "./LearningScreens";
import { C } from "../theme";

export function StudentTestsScreen() {
  const { market, user } = useApp(),
    classroom = useClassroom(),
    learning = useLearning(),
    navigation = useAppNavigation();
  const stats = studentWorkspace(market, user.id, classroom.data),
    [query, setQuery] = useState("");
  const legacy = stats.invitations.filter(({ invite }) =>
    matchesSearch(invite.title, query),
  );
  return (
    <Screen lightTop top={<WorkspaceHeader title="Mening testlarim" back />}>
      <AppText variant="title">Ustoz topshiriqlari</AppText>
      <View style={uiStyles.wrap}>
        <MetricTile
          title="Bajarish kerak"
          value={stats.pendingTests.length}
          icon="clipboard"
        />
        <MetricTile
          title="Topshirilgan"
          value={stats.attempts.filter((a) => a.completedAt).length}
          icon="check-circle"
          tone="green"
        />
      </View>
      <MockTestCards />
      {!stats.tests.length ? (
        <EmptyState
          title="Mock test hali berilmagan"
          subtitle="Ustozingiz guruhga test e’lon qilgach shu yerda ishlashingiz mumkin."
          icon="file-text"
        />
      ) : null}
      <AppText variant="heading">Shaxsiy diagnostika topshiriqlari</AppText>
      <Field
        label="Topshiriqni qidirish"
        value={query}
        onChangeText={setQuery}
        icon="search"
      />
      {legacy.map(({ message, invite }) => (
        <Card key={message.id}>
          <AppText variant="heading" localize={false}>
            {invite.title}
          </AppText>
          <AppText variant="caption" color={C.muted}>
            {market.offerings.find((g) => g.id === invite.offeringId)?.title}
          </AppText>
          <Button
            title="Testni ishlash"
            icon="play"
            onPress={() =>
              navigation.navigate("Quiz", {
                id: invite.testId,
                invitationMessageId: message.id,
              })
            }
          />
        </Card>
      ))}
      {!legacy.length ? (
        <AppText color={C.muted}>Shaxsiy topshiriqlar hozircha yo‘q.</AppText>
      ) : null}
      <Button
        title="Mustaqil testlar va natijalar"
        icon="bar-chart-2"
        variant="soft"
        onPress={() => navigation.navigate("Main", { screen: "Radar" })}
      />
      <Feedback error={classroom.error || learning.error} />
    </Screen>
  );
}
export function StudentAttendanceScreen() {
  const { market, user } = useApp(),
    classroom = useClassroom();
  const stats = studentWorkspace(market, user.id, classroom.data);
  const [group, setGroup] = useState("all"),
    [status, setStatus] = useState("Barchasi");
  const sessions = stats.past
    .filter((s) => group === "all" || s.offeringId === group)
    .reverse()
    .map((session) => ({
      session,
      record: stats.records.find((r) => r.sessionId === session.id),
    }))
    .filter(
      ({ record }) =>
        status === "Barchasi" ||
        (status === "Qatnashgan"
          ? record?.status === "present"
          : status === "Qatnashmagan"
            ? record?.status === "absent"
            : !record),
    );
  return (
    <Screen lightTop top={<WorkspaceHeader title="Mening davomatim" back />}>
      <Card
        style={{ backgroundColor: C.primarySoft, borderColor: C.primaryBorder }}
      >
        <AppText variant="caption" color={C.primary}>
          QATNASHUV NATIJASI
        </AppText>
        <AppText variant="display" color={C.primary}>
          {stats.attendancePercent === null
            ? "—"
            : `${stats.attendancePercent}%`}
        </AppText>
        <AppText color={C.muted}>
          {stats.present} qatnashgan · {stats.past.length} o‘tilgan dars ·{" "}
          {stats.records.length} belgilangan
        </AppText>
      </Card>
      <FilterSelect
        label="Davomat guruhi"
        value={group}
        onChange={setGroup}
        options={[
          { value: "all", label: "Barcha guruhlar" },
          ...stats.groups.map((g) => ({ value: g.id, label: g.title })),
        ]}
      />
      <FilterOptions
        label="Davomat holati"
        options={filterChoices([
          "Barchasi",
          "Qatnashgan",
          "Qatnashmagan",
          "Belgilanmagan",
        ])}
        value={status}
        onChange={setStatus}
      />
      {sessions.map(({ session, record }) => (
        <Card key={session.id}>
          <View style={uiStyles.between}>
            <AppText variant="caption" color={C.muted}>
              {dateLabel(session.startsAt)} · {timeLabel(session.startsAt)}
            </AppText>
            <Chip
              label={
                record?.status === "present"
                  ? "Qatnashgan"
                  : record?.status === "absent"
                    ? "Qatnashmagan"
                    : "Belgilanmagan"
              }
              tone={record?.status === "present" ? "green" : "purple"}
            />
          </View>
          <AppText variant="heading" localize={false}>
            {session.title}
          </AppText>
          <AppText variant="caption" color={C.muted}>
            {session.location}
          </AppText>
        </Card>
      ))}
      {!sessions.length ? (
        <EmptyState
          title="Davomat yozuvi yo‘q"
          subtitle="Guruh darsi boshlanib, ustoz davomatni belgilagach natija ko‘rinadi."
          icon="calendar"
        />
      ) : null}
      <Feedback error={classroom.error} />
    </Screen>
  );
}
export function StudentPaymentsScreen() {
  return (
    <Screen lightTop top={<WorkspaceHeader title="Mening to‘lovlarim" back />}>
      <AppText variant="title">Oylik to‘lovlar</AppText>
      <AppText color={C.muted}>
        Ustoz qayd etgan to‘lovlar va to‘lanmagan summalar.
      </AppText>
      <StudentPayments />
    </Screen>
  );
}
export function StudentGroupScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "StudentGroup">) {
  const { market, user } = useApp(),
    classroom = useClassroom(),
    navigation = useAppNavigation(),
    [tab, setTab] = useState("Jadval");
  const stats = studentWorkspace(market, user.id, classroom.data),
    group = stats.groups.find((g) => g.id === route.params.id);
  if (!group)
    return (
      <Screen lightTop top={<WorkspaceHeader title="Mening guruhim" back />}>
        <EmptyState
          title="Guruh mavjud emas"
          subtitle="Faqat o‘zingiz a’zo bo‘lgan guruhni ochishingiz mumkin."
        />
      </Screen>
    );
  const sessions = stats.sessions.filter((s) => s.offeringId === group.id),
    today = Date.now();
  return (
    <Screen lightTop top={<WorkspaceHeader title="Mening guruhim" back />}>
      <Card style={{ backgroundColor: C.action, borderColor: C.primaryBorder }}>
        <Chip label={group.subject} tone="purple" />
        <AppText variant="title" color={C.navy} localize={false}>
          {group.title}
        </AppText>
        <AppText color={C.primary} localize={false}>
          {group.tutor}
        </AppText>
        <AppText variant="caption" color={C.primary}>
          {group.mode} · {group.location}
        </AppText>
      </Card>
      <View style={uiStyles.row}>
        <Button
          title="Guruh chati"
          icon="message-circle"
          style={{ flex: 1 }}
          disabled={!classroom.data.groups.some((g) => g.id === group.id)}
          onPress={() =>
            navigation.navigate("GroupConversation", { id: group.id })
          }
        />
        <Button
          title="Ustozga yozish"
          icon="user"
          variant="soft"
          style={{ flex: 1 }}
          onPress={() =>
            navigation.navigate("Conversation", {
              id: dmId(user.id, group.tutorId),
            })
          }
        />
      </View>
      <FilterOptions
        label="Guruh materiallari va darslar"
        options={filterChoices([
          "Jadval",
          "Materiallar",
          "Testlar",
          "To‘lovlar",
        ])}
        value={tab}
        onChange={setTab}
      />
      {tab === "Jadval" ? (
        sessions.map((s) => (
          <Card key={s.id}>
            <View style={uiStyles.between}>
              <AppText variant="label">{dateLabel(s.startsAt)}</AppText>
              <Chip
                label={
                  Date.parse(s.endsAt) < today ? "Tugagan dars" : "Kelgusi dars"
                }
                tone="purple"
              />
            </View>
            <AppText variant="heading">
              {timeLabel(s.startsAt)}–{timeLabel(s.endsAt)}
            </AppText>
            <AppText color={C.muted}>{s.location}</AppText>
            <Button
              title="Shu dars materiallari"
              variant="soft"
              icon="folder"
              onPress={() =>
                navigation.navigate("Materials", {
                  offeringId: group.id,
                  sessionId: s.id,
                })
              }
            />
          </Card>
        ))
      ) : tab === "Materiallar" ? (
        <LessonMaterials offeringId={group.id} />
      ) : tab === "Testlar" ? (
        classroom.data.tests.some(
          (t) => t.offeringId === group.id && t.status === "published",
        ) ? (
          <MockTestCards offeringId={group.id} />
        ) : (
          <EmptyState
            title="Testlar hali berilmagan"
            subtitle="Ustoz guruhga test e’lon qilgach shu yerda ko‘rinadi."
            icon="check-square"
          />
        )
      ) : (
        <StudentPayments offeringId={group.id} />
      )}
      {tab === "Jadval" && !sessions.length ? (
        <EmptyState
          title="Jadval hali berilmagan"
          subtitle="Ustoz kiritgan darslar shu yerda ko‘rinadi."
        />
      ) : null}
      <Feedback error={classroom.error} />
    </Screen>
  );
}
export function LearningLibraryScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "LearningLibrary">) {
  return (
    <Screen
      lightTop
      top={<WorkspaceHeader title={route.params.section} back />}
    >
      <LearningLibrary section={route.params.section} />
    </Screen>
  );
}

export function StudentGroupsScreen() {
  const { market, user } = useApp(),
    classroom = useClassroom(),
    navigation = useAppNavigation();
  const stats = studentWorkspace(market, user.id, classroom.data);
  return (
    <Screen lightTop top={<WorkspaceHeader title="Mening guruhlarim" back />}>
      <AppText variant="title">Ustoz bilan o‘qish</AppText>
      <AppText color={C.muted}>
        Guruhingiz darslari, testlari, materiallari va suhbati.
      </AppText>
      {stats.groups.map((g) => (
        <Card
          key={g.id}
          onPress={() => navigation.navigate("StudentGroup", { id: g.id })}
          accessibilityLabel={`${g.title}: o‘quvchi guruhini ochish`}
        >
          <View style={uiStyles.between}>
            <Chip label={g.subject} tone="purple" />
            <Chip label="Qabul qilingansiz" tone="green" />
          </View>
          <AppText variant="heading" localize={false}>
            {g.title}
          </AppText>
          <AppText color={C.muted} localize={false}>
            {g.tutor}
          </AppText>
          <AppText variant="caption" color={C.primary}>
            Jadval · Materiallar · Testlar · Guruh chat
          </AppText>
        </Card>
      ))}
      {!stats.groups.length ? (
        <EmptyState
          title="Hozircha guruhingiz yo‘q"
          subtitle="Ustozning guruh taklifini qabul qiling yoki ochiq guruhga ariza yuboring."
          icon="users"
        />
      ) : null}
      <View style={{ gap: 10 }}>
        <Button
          title="Guruh takliflari"
          icon="inbox"
          variant="soft"
          onPress={() => navigation.navigate("Invitations")}
        />
        <Button
          title="Ochiq guruhlarni ko‘rish"
          icon="search"
          variant="outline"
          onPress={() => navigation.navigate("Groups")}
        />
      </View>
    </Screen>
  );
}
