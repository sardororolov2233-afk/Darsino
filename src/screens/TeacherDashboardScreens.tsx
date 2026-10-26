import React, { useState } from "react";
import { Platform, Share, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useApp } from "../state/AppContext";
import { useClassroom } from "../state/ClassroomContext";
import { useAppNavigation, type RootStackParamList } from "../navigation";
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
  WorkspaceHeader,
  WORKSPACE,
  TeacherSchedule,
} from "../components/ClassroomUI";
import { FilterSelect } from "../components/FilterControls";
import { LocalizedPressable as Pressable } from "../i18n/native";
import { UserAvatar } from "../components/UserAvatar";
import { MonthPicker } from "../components/GroupPayments";
import { Feedback, useAction } from "../components/feedback";
import {
  dailyAttendance,
  teacherDebtors,
  teacherStudentProgress,
} from "../state/teacherDashboard";
import { dateLabel, dmId, localDate } from "../state/domain";
import { paymentMonth } from "../state/payments";
import { matchesSearch } from "../state/learning";
import { formatPrice } from "../data/catalog";
import { C, font } from "../theme";

const level = (score: number | null) =>
  score === null
    ? "Natija yo‘q"
    : score >= 85
      ? "A’lo"
      : score >= 70
        ? "Yaxshi"
        : score >= 50
          ? "Qoniqarli"
          : "E’tibor kerak";
const scoreColor = (score: number | null) =>
  score === null
    ? C.muted
    : score >= 85
      ? C.green
      : score >= 70
        ? WORKSPACE
        : score >= 60
          ? "#B7791F"
          : C.error;

