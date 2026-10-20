import {
  FilterPanel,
  FilterSelect,
  FilterOptions,
  filterChoices,
} from "../components/FilterControls";
import React, { useState, useRef } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppNavigation, type RootStackParamList } from "../navigation";
import { useApp } from "../state/AppContext";
import { useTeacher } from "../state/TeacherContext";
import { CLUB_MARKER, isClubOffering } from "../state/teacher";
import {
  dateLabel,
  nextDates,
  timeLabel,
  toLessonTime,
  uid,
  dmId,
} from "../state/domain";
import { rooms, formatPrice, type StudyRoom } from "../data/catalog";
import { diagnostics } from "../data/learning";
import {
  encodeAssessment,
  parseAssessment,
  type TestInvitation,
} from "../state/assessments";
import { matchesSearch } from "../state/learning";
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
import {
  TeacherHeader,
  TeacherGroupCard,
} from "../components/TeacherComponents";
import { Feedback, useAction } from "../components/feedback";
import { RoomIllustration } from "../components/Illustrations";
import { C, font } from "../theme";

function RoomCard({ room }: { room: StudyRoom }) {
  const navigation = useAppNavigation();
  return (
    <Card>
      <RoomIllustration height={110} />
      <View style={uiStyles.between}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading">{room.name || room.title}</AppText>
          <View style={uiStyles.row}>
            <Icon name="map-pin" size={14} color={C.muted} />
            <AppText variant="caption" color={C.muted} style={{ flex: 1 }}>
              {room.address || room.location}
            </AppText>
          </View>
        </View>
        <Chip label={`${room.capacity} o‘rin`} tone="purple" />
      </View>

      <View style={uiStyles.row}>
        <AppText
          variant="caption"
          style={{ fontFamily: font.bold, color: C.navy }}
        >
          ⭐ {room.rating || 4.9} ({room.reviews || 84} baho)
        </AppText>
        <AppText variant="caption" color={C.muted}>
          • {room.distance || "0.8 km"}
        </AppText>
      </View>

      <View style={uiStyles.wrap}>
        {room.amenities.map((a) => (
          <Chip
            key={a}
            label={a}
            icon={a === "Wi-Fi" || a.includes("Wi-Fi") ? "wifi" : "monitor"}
          />
        ))}
      </View>

      {room.slots?.length ? (
        <View style={{ gap: 4 }}>
          <AppText variant="caption" color={C.muted}>
            Bo‘sh vaqt slotlari:
          </AppText>
          <View style={uiStyles.wrap}>
            {room.slots.map((s) => (
              <Chip key={s} label={s} icon="clock" />
            ))}
          </View>
        </View>
      ) : null}

      <View style={[uiStyles.between, { flexWrap: "wrap", marginTop: 4 }]}>
        <View>
          <AppText variant="heading">
            {formatPrice(room.pricePerHour || room.price)}
          </AppText>
          <AppText variant="caption" color={C.muted}>
            soatiga · to‘liq jihozlangan
          </AppText>
        </View>
        <Button
          title="Reja tuzish"
          accessibilityLabel={`${room.title}: xona rejasini tuzish`}
          variant="gold"
          icon="calendar"
          onPress={() => navigation.navigate("PlanRoom", { roomId: room.id })}
        />
      </View>
    </Card>
  );
}
export function TeacherRoomsScreen() {
  const { data, error, removeRoomPlan } = useTeacher();
  const { market } = useApp();
  const action = useAction();
  const [district, setDistrict] = useState("Barchasi"),
    [capacity, setCapacity] = useState(0),
    [view, setView] = useState("Ro‘yxat"),
    [activeId, setActiveId] = useState("");
  const list = rooms.filter(
    (r) =>
      (district === "Barchasi" || (r.district || r.area) === district) &&
      r.capacity >= capacity,
  );
  const selected = list.find((r) => r.id === activeId) || list[0];
  return (
    <Screen top={<TeacherHeader />}>
      <Header title="O‘quv xonalari" />
      <AppText variant="caption" color={C.muted}>
        Guruh darslari, seminar va olimpiadalar uchun darsxonalarni bron qilish
        va boshqarish.
      </AppText>

      <FilterOptions
        label="Ko‘rinish"
        options={filterChoices(["Ro‘yxat", "Xarita"])}
        value={view}
        onChange={setView}
      />
      <FilterPanel
        count={Number(district !== "Barchasi") + Number(capacity !== 0)}
        onReset={() => {
          setDistrict("Barchasi");
          setCapacity(0);
        }}
      >
        <FilterSelect
          label="Hudud"
          value={district}
          onChange={setDistrict}
          options={filterChoices([
            "Barchasi",
            ...new Set(rooms.map((r) => r.district || r.area)),
          ])}
        />
        <FilterOptions
          label="Xona sig‘imi"
          value={String(capacity)}
          onChange={(v) => setCapacity(Number(v))}
          options={[0, 10, 16, 25].map((n) => ({
            value: String(n),
            label: n ? `Kamida ${n} o‘rin` : "Barcha sig‘imlar",
          }))}
        />
      </FilterPanel>
      <AppText variant="caption" color={C.muted}>
        {list.length} xona topildi · {data.roomPlans.length} saqlangan reja
      </AppText>
      {view === "Xarita" && list.length ? (
        <Card>
          <AppText variant="caption" color={C.muted}>
            Toshkent hududlari sxemasi · aniq GPS emas
          </AppText>
          <View style={{ height: 210, borderRadius: 18, overflow: "hidden" }}>
            <Svg viewBox="0 0 340 210" width="100%" height="100%">
              <Rect width="340" height="210" fill="#E9EFF8" />
              <Path
                d="M0 40Q60 0 100 50L80 110H0Z M260 150Q310 110 340 180V210H250Z"
                fill="#C8EAD3"
              />
              <Line
                x1="0"
                y1="90"
                x2="340"
                y2="135"
                stroke="white"
                strokeWidth="8"
              />
              <Line
                x1="100"
                y1="0"
                x2="170"
                y2="210"
                stroke="white"
                strokeWidth="7"
              />
              <Path
                d="M0 190Q170 150 260 60T350 10"
                fill="none"
                stroke="#A3CFF2"
                strokeWidth="12"
              />
              <Circle
                cx="170"
                cy="105"
                r="60"
                fill="none"
                stroke={C.accent}
                strokeDasharray="4 4"
              />
            </Svg>
            {list.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={`${r.title}: xarita belgisi`}
                accessibilityState={{ selected: selected.id === r.id }}
                onPress={() => setActiveId(r.id)}
                style={{
                  position: "absolute",
                  left: `${8 + (rooms.findIndex((room) => room.id === r.id) % 3) * 31}%`,
                  top: `${10 + Math.floor(rooms.findIndex((room) => room.id === r.id) / 3) * (58 / Math.max(1, Math.ceil(rooms.length / 3) - 1))}%`,
                  width: 44,
                  height: 44,
                  borderWidth: 3,
                  borderColor: C.white,
                  borderRadius: 16,
                  backgroundColor: r.id === selected.id ? C.accent : C.navy,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Icon name="grid" color={C.white} size={21} />
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}
      {(view === "Xarita" ? (selected ? [selected] : []) : list).map((r) => (
        <RoomCard key={r.id} room={r} />
      ))}
      {!list.length ? (
        <>
          <EmptyState
            title="Xona topilmadi"
            subtitle="Hudud yoki sig‘im filtrini o‘zgartiring."
            icon="grid"
          />
          <Button
            title="Xona filtrlarini tozalash"
            variant="soft"
            onPress={() => {
              setDistrict("Barchasi");
              setCapacity(0);
            }}
          />
        </>
      ) : null}
      <AppText variant="heading">Saqlangan xona rejalarim</AppText>
      {data.roomPlans.map((p) => (
        <Card key={p.id}>
          <Chip label="Reja · tasdiqlanmagan" tone="purple" />
          <AppText variant="heading">
            {rooms.find((r) => r.id === p.roomId)?.title || "Xona"}
          </AppText>
          <AppText variant="caption" color={C.muted}>
            {market.offerings.find((g) => g.id === p.offeringId)?.title ||
              "Oldingi guruh"}
          </AppText>
          <AppText>
            {dateLabel(p.startsAt)} · {timeLabel(p.startsAt)}–
            {timeLabel(p.endsAt)}
          </AppText>
          <AppText variant="label">
            {formatPrice(p.estimatedCost)} · taxminiy
          </AppText>
          <Button
            title="Rejani olib tashlash"
            variant="outline"
            loading={action.busy}
            onPress={() => action.run(() => removeRoomPlan(p.id))}
          />
        </Card>
      ))}
      {!data.roomPlans.length ? (
        <AppText variant="caption" color={C.muted}>
          Hozircha xona rejasi saqlanmagan.
        </AppText>
      ) : null}
      <Feedback error={error || action.error} />
    </Screen>
  );
}
export function PlanRoomScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "PlanRoom">) {
  const { market, user } = useApp();
  const { addRoomPlan, ready } = useTeacher();
  const navigation = useAppNavigation();
  const action = useAction();
  const room = rooms.find((r) => r.id === route.params.roomId);
  const groups = market.offerings.filter(
    (g) => g.tutorId === user.id && g.mode === "Oflayn",
  );
  const [offeringId, setOfferingId] = useState(groups[0]?.id || ""),
    [date, setDate] = useState(nextDates(1)[0]),
    [time, setTime] = useState("14:00"),
    [hours, setHours] = useState("2");
  if (!room)
    return (
      <Screen>
        <Header title="Xona rejasi" onBack={() => navigation.goBack()} />
        <EmptyState
          title="Xona topilmadi"
          subtitle="Katalogdan boshqa xonani tanlang."
        />
      </Screen>
    );
  return (
    <Screen
      bottom={
        <Button
          title="Xona rejasini saqlash"
          variant="gold"
          disabled={!ready || !groups.length}
          loading={action.busy}
          onPress={() =>
            action.run(
              () =>
                addRoomPlan({
                  roomId: room.id,
                  offeringId,
                  date,
                  time,
                  hours: Number(hours),
                }),
              () => navigation.goBack(),
            )
          }
        />
      }
    >
      <Header title="Xona rejasini tuzish" onBack={() => navigation.goBack()} />
      <AppText variant="title">{room.title}</AppText>
      <AppText color={C.muted}>
        {room.location} · {room.capacity} o‘rin
      </AppText>
      <AppText variant="label">Qaysi guruh uchun?</AppText>
      <View style={uiStyles.wrap}>
        {groups.map((g) => (
          <Chip
            key={g.id}
            label={`${g.title} (${g.capacity} o‘rin)`}
            selected={offeringId === g.id}
            onPress={() => setOfferingId(g.id)}
          />
        ))}
      </View>
      {!groups.length ? (
        <EmptyState
          title="Oflayn guruh yo‘q"
          subtitle="Avval oflayn dars yoki guruh yarating."
        />
      ) : null}
      <Field
        label="Xona rejasi sanasi (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />
      <Field
        label="Xona rejasi vaqti (HH:MM)"
        value={time}
        onChangeText={setTime}
      />
      <Field
        label="Xona davomiyligi (soat)"
        value={hours}
        onChangeText={setHours}
        keyboardType="number-pad"
      />
      <Card style={{ backgroundColor: C.greenSoft }}>
        <AppText variant="heading">
          {formatPrice(room.price * (Number(hours) || 0))}
        </AppText>
        <AppText variant="caption" color={C.muted}>
          Taxminiy xarajat. Narx va bo‘sh vaqt xona egasi bilan tasdiqlanadi.
          Saqlash xonani band qilmaydi.
        </AppText>
      </Card>
      <Feedback {...action} />
    </Screen>
  );
}
export function TeacherClubsScreen() {
  const { market, user, requests } = useApp();
  const navigation = useAppNavigation();
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("Barchasi");
  const profile = market.tutorProfiles.find((p) => p.userId === user.id);
  const userClubs = market.offerings.filter(
    (g) =>
      g.tutorId === user.id &&
      isClubOffering(g) &&
      (status === "Barchasi" ||
        (status === "Ochiq" && g.published) ||
        (status === "Yopiq" && !g.published)) &&
      matchesSearch(`${g.title} ${g.subject}`, query),
  );
  return (
    <Screen top={<TeacherHeader />}>
      <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="title">O‘quv Klublari & Tadbirlarim</AppText>
          <AppText variant="caption" color={C.muted}>
            O‘z hamjamiyatingizni yarating, ochiq master-klasslar va diagnostik
            olimpiadalar o‘tkazing.
          </AppText>
        </View>
        <Button
          title="+ Yangi klub ochish"
          variant="gold"
          disabled={profile?.verification !== "approved"}
          onPress={() => navigation.navigate("CreateClub")}
        />
      </View>

      <Field
        accessibilityLabel="Klublarimni qidirish"
        placeholder="Klub yoki tadbir nomini qidiring"
        icon="search"
        value={query}
        onChangeText={setQuery}
      />

      <FilterOptions
        label="Klub holati"
        value={status}
        onChange={setStatus}
        options={filterChoices(["Barchasi", "Ochiq", "Yopiq"])}
      />
      <AppText variant="caption" color={C.muted}>
        {userClubs.length} ta klub
      </AppText>
      {userClubs.map((g) => (
        <View key={g.id} style={{ gap: 8 }}>
          <TeacherGroupCard group={g} />
          <Button
            title={`Klub arizalari · ${requests.filter((r) => r.groupId === g.id && r.status === "pending").length}`}
            icon="inbox"
            variant="outline"
            onPress={() =>
              navigation.navigate("Applications", { offeringId: g.id })
            }
          />
        </View>
      ))}
      {!userClubs.length ? (
        <EmptyState
          title="Klub topilmadi"
          subtitle="Yangi klub oching yoki qidiruv va holat filtrini o‘zgartiring."
          icon="award"
        />
      ) : null}
    </Screen>
  );
}
export function CreateClubScreen() {
  const { user, market, command } = useApp();
  const navigation = useAppNavigation();
  const action = useAction();
  const profile = market.tutorProfiles.find((p) => p.userId === user.id);
  const [title, setTitle] = useState(""),
    [kind, setKind] = useState("Doimiy klub"),
    [subject, setSubject] = useState(profile?.subjects[0] || ""),
    [mode, setMode] = useState(profile?.modes[0] || "Onlayn"),
    [location, setLocation] = useState(""),
    [capacity, setCapacity] = useState("12"),
    [price, setPrice] = useState("0"),
    [date, setDate] = useState(nextDates(1)[0]),
    [time, setTime] = useState("14:00"),
    [minutes, setMinutes] = useState("90");
  return (
    <Screen
      bottom={
        <Button
          title="Klubni e’lon qilish"
          variant="gold"
          icon="send"
          disabled={profile?.verification !== "approved"}
          loading={action.busy}
          onPress={() =>
            action.run(
              async () => {
                if (
                  user.role !== "tutor" ||
                  profile?.verification !== "approved"
                )
                  throw new Error("Tasdiqlangan ustoz profili kerak.");
                if (
                  !Number.isInteger(Number(minutes)) ||
                  Number(minutes) < 15 ||
                  Number(minutes) > 240
                )
                  throw new Error("Davomiylik 15–240 daqiqa bo‘lsin.");
                return command({
                  type: "offering",
                  offering: {
                    title,
                    subject,
                    type: "group",
                    capacity: Number(capacity),
                    price: Number(price),
                    mode,
                    area: user.area,
                    location,
                    days: kind,
                    benefits: [CLUB_MARKER, kind],
                    sessions: [toLessonTime(date, time, Number(minutes))],
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
        title="Yangi klub yoki tadbir"
        onBack={() => navigation.goBack()}
      />
      <Field
        label="Klub yoki tadbir nomi"
        placeholder="Masalan, English Speaking Society"
        value={title}
        onChangeText={setTitle}
      />
      <View style={uiStyles.wrap}>
        {["Doimiy klub", "Olimpiada", "Ochiq masterklass"].map((k) => (
          <Chip
            key={k}
            label={k}
            selected={kind === k}
            onPress={() => setKind(k)}
          />
        ))}
      </View>
      <AppText variant="label">Fan</AppText>
      <View style={uiStyles.wrap}>
        {profile?.subjects.map((s) => (
          <Chip
            key={s}
            label={s}
            selected={subject === s}
            onPress={() => setSubject(s)}
          />
        ))}
      </View>
      <View style={uiStyles.wrap}>
        {profile?.modes.map((m) => (
          <Chip
            key={m}
            label={m}
            selected={mode === m}
            onPress={() => setMode(m)}
          />
        ))}
      </View>
      <Field
        label="Klub manzili yoki onlayn havola"
        value={location}
        onChangeText={setLocation}
      />
      <Field
        label="Klub o‘rinlari"
        keyboardType="number-pad"
        value={capacity}
        onChangeText={setCapacity}
      />
      <Field
        label="Klub narxi (so‘m, bepul uchun 0)"
        keyboardType="number-pad"
        value={price}
        onChangeText={setPrice}
      />
      <Field
        label="Klub sanasi (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />
      <Field
        label="Klub boshlanishi (HH:MM)"
        value={time}
        onChangeText={setTime}
      />
      <Field
        label="Klub davomiyligi (daqiqa)"
        keyboardType="number-pad"
        value={minutes}
        onChangeText={setMinutes}
      />
      <AppText variant="caption" color={C.muted}>
        Birinchi uchrashuv sanasini belgilang. Keyingi uchrashuvlar uchun
        alohida jadval kerak. Qatnashchilar faqat ariza tasdiqlangach
        qo‘shiladi.
      </AppText>
      <Feedback {...action} />
    </Screen>
  );
}
export function AssignDiagnosticScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "AssignDiagnostic">) {
  const { market, user, sendMessage } = useApp();
  const navigation = useAppNavigation();
  const action = useAction();
  const profile = market.tutorProfiles.find((p) => p.userId === user.id);
  const groups = market.offerings.filter((g) => g.tutorId === user.id);
  const [offeringId, setOfferingId] = useState(
      route.params?.offeringId || groups[0]?.id || "",
    ),
    [testId, setTestId] = useState(
      diagnostics.find((t) => profile?.subjects.includes(t.subject))?.id ||
        diagnostics[0].id,
    ),
    [title, setTitle] = useState("Qisqa bilim diagnostikasi"),
    [batch] = useState(() => uid("diagnostic")),
    [sent, setSent] = useState(0),
    [finished, setFinished] = useState(false);
  const inviteIds = useRef(new Map<string, string>());
  const delivered = useRef(new Set<string>());
  const [recipient, setRecipient] = useState(route.params?.studentId || "all");
  const allMembers = [
    ...new Set(
      market.enrollments
        .filter((e) => e.active && e.offeringId === offeringId)
        .map((e) => e.studentId),
    ),
  ];
  const members = allMembers.filter(
    (id) => recipient === "all" || id === recipient,
  );
  const test = diagnostics.find((t) => t.id === testId)!;
  return (
    <Screen>
      <Header
        title="O‘quvchilarga test yuborish"
        onBack={() => navigation.goBack()}
      />
      <AppText color={C.muted}>
        Test chat orqali har bir faol o‘quvchiga yuboriladi. O‘quvchi natijani
        o‘zi ulashadi.
      </AppText>
      <Field
        label="Test topshirig‘i nomi"
        value={title}
        onChangeText={setTitle}
        editable={!action.busy && !finished && sent === 0}
        maxLength={120}
      />
      <FilterSelect
        label="Guruhni tanlang"
        value={offeringId}
        onChange={(id) => {
          setOfferingId(id);
          setRecipient("all");
          setSent(0);
        }}
        disabled={action.busy || finished || sent > 0}
        options={groups.map((g) => ({ value: g.id, label: g.title }))}
      />
      <FilterSelect
        label="Kimga yuboriladi"
        value={recipient}
        onChange={(id) => {
          setRecipient(id);
          setSent(0);
        }}
        disabled={action.busy || finished || sent > 0}
        options={[
          {
            value: "all",
            label: `Barcha faol o‘quvchilar · ${allMembers.length}`,
          },
          ...allMembers.map((id) => ({
            value: id,
            label:
              market.users.find((u) => u.id === id)?.name || "Ism kiritilmagan",
          })),
        ]}
      />
      <FilterSelect
        label="Testni tanlang"
        value={testId}
        onChange={(id) => {
          setTestId(id);
          setSent(0);
        }}
        disabled={action.busy || finished || sent > 0}
        options={diagnostics.map((t) => ({
          value: t.id,
          label: `${t.title} · ${t.questions.length} savol`,
        }))}
      />
      <Card>
        <AppText variant="heading">{members.length} faol o‘quvchi</AppText>
        <AppText variant="caption" color={C.muted}>
          {test.questions.length} savol · taxminan {test.minutes} daqiqa.
          Avvaldan band o‘rinlar haqiqiy o‘quvchi akkaunti hisoblanmaydi.
        </AppText>
        <AppText variant="caption" color={C.green}>
          {sent}/{members.length} ta chatga yuborildi
        </AppText>
      </Card>
      <Button
        title={
          finished
            ? "Test topshirig‘i yuborildi"
            : "Testni o‘quvchilarga yuborish"
        }
        icon={finished ? "check-circle" : "send"}
        variant="gold"
        disabled={
          finished || !members.length || profile?.verification !== "approved"
        }
        loading={action.busy}
        onPress={() =>
          action.run(
            async () => {
              if (profile?.verification !== "approved")
                throw new Error("Tasdiqlangan ustoz profili kerak.");
              if (title.trim().length < 3)
                throw new Error("Topshiriq nomini kiriting.");
              let count = 0;
              for (const studentId of members) {
                const invite: TestInvitation = {
                  kind: "invite",
                  id: (() => {
                    const key = `${offeringId}:${testId}:${studentId}`;
                    if (!inviteIds.current.has(key))
                      inviteIds.current.set(
                        key,
                        `${batch}:${inviteIds.current.size}`,
                      );
                    return inviteIds.current.get(key)!;
                  })(),
                  tutorId: user.id,
                  studentId,
                  offeringId,
                  testId,
                  title: title.trim(),
                };
                const exists = market.messages.some((m) => {
                  const p = parseAssessment(m.text);
                  return (
                    m.senderId === user.id &&
                    p?.kind === "invite" &&
                    p.id === invite.id
                  );
                });
                if (!exists && !delivered.current.has(invite.id)) {
                  await sendMessage(
                    dmId(studentId, user.id),
                    encodeAssessment(invite),
                  );
                  delivered.current.add(invite.id);
                }
                count++;
                setSent(count);
              }
              setFinished(true);
            },
            () =>
              action.setSuccess(
                "Topshiriq yuborildi. Natijalar ulashilgach tahlil panelida ko‘rinadi.",
              ),
          )
        }
      />
      <Feedback {...action} />
      {!groups.length ? (
        <EmptyState
          title="Guruh hali yo‘q"
          subtitle="Avval guruh yarating va o‘quvchilar arizalarini tasdiqlang."
        />
      ) : !members.length ? (
        <EmptyState
          title="Faol o‘quvchi yo‘q"
          subtitle="O‘quvchilar arizalari tasdiqlangach test yuborish mumkin."
        />
      ) : null}
    </Screen>
  );
}
