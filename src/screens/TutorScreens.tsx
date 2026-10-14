import React, { useMemo, useState } from "react";
import { View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AppText,
  Avatar,
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
} from "../state/domain";
import { initials } from "../state/model";
import { money } from "./DiscoveryScreens";
import { C } from "../theme";

export function TutorHomeScreen() {
  const { user, market, requests, notifications } = useApp(),
    navigation = useAppNavigation();
  const profile = market.tutorProfiles.find((p) => p.userId === user.id),
    approved = profile?.verification === "approved";
  const classes = market.offerings.filter((o) => o.tutorId === user.id),
    classIds = new Set(classes.map((o) => o.id)),
    pending = requests.filter((r) => r.status === "pending").length;
  const students = new Set(
    market.enrollments
      .filter((e) => classIds.has(e.offeringId) && e.active)
      .map((e) => e.studentId),
  ).size;
  const next = market.sessions
    .filter(
      (s) =>
        classIds.has(s.offeringId) && new Date(s.endsAt).getTime() > Date.now(),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  return (
    <Screen>
      <Header
        title="Repetitor kabineti"
        right={
          <Button
            title={`Xabarlar · ${notifications.filter((n) => !n.read).length}`}
            icon="bell"
            variant="soft"
            onPress={() => navigation.navigate("Notifications")}
            style={{ minHeight: 44 }}
          />
        }
      />
      <AppText variant="display">Salom, {user.name.split(" ")[0]}.</AppText>
      <AppText color={C.muted}>
        Darslaringiz, arizalar va qatnashchilar bir joyda.
      </AppText>
      <Card style={{ backgroundColor: approved ? C.greenSoft : C.goldSoft }}>
        <Chip
          label={verificationLabel[profile?.verification || "draft"]}
          tone={approved ? "green" : "gold"}
        />
        <AppText>
          {approved
            ? "O‘quvchilarni qabul qilish va darslarni e’lon qilish mumkin."
            : "Moderator mutaxassislik va tasdiqlash ma’lumotlarini tekshiradi. Javob bildirishnomalarda ko‘rinadi."}
        </AppText>
        {profile?.moderationNote ? (
          <AppText variant="label">{profile.moderationNote}</AppText>
        ) : null}
        <Button
          title="Repetitor profilini tahrirlash"
          variant="outline"
          onPress={() => navigation.navigate("TutorProfile")}
        />
      </Card>
      <View style={uiStyles.row}>
        {[
          { n: pending, label: "Arizalar" },
          { n: classes.length, label: "Dars / guruh" },
          { n: students, label: "O‘quvchilar" },
        ].map((s) => (
          <Card
            key={s.label}
            style={{ flex: 1, alignItems: "center", padding: 12 }}
          >
            <AppText variant="title">{s.n}</AppText>
            <AppText variant="caption" color={C.muted}>
              {s.label}
            </AppText>
          </Card>
        ))}
      </View>
      <Button
        title="Yangi dars yoki guruh"
        icon="plus"
        variant="gold"
        disabled={!approved}
        onPress={() => navigation.navigate("CreateOffering")}
      />
      <Button
        title={`Kelgan arizalar · ${pending}`}
        variant="outline"
        onPress={() => navigation.navigate("Main", { screen: "Applications" })}
      />
      <AppText variant="heading">Yaqin dars</AppText>
      {next ? (
        <Card
          onPress={() =>
            navigation.navigate("ManageClass", { id: next.offeringId })
          }
          accessibilityLabel="Yaqin darsni boshqarish"
        >
          <AppText variant="heading">{next.title}</AppText>
          <AppText>
            {dateLabel(next.startsAt)} · {timeLabel(next.startsAt)}–
            {timeLabel(next.endsAt)}
          </AppText>
          <AppText color={C.muted}>{next.location}</AppText>
        </Card>
      ) : (
        <EmptyState
          title="Jadval hali bo‘sh"
          subtitle="Tasdiqlangan profildan dars yoki guruh yaratib, jadvalni belgilang."
          icon="calendar"
        />
      )}
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
        <Avatar initials={initials(student?.name || "O‘quvchi")} />
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
export function ApplicationsScreen() {
  const { requests, user, refresh } = useApp(),
    action = useAction();
  const [archive, setArchive] = useState(false);
  const list = requests.filter(
    (r) =>
      r.tutorId === user.id &&
      (archive ? r.status !== "pending" : r.status === "pending"),
  );
  return (
    <Screen>
      <Header
        title="O‘quvchilar arizalari"
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
  const { market, user } = useApp(),
    navigation = useAppNavigation();
  const classes = market.offerings.filter((o) => o.tutorId === user.id),
    approved = market.tutorProfiles.some(
      (p) => p.userId === user.id && p.verification === "approved",
    );
  return (
    <Screen>
      <Header title="Darslar va guruhlar" />
      <Button
        title="Yangi dars yoki guruh"
        icon="plus"
        variant="gold"
        disabled={!approved}
        onPress={() => navigation.navigate("CreateOffering")}
      />
      {classes.map((g) => {
        const students = market.enrollments.filter(
          (e) => e.offeringId === g.id && e.active,
        ).length;
        return (
          <Card
            key={g.id}
            accessibilityLabel={`${g.title}ni boshqarish`}
            onPress={() => navigation.navigate("ManageClass", { id: g.id })}
          >
            <View style={uiStyles.between}>
              <Chip
                label={g.type === "group" ? "Guruh" : "Individual"}
                tone="purple"
              />
              <Chip
                label={g.published ? "Ochiq e’lon" : "Yopiq"}
                tone={g.published ? "green" : undefined}
              />
            </View>
            <AppText variant="heading">{g.title}</AppText>
            <AppText color={C.muted}>
              {g.subject} · {g.mode}
            </AppText>
            <AppText>
              {g.days} · {g.time}
            </AppText>
            <View style={uiStyles.between}>
              <AppText variant="caption" color={C.muted}>
                {students + g.reservedSeats}/{g.capacity} qatnashchi
              </AppText>
              <Icon name="chevron-right" />
            </View>
          </Card>
        );
      })}
      {!classes.length ? (
        <EmptyState
          title="Darslar hali yaratilmagan"
          subtitle="Guruh yoki individual dars yarating, so‘ng kelgan arizalarni qabul qiling."
          icon="book-open"
        />
      ) : null}
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
  const [editing, setEditing] = useState(false),
    [newDate, setNewDate] = useState(""),
    [newTime, setNewTime] = useState("");
  const members = market.enrollments.filter(
      (e) => e.offeringId === route.params.id && e.active,
    ),
    session = sessions.find((s) => s.id === selected),
    started = session && new Date(session.startsAt).getTime() <= Date.now();
  if (!group)
    return (
      <Screen>
        <Header title="Guruhni boshqarish" onBack={() => navigation.goBack()} />
        <EmptyState
          title="Guruh topilmadi"
          subtitle="Faqat o‘z darslaringizni boshqarishingiz mumkin."
        />
      </Screen>
    );
  return (
    <Screen>
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
      <AppText variant="heading">Jadval va davomat</AppText>
      <View style={uiStyles.wrap}>
        {sessions.map((s) => (
          <Chip
            key={s.id}
            label={`${dateLabel(s.startsAt)} · ${timeLabel(s.startsAt)}`}
            selected={selected === s.id}
            onPress={() => {
              setSelected(s.id);
              setEditing(false);
            }}
          />
        ))}
      </View>
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
              <Avatar initials={initials(student?.name || "O‘quvchi")} />
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
          {group.reservedSeats} ta o‘rin sinov katalogida avvaldan band. Ularga
          soxta qatnashchi akkauntlari kiritilmagan.
        </AppText>
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
                  <Avatar initials={initials(tutor?.name || "Repetitor")} />
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