export function TeacherStudentsScreen() {
  const { user, market } = useApp(),
    classroom = useClassroom(),
    navigation = useAppNavigation(),
    action = useAction();
  const [group, setGroup] = useState("all"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("score");
  const rows = teacherStudentProgress(market, user.id, classroom.data, group);
  const measured = rows.filter((r) => r.score !== null),
    average = measured.length
      ? measured.reduce((n, r) => n + r.score!, 0) / measured.length
      : null;
  const groups = market.offerings.filter((g) => g.tutorId === user.id);
  const visible = rows
    .filter(
      (r) =>
        matchesSearch(
          `${r.name} ${r.groups.map((g) => g.title).join(" ")}`,
          query,
        ) &&
        (sort !== "risk" || (r.score !== null && r.score < 60)),
    )
    .sort((a, b) =>
      sort === "activity"
        ? b.results.length - a.results.length
        : (b.score ?? -1) - (a.score ?? -1),
    );
  const report = async () => {
    const escape = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      "Ism,Guruhlar,O‘zlashtirish,Davomat",
      ...visible.map((r) =>
        [
          r.name,
          r.groups.map((g) => g.title).join(" / "),
          r.score ?? "",
          `${r.present}/${r.expected}`,
        ]
          .map(escape)
          .join(","),
      ),
    ].join("\n");
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const url = URL.createObjectURL(
        new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "oqi-oquvchilar.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else await Share.share({ message: csv, title: "O‘quvchilar hisoboti" });
  };
  return (
    <Screen lightTop top={<WorkspaceHeader title="O‘quvchilar" />}>
      <Card
        style={{ backgroundColor: "#F0EEFF", borderColor: "#DBD5FF", gap: 14 }}
      >
        <View style={uiStyles.between}>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">Umumiy o‘zlashtirish</AppText>
            <AppText variant="caption" color={C.muted}>
              Jami {rows.length} nafar faol o‘quvchi
            </AppText>
          </View>
          <Chip
            label={
              average === null
                ? "Hali o‘lchanmagan"
                : `${average.toFixed(1)}% o‘rtacha`
            }
            tone="green"
          />
        </View>
        <View
          style={{
            height: 9,
            backgroundColor: "#DED9F9",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 9,
              width: `${average ?? 0}%`,
              backgroundColor: WORKSPACE,
              borderRadius: 10,
            }}
          />
        </View>
        <View style={uiStyles.between}>
          <AppText variant="caption" color={C.muted}>
            0%
          </AppText>
          <AppText variant="caption" color={C.muted}>
            Maqsad: 85%+
          </AppText>
          <AppText variant="caption" color={C.muted}>
            100%
          </AppText>
        </View>
        <View style={uiStyles.wrap}>
          {[
            {
              label: "A’lo (85–100%)",
              count: measured.filter((r) => r.score! >= 85).length,
              color: C.green,
              background: C.greenSoft,
            },
            {
              label: "Yaxshi (70–84%)",
              count: measured.filter((r) => r.score! >= 70 && r.score! < 85)
                .length,
              color: WORKSPACE,
              background: "#F4F1FF",
            },
            {
              label: "Qoniqarli (50–69%)",
              count: measured.filter((r) => r.score! >= 50 && r.score! < 70)
                .length,
              color: "#A56B15",
              background: "#FFF7E7",
            },
            {
              label: "E’tibor kerak (<50%)",
              count: measured.filter((r) => r.score! < 50).length,
              color: C.error,
              background: C.errorSoft,
            },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flexBasis: "46%",
                flexGrow: 1,
                backgroundColor: item.background,
                padding: 11,
                borderRadius: 12,
                gap: 4,
              }}
            >
              <AppText variant="caption" color={item.color}>
                {item.label}
              </AppText>
              <AppText variant="heading" color={item.color}>
                {item.count} nafar
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" color={C.muted}>
          {measured.length} o‘quvchining haqiqiy test natijasi mavjud.
        </AppText>
      </Card>
      <Field
        accessibilityLabel="O‘quvchilarni qidirish"
        placeholder="O‘quvchini yoki guruhini izlang..."
        icon="search"
        value={query}
        onChangeText={setQuery}
      />
      <FilterSelect
        label="O‘quvchilar guruhi"
        value={group}
        onChange={setGroup}
        options={[
          { value: "all", label: "Barcha guruhlar" },
          ...groups.map((g) => ({ value: g.id, label: g.title })),
        ]}
      />
      <View style={[uiStyles.row, { flexWrap: "wrap" }]}>
        {[
          { value: "score", label: "O‘zlashtirish (yuqori)" },
          { value: "risk", label: "Xavf ostida (<60%)" },
          { value: "activity", label: "Faollik" },
        ].map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            selected={sort === item.value}
            onPress={() => setSort(item.value)}
          />
        ))}
      </View>
      {visible.map((row) => (
        <Card
          key={row.studentId}
          style={{
            borderColor:
              row.score !== null && row.score < 60 ? "#F6B7C0" : C.border,
            gap: 14,
          }}
        >
          <View style={uiStyles.row}>
            <UserAvatar
              userId={row.studentId}
              initials={row.name.slice(0, 1)}
            />
            <View style={{ flex: 1 }}>
              <AppText variant="label" localize={false}>
                {row.name}
              </AppText>
              <AppText variant="caption" color={C.muted} numberOfLines={2}>
                {row.groups.map((g) => g.title).join(" · ")}
              </AppText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <AppText variant="heading" color={scoreColor(row.score)}>
                {row.score === null ? "—" : `${row.score}%`}
              </AppText>
              <AppText variant="caption" color={scoreColor(row.score)}>
                {level(row.score)}
              </AppText>
            </View>
          </View>
          <View style={uiStyles.row}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="caption" color={C.muted}>
                Jami to‘g‘ri javoblar
              </AppText>
              <AppText variant="label">
                {row.total
                  ? `${row.correct} / ${row.total}`
                  : "Hali test topshirmagan"}
              </AppText>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="caption" color={C.muted}>
                Davomat holati
              </AppText>
              <AppText variant="label">
                {row.expected
                  ? `${row.attendancePercent}% (${row.present}/${row.expected})`
                  : "Dars boshlanmagan"}
              </AppText>
            </View>
          </View>
          <Button
            title={
              row.score !== null && row.score < 60
                ? "Shaxsiy reja va tahlil"
                : "Profil va tahlil"
            }
            icon="chevron-right"
            variant="soft"
            onPress={() =>
              navigation.navigate("TeacherStudentDetail", {
                id: row.studentId,
                groupId: group,
              })
            }
          />
        </Card>
      ))}
      {!visible.length ? (
        <EmptyState
          title="O‘quvchi topilmadi"
          subtitle={
            rows.length
              ? "Qidiruv va guruh filtrini o‘zgartiring."
              : "Arizalar tasdiqlangach guruh o‘quvchilari shu yerda ko‘rinadi."
          }
          icon="users"
        />
      ) : null}
      <Card>
        <AppText variant="heading">Guruh amallari va hisobot</AppText>
        <AppText color={C.muted}>Tanlangan: {visible.length} o‘quvchi</AppText>
        <View style={uiStyles.wrap}>
          <Button
            title="Test yuklash"
            icon="plus-square"
            variant="gold"
            onPress={() =>
              navigation.navigate("Main", { screen: "TeacherTests" })
            }
          />
          <Button
            title="Hisobotni olish"
            icon="download"
            variant="outline"
            disabled={!visible.length}
            onPress={() => action.run(report)}
          />
        </View>
      </Card>
      <Feedback error={action.error || classroom.error} />
    </Screen>
  );
}

