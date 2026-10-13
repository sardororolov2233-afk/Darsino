import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
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
import {
  EventIllustration,
  RoomIllustration,
} from "../components/Illustrations";
import { BottomNavigation } from "../components/BottomNavigation";
import {
  events,
  formatPrice,
  groups,
  rooms,
  tutors,
  type PracticeEvent,
  type StudyGroup,
  type StudyRoom,
  type Tutor,
} from "../data/catalog";
import { useAppNavigation, type RootStackParamList } from "../navigation";
import { useApp } from "../state/AppContext";
import { defaultFilters, type Filters } from "../state/model";
import { C } from "../theme";

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/[‘’ʻʼ']/g, "")
    .trim();
const matches = (query: string, values: string[]) =>
  normalize(values.join(" ")).includes(normalize(query));
export const filterTutors = (filters: Filters, query = "") =>
  tutors.filter(
    (tutor) =>
      (!filters.subject ||
        filters.subject === "Barchasi" ||
        tutor.subject === filters.subject) &&
      (!filters.area ||
        ["Barcha tumanlar", "Toshkent"].includes(filters.area) ||
        tutor.area === filters.area) &&
      (filters.mode === "Barchasi" ||
        !filters.mode ||
        tutor.modes.includes(filters.mode)) &&
      tutor.price >= filters.minPrice &&
      tutor.price <= filters.maxPrice &&
      tutor.rating >= filters.minRating &&
      matches(query, [tutor.name, tutor.subject, tutor.specialty, tutor.area]),
  );

function SaveButton({ id }: { id: string }) {
  const { favorites, toggleFavorite } = useApp();
  const saved = favorites.includes(id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? "Saqlanganlardan olib tashlash" : "Saqlash"}
      accessibilityState={{ selected: saved }}
      onPress={(event) => {
        event.stopPropagation();
        toggleFavorite(id);
      }}
      hitSlop={10}
      style={styles.saveButton}
    >
      <Icon name="heart" size={23} color={saved ? C.gold : C.muted} />
      {saved ? <View style={styles.savedDot} /> : null}
    </Pressable>
  );
}
function InfoLine({
  icon,
  children,
  color = C.muted,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <View style={[uiStyles.row, { gap: 5 }]}>
      <Icon name={icon} size={17} color={color} />
      <AppText variant="caption" color={color} style={styles.flex}>
        {children}
      </AppText>
    </View>
  );
}
function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <View style={uiStyles.between}>
      <AppText variant="heading">{title}</AppText>
      {aside ? (
        <AppText variant="caption" color={C.muted}>
          {aside}
        </AppText>
      ) : null}
    </View>
  );
}
function Benefits({
  items,
  green = false,
}: {
  items: string[];
  green?: boolean;
}) {
  return (
    <View
      style={[
        styles.benefits,
        green && { backgroundColor: C.greenSoft, padding: 16 },
      ]}
    >
      {items.map((item) => (
        <View key={item} style={[uiStyles.row, { gap: 6 }]}>
          <Icon name="check" size={18} color={C.green} />
          <AppText variant="caption" color={C.green} style={styles.flex}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}
function DemoLabel() {
  return (
    <AppText variant="caption" color={C.muted} style={styles.demo}>
      Namuna ma’lumotlar · so‘rovlar qurilmada saqlanadi
    </AppText>
  );
}
const trialDates = [
  "14 oktabr, chorshanba",
  "15 oktabr, payshanba",
  "16 oktabr, juma",
];
function DateChoice({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        style={styles.selectField}
        accessibilityRole="button"
        accessibilityLabel="Dars sanasini tanlash"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
      >
        <Icon name="calendar" color={C.muted} />
        <AppText color={C.muted} style={styles.flex}>
          {value}
        </AppText>
        <Icon name="chevron-down" color={C.muted} size={16} />
      </Pressable>
      {open ? (
        <Card style={{ padding: 8 }}>
          {trialDates.map((date) => (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityState={{ selected: date === value }}
              onPress={() => {
                onChange(date);
                setOpen(false);
              }}
              style={[
                styles.dateOption,
                date === value && { backgroundColor: C.blueSoft },
              ]}
            >
              <AppText>{date}</AppText>
              {date === value ? <Icon name="check" size={17} /> : null}
            </Pressable>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

export function TutorCard({ tutor }: { tutor: Tutor }) {
  const nav = useAppNavigation();
  return (
    <Card
      accessibilityLabel={`${tutor.name} profilini ko‘rish`}
      onPress={() => nav.navigate("Tutor", { id: tutor.id })}
      style={styles.tutorCard}
    >
      <View style={uiStyles.row}>
        <Avatar initials={tutor.initials} size={50} />
        <View style={[styles.flex, { gap: 2 }]}>
          <AppText variant="label">{tutor.name}</AppText>
          <AppText variant="caption" color={C.muted}>
            {tutor.subject} · {tutor.specialty}
          </AppText>
          <View style={[uiStyles.row, { gap: 3 }]}>
            <Icon name="star" size={15} color={C.gold} />
            <AppText variant="caption" color={C.muted}>
              {tutor.rating} ({tutor.reviews} sharh)
            </AppText>
          </View>
        </View>
        <SaveButton id={`tutor:${tutor.id}`} />
      </View>
      <View style={styles.cardDivider} />
      <View style={uiStyles.between}>
        <InfoLine icon="map-pin">{tutor.area}</InfoLine>
        <View style={styles.priceColumn}>
          <AppText variant="label">{formatPrice(tutor.price)}</AppText>
          <AppText variant="caption" color={C.muted} style={{ fontSize: 10 }}>
            1 soat uchun
          </AppText>
        </View>
      </View>
    </Card>
  );
}

export function TutorsScreen() {
  const nav = useAppNavigation();
  const route = useRoute();
  const { filters, setFilters } = useApp();
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [sort, setSort] = useState<"rating" | "price">("rating");
  const results = useMemo(
    () =>
      filterTutors(filters, query)
        .filter((tutor) => !specialty || tutor.specialty === specialty)
        .sort((a, b) =>
          sort === "rating" ? b.rating - a.rating : a.price - b.price,
        ),
    [filters, query, specialty, sort],
  );
  return (
    <Screen
      bottom={
        route.name === "Tutors" ? (
          <BottomNavigation active="Search" />
        ) : undefined
      }
    >
      <Header
        title="Repetitor qidirish"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filtrlarni ochish"
            onPress={() => nav.navigate("Filters")}
            style={styles.headerRound}
          >
            <Icon name="sliders" size={20} />
          </Pressable>
        }
      />
      <Field
        icon="search"
        placeholder="Ingliz tili"
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
      />
      <View style={uiStyles.wrap}>
        <Chip
          label="IELTS"
          selected={specialty === "IELTS"}
          onPress={() => setSpecialty(specialty ? "" : "IELTS")}
        />
        <Chip
          label="Onlayn"
          selected={filters.mode === "Onlayn"}
          onPress={() =>
            setFilters({
              mode: filters.mode === "Onlayn" ? "Barchasi" : "Onlayn",
            })
          }
        />
        <Chip
          label="Toshkent"
          selected={filters.area === "Toshkent"}
          onPress={() =>
            setFilters({
              area:
                filters.area === "Toshkent" ? "Barcha tumanlar" : "Toshkent",
            })
          }
        />
      </View>
      <View style={uiStyles.between}>
        <AppText variant="label">{results.length} repetitor</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Saralashni o‘zgartirish"
          onPress={() => setSort(sort === "rating" ? "price" : "rating")}
        >
          <AppText variant="caption" color={C.muted}>
            {sort === "rating" ? "Reyting bo‘yicha ↓" : "Narx bo‘yicha ↑"}
          </AppText>
        </Pressable>
      </View>
      {results.map((tutor) => (
        <TutorCard key={tutor.id} tutor={tutor} />
      ))}
      {!results.length ? (
        <EmptyState
          title="Repetitor topilmadi"
          subtitle="Qidiruv so‘zini yoki filtrlarni o‘zgartirib ko‘ring."
        />
      ) : null}
      <DemoLabel />
    </Screen>
  );
}

export function FiltersScreen() {
  const nav = useAppNavigation();
  const { filters, setFilters } = useApp();
  const [draft, setDraft] = useState<Filters>({ ...filters });
  const [minInput, setMinInput] = useState(String(filters.minPrice));
  const [maxInput, setMaxInput] = useState(String(filters.maxPrice));
  const [expanded, setExpanded] = useState<"subject" | "area" | null>(null);
  const min = Number(minInput),
    max = Number(maxInput);
  const validRange =
    !!minInput &&
    !!maxInput &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min >= 0 &&
    max >= min;
  const count = validRange
    ? filterTutors({ ...draft, minPrice: min, maxPrice: max }).length
    : 0;
  const reset = () => {
    setDraft({ ...defaultFilters });
    setMinInput(String(defaultFilters.minPrice));
    setMaxInput(String(defaultFilters.maxPrice));
  };
  const update = (values: Partial<Filters>) =>
    setDraft((old) => ({ ...old, ...values }));
  return (
    <Screen scroll={false} background="#ACB9C9" style={{ padding: 0, gap: 0 }}>
      <View style={styles.filterPreview}>
        <AppText variant="title" color={C.navy}>
          Repetitor qidirish
        </AppText>
        <View style={styles.filterGhostField}>
          <Icon name="search" color="#6B819B" />
          <AppText color="#6B819B">Ingliz tili</AppText>
        </View>
      </View>
      <View style={styles.filterSheet}>
        <View style={styles.sheetHandle} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.filterContent}
        >
          <Header
            title="Filtrlar"
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filtrlarni yopish"
                hitSlop={12}
                onPress={() => nav.goBack()}
              >
                <Icon name="chevron-left" size={25} />
              </Pressable>
            }
          />
          <AppText variant="caption" color={C.muted}>
            Fan
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fanni tanlash"
            onPress={() =>
              setExpanded(expanded === "subject" ? null : "subject")
            }
            style={styles.selectField}
          >
            <Icon name="book-open" color={C.muted} />
            <AppText color={C.muted} style={styles.flex}>
              {draft.subject}
            </AppText>
            <Icon name="chevron-down" color={C.muted} size={16} />
          </Pressable>
          {expanded === "subject" ? (
            <View style={uiStyles.wrap}>
              {["Barchasi", "Ingliz tili", "Matematika"].map((value) => (
                <Chip
                  key={value}
                  label={value}
                  selected={draft.subject === value}
                  onPress={() => {
                    update({ subject: value });
                    setExpanded(null);
                  }}
                />
              ))}
            </View>
          ) : null}
          <AppText variant="caption" color={C.muted}>
            Hudud
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hududni tanlash"
            onPress={() => setExpanded(expanded === "area" ? null : "area")}
            style={styles.selectField}
          >
            <Icon name="map-pin" color={C.muted} />
            <AppText color={C.muted} style={styles.flex}>
              {draft.area === "Barcha tumanlar"
                ? "Toshkent · barcha tumanlar"
                : draft.area}
            </AppText>
            <Icon name="chevron-down" color={C.muted} size={16} />
          </Pressable>
          {expanded === "area" ? (
            <View style={uiStyles.wrap}>
              {[
                "Barcha tumanlar",
                "Yunusobod",
                "Mirzo Ulug‘bek",
                "Chilonzor",
              ].map((value) => (
                <Chip
                  key={value}
                  label={value}
                  selected={draft.area === value}
                  onPress={() => {
                    update({ area: value });
                    setExpanded(null);
                  }}
                />
              ))}
            </View>
          ) : null}
          <AppText variant="label">Narx · 1 soat uchun</AppText>
          <View style={[uiStyles.row, { alignItems: "flex-start" }]}>
            <View style={styles.flex}>
              <Field
                label="Eng kam (so‘m)"
                value={minInput}
                onChangeText={(value) => setMinInput(value.replace(/\D/g, ""))}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.flex}>
              <Field
                label="Eng ko‘p (so‘m)"
                value={maxInput}
                onChangeText={(value) => setMaxInput(value.replace(/\D/g, ""))}
                keyboardType="numeric"
              />
            </View>
          </View>
          {!validRange ? (
            <AppText variant="caption" color={C.error}>
              Narxlarni tekshiring: eng ko‘p narx eng kam narxdan kichik
              bo‘lmasin.
            </AppText>
          ) : null}
          <AppText variant="label">Dars shakli</AppText>
          <View style={uiStyles.wrap}>
            {["Barchasi", "Oflayn", "Onlayn"].map((value) => (
              <Chip
                key={value}
                label={value}
                selected={draft.mode === value}
                onPress={() => update({ mode: value })}
              />
            ))}
          </View>
          <AppText variant="label">Reyting</AppText>
          <View style={uiStyles.wrap}>
            {[4.5, 4.8].map((value) => (
              <Chip
                key={value}
                label={`${value} va yuqori`}
                selected={draft.minRating === value}
                onPress={() => update({ minRating: value })}
              />
            ))}
          </View>
        </ScrollView>
        <View style={styles.filterFooter}>
          <Button
            title="Tozalash"
            variant="soft"
            onPress={reset}
            style={{ flex: 0.8 }}
          />
          <Button
            title={`${count} natijani ko‘rish`}
            disabled={!validRange}
            onPress={() => {
              setFilters({ ...draft, minPrice: min, maxPrice: max });
              nav.goBack();
            }}
            style={{ flex: 1.35 }}
          />
        </View>
      </View>
    </Screen>
  );
}

export function TutorScreen() {
  const nav = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Tutor">>();
  const tutor = tutors.find((item) => item.id === route.params.id);
  const { submitRequest } = useApp();
  const [date, setDate] = useState(trialDates[0]);
  const [time, setTime] = useState("18:00");
  if (!tutor)
    return (
      <Screen>
        <Header title="Ustoz haqida" onBack={() => nav.goBack()} />
        <EmptyState
          title="Ustoz topilmadi"
          subtitle="Qidiruvga qaytib, boshqa ustozni tanlang."
        />
      </Screen>
    );
  const book = () => {
    const id = submitRequest({
      kind: "lesson",
      conversationId: tutor.id,
      title: `${tutor.name} · sinov darsi`,
      subtitle: `${tutor.subject} · ${tutor.specialty}`,
      time: `${date} · ${time} · 30 daqiqa`,
      price: tutor.price / 2,
    });
    nav.navigate("Request", { id });
  };
  return (
    <Screen
      background={C.white}
      bottom={<Button title="Sinov darsiga yozilish" onPress={book} />}
    >
      <Header
        title="Ustoz haqida"
        onBack={() => nav.goBack()}
        right={<SaveButton id={`tutor:${tutor.id}`} />}
      />
      <View style={styles.tutorProfile}>
        <Avatar initials={tutor.initials} size={88} tone="blue" />
        <Chip
          label={tutor.verified ? "Tasdiqlangan" : "Yangi ustoz"}
          tone="green"
          style={[styles.smallChip, { alignSelf: "center" }]}
        />
        <AppText variant="title">{tutor.name}</AppText>
        <AppText color={C.muted}>
          {tutor.subject} · {tutor.specialty}
          {tutor.id === "dilnoza" ? " · CEFR" : ""}
        </AppText>
      </View>
      <View style={styles.stats}>
        {[
          { value: String(tutor.rating), label: `${tutor.reviews} sharh` },
          { value: `${tutor.experience} yil`, label: "Tajriba" },
          { value: `${tutor.students}+`, label: "O‘quvchi" },
        ].map((item) => (
          <View key={item.label} style={styles.stat}>
            <AppText variant="heading">{item.value}</AppText>
            <AppText variant="caption" color={C.muted}>
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
      <Card style={styles.bioCard}>
        <AppText variant="heading">Men haqimda</AppText>
        <AppText color={C.muted}>{tutor.bio}</AppText>
      </Card>
      <SectionTitle title="Sinov darsi uchun vaqt" />
      <DateChoice value={date} onChange={setDate} />
      <AppText variant="caption" color={C.muted}>
        30 daqiqa · individual tanishuv darsi
      </AppText>
      <View style={uiStyles.wrap}>
        {["16:00", "18:00", "20:00"].map((value) => (
          <Chip
            key={value}
            label={value}
            selected={time === value}
            onPress={() => setTime(value)}
          />
        ))}
      </View>
      <View style={styles.priceStrip}>
        <AppText variant="caption">Sinov darsi</AppText>
        <AppText variant="label">{formatPrice(tutor.price / 2)}</AppText>
      </View>
      <DemoLabel />
    </Screen>
  );
}

export function GroupCard({ group }: { group: StudyGroup }) {
  const nav = useAppNavigation();
  return (
    <Card
      accessibilityLabel={`${group.title} tafsilotlari`}
      onPress={() => nav.navigate("Group", { id: group.id })}
    >
      <View style={uiStyles.between}>
        <View style={[uiStyles.row, styles.flex]}>
          <View style={styles.bookCircle}>
            <Icon name="book-open" size={22} />
          </View>
          <AppText variant="label" style={styles.flex}>
            {group.title}
          </AppText>
        </View>
        <Chip
          label={`${group.spots} o‘rin`}
          tone="gold"
          style={styles.smallChip}
        />
      </View>
      <AppText variant="caption" color={C.muted}>
        {group.tutor} · {group.students}/{group.capacity} o‘quvchi
      </AppText>
      <View style={styles.cardDivider} />
      <InfoLine icon="clock">
        {group.days} / {group.time}
      </InfoLine>
      <View style={uiStyles.between}>
        <AppText variant="label">{formatPrice(group.price)} / oy</AppText>
        <AppText variant="caption" color={C.muted}>
          {group.mode}
        </AppText>
      </View>
    </Card>
  );
}

export function GroupsScreen() {
  const nav = useAppNavigation();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("Barchasi");
  const results = groups.filter(
    (group) =>
      (subject === "Barchasi" ||
        (subject === "IELTS"
          ? group.id === "ielts"
          : group.subject === subject)) &&
      matches(query, [group.title, group.subject, group.area, group.tutor]),
  );
  return (
    <Screen bottom={<BottomNavigation active="Search" />}>
      <Header
        title="O‘quv guruhlari"
        onBack={() => nav.goBack()}
        right={<Icon name="users" color={C.muted} />}
      />
      <AppText color={C.muted}>Birga o‘rganish osonroq.</AppText>
      <Field
        icon="search"
        placeholder="Fan, guruh yoki hudud"
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
      />
      <View style={uiStyles.wrap}>
        {["Barchasi", "IELTS", "Matematika"].map((value) => (
          <Chip
            key={value}
            label={value}
            selected={subject === value}
            onPress={() => setSubject(value)}
          />
        ))}
      </View>
      <SectionTitle
        title="Yangi guruhlar"
        aside={`${results.length} ta guruh`}
      />
      {results.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}
      {!results.length ? (
        <EmptyState
          title="Guruh topilmadi"
          subtitle="Boshqa fan yoki hududni qidirib ko‘ring."
        />
      ) : null}
      <DemoLabel />
    </Screen>
  );
}

export function GroupScreen() {
  const nav = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Group">>();
  const group = groups.find((item) => item.id === route.params.id);
  const { submitRequest } = useApp();
  if (!group)
    return (
      <Screen>
        <Header title="Guruh haqida" onBack={() => nav.goBack()} />
        <EmptyState
          title="Guruh topilmadi"
          subtitle="Guruhlar ro‘yxatidan boshqa guruhni tanlang."
        />
      </Screen>
    );
  const tutor = tutors.find((item) => item.id === group.tutorId);
  const join = () => {
    const id = submitRequest({
      kind: "group",
      conversationId: group.id === "ielts" ? "ielts" : `group:${group.id}`,
      title: group.title,
      subtitle: group.tutor,
      time: `${group.days} · ${group.time}`,
      price: group.price,
    });
    nav.navigate("Request", { id });
  };
  return (
    <Screen
      background={C.white}
      bottom={
        <Button title="Guruhga qo‘shilish" variant="gold" onPress={join} />
      }
    >
      <Header
        title="Guruh haqida"
        onBack={() => nav.goBack()}
        right={<SaveButton id={`group:${group.id}`} />}
      />
      <View style={styles.groupHero}>
        <View style={uiStyles.between}>
          <AppText variant="caption" color={C.gold} style={{ fontSize: 10 }}>
            {group.subject.toUpperCase()}
          </AppText>
          <Chip
            label={`${group.spots} o‘rin`}
            tone="gold"
            style={styles.smallChip}
          />
        </View>
        <AppText variant="title" color={C.white} style={{ maxWidth: "82%" }}>
          {group.id === "ielts" ? "IELTS 6.5+\nkichik guruhi" : group.title}
        </AppText>
        <AppText variant="caption" color="#B5C6DA">
          {group.id === "ielts" ? "Intermediate" : "Amaliy ta’lim"} ·{" "}
          {group.capacity} kishilik guruh
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${group.tutor} profili`}
        onPress={() => nav.navigate("Tutor", { id: group.tutorId })}
        style={uiStyles.row}
      >
        <Avatar initials={tutor?.initials || "AY"} size={46} />
        <View style={styles.flex}>
          <AppText variant="label">{group.tutor}</AppText>
          <AppText variant="caption" color={C.muted}>
            {group.id === "ielts" ? "IELTS 8.5" : group.subject} ·{" "}
            {tutor?.experience || 5} yil tajriba
          </AppText>
        </View>
        <Icon name="chevron-right" color={C.muted} />
      </Pressable>
      <View style={styles.infoPanel}>
        <InfoLine icon="calendar">
          {group.days} / {group.time}
        </InfoLine>
        <InfoLine icon="map-pin">
          {group.area} · {group.location}
        </InfoLine>
        <InfoLine icon="users">
          {group.students}/{group.capacity} o‘quvchi · {group.spots} ta bo‘sh
          o‘rin
        </InfoLine>
      </View>
      <View style={styles.groupPrice}>
        <AppText variant="heading">{formatPrice(group.price)} / oy</AppText>
        <AppText variant="caption" color={C.muted}>
          {group.lessons} ta dars · har biri {group.duration} daqiqa
        </AppText>
      </View>
      <Card>
        <AppText variant="heading">Nimalarni o‘rganamiz?</AppText>
        <Benefits items={group.benefits} />
      </Card>
      <AppText variant="caption" color={C.muted}>
        Qo‘shilish so‘rovini ustoz tasdiqlaydi.
      </AppText>
      <DemoLabel />
    </Screen>
  );
}

export function EventCard({ event }: { event: PracticeEvent }) {
  const nav = useAppNavigation();
  return (
    <Card
      accessibilityLabel={`${event.title} tafsilotlari`}
      onPress={() => nav.navigate("Event", { id: event.id })}
    >
      <View style={uiStyles.row}>
        <View style={styles.dateBadge}>
          <AppText variant="label">{event.day}</AppText>
          <AppText variant="caption" style={{ fontSize: 11 }}>
            {event.month}
          </AppText>
        </View>
        <View style={[styles.flex, { gap: 4 }]}>
          <AppText variant="label">{event.title}</AppText>
          <AppText
            variant="caption"
            color={C.purple}
            style={{ fontSize: 9, textTransform: "uppercase" }}
          >
            {event.category}
          </AppText>
        </View>
      </View>
      <InfoLine icon="map-pin">
        {event.area} · {event.time}
      </InfoLine>
      <View style={styles.cardDivider} />
      <View style={uiStyles.between}>
        <AppText variant="label" color={C.green}>
          {event.price ? formatPrice(event.price) : "Bepul"}
        </AppText>
        <AppText variant="caption" color={C.navy}>
          Qatnashish →
        </AppText>
      </View>
    </Card>
  );
}

export function EventsScreen() {
  const nav = useAppNavigation();
  const [category, setCategory] = useState("Hammasi");
  const results = events.filter(
    (event) =>
      category === "Hammasi" ||
      (category === "Masterklass"
        ? event.category === "Masterklass"
        : event.category !== "Masterklass"),
  );
  return (
    <Screen bottom={<BottomNavigation active="Home" />}>
      <Header
        title="Amaliy tadbirlar"
        onBack={() => nav.goBack()}
        right={<Icon name="star" color={C.muted} />}
      />
      <AppText color={C.muted}>Bilimingizni amaliyotda sinab ko‘ring.</AppText>
      <View style={uiStyles.wrap}>
        {["Hammasi", "Masterklass", "Amaliyot"].map((value) => (
          <Chip
            key={value}
            label={value}
            selected={category === value}
            onPress={() => setCategory(value)}
          />
        ))}
      </View>
      <View style={styles.eventBanner}>
        <View style={styles.bannerCircle}>
          <Icon name="star" size={24} />
        </View>
        <View style={styles.flex}>
          <AppText variant="label">Tanishuv. Tajriba. Natija.</AppText>
          <AppText variant="caption" color={C.muted}>
            Siz uchun yaqin {results.length} ta tadbir
          </AppText>
        </View>
      </View>
      {results.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
      <DemoLabel />
    </Screen>
  );
}

export function EventScreen() {
  const nav = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Event">>();
  const event = events.find((item) => item.id === route.params.id);
  const { submitRequest } = useApp();
  if (!event)
    return (
      <Screen>
        <Header title="Tadbir haqida" onBack={() => nav.goBack()} />
        <EmptyState
          title="Tadbir topilmadi"
          subtitle="Tadbirlar ro‘yxatiga qayting."
        />
      </Screen>
    );
  const join = () => {
    const id = submitRequest({
      kind: "event",
      conversationId:
        event.id === "speaking" ? "speaking" : `event:${event.id}`,
      title: event.title,
      subtitle: `${event.area} · ${event.location}`,
      time: `${event.date} · ${event.time}`,
      price: event.price,
    });
    nav.navigate("Request", { id });
  };
  return (
    <Screen
      background={C.white}
      bottom={<Button title="Ishtirok etish" variant="gold" onPress={join} />}
    >
      <Header
        title="Tadbir haqida"
        onBack={() => nav.goBack()}
        right={<SaveButton id={`event:${event.id}`} />}
      />
      <View style={styles.illustrationClip}>
        <EventIllustration height={180} />
      </View>
      <AppText variant="display">
        {event.id === "speaking" ? "Speaking club:\nerkin suhbat" : event.title}
      </AppText>
      <View style={uiStyles.wrap}>
        <Chip
          label={event.price ? formatPrice(event.price) : "Bepul"}
          tone="green"
          style={styles.smallChip}
        />
        <Chip
          label={`${event.spots} ta bo‘sh o‘rin`}
          tone="gold"
          style={styles.smallChip}
        />
      </View>
      <View style={styles.infoPanel}>
        <InfoLine icon="calendar">
          {event.date} · {event.time}
        </InfoLine>
        <InfoLine icon="map-pin">
          {event.area} · {event.location}
        </InfoLine>
        <InfoLine icon="user">{event.host} · boshlovchi</InfoLine>
      </View>
      <SectionTitle
        title={
          event.id === "speaking"
            ? "Suhbatga qo‘shiling"
            : "Amaliyotga qo‘shiling"
        }
      />
      <AppText color={C.muted}>{event.description}</AppText>
      <Benefits items={event.benefits} green />
      <DemoLabel />
    </Screen>
  );
}

export function RoomCard({ room }: { room: StudyRoom }) {
  const nav = useAppNavigation();
  return (
    <Card
      accessibilityLabel={`${room.title} tafsilotlari`}
      onPress={() => nav.navigate("Room", { id: room.id })}
      style={{ padding: 15, gap: 8 }}
    >
      <View style={styles.illustrationClip}>
        <RoomIllustration height={124} />
      </View>
      <AppText variant="label">{room.title}</AppText>
      <InfoLine icon="map-pin">{room.area} · Toshkent</InfoLine>
      <View style={uiStyles.between}>
        <AppText variant="caption" color={C.muted}>
          {room.capacity} kishi
        </AppText>
        <AppText variant="label">{formatPrice(room.price)} / soat</AppText>
      </View>
    </Card>
  );
}

export function RoomsScreen() {
  const nav = useAppNavigation();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [projector, setProjector] = useState(false);
  const [wifi, setWifi] = useState(false);
  const results = rooms.filter(
    (room) =>
      (!area || room.area === area) &&
      (!projector || room.amenities.includes("Proyektor")) &&
      (!wifi || room.amenities.includes("Wi-Fi")) &&
      matches(query, [room.title, room.area, room.location]),
  );
  return (
    <Screen bottom={<BottomNavigation active="Search" />}>
      <Header
        title="Dars xonalari"
        onBack={() => nav.goBack()}
        right={<Icon name="briefcase" color={C.muted} />}
      />
      <AppText color={C.muted}>Qulay muhit. Bir joyda yaxshi dars.</AppText>
      <Field
        icon="map-pin"
        placeholder="Yunusobod"
        value={query}
        onChangeText={setQuery}
      />
      <View style={uiStyles.wrap}>
        <Chip
          label="Yunusobod"
          selected={area === "Yunusobod"}
          onPress={() => setArea(area ? "" : "Yunusobod")}
        />
        <Chip
          label="Proyektor"
          selected={projector}
          onPress={() => setProjector(!projector)}
        />
        <Chip label="Wi-Fi" selected={wifi} onPress={() => setWifi(!wifi)} />
      </View>
      <SectionTitle
        title="Sizga yaqin xonalar"
        aside={`${results.length} ta xona`}
      />
      {results.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
      {!results.length ? (
        <EmptyState
          title="Xona topilmadi"
          subtitle="Hudud yoki qulayliklar filtrini o‘zgartirib ko‘ring."
        />
      ) : null}
      <DemoLabel />
    </Screen>
  );
}

export function RoomScreen() {
  const nav = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Room">>();
  const room = rooms.find((item) => item.id === route.params.id);
  const { submitRequest } = useApp();
  const [date, setDate] = useState(trialDates[0]);
  const [time, setTime] = useState("16:00");
  const [duration, setDuration] = useState(1.5);
  if (!room)
    return (
      <Screen>
        <Header title="Xona haqida" onBack={() => nav.goBack()} />
        <EmptyState
          title="Xona topilmadi"
          subtitle="Xonalar ro‘yxatiga qayting."
        />
      </Screen>
    );
  const start = Number(time.split(":")[0]);
  const endTime = `${String(start + Math.floor(duration)).padStart(2, "0")}:${duration % 1 ? "30" : "00"}`;
  const price = room.price * duration;
  const book = () => {
    const id = submitRequest({
      kind: "room",
      conversationId: `room:${room.id}`,
      title: room.title,
      subtitle: room.location,
      time: `${date} · ${time}–${endTime}`,
      price,
    });
    nav.navigate("Request", { id });
  };
  return (
    <Screen
      background={C.white}
      bottom={<Button title="Bron so‘rovini yuborish" onPress={book} />}
    >
      <Header
        title="Xona haqida"
        onBack={() => nav.goBack()}
        right={<SaveButton id={`room:${room.id}`} />}
      />
      <View style={styles.illustrationClip}>
        <RoomIllustration height={155} />
      </View>
      <AppText variant="title">{room.title}</AppText>
      <InfoLine icon="map-pin">{room.location}</InfoLine>
      <View style={uiStyles.wrap}>
        {[`${room.capacity} kishi`, ...room.amenities].map((value) => (
          <Chip
            key={value}
            label={value}
            style={[styles.smallChip, { backgroundColor: C.blueSoft }]}
          />
        ))}
      </View>
      <SectionTitle title="Qachon dars o‘tamiz?" />
      <DateChoice value={date} onChange={setDate} />
      <View style={uiStyles.wrap}>
        {["16:00", "18:00", "20:00"].map((value) => (
          <View
            key={value}
            style={value === "18:00" ? { opacity: 0.45 } : undefined}
          >
            <Chip
              label={value === "18:00" ? "18:00 · band" : value}
              selected={time === value}
              onPress={value === "18:00" ? undefined : () => setTime(value)}
            />
          </View>
        ))}
      </View>
      <AppText variant="caption" color={C.muted}>
        Davomiyligi
      </AppText>
      <View style={uiStyles.wrap}>
        {[1, 1.5, 2].map((value) => (
          <Chip
            key={value}
            label={`${value} soat`}
            selected={duration === value}
            onPress={() => setDuration(value)}
          />
        ))}
      </View>
      <View style={styles.groupPrice}>
        <View style={uiStyles.between}>
          <AppText variant="caption">{formatPrice(room.price)} / soat</AppText>
          <AppText variant="caption" color={C.muted}>
            {time}–{endTime}
          </AppText>
        </View>
        <View style={styles.cardDivider} />
        <View style={uiStyles.between}>
          <AppText variant="label">Jami</AppText>
          <AppText variant="heading">{formatPrice(price)}</AppText>
        </View>
      </View>
      <DemoLabel />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  saveButton: {
    width: 30,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  savedDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.gold,
    position: "absolute",
    bottom: 1,
  },
  headerRound: {
    width: 42,
    height: 42,
    backgroundColor: C.white,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorCard: {
    padding: 16,
    minHeight: 158,
    gap: 10,
    shadowColor: "#173251",
    shadowOpacity: 0.025,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  cardDivider: { height: 1, backgroundColor: C.border, marginVertical: 2 },
  priceColumn: { alignItems: "flex-end", gap: 0 },
  demo: { textAlign: "center", fontSize: 10, marginTop: 2 },
  tutorProfile: { alignItems: "center", gap: 8, paddingVertical: 4 },
  smallChip: {
    minHeight: 26,
    paddingVertical: 3,
    paddingHorizontal: 11,
    borderWidth: 0,
  },
  stats: {
    flexDirection: "row",
    backgroundColor: C.background,
    paddingVertical: 15,
    borderRadius: 20,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  bioCard: { backgroundColor: C.blueSoft, borderWidth: 0, padding: 18 },
  priceStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    backgroundColor: C.goldSoft,
    borderRadius: 16,
  },
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    paddingHorizontal: 16,
    minHeight: 54,
    borderRadius: 16,
  },
  dateOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
  },
  filterPreview: {
    paddingHorizontal: 22,
    paddingTop: 35,
    paddingBottom: 20,
    gap: 16,
    opacity: 0.75,
  },
  filterGhostField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 15,
    borderRadius: 16,
    backgroundColor: "#B9C5D3",
    borderWidth: 1,
    borderColor: "#A3B1C3",
  },
  filterSheet: {
    flex: 1,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: C.white,
    overflow: "hidden",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 3,
    backgroundColor: C.border,
    alignSelf: "center",
    marginTop: 18,
  },
  filterContent: { padding: 20, paddingTop: 10, gap: 12 },
  filterFooter: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
    paddingTop: 12,
    paddingBottom: 26,
    backgroundColor: C.white,
  },
  bookCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  groupHero: {
    backgroundColor: C.navy,
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  infoPanel: {
    padding: 16,
    gap: 10,
    borderRadius: 18,
    backgroundColor: C.background,
  },
  groupPrice: {
    backgroundColor: C.goldSoft,
    padding: 17,
    gap: 6,
    borderRadius: 18,
  },
  benefits: { gap: 10, paddingVertical: 4, borderRadius: 18 },
  eventBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: C.goldSoft,
    borderRadius: 18,
  },
  bannerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  dateBadge: {
    width: 56,
    height: 58,
    backgroundColor: C.goldSoft,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  illustrationClip: { overflow: "hidden", borderRadius: 20 },
});
