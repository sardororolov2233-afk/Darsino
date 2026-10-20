import React, { useMemo, useState } from "react";
import { View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Header,
  Icon,
  Screen,
  uiStyles,
} from "../components/ui";
import { Feedback, useAction } from "../components/feedback";
import { TutorFields, initialTutor } from "../components/TutorForm";
import { useApp } from "../state/AppContext";
import { useAppNavigation, type RootStackParamList } from "../navigation";
import {
  dateLabel,
  dmId,
  localDate,
  nextDates,
  requestStatusLabel,
  timeLabel,
  toLessonTime,
  verificationLabel,
  type BookingRequest,
  type TutorInput,
  type Offering,
} from "../state/domain";
import { initials } from "../state/model";
import { money } from "./DiscoveryScreens";
import { C } from "../theme";
import { LessonMaterials } from "../components/LessonMaterials";
import { UserAvatar } from "../components/UserAvatar";
import {
  TeacherHeader,
  TeacherMetric,
  TeacherRadar,
  TeacherGroupCard,
} from "../components/TeacherComponents";
import { useTeacher } from "../state/TeacherContext";
import { teacherOverview, isClubOffering } from "../state/teacher";
import { matchesSearch } from "../state/learning";
import { formatPrice } from "../data/catalog";
import {
  groupPaymentRows,
  monthLabel,
  paymentMonth,
  paymentSummary,
} from "../state/payments";
import {
  FilterPanel,
  FilterOptions,
  FilterSelect,
  filterChoices,
} from "../components/FilterControls";
import { GroupPayments } from "../components/GroupPayments";
import { GroupTests } from "../components/GroupTests";

