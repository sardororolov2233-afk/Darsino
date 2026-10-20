import {
  FilterPanel,
  FilterSelect,
  FilterOptions,
  filterChoices,
} from "../components/FilterControls";
import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
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
import { SUBJECTS, AREAS } from "../components/TutorForm";
import { useAppNavigation, type RootStackParamList } from "../navigation";
import { useApp } from "../state/AppContext";
import { defaultFilters } from "../state/model";
import {
  dateLabel,
  dmId,
  nextDates,
  timeLabel,
  toLessonTime,
  type Filters,
  type Offering,
} from "../state/domain";
import type { Tutor } from "../data/catalog";
import { C } from "../theme";
import { UserAvatar } from "../components/UserAvatar";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
export const money = (value: number) =>
  value === 0
    ? "Bepul"
    : `${new Intl.NumberFormat("uz-UZ").format(value)} so‘m`;
export function filterTutors(catalog: Tutor[], filters: Filters, query = "") {
  const q = query.trim().toLocaleLowerCase();
  return catalog.filter(
    (t) =>
      (filters.subject === "Barchasi" ||
        (t.subjects || [t.subject]).includes(filters.subject)) &&
      (filters.area === "Barcha hududlar" || t.area === filters.area) &&
      (filters.mode === "Barchasi" || t.modes.includes(filters.mode)) &&
      t.price >= filters.minPrice &&
      t.price <= filters.maxPrice &&
      t.rating >= filters.minRating &&
      `${t.name} ${t.subjects?.join(" ") || t.subject} ${t.specialty} ${t.area}`
        .toLocaleLowerCase()
        .includes(q),
  );
}
export function TutorCard({ tutor }: { tutor: Tutor }) {
  const navigation = useAppNavigation();
  const { favorites, toggleFavorite, user } = useApp();
  const action = useAction();
  const saved = favorites.includes(tutor.id);
  return (
    <Card style={{ gap: 12 }}>
      <View style={uiStyles.row}>
        <UserAvatar userId={tutor.id} initials={tutor.initials} size={56} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={[uiStyles.row, { gap: 5 }]}>
            <AppText variant="label" style={{ flexShrink: 1, fontSize: 15 }}>
              {tutor.name}
            </AppText>
            {tutor.verified ? (
              <Icon name="check-circle" color={C.accent} size={15} />
            ) : null}
          </View>
          <AppText variant="caption" color={C.purple}>
            {tutor.subject} · {tutor.specialty}
          </AppText>
          <AppText variant="caption" color={C.muted}>
            {tutor.reviews
              ? `★ ${tutor.rating} · ${tutor.reviews} fikr`
              : "Yangi repetitor"}{" "}
            · {tutor.experience} yil tajriba
          </AppText>
        </View>
        {user.role === "student" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              saved
                ? `${tutor.name}ni saqlanganlardan olib tashlash`
                : `${tutor.name}ni saqlash`
            }
            onPress={() => action.run(() => toggleFavorite(tutor.id))}
            style={{
              padding: 10,
              borderRadius: 13,
              backgroundColor: saved ? C.errorSoft : C.background,
            }}
          >
            <Icon name="heart" color={saved ? C.error : C.muted} size={18} />
          </Pressable>
        ) : null}
      </View>
      <View style={[uiStyles.row, { gap: 5 }]}>
        <Icon name="map-pin" size={13} color={C.muted} />
        <AppText color={C.muted} variant="caption" style={{ flex: 1 }}>
          {tutor.area} · {tutor.modes.join(" / ")}
        </AppText>
      </View>
      <View style={uiStyles.wrap}>
        {tutor.verified ? <Chip label="✓ Tasdiqlangan" tone="green" /> : null}
        <Chip
          label={`#${tutor.specialty.replace(/\s+/g, "_")}`}
          tone="purple"
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          borderTopWidth: 1,
          borderColor: C.border,
          paddingTop: 12,
        }}
      >
        <View
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 150,
            minWidth: 0,
            gap: 1,
          }}
        >
          <AppText variant="heading" color={C.navy} style={{ flexShrink: 1 }}>
            {money(tutor.price)}
          </AppText>
          <AppText variant="caption" color={C.muted}>
            bir dars uchun
          </AppText>
        </View>
        <Button
          title="Profil"
          icon="arrow-up-right"
          variant="gold"
          onPress={() => navigation.navigate("Tutor", { id: tutor.id })}
          style={{ minHeight: 44, flexShrink: 0 }}
        />
      </View>
      <Feedback {...action} />
    </Card>
  );
}
export function TutorsScreen() {
  const { tutors, filters, setFilters, mode } = useApp(),
    navigation = useAppNavigation();
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState("Mosligi");
  const results = useMemo(() => {
    const list = filterTutors(tutors, filters, query);
    return sort === "Arzonroq"
      ? list.sort((a, b) => a.price - b.price)
      : sort === "Reyting"
        ? list.sort((a, b) => b.rating - a.rating)
        : list;
  }, [tutors, filters, query, sort]);
  return (
    <Screen>
      <Header
        title="Ustoz toping"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        right={
          <Pressable
            style={{ padding: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Filtrlarni ochish"
            onPress={() => navigation.navigate("Filters")}
          >
            <Icon name="sliders" />
          </Pressable>
        }
      />
      <Field
        accessibilityLabel="Repetitor qidirish"
        placeholder="Fan, ustoz yoki yo‘nalish"
        icon="search"
        value={query}
        onChangeText={setQuery}
      />
      <View style={uiStyles.wrap}>
        {["Barchasi", ...SUBJECTS].map((s) => (
          <Chip
            key={s}
            label={s}
            selected={filters.subject === s}
            onPress={() => setFilters({ subject: s })}
          />
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <AppText variant="label">{results.length} repetitor</AppText>
        <View style={uiStyles.wrap}>
          {["Mosligi", "Arzonroq", "Reyting"].map((s) => (
            <Chip
              key={s}
              label={s}
              selected={sort === s}
              onPress={() => setSort(s)}
            />
          ))}
        </View>
      </View>
      {results.map((t) => (
        <TutorCard key={t.id} tutor={t} />
      ))}
      {!results.length ? (
        <>
          <EmptyState
            title="Repetitor topilmadi"
            subtitle="Boshqa fan yoki hududni tanlang. Filtrlarni tozalab ham qidirishingiz mumkin."
          />
          <Button
            title="Filtrlarni tozalash"
            variant="soft"
            onPress={() => {
              setFilters(defaultFilters);
              setQuery("");
            }}
          />
        </>
      ) : null}
      {mode === "demo" ? (
        <AppText variant="caption" color={C.muted}>
          Sinov katalogi · profil va dars ma’lumotlari namuna.
        </AppText>
      ) : null}
    </Screen>
  );
}
export function FiltersScreen() {
  const navigation = useAppNavigation(),
    { filters, setFilters, tutors } = useApp();
  const [draft, setDraft] = useState(filters),
    [min, setMin] = useState(String(filters.minPrice)),
    [max, setMax] = useState(String(filters.maxPrice));
  const action = useAction(),
    value = { ...draft, minPrice: Number(min), maxPrice: Number(max) };
  const count = filterTutors(tutors, value).length;
  return (
    <Screen
      bottom={
        <Button
          title={`${count} natijani ko‘rish`}
          onPress={() =>
            action.run(
              async () => {
                if (
                  !Number.isFinite(value.minPrice) ||
                  !Number.isFinite(value.maxPrice) ||
                  value.minPrice < 0 ||
                  value.minPrice > value.maxPrice
                )
                  throw new Error("Eng kam narx eng ko‘p narxdan oshmasin.");
                setFilters(value);
              },
              () => navigation.goBack(),
            )
          }
        />
      }
    >
      <Header title="Filtrlar" onBack={() => navigation.goBack()} />
      <Card>
        <FilterSelect
          label="Fan"
          options={filterChoices(["Barchasi", ...SUBJECTS])}
          value={draft.subject}
          onChange={(subject) => setDraft((p) => ({ ...p, subject }))}
        />
        <FilterSelect
          label="Hudud"
          options={filterChoices([
            ...new Set([
              "Barcha hududlar",
              draft.area,
              ...AREAS,
              ...tutors.map((t) => t.area),
            ]),
          ])}
          value={draft.area}
          onChange={(area) => setDraft((p) => ({ ...p, area }))}
        />
        <FilterOptions
          label="Dars shakli"
          options={filterChoices(["Barchasi", "Onlayn", "Oflayn"])}
          value={draft.mode}
          onChange={(mode) => setDraft((p) => ({ ...p, mode }))}
        />
      </Card>
      <Card>
        <AppText variant="heading">Bir dars narxi</AppText>
        <View style={uiStyles.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Eng kam (so‘m)"
              keyboardType="number-pad"
              value={min}
              onChangeText={setMin}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Eng ko‘p (so‘m)"
              keyboardType="number-pad"
              value={max}
              onChangeText={setMax}
            />
          </View>
        </View>
      </Card>
      <Card>
        <FilterOptions
          label="Minimal reyting"
          options={[0, 4, 4.5, 4.9].map((n) => ({
            value: String(n),
            label: n ? `${n}+` : "Barchasi",
          }))}
          value={String(draft.minRating)}
          onChange={(n) => setDraft((p) => ({ ...p, minRating: Number(n) }))}
        />
      </Card>
      <Feedback {...action} />
      <Button
        title="Tozalash"
        variant="outline"
        onPress={() => {
          setDraft({ ...defaultFilters });
          setMin(String(defaultFilters.minPrice));
          setMax(String(defaultFilters.maxPrice));
        }}
      />
    </Screen>
  );
}
export function TutorScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Tutor">) {
  const navigation = useAppNavigation(),
    { tutors, groups, market, user, submitRequest, favorites, toggleFavorite } =
      useApp();
  const tutor = tutors.find((t) => t.id === route.params.id),
    profile = market.tutorProfiles.find((p) => p.userId === route.params.id);
  const dates = useMemo(() => nextDates(), []),
    [date, setDate] = useState(dates[0]),
    [time, setTime] = useState(profile?.availability[0] || "18:00");
  const action = useAction();
  const [subject, setSubject] = useState(
    profile?.subjects.find((s) => user.interests.includes(s)) ||
      profile?.subjects[0] ||
      "",
  );
  if (!tutor)
    return (
      <Screen>
        <Header title="Repetitor" onBack={() => navigation.goBack()} />
        <EmptyState
          title="Profil mavjud emas"
          subtitle="Profil tekshiruvda yoki katalogdan olib tashlangan."
        />
      </Screen>
    );
  const ownGroups = groups.filter((g) => g.tutorId === tutor.id),
    student = user.role === "student";
  return (
    <Screen
      bottom={
        student ? (
          <>
            <AppText variant="caption" color={C.muted}>
              Arizangizni ustoz tasdiqlaydi. Individual dars:{" "}
              {money(tutor.price)}.
            </AppText>
            <Button
              title="Individual darsga ariza"
              loading={action.busy}
              onPress={() =>
                action.run(
                  () =>
                    submitRequest({
                      kind: "lesson",
                      tutorId: tutor.id,
                      title: `${tutor.name} · individual dars`,
                      subtitle: subject,
                      time: `${dateLabel(date)} · ${time}`,
                      ...toLessonTime(date, time),
                      price: tutor.price,
                    }),
                  (id) => navigation.navigate("Request", { id }),
                )
              }
            />
          </>
        ) : undefined
      }
    >
      <Header title="Repetitor profili" onBack={() => navigation.goBack()} />
      <Card style={{ alignItems: "center", padding: 24 }}>
        <UserAvatar userId={tutor.id} initials={tutor.initials} size={88} />
        <AppText variant="title">{tutor.name}</AppText>
        <Chip label="Tasdiqlangan repetitor" tone="green" />
        <AppText color={C.muted}>
          {(tutor.subjects || [tutor.subject]).join(" · ")} · {tutor.specialty}
        </AppText>
        <View style={uiStyles.wrap}>
          <Chip label={`${tutor.experience} yil tajriba`} />
          <Chip
            label={
              tutor.reviews
                ? `★ ${tutor.rating} · ${tutor.reviews} fikr`
                : "Hali fikr yo‘q"
            }
          />
        </View>
      </Card>
      <AppText variant="heading">Ustoz haqida</AppText>
      <AppText color={C.muted}>{tutor.bio}</AppText>
      <Card>
        <AppText variant="heading">Dars shartlari</AppText>
        <AppText>{money(tutor.price)} / individual dars</AppText>
        <AppText color={C.muted}>
          {tutor.area} · {tutor.modes.join(" / ")}
        </AppText>
      </Card>
      {student ? (
        <>
          <Button
            title="Ustozga yozish"
            variant="soft"
            icon="message-circle"
            onPress={() =>
              navigation.navigate("Conversation", {
                id: dmId(user.id, tutor.id),
              })
            }
          />
          <Button
            title={
              favorites.includes(tutor.id)
                ? "Saqlanganlardan olib tashlash"
                : "Saqlash"
            }
            variant="outline"
            icon="heart"
            onPress={() => action.run(() => toggleFavorite(tutor.id))}
          />
          <AppText variant="heading">Individual dars fani va vaqti</AppText>
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
            {dates.map((v) => (
              <Chip
                key={v}
                label={dateLabel(v)}
                selected={date === v}
                onPress={() => setDate(v)}
              />
            ))}
          </View>
          <View style={uiStyles.wrap}>
            {(profile?.availability || []).map((v) => (
              <Chip
                key={v}
                label={v}
                selected={time === v}
                onPress={() => setTime(v)}
              />
            ))}
          </View>
          <AppText variant="caption" color={C.muted}>
            Vaqtlar Toshkent vaqti bilan. Ustoz ariza bo‘yicha mavjudligini
            tekshiradi.
          </AppText>
        </>
      ) : null}
      <Feedback {...action} />
      <AppText variant="heading">Ochiq dars va guruhlar</AppText>
      {ownGroups.map((g) => (
        <GroupCard key={g.id} group={g} />
      ))}
      {!ownGroups.length ? (
        <AppText color={C.muted}>
          Hozircha ochiq guruh e’lon qilinmagan.
        </AppText>
      ) : null}
      <AppText variant="heading">O‘quvchilar fikrlari</AppText>
      {market.reviews
        .filter((r) => r.tutorId === tutor.id)
        .map((r) => (
          <Card key={r.id}>
            <AppText variant="label">★ {r.rating} / 5</AppText>
            <AppText>{r.text}</AppText>
            <AppText variant="caption" color={C.muted}>
              {dateLabel(r.createdAt)}
            </AppText>
          </Card>
        ))}
      {!tutor.reviews ? (
        <AppText color={C.muted}>
          Fikrlar darsda qatnashgandan keyin qoldiriladi.
        </AppText>
      ) : null}
    </Screen>
  );
}
export function GroupCard({ group }: { group: Offering }) {
  const navigation = useAppNavigation();
  return (
    <Card
      onPress={() => navigation.navigate("Group", { id: group.id })}
      accessibilityLabel={`${group.title} tafsilotlari`}
    >
      <View style={uiStyles.between}>
        <Chip
          label={group.type === "group" ? group.subject : "Individual dars"}
          tone="purple"
        />
        <Chip
          label={group.spots ? `${group.spots} bo‘sh o‘rin` : "Guruh to‘lgan"}
          tone={group.spots ? "green" : undefined}
        />
      </View>
      <AppText variant="heading">{group.title}</AppText>
      <AppText color={C.muted}>{group.tutor}</AppText>
      <AppText variant="caption" color={C.muted}>
        {group.days} · {group.time} · {group.mode}
      </AppText>
      <View style={uiStyles.between}>
        <AppText variant="label">{money(group.price)}</AppText>
        <AppText variant="caption" color={C.muted}>
          {group.area} · {group.students}/{group.capacity}
        </AppText>
      </View>
    </Card>
  );
}
export function GroupsScreen() {
  const navigation = useAppNavigation(),
    { groups } = useApp();
  const [subject, setSubject] = useState("Barchasi"),
    [openOnly, setOpenOnly] = useState(true);
  const list = groups.filter(
    (g) =>
      (subject === "Barchasi" || g.subject === subject) &&
      (!openOnly || g.spots > 0),
  );
  return (
    <Screen>
      <Header title="Ochiq guruhlar" onBack={() => navigation.goBack()} />
      <AppText color={C.muted}>
        Maqsadingizga mos guruhni tanlang. Ustoz arizangizni ko‘rib chiqadi.
      </AppText>
      <FilterPanel
        count={Number(subject !== "Barchasi") + Number(!openOnly)}
        onReset={() => {
          setSubject("Barchasi");
          setOpenOnly(true);
        }}
        initiallyOpen
      >
        <FilterSelect
          label="Fan"
          options={filterChoices(["Barchasi", ...SUBJECTS])}
          value={subject}
          onChange={setSubject}
        />
        <FilterOptions
          label="Guruhda bo‘sh o‘rin"
          value={openOnly ? "open" : "all"}
          onChange={(v) => setOpenOnly(v === "open")}
          options={[
            { value: "open", label: "Bo‘sh o‘rin bor" },
            { value: "all", label: "Barcha guruhlar" },
          ]}
        />
      </FilterPanel>
      {list.map((g) => (
        <GroupCard key={g.id} group={g} />
      ))}
      {!list.length ? (
        <EmptyState
          title="Ochiq guruh topilmadi"
          subtitle="Boshqa fanni tanlang yoki repetitorga individual dars uchun yozing."
          icon="users"
        />
      ) : null}
    </Screen>
  );
}
export function GroupScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Group">) {
  const navigation = useAppNavigation(),
    { groups, market, user, requests, submitRequest } = useApp();
  const group =
    groups.find((g) => g.id === route.params.id) ||
    market.offerings.find((g) => g.id === route.params.id);
  const action = useAction();
  if (!group)
    return (
      <Screen>
        <Header title="Guruh" onBack={() => navigation.goBack()} />
        <EmptyState
          title="Guruh topilmadi"
          subtitle="E’lon mavjud emas yoki sizga ochiq emas."
        />
      </Screen>
    );
  const member = market.enrollments.some(
      (e) => e.offeringId === group.id && e.studentId === user.id && e.active,
    ),
    pending = requests.find(
      (r) => r.groupId === group.id && r.status === "pending",
    );
  const sessions = market.sessions
    .filter((s) => s.offeringId === group.id)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    <Screen
      bottom={
        user.role === "student" ? (
          <Button
            title={
              member
                ? "Darslarimga o‘tish"
                : pending
                  ? "Arizani ko‘rish"
                  : group.spots <= 0
                    ? "Guruh to‘lgan"
                    : "Guruhga ariza yuborish"
            }
            disabled={!member && !pending && group.spots <= 0}
            loading={action.busy}
            onPress={() => {
              if (member) navigation.popTo("Main", { screen: "Lessons" });
              else if (pending)
                navigation.navigate("Request", { id: pending.id });
              else
                action.run(
                  () =>
                    submitRequest({
                      kind: group.type === "group" ? "group" : "lesson",
                      groupId: group.id,
                      tutorId: group.tutorId,
                      title: group.title,
                      subtitle: group.subject,
                      time: `${group.days} · ${group.time}`,
                      price: group.price,
                    }),
                  (id) => navigation.navigate("Request", { id }),
                );
            }}
          />
        ) : undefined
      }
    >
      <Header title="Guruh haqida" onBack={() => navigation.goBack()} />
      <Chip label={group.subject} tone="purple" />
      <AppText variant="display">{group.title}</AppText>
      <Card>
        <AppText variant="heading">{group.tutor}</AppText>
        <AppText color={C.muted}>
          {group.mode} · {group.area}
        </AppText>
        <AppText>{group.location}</AppText>
        <Button
          title="Repetitor profilini ko‘rish"
          variant="soft"
          onPress={() => navigation.navigate("Tutor", { id: group.tutorId })}
        />
      </Card>
      <View style={uiStyles.between}>
        <AppText variant="heading">{money(group.price)}</AppText>
        <Chip
          label={member ? "Siz qatnashchisiz" : `${group.spots} bo‘sh o‘rin`}
          tone="green"
        />
      </View>
      <AppText variant="caption" color={C.muted}>
        {group.lessons} dars · {group.duration} daqiqa · {group.students}/
        {group.capacity} qatnashchi
      </AppText>
      {group.benefits.map((b, i) => (
        <View key={`${i}-${b}`} style={uiStyles.row}>
          <Icon name="check-circle" color={C.green} />
          <AppText style={{ flex: 1 }}>{b}</AppText>
        </View>
      ))}
      <AppText variant="heading">Dars jadvali</AppText>
      {sessions.map((s) => (
        <Card key={s.id}>
          <View style={uiStyles.between}>
            <AppText variant="label">{dateLabel(s.startsAt)}</AppText>
            <AppText>
              {timeLabel(s.startsAt)}–{timeLabel(s.endsAt)}
            </AppText>
          </View>
          <AppText color={C.muted} variant="caption">
            {s.location}
          </AppText>
        </Card>
      ))}
      {user.role === "student" ? (
        <Button
          title="Ustozga yozish"
          variant="outline"
          icon="message-circle"
          onPress={() =>
            navigation.navigate("Conversation", {
              id: dmId(user.id, group.tutorId),
            })
          }
        />
      ) : null}
      <Feedback {...action} />
    </Screen>
  );
}
function FutureScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const navigation = useAppNavigation();
  return (
    <Screen>
      <Header title={title} onBack={() => navigation.goBack()} />
      <Chip label="KEYINGI VERSIYA" tone="gold" />
      <EmptyState title={title} subtitle={description} icon="clock" />
    </Screen>
  );
}
export function RoomsScreen() {
  return (
    <FutureScreen
      title="Xona band qilish"
      description="Repetitorlar uchun xonalar, bo‘sh vaqtlar va band qilish keyingi versiyada qo‘shiladi."
    />
  );
}
export function RoomScreen() {
  return <RoomsScreen />;
}
export function EventsScreen() {
  return (
    <FutureScreen
      title="O‘quv tadbirlari"
      description="Hozir ochiq guruhlar va individual darslarga ariza yuborishingiz mumkin. Alohida tadbirlar keyingi bosqichda qo‘shiladi."
    />
  );
}
export function EventScreen() {
  return <EventsScreen />;
}
