import {
  FilterPanel,
  FilterOptions,
  FilterSelect,
  filterChoices,
} from "../components/FilterControls";
import { useAppNavigation } from "../navigation";
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
  const { tutors, groups, filters, setFilters, favorites, user, mode, market } =
    useApp();
  const { data, rememberSearch, clearSearches, ready, error } = useLearning();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Barchasi");
  const [view, setView] = useState("Ro‘yxat");
  const [quick, setQuick] = useState<string[]>([]);
  const [sort, setSort] = useState("Mosligi");
  const [verifiedOnly, setVerifiedOnly] = useState(false),
    [weekday, setWeekday] = useState("all"),
    [period, setPeriod] = useState("all");
  const available = (tutorId: string, offeringId?: string) => {
    if (weekday === "all" && period === "all") return true;
    return market.sessions.some((s) => {
      const g = market.offerings.find((g) => g.id === s.offeringId);
      if (
        !g ||
        g.tutorId !== tutorId ||
        (offeringId && s.offeringId !== offeringId) ||
        Date.parse(s.startsAt) < Date.now()
      )
        return false;
      const d = new Date(Date.parse(s.startsAt) + 5 * 3600000),
        hour = d.getUTCHours();
      return (
        (weekday === "all" || d.getUTCDay() === Number(weekday)) &&
        (period === "all" ||
          (period === "morning"
            ? hour < 12
            : period === "afternoon"
              ? hour >= 12 && hour < 18
              : hour >= 18))
      );
    });
  };
  const action = useAction();
  const navigation = useAppNavigation();
  const results = useMemo(() => {
    const list = filterTutors(tutors, filters).filter(
      (t) =>
        matchesSearch(
          `${t.name} ${t.subjects?.join(" ") || t.subject} ${t.specialty} ${t.area} ${t.bio}`,
          query,
        ) &&
        ((!quick.includes("Hududimda") && !quick.includes("Yaqin atrofda")) ||
          t.area === user.area) &&
        ((!quick.includes("Onlayn") && !quick.includes("Online dars")) ||
          t.modes.includes("Onlayn")) &&
        (!quick.includes("Top reyting 4.9+") || t.rating >= 4.9) &&
        (!quick.includes("Bepul sinov") || t.freeTrial) &&
        (!quick.includes("Saqlangan") || favorites.includes(t.id)) &&
        (!verifiedOnly || t.verified) &&
        available(t.id),
    );
    return sort === "Arzonroq"
      ? list.sort((a, b) => a.price - b.price)
      : sort === "Reyting"
        ? list.sort((a, b) => b.rating - a.rating)
        : list.sort(
            (a, b) =>
              Number(
                user.interests.some((s) =>
                  (b.subjects || [b.subject]).includes(s),
                ),
              ) -
                Number(
                  user.interests.some((s) =>
                    (a.subjects || [a.subject]).includes(s),
                  ),
                ) ||
              Number(b.area === user.area) - Number(a.area === user.area) ||
              b.rating - a.rating,
          );
  }, [
    tutors,
    filters,
    query,
    quick,
    user.area,
    favorites,
    sort,
    verifiedOnly,
    weekday,
    period,
    market,
    user.interests,
  ]);
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
  const communities = (mode === "demo" ? clubs : []).filter(
    (c) =>
      matchesSubject(c.subject) &&
      matchesSearch(`${c.title} ${c.subject} ${c.description}`, query),
  );
  const communityGroups = groups.filter(
    (g) =>
      isClubOffering(g) &&
      (filters.area === "Barcha hududlar" || filters.area === g.area) &&
      (filters.mode === "Barchasi" || filters.mode === g.mode) &&
      g.price >= filters.minPrice &&
      g.price <= filters.maxPrice &&
      matchesSubject(g.subject) &&
      matchesSearch(`${g.title} ${g.subject} ${g.tutor} ${g.area}`, query),
  );
  const studyGroups = groups.filter(
    (g) =>
      !isClubOffering(g) &&
      available(g.tutorId, g.id) &&
      g.price >= filters.minPrice &&
      g.price <= filters.maxPrice &&
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
    { label: "Testlar", count: tests.length },
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
    setVerifiedOnly(false);
    setWeekday("all");
    setPeriod("all");
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
          <AppText variant="heading">Qidiruv</AppText>
          <AppText variant="caption" color={C.muted}>
            {count} ta natija
          </AppText>
        </View>
      </View>
      <FilterOptions
        label="Natija turi"
        options={categories.map((c) => ({
          value: c.label,
          label: `${c.label} · ${c.count}`,
        }))}
        value={category}
        onChange={setCategory}
      />
      <FilterPanel
        count={
          Number(filters.subject !== "Barchasi") +
          Number(filters.area !== "Barcha hududlar") +
          Number(filters.mode !== "Barchasi") +
          Number(
            filters.minPrice !== defaultFilters.minPrice ||
              filters.maxPrice !== defaultFilters.maxPrice,
          ) +
          Number(filters.minRating > 0) +
          quick.length +
          Number(sort !== "Mosligi") +
          Number(verifiedOnly) +
          Number(weekday !== "all") +
          Number(period !== "all")
        }
        onReset={() => {
          reset();
          setSort("Mosligi");
        }}
      >
        <Chip
          label="Faqat tasdiqlangan ustozlar"
          selected={verifiedOnly}
          onPress={() => setVerifiedOnly((v) => !v)}
        />
        <FilterSelect
          label="Dars kuni"
          value={weekday}
          onChange={setWeekday}
          options={[
            { value: "all", label: "Barcha kunlar" },
            ...[
              "Yakshanba",
              "Dushanba",
              "Seshanba",
              "Chorshanba",
              "Payshanba",
              "Juma",
              "Shanba",
            ].map((label, i) => ({ value: String(i), label })),
          ]}
        />
        <FilterSelect
          label="Dars vaqti"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "all", label: "Istalgan vaqt" },
            { value: "morning", label: "Ertalab · 12:00 gacha" },
            { value: "afternoon", label: "Kunduzi · 12:00–18:00" },
            { value: "evening", label: "Kechqurun · 18:00 dan" },
          ]}
        />
        {weekday !== "all" || period !== "all" ? (
          <AppText variant="caption" color={C.muted}>
            Vaqt filtri e’lon qilingan kelgusi darslar jadvaliga asoslanadi.
          </AppText>
        ) : null}
        <FilterSelect
          label="Fan"
          options={filterChoices(["Barchasi", ...SUBJECTS])}
          value={filters.subject}
          onChange={(subject) => setFilters({ subject })}
        />
        <FilterSelect
          label="Hudud"
          options={filterChoices([
            "Barcha hududlar",
            ...new Set(
              [
                user.area,
                ...tutors.map((t) => t.area),
                ...groups.map((g) => g.area),
              ].filter(Boolean),
            ),
          ])}
          value={filters.area}
          onChange={(area) => setFilters({ area })}
        />
        <FilterOptions
          label="Dars shakli"
          options={filterChoices(["Barchasi", "Onlayn", "Oflayn"])}
          value={filters.mode}
          onChange={(mode) => setFilters({ mode })}
        />
        <FilterOptions
          label="Saralash"
          options={filterChoices(["Mosligi", "Arzonroq", "Reyting"])}
          value={sort}
          onChange={setSort}
        />
        <View style={{ gap: 6 }}>
          <AppText variant="caption" color={C.muted}>
            Ustozlar uchun tezkor tanlovlar
          </AppText>
          <View style={uiStyles.wrap}>
            {["Hududimda", "Top reyting 4.9+", "Saqlangan"].map((v) => (
              <Chip
                key={v}
                label={v}
                selected={quick.includes(v)}
                onPress={() => toggle(v)}
              />
            ))}
          </View>
        </View>
        <Button
          title="Narx va reyting filtrlari"
          icon="sliders"
          variant="outline"
          onPress={() => navigation.navigate("Filters")}
        />
      </FilterPanel>
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
          {[
            "#DTM_2026",
            "#IELTS_8.0",
            "#Olimpiada",
            "#Python_AI",
            "#Milliy_Sertifikat",
          ].map((q) => (
            <Chip
              key={q}
              label={q}
              tone="purple"
              onPress={() => {
                const term = q.replace(/^#/, "");
                setQuery(term);
                if (ready) void action.run(() => rememberSearch(term));
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
                  icon={v === "Xarita" ? "map" : "list"}
                  selected={view === v}
                  onPress={() => setView(v)}
                />
              ))}
            </View>
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
      {section("Testlar") && tests.length ? (
        <>
          <AppText variant="heading">Testlar · {tests.length}</AppText>
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