export function TeacherStudentDetailScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "TeacherStudentDetail">) {
  const { market, user } = useApp(),
    classroom = useClassroom(),
    navigation = useAppNavigation();
  const row = teacherStudentProgress(
    market,
    user.id,
    classroom.data,
    route.params.groupId || "all",
  ).find((r) => r.studentId === route.params.id);
  return (
    <Screen lightTop top={<WorkspaceHeader title="Profil va tahlil" back />}>
      {!row ? (
        <EmptyState
          title="O‘quvchi topilmadi"
          subtitle="Faqat o‘z guruhingizdagi faol o‘quvchini ochishingiz mumkin."
        />
      ) : (
        <>
          <Card>
            <View style={uiStyles.row}>
              <UserAvatar
                userId={row.studentId}
                initials={row.name.slice(0, 1)}
              />
              <View style={{ flex: 1 }}>
                <AppText variant="title" localize={false}>
                  {row.name}
                </AppText>
                <AppText color={C.muted}>
                  {row.groups.map((g) => g.title).join(" · ")}
                </AppText>
              </View>
            </View>
            <AppText variant="display" color={scoreColor(row.score)}>
              {row.score === null ? "Hali o‘lchanmagan" : `${row.score}%`}
            </AppText>
            <AppText color={C.muted}>
              Davomat: {row.present}/{row.expected} · {row.marked} ta
              belgilangan
            </AppText>
          </Card>
          <Button
            title="O‘quvchiga yozish"
            icon="message-circle"
            onPress={() =>
              navigation.navigate("Conversation", {
                id: dmId(row.studentId, user.id),
              })
            }
          />
          <Button
            title="Shaxsiy test yuborish"
            icon="target"
            variant="gold"
            onPress={() =>
              navigation.navigate("AssignDiagnostic", {
                studentId: row.studentId,
                offeringId: row.groups[0]?.id,
              })
            }
          />
          <AppText variant="heading">Test natijalari</AppText>
          {row.results.map((result) => (
            <Card key={result.id}>
              <View style={uiStyles.between}>
                <AppText variant="label" style={{ flex: 1 }} localize={false}>
                  {result.title}
                </AppText>
                <Chip label={`${result.percentage}%`} tone="green" />
              </View>
              <AppText>
                {result.correct}/{result.questions} to‘g‘ri javob
              </AppText>
              {result.date ? (
                <AppText variant="caption" color={C.muted}>
                  {dateLabel(result.date)}
                </AppText>
              ) : null}
            </Card>
          ))}
          {!row.results.length ? (
            <EmptyState
              title="Hali natija yo‘q"
              subtitle="Mock test yoki ulashilgan diagnostikadan keyin natija ko‘rinadi."
              icon="bar-chart-2"
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

export function TeacherAttendanceScreen() {
  const { market, user } = useApp();
  const [group, setGroup] = useState("all");
  const groups = market.offerings.filter((g) => g.tutorId === user.id);
  const stats = dailyAttendance(market, user.id, localDate(new Date()));
  return (
    <Screen lightTop top={<WorkspaceHeader title="Davomat" back />}>
      <Card style={{ backgroundColor: C.greenSoft }}>
        <AppText variant="heading">Bugungi davomat</AppText>
        <AppText variant="display" color={C.green}>
          {stats.present} / {stats.expected}
        </AppText>
        <AppText color={C.muted}>
          {stats.marked} belgilangan · {stats.sessions.length} dars
        </AppText>
      </Card>
      <FilterSelect
        label="Davomat guruhi"
        value={group}
        onChange={setGroup}
        options={[
          { value: "all", label: "Barcha guruhlar" },
          ...groups.map((g) => ({ value: g.id, label: g.title })),
        ]}
      />
      <TeacherSchedule initialGroup={group} attendance />
    </Screen>
  );
}
export function TeacherDebtorsScreen() {
  const { market, user } = useApp(),
    navigation = useAppNavigation();
  const [month, setMonth] = useState(paymentMonth),
    [group, setGroup] = useState("all"),
    [query, setQuery] = useState("");
  const rows = teacherDebtors(market, user.id, month, group).filter((r) =>
    matchesSearch(r.name, query),
  );
  const groups = market.offerings.filter((g) => g.tutorId === user.id);
  return (
    <Screen lightTop top={<WorkspaceHeader title="Qarzdorlar" back />}>
      <MonthPicker month={month} onChange={setMonth} />
      <Card style={{ backgroundColor: "#FFF1F2", borderColor: "#FECDD3" }}>
        <AppText variant="heading">Qarzdor o‘quvchilar</AppText>
        <AppText variant="display" color={C.error}>
          {rows.length} nafar
        </AppText>
        <AppText variant="label" color={C.error}>
          {formatPrice(rows.reduce((sum, row) => sum + row.total, 0))}
        </AppText>
      </Card>
      <Field
        accessibilityLabel="Qarzdorlarni qidirish"
        placeholder="O‘quvchi ismi..."
        value={query}
        onChangeText={setQuery}
        icon="search"
      />
      <FilterSelect
        label="To‘lov guruhi"
        value={group}
        onChange={setGroup}
        options={[
          { value: "all", label: "Barcha guruhlar" },
          ...groups.map((g) => ({ value: g.id, label: g.title })),
        ]}
      />
      {rows.map((row) => (
        <Card key={row.studentId}>
          <View style={uiStyles.row}>
            <UserAvatar
              userId={row.studentId}
              initials={row.name.slice(0, 1)}
            />
            <View style={{ flex: 1 }}>
              <AppText variant="label" localize={false}>
                {row.name}
              </AppText>
              <AppText variant="caption" color={C.muted}>
                {row.groups.length} guruh bo‘yicha
              </AppText>
            </View>
            <AppText variant="label" color={C.error}>
              {formatPrice(row.total)}
            </AppText>
          </View>
          {row.groups.map(({ group: item, amount }) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${row.name}: ${item.title} to‘lovini ochish`}
              onPress={() =>
                navigation.navigate("ManageClass", {
                  id: item.id,
                  tab: "O‘quvchilar",
                  month,
                  paymentStatus: "Qarzdor",
                })
              }
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: C.border,
                gap: 8,
              }}
            >
              <AppText style={{ flex: 1 }} localize={false}>
                {item.title}
              </AppText>
              <AppText color={C.error}>{formatPrice(amount)}</AppText>
              <Icon name="chevron-right" size={18} />
            </Pressable>
          ))}
        </Card>
      ))}
      {!rows.length ? (
        <EmptyState
          title="Qarzdorlar yo‘q"
          subtitle="Tanlangan oy va guruh bo‘yicha to‘lanmagan summa yo‘q."
          icon="check-circle"
        />
      ) : null}
    </Screen>
  );
}
