import React, { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  uiStyles,
} from "../components/ui";
import { OqiHeader } from "../components/OqiHeader";
import { TutorMap } from "../components/TutorMap";
import {
  ClubCard,
  DiagnosticCard,
  OpenLessonCard,
} from "../components/LearningCards";
import { TutorCard, GroupCard, filterTutors } from "./DiscoveryScreens";
import { useApp } from "../state/AppContext";
import { useLearning } from "../state/LearningContext";
import { defaultFilters } from "../state/model";
import { matchesSearch } from "../state/learning";
import { clubs, diagnostics, openLessons } from "../data/learning";
import { SUBJECTS } from "../components/TutorForm";
import { useAction, Feedback } from "../components/feedback";
import { isClubOffering } from "../state/teacher";
import { C } from "../theme";
export function SearchScreen() {
  const { tutors, groups, filters, setFilters, favorites, user, mode } =
    useApp();
  const { data, rememberSearch, clearSearches, ready, error } = useLearning();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Barchasi");
  const [view, setView] = useState("Ro‘yxat");
  const [quick, setQuick] = useState<string[]>([]);
  const [sort, setSort] = useState("Mosligi");
  const action = useAction();
  const results = useMemo(() => {
    const list = filterTutors(tutors, filters).filter(
      (t) =>
        matchesSearch(
          `${t.name} ${t.subjects?.join(" ") || t.subject} ${t.specialty} ${t.area} ${t.bio}`,
          query,
        ) &&
        (!quick.includes("Hududimda") || t.area === user.area) &&
        (!quick.includes("Onlayn") || t.modes.includes("Onlayn")) &&
        (!quick.includes("Saqlangan") || favorites.includes(t.id)),
    );
    return sort === "Arzonroq"
      ? list.sort((a, b) => a.price - b.price)
      : sort === "Reyting"
        ? list.sort((a, b) => b.rating - a.rating)
        : list;
  }, [tutors, filters, query, quick, user.area, favorites, sort]);
  const matchesSubject = (subject: string) =>
    filters.subject === "Barchasi" || subject === filters.subject;
  const videos = openLessons.filter(
    (l) =>
      matchesSubject(l.subject) &&
      matchesSearch(`${l.title} ${l.subject} ${l.author}`, query),
  );
  const tests = diagnostics.filter(
    (t) =>
      matchesSubject(t.subject) &&
      matchesSearch(`${t.title} ${t.subject}`, query),
  );
  const communities = clubs.filter(
    (c) =>
      matchesSubject(c.subject) &&
      matchesSearch(`${c.title} ${c.subject} ${c.description}`, query),
  );
  const communityGroups = groups.filter(
    (g) =>
      isClubOffering(g) &&
      matchesSubject(g.subject) &&
      matchesSearch(`${g.title} ${g.subject} ${g.tutor} ${g.area}`, query),
  );
  const studyGroups = groups.filter(
    (g) =>
      !isClubOffering(g) &&
      matchesSubject(g.subject) &&
      (filters.area === "Barcha hududlar" || filters.area === g.area) &&
      (filters.mode === "Barchasi" || filters.mode === g.mode) &&
      matchesSearch(`${g.title} ${g.subject} ${g.tutor} ${g.area}`, query),
  );
  const categories = [
    {
      label: "Barchasi",
      count:
        results.length +
        videos.length +
        tests.length +
        communities.length +
        communityGroups.length +
        studyGroups.length,
    },
    { label: "Ustozlar", count: results.length },
    { label: "Video darslar", count: videos.length },
    { label: "Radar testlar", count: tests.length },
    { label: "Klublar", count: communities.length + communityGroups.length },
    { label: "Guruhlar", count: studyGroups.length },
  ];
  const count = categories.find((c) => c.label === category)!.count;
  const section = (name: string) =>
    category === "Barchasi" || category === name;
  const toggle = (value: string) =>
    setQuick((p) =>
      p.includes(value) ? p.filter((v) => v !== value) : [...p, value],
    );
  const reset = () => {
    setFilters(defaultFilters);
    setQuick([]);
    setQuery("");
  };
  return (
    <Screen
      top={
        <OqiHeader
          query={query}
          onChangeQuery={setQuery}
          onSubmitSearch={() => action.run(() => rememberSearch(query))}
        />
      }
    >
      <View
        style={[
          uiStyles.between,
          { alignItems: "flex-start", flexWrap: "wrap" },
        ]}
      >
        <View>
          <AppText variant="heading">Aqlli qidiruv</AppText>
          <AppText variant="caption" color={C.muted}>
            {count} ta natija · bir joyda barcha imkoniyatlar
          </AppText>
        </View>
        <Chip label="O‘zingizga mosini toping" tone="green" />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {categories.map((c) => (
          <Chip
            key={c.label}
            label={`${c.label} · ${c.count}`}
            selected={category === c.label}
            onPress={() => setCategory(c.label)}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {["Barchasi", ...SUBJECTS].map((s) => (
          <Chip
            key={s}
            label={s}
            selected={filters.subject === s}
            onPress={() => setFilters({ subject: s })}
          />
        ))}
      </ScrollView>
      {!query && data.recentSearches.length ? (
        <Card>
          <View style={uiStyles.between}>
            <AppText variant="caption" color={C.muted}>
              SO‘NGGI QIDIRUVLAR
            </AppText>
            <Button
              title="Tozalash"
              variant="soft"
              style={{ minHeight: 44 }}
              onPress={() => action.run(clearSearches)}
            />
          </View>
          <View style={uiStyles.wrap}>
            {data.recentSearches.map((q) => (
              <Chip key={q} label={q} onPress={() => setQuery(q)} />
            ))}
          </View>
        </Card>
      ) : null}
      {!query ? (
        <View style={uiStyles.wrap}>
          {["IELTS", "Matematika", "Speaking", "Fizika"].map((q) => (
            <Chip
              key={q}
              label={`#${q}`}
              tone="purple"
              onPress={() => {
                setQuery(q);
                if (ready) void action.run(() => rememberSearch(q));
              }}
            />
          ))}
        </View>
      ) : null}
      {section("Ustozlar") ? (
        <>
          <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
            <AppText variant="heading">Ustozlar · {results.length}</AppText>
            <View style={uiStyles.row}>
              {["Ro‘yxat", "Xarita"].map((v) => (
                <Chip
                  key={v}
                  label={v}
                  selected={view === v}
                  onPress={() => setView(v)}
                />
              ))}
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {["Hududimda", "Onlayn", "Saqlangan"].map((v) => (
              <Chip
                key={v}
                icon={
                  v === "Hududimda"
                    ? "map-pin"
                    : v === "Onlayn"
                      ? "globe"
                      : "heart"
                }
                label={
                  v === "Hududimda"
                    ? user.area
                    : v === "Onlayn"
                      ? "Onlayn"
                      : "Saqlangan"
                }
                selected={quick.includes(v)}
                onPress={() => toggle(v)}
              />
            ))}
          </ScrollView>
          <View style={uiStyles.wrap}>
            {["Mosligi", "Arzonroq", "Reyting"].map((v) => (
              <Chip
                key={v}
                label={v}
                selected={sort === v}
                onPress={() => setSort(v)}
              />
            ))}
          </View>
          {view === "Xarita" ? (
            <TutorMap tutors={results} />
          ) : (
            results.map((t) => <TutorCard key={t.id} tutor={t} />)
          )}
          {!results.length ? (
            <>
              <EmptyState
                title="Repetitor topilmadi"
                subtitle="Boshqa so‘z, fan yoki hududni sinab ko‘ring."
              />
              <Button
                title="Filtrlarni tozalash"
                variant="soft"
                onPress={reset}
              />
            </>
          ) : null}
        </>
      ) : null}
      {section("Video darslar") && videos.length ? (
        <>
          <AppText variant="heading">Video darslar · {videos.length}</AppText>
          {videos.map((l) => (
            <OpenLessonCard key={l.id} lesson={l} />
          ))}
        </>
      ) : null}
      {section("Radar testlar") && tests.length ? (
        <>
          <AppText variant="heading">Radar testlar · {tests.length}</AppText>
          {tests.map((t) => (
            <DiagnosticCard key={t.id} test={t} />
          ))}
        </>
      ) : null}
      {section("Klublar") && communities.length + communityGroups.length ? (
        <>
          <AppText variant="heading">
            Klublar · {communities.length + communityGroups.length}
          </AppText>
          {communityGroups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
          {communities.map((c) => (
            <ClubCard key={c.id} club={c} />
          ))}
        </>
      ) : null}
      {section("Guruhlar") && studyGroups.length ? (
        <>
          <AppText variant="heading">
            Ochiq guruhlar · {studyGroups.length}
          </AppText>
          {studyGroups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </>
      ) : null}
      {!count && category !== "Ustozlar" && category !== "Barchasi" ? (
        <>
          <EmptyState
            title="Natija topilmadi"
            subtitle="Boshqa so‘z yoki fanni tanlang."
          />
          <Button title="Filtrlarni tozalash" variant="soft" onPress={reset} />
        </>
      ) : null}
      <Feedback error={error || action.error} />
      {mode === "demo" ? (
        <AppText variant="caption" color={C.muted}>
          Ustoz va guruhlar — sinov katalogi. Reytinglar qoldirilgan fikrlardan
          hisoblanadi.
        </AppText>
      ) : null}
      <AppText variant="caption" color={C.muted}>
        Narx, reyting va tezkor filtrlar ustozlarga qo‘llanadi. Video va testlar
        fan bo‘yicha saralanadi.
      </AppText>
    </Screen>
  );
}