export function TutorHomeScreen() {
  const { user, market, syncError } = useApp();
  const { data, error } = useTeacher();
  const navigation = useAppNavigation();
  const [selectedGroup, setSelectedGroup] = useState("all");
  const profile = market.tutorProfiles.find((p) => p.userId === user.id);
  const approved = profile?.verification === "approved";
  const all = teacherOverview(market, user.id);
  const month = paymentMonth();
  const finances = paymentSummary(market, user.id, month);
  const next = all.sessions
    .filter((s) => Date.parse(s.endsAt) > Date.now())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 3);
  return (
    <Screen top={<TeacherHeader />}>
      <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
        <View style={{ flex: 1, minWidth: 160 }}>
          <AppText variant="caption" color={C.muted}>
            Repetitor kabineti
          </AppText>
          <AppText variant="title">Tahlil va natijalar</AppText>
        </View>
        <Chip
          label={verificationLabel[profile?.verification || "draft"]}
          tone={approved ? "green" : "gold"}
        />
      </View>
      {!approved ? (
        <Card style={{ backgroundColor: C.goldSoft }}>
          <AppText>
            {profile?.moderationNote ||
              "Moderator profilingizni tekshiradi. Tasdiqlangach guruh va klublarni e’lon qilasiz."}
          </AppText>
          <Button
            title="Repetitor profilini tahrirlash"
            variant="outline"
            onPress={() => navigation.navigate("TutorProfile")}
          />
        </Card>
      ) : null}
      <View style={uiStyles.wrap}>
        <TeacherMetric
          title="Faol o‘quvchilar"
          value={`${all.studentIds.size} nafar`}
          subtitle={`${all.classes.length} guruh va darsda`}
          icon="users"
          onPress={() => navigation.navigate("Main", { screen: "Classes" })}
        />
        <TeacherMetric
          title="Yangi arizalar"
          value={all.pending}
          subtitle="Tasdiqlash kutilmoqda"
          icon="inbox"
          onPress={() => navigation.navigate("Applications")}
        />
        <TeacherMetric
          title="Oylik to‘lovlar"
          value={formatPrice(finances.received)}
          subtitle={monthLabel(month)}
          icon="credit-card"
          dark
          onPress={() => navigation.navigate("Main", { screen: "Classes" })}
        />
        <TeacherMetric
          title="To‘lov qoldig‘i"
          value={formatPrice(finances.outstanding)}
          subtitle={`${finances.unpaidCount} o‘quvchidan kutilmoqda`}
          icon="clock"
          onPress={() => navigation.navigate("Main", { screen: "Classes" })}
        />
      </View>
      <Button
        title="Yangi guruh"
        icon="plus"
        variant="gold"
        disabled={!approved}
        onPress={() => navigation.navigate("CreateOffering")}
      />
      <TeacherRadar
        offeringId={selectedGroup}
        onSelect={setSelectedGroup}
        compact
      />
      <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
        <AppText variant="heading">Yaqin darslar</AppText>
        <Chip label={`${data.roomPlans.length} xona rejasi`} tone="purple" />
      </View>
      {next.map((session) => (
        <Card key={session.id}>
          <AppText variant="caption" color={C.purple}>
            {dateLabel(session.startsAt)} · {timeLabel(session.startsAt)}–
            {timeLabel(session.endsAt)} · {session.mode}
          </AppText>
          <AppText variant="heading">{session.title}</AppText>
          <AppText variant="caption" color={C.muted}>
            {session.location}
          </AppText>
          <Button
            title="Jadval va davomat"
            variant="soft"
            onPress={() =>
              navigation.navigate("ManageClass", { id: session.offeringId })
            }
          />
        </Card>
      ))}
      {!next.length ? (
        <EmptyState
          title="Kelgusi darslar yo‘q"
          subtitle="Yangi guruh oching yoki guruhingiz jadvalini tekshiring."
          icon="calendar"
        />
      ) : null}
      <AppText variant="heading">Guruhlarim</AppText>
      {all.classes.slice(0, 2).map((g) => (
        <TeacherGroupCard key={g.id} group={g} />
      ))}
      <Button
        title="Barcha guruhlar"
        variant="outline"
        onPress={() => navigation.navigate("Main", { screen: "Classes" })}
      />
      <Feedback error={syncError || error} />
    </Screen>
  );
}
function ApplicationDecisionCard({ request }: { request: BookingRequest }) {
  const { market, command } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const [note, setNote] = useState(""),
    student = market.users.find((u) => u.id === request.studentId);
  return (
    <Card>
      <View style={uiStyles.row}>
        <UserAvatar
          userId={student?.id}
          initials={initials(student?.name || "O‘quvchi")}
        />
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{student?.name || "O‘quvchi"}</AppText>
          <AppText variant="caption" color={C.muted}>
            {student?.area} {student?.goal ? `· ${student.goal}` : ""}
          </AppText>
        </View>
        <Chip
          label={
            request.status === "pending"
              ? "Yangi"
              : requestStatusLabel[request.status]
          }
          tone={request.status === "pending" ? "gold" : undefined}
        />
      </View>
      <AppText variant="label">{request.title}</AppText>
      <AppText color={C.muted}>{request.time}</AppText>
      {request.price ? <AppText>{money(request.price)}</AppText> : null}
      {request.status === "pending" ? (
        <>
          <Field
            label="O‘quvchiga izoh"
            placeholder="Rad etishda sabab yozish majburiy"
            value={note}
            onChangeText={setNote}
          />
          <View style={uiStyles.row}>
            <Button
              title="Tasdiqlash"
              icon="check"
              loading={action.busy}
              onPress={() =>
                action.run(() =>
                  command({
                    type: "decide",
                    requestId: request.id,
                    decision: "approved",
                    note,
                  }),
                )
              }
              style={{ flex: 1 }}
            />
            <Button
              title="Rad etish"
              variant="outline"
              disabled={action.busy}
              onPress={() =>
                action.run(async () => {
                  if (note.trim().length < 3)
                    throw new Error("Rad etish sababini yozing.");
                  return command({
                    type: "decide",
                    requestId: request.id,
                    decision: "rejected",
                    note,
                  });
                })
              }
              style={{ flex: 1 }}
            />
          </View>
        </>
      ) : request.note ? (
        <AppText color={C.muted}>{request.note}</AppText>
      ) : null}
      <Button
        title="O‘quvchiga yozish"
        icon="message-circle"
        variant="soft"
        onPress={() =>
          navigation.navigate("Conversation", {
            id: dmId(request.studentId, request.tutorId),
          })
        }
      />
      <Feedback {...action} />
    </Card>
  );
}
export function ApplicationsScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Applications">) {
  const navigation = useAppNavigation();
  const { requests, user, refresh } = useApp(),
    action = useAction();
  const [archive, setArchive] = useState(false);
  const list = requests.filter(
    (r) =>
      r.tutorId === user.id &&
      (!route.params?.offeringId || r.groupId === route.params.offeringId) &&
      (archive ? r.status !== "pending" : r.status === "pending"),
  );
  return (
    <Screen top={<TeacherHeader />}>
      <Header
        title="O‘quvchilar arizalari"
        onBack={() => navigation.goBack()}
        right={
          <Button
            title="Yangilash"
            variant="soft"
            loading={action.busy}
            onPress={() => action.run(refresh)}
            style={{ minHeight: 44 }}
          />
        }
      />
      <View style={uiStyles.wrap}>
        <Chip
          label="Kutilayotgan"
          selected={!archive}
          onPress={() => setArchive(false)}
        />
        <Chip
          label="Javob berilgan"
          selected={archive}
          onPress={() => setArchive(true)}
        />
      </View>
      <AppText color={C.muted}>
        Tasdiqlash o‘quvchini guruhga qo‘shadi va unga jadvalni ochadi.
      </AppText>
      <Feedback {...action} />
      {list.map((r) => (
        <ApplicationDecisionCard key={r.id} request={r} />
      ))}
      {!list.length ? (
        <EmptyState
          title={archive ? "Javob berilgan ariza yo‘q" : "Yangi arizalar yo‘q"}
          subtitle="E’lon qilingan dars va guruhlaringizga arizalar shu yerga keladi."
          icon="inbox"
        />
      ) : null}
    </Screen>
  );
}
export function TutorProfileScreen() {
  const { market, user, command } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const existing = market.tutorProfiles.find((p) => p.userId === user.id);
  const [value, setValue] = useState<TutorInput>(
    existing || { ...initialTutor, subjects: user.interests },
  );
  return (
    <Screen
      bottom={
        <Button
          title="Tekshiruvga yuborish"
          loading={action.busy}
          onPress={() =>
            action.run(
              () => command({ type: "tutor-profile", profile: value }),
              () => navigation.goBack(),
            )
          }
        />
      }
    >
      <Header
        title="Repetitor ma’lumotlari"
        onBack={() => navigation.goBack()}
      />
      <Card style={{ backgroundColor: C.goldSoft }}>
        <AppText color={C.muted}>
          O‘zgartirilgan profil qayta moderator tekshiruvidan o‘tadi. Tasdiqlash
          ma’lumoti ochiq profilda ko‘rinmaydi.
        </AppText>
      </Card>
      <TutorFields value={value} onChange={setValue} />
      <Feedback {...action} />
    </Screen>
  );
}
export function TutorClassesScreen() {
  const { market, user } = useApp();
  const navigation = useAppNavigation();
  const [query, setQuery] = useState(""),
    [type, setType] = useState("Barchasi"),
    [mode, setMode] = useState("Barchasi"),
    [sort, setSort] = useState("Nom bo‘yicha");
  const all = teacherOverview(market, user.id);
  const classes = all.classes
    .filter(
      (g) =>
        matchesSearch(`${g.title} ${g.subject} ${g.location}`, query) &&
        (mode === "Barchasi" || g.mode === mode) &&
        (type === "Barchasi" ||
          (type === "Ochiq" && g.published) ||
          (type === "Yopiq" && !g.published) ||
          (type === "Klublar" && isClubOffering(g))),
    )
    .sort((a, b) =>
      sort === "Nom bo‘yicha"
        ? a.title.localeCompare(b.title, "uz")
        : groupPaymentRows(market, b.id, paymentMonth()).length -
          groupPaymentRows(market, a.id, paymentMonth()).length,
    );
  const approved = market.tutorProfiles.some(
    (p) => p.userId === user.id && p.verification === "approved",
  );
  const active = [
    type !== "Barchasi",
    mode !== "Barchasi",
    sort !== "Nom bo‘yicha",
  ].filter(Boolean).length;
  return (
    <Screen top={<TeacherHeader />}>
      <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
        <View style={{ flex: 1, minWidth: 160 }}>
          <AppText variant="title">Guruhlarim va nazorat</AppText>
          <AppText variant="caption" color={C.muted}>
            {all.classes.length} ta guruh · {all.studentIds.size} faol o‘quvchi
          </AppText>
        </View>
        <Button
          title="Yangi guruh"
          icon="plus"
          variant="gold"
          disabled={!approved}
          onPress={() => navigation.navigate("CreateOffering")}
        />
      </View>
      <Field
        icon="search"
        placeholder="Guruh, fan yoki manzilni qidirish"
        value={query}
        onChangeText={setQuery}
      />
      <FilterPanel
        count={active}
        onReset={() => {
          setType("Barchasi");
          setMode("Barchasi");
          setSort("Nom bo‘yicha");
        }}
        initiallyOpen
      >
        <FilterOptions
          label="Guruh holati"
          options={filterChoices(["Barchasi", "Ochiq", "Yopiq", "Klublar"])}
          value={type}
          onChange={setType}
        />
        <FilterOptions
          label="Dars shakli"
          options={filterChoices(["Barchasi", "Onlayn", "Oflayn"])}
          value={mode}
          onChange={setMode}
        />
        <FilterSelect
          label="Saralash"
          options={filterChoices(["Nom bo‘yicha", "O‘quvchilar soni"])}
          value={sort}
          onChange={setSort}
        />
      </FilterPanel>
      <AppText variant="caption" color={C.muted}>
        {classes.length} ta guruh topildi. Boshqarishda o‘quvchilar, to‘lovlar,
        davomat va testlar mavjud.
      </AppText>
      {classes.map((g) => (
        <TeacherGroupCard key={g.id} group={g} />
      ))}
      {!classes.length ? (
        <EmptyState
          title={
            all.classes.length ? "Guruh topilmadi" : "Hali guruh ochilmagan"
          }
          subtitle={
            all.classes.length
              ? "Qidiruv yoki filtrlarni o‘zgartiring."
              : "Yangi guruh oching va o‘quvchilar arizalarini tasdiqlang."
          }
          icon="users"
        />
      ) : null}
      <Button
        title={`O‘quvchilar arizalari · ${all.pending}`}
        icon="inbox"
        variant="outline"
        onPress={() => navigation.navigate("Applications")}
      />
    </Screen>
  );
}
export function CreateOfferingScreen() {
  const { market, user, command } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const profile = market.tutorProfiles.find((p) => p.userId === user.id);
  const [title, setTitle] = useState(""),
    [subject, setSubject] = useState(profile?.subjects[0] || ""),
    [type, setType] = useState<"group" | "individual">("group"),
    [capacity, setCapacity] = useState("10"),
    [price, setPrice] = useState(String(profile?.price || 90000));
  const [mode, setMode] = useState(profile?.modes[0] || "Onlayn"),
    [area, setArea] = useState(user.area),
    [location, setLocation] = useState(""),
    [date, setDate] = useState(nextDates(1)[0]),
    [time, setTime] = useState(profile?.availability[0] || "18:00"),
    [count, setCount] = useState("4"),
    [duration, setDuration] = useState("60");
  const planned = useMemo(() => {
    try {
      const n = Number(count),
        minutes = Number(duration);
      if (
        !Number.isInteger(n) ||
        n < 1 ||
        n > 12 ||
        minutes < 15 ||
        minutes > 240
      )
        return [];
      const first = toLessonTime(date, time, minutes);
      return Array.from({ length: n }, (_, i) => ({
        startsAt: new Date(
          new Date(first.startsAt).getTime() + i * 7 * 86400000,
        ).toISOString(),
        endsAt: new Date(
          new Date(first.endsAt).getTime() + i * 7 * 86400000,
        ).toISOString(),
      }));
    } catch {
      return [];
    }
  }, [date, time, count, duration]);
  return (
    <Screen
      bottom={
        <Button
          title="Darsni e’lon qilish"
          loading={action.busy}
          onPress={() =>
            action.run(
              async () => {
                if (!planned.length)
                  throw new Error(
                    "Sana, vaqt, darslar soni va davomiylikni tekshiring.",
                  );
                return command({
                  type: "offering",
                  offering: {
                    title,
                    subject,
                    type,
                    capacity: type === "individual" ? 1 : Number(capacity),
                    price: Number(price),
                    mode,
                    area,
                    location,
                    days: `Haftalik · ${planned.length} dars`,
                    benefits: [],
                    sessions: planned,
                  },
                });
              },
              (id) => {
                if (id) navigation.replace("ManageClass", { id });
              },
            )
          }
        />
      }
    >
      <Header
        title="Yangi dars yoki guruh"
        onBack={() => navigation.goBack()}
      />
      <View style={uiStyles.wrap}>
        <Chip
          label="Guruh"
          selected={type === "group"}
          onPress={() => setType("group")}
        />
        <Chip
          label="Individual"
          selected={type === "individual"}
          onPress={() => {
            setType("individual");
            setCount("1");
          }}
        />
      </View>
      <Field
        label="Dars / guruh nomi"
        placeholder="Masalan, IELTS 6.5+ kechki guruh"
        value={title}
        onChangeText={setTitle}
      />
      <AppText variant="label">Fan</AppText>
      <View style={uiStyles.wrap}>
        {profile?.subjects.map((v) => (
          <Chip
            key={v}
            label={v}
            selected={subject === v}
            onPress={() => setSubject(v)}
          />
        ))}
      </View>
      {type === "group" ? (
        <Field
          label="O‘rinlar soni"
          keyboardType="number-pad"
          value={capacity}
          onChangeText={setCapacity}
        />
      ) : null}
      <Field
        label="E’lon narxi (so‘m)"
        keyboardType="number-pad"
        value={price}
        onChangeText={setPrice}
      />
      <AppText variant="caption" color={C.muted}>
        Narxni bir dars yoki kurs uchun belgilasangiz, guruh nomida va chatda
        aniqlashtiring.
      </AppText>
      <View style={uiStyles.wrap}>
        {profile?.modes.map((v) => (
          <Chip
            key={v}
            label={v}
            selected={mode === v}
            onPress={() => setMode(v)}
          />
        ))}
      </View>
      <Field label="Hudud" value={area} onChangeText={setArea} />
      <Field
        label={mode === "Onlayn" ? "Onlayn dars manzili" : "Dars manzili"}
        placeholder={
          mode === "Onlayn"
            ? "Platforma nomi yoki dars havolasi"
            : "Manzil va xona"
        }
        value={location}
        onChangeText={setLocation}
      />
      <AppText variant="heading">Jadval (Toshkent vaqti)</AppText>
      <Field
        label="Birinchi dars sanasi (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />
      <Field
        label="Boshlanish vaqti (HH:MM)"
        value={time}
        onChangeText={setTime}
      />
      <View style={uiStyles.row}>
        <View style={{ flex: 1 }}>
          <Field
            label="Haftalik darslar soni"
            keyboardType="number-pad"
            value={count}
            onChangeText={setCount}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Davomiylik (daqiqa)"
            keyboardType="number-pad"
            value={duration}
            onChangeText={setDuration}
          />
        </View>
      </View>
      {planned.length ? (
        <Card>
          <AppText variant="label">E’lon qilinadigan jadval</AppText>
          {planned.map((s) => (
            <AppText key={s.startsAt} variant="caption" color={C.muted}>
              {dateLabel(s.startsAt)} · {timeLabel(s.startsAt)}–
              {timeLabel(s.endsAt)}
            </AppText>
          ))}
        </Card>
      ) : null}
      <Feedback {...action} />
    </Screen>
  );
}
export function ManageClassScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "ManageClass">) {
  const { market, user, command } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const group = market.offerings.find(
      (g) => g.id === route.params.id && g.tutorId === user.id,
    ),
    sessions = market.sessions
      .filter((s) => s.offeringId === route.params.id)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const [selected, setSelected] = useState(sessions[0]?.id || ""),
    [remove, setRemove] = useState<string | null>(null);
  const [tab, setTab] = useState("O‘quvchilar"),
    [editing, setEditing] = useState(false),
    [newDate, setNewDate] = useState(""),
    [newTime, setNewTime] = useState("");
  const members = market.enrollments.filter(
      (e) => e.offeringId === route.params.id && e.active,
    ),
    session = sessions.find((s) => s.id === selected),
    started = session && new Date(session.startsAt).getTime() <= Date.now();
  if (!group)
    return (
      <Screen top={<TeacherHeader />}>
        <Header title="Guruhni boshqarish" onBack={() => navigation.goBack()} />
        <EmptyState
          title="Guruh topilmadi"
          subtitle="Faqat o‘z darslaringizni boshqarishingiz mumkin."
        />
      </Screen>
    );
  return (
    <Screen top={<TeacherHeader />}>
      <Header title="Guruhni boshqarish" onBack={() => navigation.goBack()} />
      <AppText variant="title">{group.title}</AppText>
      <View style={uiStyles.wrap}>
        <Chip label={group.subject} tone="purple" />
        <Chip
          label={`${members.length + group.reservedSeats}/${group.capacity} qatnashchi`}
          tone="green"
        />
      </View>
      <AppText color={C.muted}>{group.location}</AppText>
      <Button
        title={group.published ? "E’lonni yopish" : "E’lonni ochish"}
        variant="outline"
        loading={action.busy}
        onPress={() =>
          action.run(() =>
            command({
              type: "offering-visibility",
              offeringId: group.id,
              published: !group.published,
            }),
          )
        }
      />
      <Button
        title="Guruh arizalarini ko‘rish"
        variant="soft"
        icon="inbox"
        onPress={() =>
          navigation.navigate("Applications", { offeringId: group.id })
        }
      />
      {group.type === "group" ? <Button
        title="O‘quvchini guruhga taklif qilish" icon="user-plus" variant="soft"
        onPress={() => navigation.navigate("InviteToGroup", { offeringId: group.id })}
      /> : null}
      <FilterOptions
        label="Guruh bo‘limlari"
        options={filterChoices([
          "O‘quvchilar",
          "Davomat",
          "Testlar",
          "Materiallar",
        ])}
        value={tab}
        onChange={setTab}
      />
      {tab === "O‘quvchilar" ? <GroupPayments group={group} /> : null}
      {tab === "Testlar" ? <GroupTests group={group} /> : null}
      {tab === "Materiallar" ? <LessonMaterials offeringId={group.id} /> : null}
      {tab === "Davomat" ? (
        <>
          <AppText variant="heading">Jadval va davomat</AppText>
          <FilterSelect
            label="Dars sanasi"
            value={selected}
            onChange={(id) => {
              setSelected(id);
              setEditing(false);
            }}
            options={sessions.map((s) => ({
              value: s.id,
              label: `${dateLabel(s.startsAt)} · ${timeLabel(s.startsAt)}`,
            }))}
          />
          {session && !started ? (
            <Button
              title="Tanlangan dars vaqtini o‘zgartirish"
              variant="soft"
              onPress={() => {
                setNewDate(localDate(new Date(session.startsAt)));
                setNewTime(timeLabel(session.startsAt));
                setEditing((v) => !v);
              }}
            />
          ) : null}
          {editing && session ? (
            <Card>
              <Field
                label="Yangi sana (YYYY-MM-DD)"
                value={newDate}
                onChangeText={setNewDate}
              />
              <Field
                label="Yangi vaqt (HH:MM)"
                value={newTime}
                onChangeText={setNewTime}
              />
              <AppText variant="caption" color={C.muted}>
                Qatnashchilar yangi jadval haqida bildirishnoma oladi.
              </AppText>
              <Button
                title="Jadvalni saqlash"
                loading={action.busy}
                onPress={() =>
                  action.run(
                    async () => {
                      const times = toLessonTime(
                        newDate,
                        newTime,
                        Math.round(
                          (new Date(session.endsAt).getTime() -
                            new Date(session.startsAt).getTime()) /
                            60000,
                        ),
                      );
                      return command({
                        type: "update-session",
                        sessionId: session.id,
                        ...times,
                      });
                    },
                    () => setEditing(false),
                  )
                }
              />
            </Card>
          ) : null}
          <AppText variant="caption" color={C.muted}>
            {started
              ? "Tanlangan dars uchun qatnashganlarni belgilang."
              : "Davomat tanlangan dars boshlangach belgilanadi."}
          </AppText>
          {members.map((e) => {
            const student = market.users.find((u) => u.id === e.studentId),
              attendance = market.attendance.find(
                (a) => a.sessionId === selected && a.studentId === e.studentId,
              );
            return (
              <Card key={e.id}>
                <View style={uiStyles.row}>
                  <UserAvatar
                    userId={student?.id}
                    initials={initials(student?.name || "O‘quvchi")}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText variant="heading">
                      {student?.name || "O‘quvchi"}
                    </AppText>
                    <AppText variant="caption" color={C.muted}>
                      {student?.area}
                    </AppText>
                  </View>
                </View>
                <View style={uiStyles.wrap}>
                  <Chip
                    label="Qatnashgan"
                    selected={attendance?.status === "present"}
                    onPress={
                      started && !action.busy
                        ? () =>
                            action.run(() =>
                              command({
                                type: "attendance",
                                sessionId: selected,
                                studentId: e.studentId,
                                status: "present",
                              }),
                            )
                        : undefined
                    }
                  />
                  <Chip
                    label="Qatnashmagan"
                    selected={attendance?.status === "absent"}
                    onPress={
                      started && !action.busy
                        ? () =>
                            action.run(() =>
                              command({
                                type: "attendance",
                                sessionId: selected,
                                studentId: e.studentId,
                                status: "absent",
                              }),
                            )
                        : undefined
                    }
                  />
                </View>
                <Button
                  title="O‘quvchiga yozish"
                  variant="soft"
                  onPress={() =>
                    navigation.navigate("Conversation", {
                      id: dmId(e.studentId, user.id),
                    })
                  }
                />
                {remove === e.studentId ? (
                  <>
                    <AppText color={C.error}>
                      Qatnashchini guruhdan chiqarish tasdiqlansinmi?
                    </AppText>
                    <View style={uiStyles.row}>
                      <Button
                        title="Guruhdan chiqarish"
                        loading={action.busy}
                        onPress={() =>
                          action.run(
                            () =>
                              command({
                                type: "remove-participant",
                                offeringId: group.id,
                                studentId: e.studentId,
                              }),
                            () => setRemove(null),
                          )
                        }
                        style={{ flex: 1 }}
                      />
                      <Button
                        title="Qoldirish"
                        variant="outline"
                        onPress={() => setRemove(null)}
                      />
                    </View>
                  </>
                ) : (
                  <Button
                    title="Qatnashchini chiqarish"
                    variant="outline"
                    onPress={() => setRemove(e.studentId)}
                  />
                )}
              </Card>
            );
          })}
          {!members.length ? (
            <EmptyState
              title="Hali qatnashchi yo‘q"
              subtitle="O‘quvchi arizasini tasdiqlagach uning ma’lumotlari va davomati shu yerda ko‘rinadi."
              icon="users"
            />
          ) : null}
          {group.reservedSeats ? (
            <AppText variant="caption" color={C.muted}>
              {group.reservedSeats} ta o‘rin sinov katalogida avvaldan band.
              Ularga soxta qatnashchi akkauntlari kiritilmagan.
            </AppText>
          ) : null}
        </>
      ) : null}
      <Feedback {...action} />
    </Screen>
  );
}
export function ModerationScreen() {
  const { market, user, refresh } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const pending = market.tutorProfiles.filter(
    (p) => p.verification === "pending",
  );
  return (
    <Screen>
      <Header
        title="Profil tekshiruvi"
        right={
          <Button
            title="Yangilash"
            variant="soft"
            onPress={() => action.run(refresh)}
            loading={action.busy}
            style={{ minHeight: 44 }}
          />
        }
      />
      <Feedback {...action} />
      {user.role !== "moderator" ? (
        <EmptyState
          title="Moderator huquqi kerak"
          subtitle="Bu bo‘lim moderator akkaunti uchun."
        />
      ) : (
        <>
          <AppText color={C.muted}>
            {pending.length} ta repetitor profili tekshiruvda.
          </AppText>
          {pending.map((p) => {
            const tutor = market.users.find((u) => u.id === p.userId);
            return (
              <Card
                key={p.userId}
                accessibilityLabel={`${tutor?.name} profilini tekshirish`}
                onPress={() =>
                  navigation.navigate("ModerateTutor", { id: p.userId })
                }
              >
                <View style={uiStyles.row}>
                  <UserAvatar
                    userId={tutor?.id}
                    initials={initials(tutor?.name || "Repetitor")}
                  />
                  <View style={{ flex: 1 }}>
                    <AppText variant="heading">{tutor?.name}</AppText>
                    <AppText color={C.muted}>{p.subjects.join(" · ")}</AppText>
                  </View>
                  <Icon name="chevron-right" />
                </View>
                <Chip label="Tekshiruv kutilmoqda" tone="gold" />
              </Card>
            );
          })}
          {!pending.length ? (
            <EmptyState
              title="Navbat bo‘sh"
              subtitle="Yangi repetitor profillari shu yerda tekshiriladi."
              icon="check-circle"
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
export function ModerateTutorScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "ModerateTutor">) {
  const { market, user, command } = useApp(),
    navigation = useAppNavigation(),
    action = useAction(),
    [note, setNote] = useState("");
  const profile = market.tutorProfiles.find(
      (p) => p.userId === route.params.id,
    ),
    tutor = market.users.find((u) => u.id === route.params.id);
  if (user.role !== "moderator" || !profile)
    return (
      <Screen>
        <Header title="Tekshiruv" onBack={() => navigation.goBack()} />
        <EmptyState
          title="Profil topilmadi"
          subtitle="Moderator akkaunti bilan tekshiruv navbatini oching."
        />
      </Screen>
    );
  return (
    <Screen>
      <Header
        title="Repetitorni tekshirish"
        onBack={() => navigation.goBack()}
      />
      <AppText variant="title">{tutor?.name}</AppText>
      <Chip label={verificationLabel[profile.verification]} tone="gold" />
      <Card>
        <AppText variant="heading">Mutaxassislik</AppText>
        <AppText>
          {profile.subjects.join(" · ")} · {profile.specialty}
        </AppText>
        <AppText>
          {profile.experience} yil tajriba · {money(profile.price)}
        </AppText>
        <AppText color={C.muted}>{profile.bio}</AppText>
        <AppText variant="heading">Tasdiqlash ma’lumoti</AppText>
        <AppText selectable>{profile.proof}</AppText>
        <AppText color={C.muted}>
          {tutor?.city} · {tutor?.area}
        </AppText>
        <AppText color={C.muted}>
          {profile.modes.join(" / ")} · {profile.availability.join(", ")}
        </AppText>
      </Card>
      {profile.verification === "pending" ? (
        <>
          <Field
            label="Moderator izohi"
            placeholder="Tuzatish yoki rad etish sababini yozing"
            multiline
            value={note}
            onChangeText={setNote}
          />
          <Feedback {...action} />
          <Button
            title="Repetitorni tasdiqlash"
            loading={action.busy}
            onPress={() =>
              action.run(
                () =>
                  command({
                    type: "moderate",
                    tutorId: profile.userId,
                    decision: "approved",
                    note,
                  }),
                () => navigation.goBack(),
              )
            }
          />
          <Button
            title="Tuzatishga qaytarish"
            variant="outline"
            disabled={action.busy}
            onPress={() =>
              action.run(
                () =>
                  command({
                    type: "moderate",
                    tutorId: profile.userId,
                    decision: "rejected",
                    note,
                  }),
                () => navigation.goBack(),
              )
            }
          />
        </>
      ) : (
        <AppText color={C.muted}>{profile.moderationNote}</AppText>
      )}
    </Screen>
  );
}
