import React, { useMemo, useState } from "react";
import { Linking, View } from "react-native";
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
import { AREAS, GOALS, SUBJECTS } from "../components/TutorForm";
import { useApp } from "../state/AppContext";
import { useAppNavigation, type RootStackParamList } from "../navigation";
import {
  dateLabel,
  dmId,
  localDate,
  nextDates,
  requestStatusLabel,
  timeLabel,
  verificationLabel,
  type BookingRequest,
  type LessonSession,
} from "../state/domain";
import { initials } from "../state/model";
import { scheduleReminder } from "../services/reminders";
import { TutorCard, money } from "./DiscoveryScreens";
import { C, font } from "../theme";
import { UserAvatar } from "../components/UserAvatar";
import { AvatarEditor } from "../components/AvatarEditor";
import {
  TeacherHeader,
  TeacherFinance,
  TeacherProfileSummary,
} from "../components/TeacherComponents";
import { assessmentLabel } from "../state/assessments";
import { AssessmentMessage } from "../components/AssessmentMessage";
import { OqiHeader } from "../components/OqiHeader";
import { LearningLibrary } from "./LearningScreens";
import { useLearning } from "../state/LearningContext";
import { learningStats } from "../state/learning";
import { clubs } from "../data/learning";

export function RequestCard({ request }: { request: BookingRequest }) {
  const navigation = useAppNavigation();
  return (
    <Card
      onPress={() => navigation.navigate("Request", { id: request.id })}
      accessibilityLabel={`${request.title} arizasi`}
    >
      <Chip
        label={requestStatusLabel[request.status]}
        tone={
          request.status === "approved"
            ? "green"
            : request.status === "pending"
              ? "gold"
              : undefined
        }
      />
      <AppText variant="heading">{request.title}</AppText>
      <AppText color={C.muted}>
        {request.subtitle} · {request.time}
      </AppText>
      {request.price ? (
        <AppText variant="label">{money(request.price)}</AppText>
      ) : null}
    </Card>
  );
}
export function RequestScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Request">) {
  const navigation = useAppNavigation(),
    { user, requests, command } = useApp();
  const request = requests.find((r) => r.id === route.params.id),
    action = useAction();
  if (!request)
    return (
      <Screen>
        <Header title="Ariza" onBack={() => navigation.goBack()} />
        <EmptyState
          title="Ariza topilmadi"
          subtitle="Bu ariza sizning akkauntingizga tegishli emas yoki mavjud emas."
        />
      </Screen>
    );
  const isStudent = request.studentId === user.id;
  return (
    <Screen>
      <Header title="Ariza holati" onBack={() => navigation.goBack()} />
      <View style={{ alignItems: "center", gap: 16, paddingVertical: 28 }}>
        <View
          style={{
            backgroundColor:
              request.status === "approved" ? C.greenSoft : C.goldSoft,
            padding: 24,
            borderRadius: 32,
          }}
        >
          <Icon
            name={
              request.status === "approved"
                ? "check-circle"
                : request.status === "pending"
                  ? "clock"
                  : "x-circle"
            }
            size={40}
          />
        </View>
        <AppText variant="title">{requestStatusLabel[request.status]}</AppText>
        <AppText color={C.muted} style={{ textAlign: "center" }}>
          {request.status === "pending"
            ? "Ustoz arizani ko‘rib chiqadi. Qaror haqida bildirishnoma olasiz."
            : request.status === "approved"
              ? "Guruh va jadval «Darslarim» bo‘limiga qo‘shildi."
              : request.note ||
                "Boshqa dars yoki guruh uchun yangi ariza yuborishingiz mumkin."}
        </AppText>
      </View>
      <Card>
        <AppText variant="heading">{request.title}</AppText>
        <AppText color={C.muted}>{request.subtitle}</AppText>
        <AppText>{request.time}</AppText>
        {request.price ? (
          <AppText variant="heading">{money(request.price)}</AppText>
        ) : null}
        {request.note ? (
          <AppText color={C.muted}>Ustoz izohi: {request.note}</AppText>
        ) : null}
      </Card>
      <Feedback {...action} />
      <Button
        title={isStudent ? "Darslarimni ko‘rish" : "Arizalarimni ko‘rish"}
        onPress={() =>
          isStudent
            ? navigation.popTo("Main", { screen: "Lessons" })
            : navigation.navigate("Applications")
        }
      />
      {request.conversationId ? (
        <Button
          title="Chatni ochish"
          icon="message-circle"
          variant="outline"
          onPress={() =>
            navigation.navigate("Conversation", { id: request.conversationId! })
          }
        />
      ) : null}
      {isStudent && request.status === "pending" ? (
        <Button
          title="Arizani bekor qilish"
          variant="soft"
          loading={action.busy}
          onPress={() =>
            action.run(() => command({ type: "cancel", requestId: request.id }))
          }
        />
      ) : null}
    </Screen>
  );
}
function StudentLessonCard({ session }: { session: LessonSession }) {
  const navigation = useAppNavigation(),
    { user, market } = useApp();
  const action = useAction(),
    offering = market.offerings.find((o) => o.id === session.offeringId);
  const ended = new Date(session.endsAt).getTime() < Date.now(),
    attendance = market.attendance.find(
      (a) => a.sessionId === session.id && a.studentId === user.id,
    ),
    reviewed = market.reviews.some(
      (r) => r.sessionId === session.id && r.studentId === user.id,
    );
  return (
    <Card>
      <View style={uiStyles.between}>
        <Chip
          label={ended ? "Tugagan dars" : dateLabel(session.startsAt)}
          tone={ended ? undefined : "gold"}
        />
        <AppText variant="label">
          {timeLabel(session.startsAt)}–{timeLabel(session.endsAt)}
        </AppText>
      </View>
      <AppText variant="heading">{session.title}</AppText>
      <AppText color={C.muted}>{offering?.tutor}</AppText>
      <View style={uiStyles.row}>
        <Icon
          name={session.mode === "Onlayn" ? "video" : "map-pin"}
          size={16}
        />
        <AppText variant="caption" color={C.muted} style={{ flex: 1 }}>
          {session.location}
        </AppText>
      </View>
      {attendance ? (
        <Chip
          label={
            attendance.status === "present" ? "Qatnashgan" : "Qatnashmagan"
          }
          tone={attendance.status === "present" ? "green" : undefined}
        />
      ) : null}
      {!ended ? (
        <Button
          title="15 daqiqa oldin eslatish"
          icon="bell"
          variant="soft"
          loading={action.busy}
          onPress={() =>
            action.run(
              () => scheduleReminder(session),
              () => action.setSuccess("Eslatma yoqildi."),
            )
          }
        />
      ) : null}
      {!ended &&
      session.mode === "Onlayn" &&
      /^https:\/\/\S+$/.test(session.location) ? (
        <Button
          title="Darsga kirish"
          icon="video"
          variant="gold"
          onPress={() =>
            action.run(async () => {
              await Linking.openURL(session.location);
            })
          }
        />
      ) : null}
      {offering ? (
        <Button
          title="Ustozga yozish"
          variant="outline"
          onPress={() =>
            navigation.navigate("Conversation", {
              id: dmId(user.id, offering.tutorId),
            })
          }
        />
      ) : null}
      <Button
        title="Dars materiallari"
        icon="folder"
        variant="soft"
        onPress={() =>
          navigation.navigate("Materials", {
            offeringId: session.offeringId,
            sessionId: session.id,
          })
        }
      />
      {ended && attendance?.status === "present" && !reviewed ? (
        <Button
          title="Fikr qoldirish"
          variant="gold"
          onPress={() =>
            navigation.navigate("Review", { sessionId: session.id })
          }
        />
      ) : null}
      {reviewed ? (
        <AppText variant="caption" color={C.green}>
          Fikringiz saqlangan. Rahmat!
        </AppText>
      ) : null}
      <Feedback {...action} />
    </Card>
  );
}
export function LessonsScreen() {
  const [section, setSection] = useState("Darslarim");
  return (
    <Screen top={<OqiHeader />}>
      <Header title="Darslar va klublar" />
      <View style={uiStyles.wrap}>
        {["Darslarim", "Video darslar", "Klublar"].map((s) => (
          <Chip
            key={s}
            label={s}
            selected={section === s}
            onPress={() => setSection(s)}
          />
        ))}
      </View>
      {section === "Darslarim" ? (
        <ScheduleContent />
      ) : (
        <LearningLibrary section={section as "Video darslar" | "Klublar"} />
      )}
    </Screen>
  );
}
function ScheduleContent() {
  const { user, market, requests } = useApp(),
    navigation = useAppNavigation();
  const [tab, setTab] = useState("Jadval"),
    [day, setDay] = useState("Barchasi"),
    [history, setHistory] = useState(false);
  const memberships = market.enrollments.filter(
      (e) => e.studentId === user.id && e.active,
    ),
    ids = new Set(memberships.map((e) => e.offeringId));
  const sessions = market.sessions
    .filter(
      (s) =>
        ids.has(s.offeringId) &&
        (history
          ? new Date(s.endsAt).getTime() < Date.now()
          : new Date(s.endsAt).getTime() >= Date.now()) &&
        (day === "Barchasi" || localDate(new Date(s.startsAt)) === day),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const ownRequests = requests.filter((r) => r.studentId === user.id),
    pending = ownRequests.filter((r) => r.status === "pending").length;
  const dates = useMemo(() => [localDate(new Date()), ...nextDates(6)], []);
  return (
    <>
      <Header title="Darslarim" />
      <AppText color={C.muted}>
        Tasdiqlangan darslar, jadval va ariza holatlari.
      </AppText>
      <View style={uiStyles.wrap}>
        {["Jadval", "Guruhlar", "Arizalar"].map((t) => (
          <Chip
            key={t}
            label={t === "Arizalar" ? `Arizalar · ${pending}` : t}
            selected={tab === t}
            onPress={() => setTab(t)}
          />
        ))}
      </View>
      {tab === "Jadval" ? (
        <>
          <View style={uiStyles.wrap}>
            <Chip
              label="Kelgusi darslar"
              selected={!history}
              onPress={() => {
                setHistory(false);
                setDay("Barchasi");
              }}
            />
            <Chip
              label="O‘tgan darslar"
              selected={history}
              onPress={() => {
                setHistory(true);
                setDay("Barchasi");
              }}
            />
          </View>
          {!history ? (
            <View style={uiStyles.wrap}>
              {["Barchasi", ...dates].map((d) => (
                <Chip
                  key={d}
                  label={d === "Barchasi" ? d : dateLabel(d)}
                  selected={day === d}
                  onPress={() => setDay(d)}
                />
              ))}
            </View>
          ) : null}
          {sessions.map((s) => (
            <StudentLessonCard key={s.id} session={s} />
          ))}
          {!sessions.length ? (
            <>
              <EmptyState
                title={history ? "O‘tgan darslar yo‘q" : "Hozircha dars yo‘q"}
                subtitle={
                  memberships.length
                    ? "Tanlangan sana uchun dars belgilanmagan."
                    : "Ustoz arizangizni tasdiqlagach darslar shu yerda ko‘rinadi."
                }
                icon="calendar"
              />
              <Button
                title="Ochiq guruhlarni ko‘rish"
                variant="soft"
                onPress={() => navigation.navigate("Groups")}
              />
            </>
          ) : null}
        </>
      ) : tab === "Guruhlar" ? (
        <>
          {market.offerings
            .filter((o) => ids.has(o.id))
            .map((g) => (
              <Card
                key={g.id}
                onPress={() => navigation.navigate("Group", { id: g.id })}
                accessibilityLabel={`${g.title} guruhini ochish`}
              >
                <Chip label="Qabul qilingansiz" tone="green" />
                <AppText variant="heading">{g.title}</AppText>
                <AppText color={C.muted}>
                  {g.tutor} · {g.mode}
                </AppText>
                <AppText variant="caption" color={C.muted}>
                  {g.days} · {g.time}
                </AppText>
              </Card>
            ))}
          {!memberships.length ? (
            <EmptyState
              title="Guruhlar hali qo‘shilmagan"
              subtitle="Ochiq guruhga ariza yuboring va ustoz javobini kuting."
              icon="users"
            />
          ) : null}
        </>
      ) : (
        <>
          {ownRequests.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
          {!ownRequests.length ? (
            <EmptyState
              title="Arizalar yo‘q"
              subtitle="Repetitor profilidan individual darsga yoki ochiq guruhga ariza yuboring."
            />
          ) : null}
        </>
      )}
    </>
  );
}
function conversationName(
  id: string,
  actorId: string,
  users: ReturnType<typeof useApp>["market"]["users"],
) {
  const [, student, tutor] = id.split(":");
  const other = actorId === student ? tutor : student;
  return users.find((u) => u.id === other)?.name || "Suhbatdoshingiz";
}
export function ChatsScreen() {
  const { user, messages, requests, market } = useApp(),
    navigation = useAppNavigation();
  const ids = [
    ...new Set([
      ...Object.keys(messages),
      ...requests
        .map((r) => r.conversationId)
        .filter((id): id is string => !!id),
    ]),
  ];
  return (
    <Screen>
      <Header
        title="Suhbatlar"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <AppText color={C.muted}>
        {user.role === "tutor"
          ? "O‘quvchilar bilan dars vaqtini va tayyorgarlikni kelishing."
          : "Ustoz bilan dars tafsilotlarini kelishing."}
      </AppText>
      {ids.map((id) => {
        const name = conversationName(id, user.id, market.users),
          last = messages[id]?.at(-1);
        return (
          <Card
            key={id}
            accessibilityLabel={`Suhbat: ${name}`}
            onPress={() => navigation.navigate("Conversation", { id })}
          >
            <View style={uiStyles.row}>
              <UserAvatar
                userId={id
                  .split(":")
                  .slice(1)
                  .find((uid) => uid !== user.id)}
                initials={initials(name)}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="heading">{name}</AppText>
                <AppText variant="caption" numberOfLines={1} color={C.muted}>
                  {last
                    ? assessmentLabel(last.text)
                    : "Ariza tafsilotlarini kelishing"}
                </AppText>
              </View>
              <Icon name="chevron-right" />
            </View>
          </Card>
        );
      })}
      {!ids.length ? (
        <EmptyState
          title="Hali suhbat yo‘q"
          subtitle="Repetitor profilidagi «Ustozga yozish» tugmasi bilan suhbat boshlang."
          icon="message-circle"
        />
      ) : null}
    </Screen>
  );
}
export function ConversationScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Conversation">) {
  const navigation = useAppNavigation(),
    { user, market, messages, sendMessage } = useApp();
  const [text, setText] = useState(""),
    action = useAction(),
    id = route.params.id;
  const [, student, tutor] = id.split(":"),
    valid = id.startsWith("dm:") && (user.id === student || user.id === tutor);
  const list = messages[id] || [],
    name = conversationName(id, user.id, market.users);
  return (
    <Screen
      bottom={
        valid ? (
          <>
            <Feedback {...action} />
            <Field
              label="Xabar yozing"
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
            />
            <Button
              title="Xabarni yuborish"
              icon="send"
              disabled={!text.trim()}
              loading={action.busy}
              onPress={() =>
                action.run(
                  () => sendMessage(id, text),
                  () => setText(""),
                )
              }
            />
          </>
        ) : undefined
      }
    >
      <Header title={name} onBack={() => navigation.goBack()} />
      <AppText variant="caption" color={C.muted}>
        Dars va guruh bo‘yicha suhbat
      </AppText>
      {!valid ? (
        <EmptyState
          title="Suhbat mavjud emas"
          subtitle="O‘z akkauntingizdagi suhbatni oching."
        />
      ) : !list.length ? (
        <EmptyState
          title="Suhbatni boshlang"
          subtitle="Maqsadingiz va dars vaqti haqida yozishingiz mumkin."
          icon="message-circle"
        />
      ) : (
        list.map((m) => (
          <View
            key={m.id}
            style={{
              alignSelf: m.mine ? "flex-end" : "flex-start",
              maxWidth: "90%",
              padding: 14,
              borderRadius: 18,
              gap: 5,
              backgroundColor: m.mine ? C.navy : C.white,
            }}
          >
            <AssessmentMessage message={m} />
            <AppText
              variant="caption"
              color={m.mine ? "#CBD7E5" : C.muted}
              style={{ alignSelf: "flex-end" }}
            >
              {m.time}
            </AppText>
          </View>
        ))
      )}
    </Screen>
  );
}
export function NotificationsScreen() {
  const navigation = useAppNavigation(),
    { notifications, command, refresh, user } = useApp(),
    action = useAction();
  return (
    <Screen>
      <Header title="Bildirishnomalar" onBack={() => navigation.goBack()} />
      <View style={uiStyles.row}>
        <Button
          title="Yangilash"
          variant="soft"
          loading={action.busy}
          onPress={() => action.run(refresh)}
        />
        <Button
          title="O‘qildi deb belgilash"
          variant="outline"
          disabled={!notifications.some((n) => !n.read)}
          onPress={() =>
            action.run(() => command({ type: "read-notifications" }))
          }
          style={{ flex: 1 }}
        />
      </View>
      <Feedback {...action} />
      {notifications.map((n) => (
        <Card key={n.id} style={{ borderColor: n.read ? C.border : C.gold }}>
          <View style={uiStyles.row}>
            <Icon name="bell" color={n.read ? C.muted : C.navy} />
            <AppText variant="heading" style={{ flex: 1 }}>
              {n.title}
            </AppText>
            {!n.read ? (
              <View
                style={{
                  height: 8,
                  width: 8,
                  borderRadius: 4,
                  backgroundColor: C.gold,
                }}
              />
            ) : null}
          </View>
          <AppText color={C.muted}>{n.body}</AppText>
          <AppText variant="caption" color={C.muted}>
            {dateLabel(n.createdAt)} · {timeLabel(n.createdAt)}
          </AppText>
          {n.offeringId && user.role === "student" ? (
            <Button
              title="Darsni ko‘rish"
              variant="soft"
              onPress={() => navigation.popTo("Main", { screen: "Lessons" })}
            />
          ) : null}
        </Card>
      ))}
      {!notifications.length ? (
        <EmptyState
          title="Yangi xabar yo‘q"
          subtitle="Profil va ariza bo‘yicha javoblar shu yerga keladi."
          icon="bell"
        />
      ) : null}
    </Screen>
  );
}
export function ReviewScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Review">) {
  const navigation = useAppNavigation(),
    { command, market } = useApp(),
    action = useAction();
  const [rating, setRating] = useState(5),
    [text, setText] = useState("");
  const session = market.sessions.find((s) => s.id === route.params.sessionId);
  return (
    <Screen
      bottom={
        <Button
          title="Fikrni yuborish"
          loading={action.busy}
          onPress={() =>
            action.run(
              () =>
                command({
                  type: "review",
                  sessionId: route.params.sessionId,
                  rating,
                  text,
                }),
              () => navigation.goBack(),
            )
          }
        />
      }
    >
      <Header
        title="Dars haqidagi fikringiz"
        onBack={() => navigation.goBack()}
      />
      <AppText variant="heading">{session?.title || "Dars"}</AppText>
      <AppText color={C.muted}>
        Qatnashgan darsingiz haqidagi tajribangizni ulashing.
      </AppText>
      <View style={uiStyles.wrap}>
        {[1, 2, 3, 4, 5].map((v) => (
          <Chip
            key={v}
            label={`★ ${v}`}
            selected={rating === v}
            onPress={() => setRating(v)}
          />
        ))}
      </View>
      <Field
        label="Fikringiz"
        multiline
        maxLength={1000}
        placeholder="Nima foydali bo‘ldi?"
        value={text}
        onChangeText={setText}
        style={{ minHeight: 140 }}
      />
      <Feedback {...action} />
    </Screen>
  );
}
export function ProfileScreen() {
  const {
      user,
      mode,
      market,
      tutors,
      favorites,
      signOut,
      storageError,
      syncError,
    } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const [saved, setSaved] = useState(false),
    [logout, setLogout] = useState(false);
  const tutor = market.tutorProfiles.find((p) => p.userId === user.id);
  const learning = useLearning();
  const stats = learningStats(learning.data);
  return (
    <Screen
      top={
        user.role === "student" ? (
          <OqiHeader />
        ) : user.role === "tutor" ? (
          <TeacherHeader />
        ) : undefined
      }
    >
      <Header
        title="Profil"
        right={
          <Button
            title="Tahrirlash"
            variant="soft"
            onPress={() => navigation.navigate("EditProfile")}
            style={{ minHeight: 44 }}
          />
        }
      />
      <Card style={{ alignItems: "center", padding: 24 }}>
        <AvatarEditor />
        <AppText variant="title">{user.name || "Jasurbek Rahimov"}</AppText>
        <AppText
          variant="caption"
          color={C.muted}
          style={{ textAlign: "center" }}
        >
          Abituriyent & Matematika ishqibozi
        </AppText>
        <Chip
          label={
            user.role === "student"
              ? "O‘quvchi Pro ⭐"
              : user.role === "tutor"
                ? "Repetitor Pro"
                : "Moderator"
          }
          tone="gold"
        />
        <AppText variant="caption" color={C.muted}>
          📍 {user.area || "Chilonzor"}, {user.city || "Toshkent"}
        </AppText>
      </Card>
      <Button
        title="Ruxsatlar va xotira"
        icon="shield"
        variant="soft"
        onPress={() => navigation.navigate("Permissions")}
      />
      {user.role === "tutor" ? (
        <>
          <Button
            title="Dars manzilini belgilash"
            icon="map-pin"
            variant="soft"
            onPress={() => navigation.navigate("TutorLocation")}
          />
          <TeacherProfileSummary />
        </>
      ) : null}
      {user.role === "student" ? (
        <>
          <View style={uiStyles.row}>
            {[
              { title: "Umumiy ball", value: `⚡ ${stats.xp || 1450} XP` },
              {
                title: "Bilim Radari",
                value: `🎯 ${stats.score !== null ? `${stats.score}%` : "84%"}`,
              },
              {
                title: "Uzluksiz o‘qish",
                value: `🔥 ${stats.streak || 14} kun`,
              },
            ].map((item) => (
              <Card
                key={item.title}
                style={{ flex: 1, paddingHorizontal: 4, alignItems: "center" }}
              >
                <AppText
                  variant="label"
                  style={{ color: C.navy, fontFamily: font.bold }}
                >
                  {item.value}
                </AppText>
                <AppText
                  variant="caption"
                  color={C.muted}
                  style={{ fontSize: 10, textAlign: "center" }}
                >
                  {item.title}
                </AppText>
              </Card>
            ))}
          </View>
          <Card>
            <AppText variant="heading">Yutuqlar va Nishonlar</AppText>
            <View style={uiStyles.wrap}>
              <Chip icon="award" label="🏆 Olimpiada 1-bosqich" tone="gold" />
              <Chip icon="zap" label="⚡ Radar Chempioni (80%+)" tone="green" />
              <Chip
                icon="book-open"
                label="📚 Kitobxon Zakovat a’zosi"
                tone="purple"
              />
            </View>
            <Button
              title="Bilim radarimni ko‘rish →"
              variant="soft"
              icon="target"
              onPress={() => navigation.navigate("Main", { screen: "Radar" })}
            />
          </Card>
          <Button
            title="Suhbatlarim"
            icon="message-circle"
            variant="outline"
            onPress={() => navigation.navigate("Chats")}
          />
          {learning.data.followedClubs.length ? (
            <Card>
              <AppText variant="heading">Kuzatayotgan klublarim</AppText>
              {clubs
                .filter((c) => learning.data.followedClubs.includes(c.id))
                .map((c) => (
                  <View key={c.id} style={uiStyles.row}>
                    <Icon name={c.icon} size={16} color={c.color} />
                    <AppText variant="caption">{c.title}</AppText>
                  </View>
                ))}
            </Card>
          ) : null}
          <Card>
            <AppText variant="heading">O‘qish maqsadi</AppText>
            <AppText>{user.goal}</AppText>
            <View style={uiStyles.wrap}>
              {user.interests.map((s) => (
                <Chip key={s} label={s} tone="purple" />
              ))}
            </View>
          </Card>
          <Button
            title={`Saqlanganlar · ${favorites.length}`}
            icon="heart"
            variant="outline"
            onPress={() => setSaved((v) => !v)}
          />
          {saved
            ? tutors
                .filter((t) => favorites.includes(t.id))
                .map((t) => <TutorCard key={t.id} tutor={t} />)
            : null}
          {saved && !favorites.length ? (
            <AppText color={C.muted}>
              Yoqtirgan ustozlaringizni qidiruvdagi yurakcha bilan saqlang.
            </AppText>
          ) : null}
        </>
      ) : user.role === "tutor" ? (
        <Card>
          <Chip
            label={verificationLabel[tutor?.verification || "draft"]}
            tone={tutor?.verification === "approved" ? "green" : "gold"}
          />
          {tutor?.moderationNote ? (
            <AppText color={C.muted}>{tutor.moderationNote}</AppText>
          ) : null}
          <Button
            title="Repetitor profilini tahrirlash"
            variant="soft"
            onPress={() => navigation.navigate("TutorProfile")}
          />
        </Card>
      ) : null}
      <Button
        title="Bildirishnomalar"
        icon="bell"
        variant="outline"
        onPress={() => navigation.navigate("Notifications")}
      />
      {user.role === "tutor" ? <TeacherFinance /> : null}
      <AppText variant="caption" color={C.muted}>
        {mode === "demo"
          ? "Sinov rejimi · ma’lumotlar shu qurilmada saqlanadi. Boshqa rolni tekshirish uchun hisobdan chiqib, o‘sha akkaunt emaili bilan kiring."
          : "Supabase ulangan · ma’lumotlar akkauntingiz bilan sinxronlanadi."}
      </AppText>
      <Feedback
        error={
          storageError
            ? "Ma’lumotni qurilmaga saqlashda xato. Sahifani yopishdan oldin saqlash imkoniyatini tekshiring."
            : syncError || action.error
        }
      />
      {logout ? (
        <Card>
          <AppText variant="heading">Hisobdan chiqasizmi?</AppText>
          <View style={uiStyles.row}>
            <Button
              title="Qolish"
              variant="outline"
              onPress={() => setLogout(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Chiqishni tasdiqlash"
              loading={action.busy}
              onPress={() => action.run(signOut)}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      ) : (
        <Button
          title="Hisobdan chiqish"
          icon="log-out"
          variant="soft"
          onPress={() => setLogout(true)}
        />
      )}
    </Screen>
  );
}
export function EditProfileScreen() {
  const { user, command } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const [name, setName] = useState(user.name),
    [city, setCity] = useState(user.city),
    [area, setArea] = useState(user.area),
    [goal, setGoal] = useState(user.goal),
    [interests, setInterests] = useState(user.interests);
  return (
    <Screen
      bottom={
        <Button
          title="O‘zgarishlarni saqlash"
          loading={action.busy}
          onPress={() =>
            action.run(
              () =>
                command({
                  type: "profile",
                  profile: { name, city, area, goal, interests },
                }),
              () => navigation.goBack(),
            )
          }
        />
      }
    >
      <Header title="Profilni tahrirlash" onBack={() => navigation.goBack()} />
      <Card>
        <AvatarEditor />
      </Card>
      <Field label="Ism va familiya" value={name} onChangeText={setName} />
      <Field label="Shahar" value={city} onChangeText={setCity} />
      <Field label="Hudud" value={area} onChangeText={setArea} />
      <View style={uiStyles.wrap}>
        {AREAS.slice(0, 3).map((v) => (
          <Chip
            key={v}
            label={v}
            selected={area === v}
            onPress={() => setArea(v)}
          />
        ))}
      </View>
      {user.role === "student" ? (
        <>
          <AppText variant="heading">Fanlar</AppText>
          <View style={uiStyles.wrap}>
            {SUBJECTS.map((v) => (
              <Chip
                key={v}
                label={v}
                selected={interests.includes(v)}
                onPress={() =>
                  setInterests((p) =>
                    p.includes(v) ? p.filter((s) => s !== v) : [...p, v],
                  )
                }
              />
            ))}
          </View>
          <AppText variant="heading">O‘qish maqsadi</AppText>
          <View style={uiStyles.wrap}>
            {GOALS.map((v) => (
              <Chip
                key={v}
                label={v}
                selected={goal === v}
                onPress={() => setGoal(v)}
              />
            ))}
          </View>
        </>
      ) : null}
      <Feedback {...action} />
    </Screen>
  );
}
