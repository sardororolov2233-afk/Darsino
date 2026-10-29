import { WorkspaceHeader } from "./ClassroomUI";
import { offeringScheduleLabel } from "../state/domain";
import { LocalizedPressable as Pressable } from "../i18n/native";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { RadarChart } from "./RadarChart";
import { FilterSelect } from "./FilterControls";
import { monthLabel, paymentMonth, paymentSummary } from "../state/payments";
import type Feather from "@expo/vector-icons/Feather";
import { Brand } from "./Brand";
import { AppText, Button, Card, Chip, Icon, uiStyles } from "./ui";
import { useApp } from "../state/AppContext";
import { useTeacher } from "../state/TeacherContext";
import { useAppNavigation } from "../navigation";
import { C, font } from "../theme";
import { assessmentSummary } from "../state/assessments";
import { isClubOffering, teacherOverview } from "../state/teacher";
import { dateLabel, timeLabel, type Offering } from "../state/domain";
import { formatPrice } from "../data/catalog";

export function TeacherHeader() {
  const { user } = useApp();
  const navigation = useAppNavigation();
  return (
    <View
      style={{
        backgroundColor: C.white,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}
    >
      <WorkspaceHeader title={user.name.split(" ")[0] || "Boshqaruv"} />
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          paddingTop: 2,
        }}
      >
        <Button
          title="Test berish"
          icon="target"
          variant="soft"
          style={{ flex: 1, paddingHorizontal: 8 }}
          onPress={() => navigation.navigate("AssignDiagnostic")}
        />
        <Button
          title="QR skanerlash"
          icon="maximize"
          variant="outline"
          style={{ flex: 1, paddingHorizontal: 8 }}
          onPress={() => navigation.navigate("ScanContact")}
        />
        <Button
          title=""
          accessibilityLabel="Chatni ochish"
          icon="message-circle"
          variant="soft"
          style={{ width: 48, paddingHorizontal: 0 }}
          onPress={() => navigation.navigate("Main", { screen: "Chats" })}
        />
      </View>
    </View>
  );
}
export function TeacherMetric({
  title,
  value,
  subtitle,
  badge,
  icon,
  dark = false,
  progress,
  onPress,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  badge?: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  dark?: boolean;
  progress?: number;
  onPress?: () => void;
}) {
  return (
    <Card
      style={{
        flexBasis: "46%",
        flexGrow: 1,
        minWidth: 0,
        padding: 13,
        gap: 6,
        backgroundColor: dark ? C.action : C.white,
        borderColor: dark ? C.primaryBorder : C.border,
        borderRadius: 20,
      }}
      onPress={onPress}
      accessibilityLabel={onPress ? title : undefined}
    >
      <View style={uiStyles.between}>
        <AppText
          variant="caption"
          color={dark ? C.primary : C.muted}
          style={{ flex: 1, fontSize: 11, fontFamily: font.bold }}
        >
          {title}
        </AppText>
        <View
          style={[
            styles.metricIcon,
            { backgroundColor: dark ? C.white : C.primarySoft },
          ]}
        >
          <Icon name={icon} color={C.primary} size={16} />
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <AppText
          variant="title"
          color={dark ? C.navy : C.ink}
          style={{ fontSize: 18, fontFamily: font.extra }}
        >
          {value}
        </AppText>
        {badge ? (
          <View style={styles.kpiBadge}>
            <AppText
              variant="caption"
              style={{
                fontSize: 9,
                fontFamily: font.extra,
                color: C.green,
              }}
            >
              {badge}
            </AppText>
          </View>
        ) : null}
      </View>
      {progress !== undefined ? (
        <View style={styles.track}>
          <View
            style={{
              height: 5,
              width: `${Math.min(100, progress)}%`,
              backgroundColor: C.accent,
              borderRadius: 3,
            }}
          />
        </View>
      ) : null}
      <AppText variant="caption" color={C.muted} style={{ fontSize: 10 }}>
        {subtitle}
      </AppText>
    </Card>
  );
}

export function TeacherRadar({
  offeringId = "all",
  onSelect,
  compact = false,
}: {
  offeringId?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
}) {
  const { market, user } = useApp(),
    navigation = useAppNavigation();
  const classes = market.offerings.filter((g) => g.tutorId === user.id);
  const summary = assessmentSummary(market, user.id, offeringId);
  return (
    <Card>
      <AppText variant="heading">O‘quvchilar test tahlili</AppText>
      {onSelect ? (
        <FilterSelect
          label="Tahlil uchun guruh"
          value={offeringId}
          onChange={onSelect}
          options={[
            { value: "all", label: "Barcha guruhlar" },
            ...classes.map((g) => ({ value: g.id, label: g.title })),
          ]}
        />
      ) : null}
      {summary.total ? (
        <>
          <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
            <AppText variant="title" color={C.green}>
              {summary.score}%
            </AppText>
            <Chip
              label={`${summary.results.length} ta ulashilgan natija`}
              tone="purple"
            />
          </View>
          {!compact ? <RadarChart skills={summary.skills} /> : null}
          <AppText variant="caption" color={C.muted}>
            {summary.total} savoldan {summary.correct} tasi to‘g‘ri. Har bir
            o‘quvchining guruhdagi oxirgi ulashilgan natijasi hisoblanadi.
          </AppText>
        </>
      ) : (
        <AppText color={C.muted}>
          Hali natijalar ulashilmagan. O‘quvchilarga test yuboring; ulashilgan
          javoblar shu yerda ko‘rinadi.
        </AppText>
      )}
      <Button
        title="Test tayinlash"
        icon="send"
        variant="soft"
        onPress={() =>
          navigation.navigate(
            "AssignDiagnostic",
            offeringId === "all" ? {} : { offeringId },
          )
        }
      />
    </Card>
  );
}

export function TeacherGroupCard({
  group,
  onManage,
}: {
  group: Offering;
  onManage?: () => void;
}) {
  const { market } = useApp(),
    navigation = useAppNavigation();
  const active = market.enrollments.filter(
    (e) => e.offeringId === group.id && e.active,
  ).length;
  const total = group.enrolledCount ?? active + group.reservedSeats;
  const fill = Math.min(100, Math.round((100 * total) / group.capacity));
  const next = market.sessions
    .filter(
      (s) => s.offeringId === group.id && Date.parse(s.endsAt) > Date.now(),
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  return (
    <Card>
      <View style={uiStyles.wrap}>
        <Chip label={group.mode} tone="purple" />
        <Chip
          label={group.published ? "Qabul ochiq" : "Qabul yopiq"}
          tone={group.published ? "green" : undefined}
        />
        {isClubOffering(group) ? <Chip label="Klub" tone="gold" /> : null}
      </View>
      <AppText variant="heading">{group.title}</AppText>
      <AppText variant="caption" color={C.muted}>
        {offeringScheduleLabel(group)}
      </AppText>
      <AppText variant="caption" color={C.muted}>
        {group.location}
      </AppText>
      <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
        <AppText variant="label">{formatPrice(group.price)} / oy</AppText>
        <AppText variant="caption" color={C.muted}>
          {total}/{group.capacity} o‘rin
        </AppText>
      </View>
      <View style={styles.track}>
        <View
          style={{
            height: 6,
            width: `${fill}%`,
            backgroundColor: C.accent,
            borderRadius: 3,
          }}
        />
      </View>
      <AppText variant="caption" color={C.muted}>
        {active} faol o‘quvchi
        {group.reservedSeats
          ? ` · ${group.reservedSeats} katalogda band o‘rin`
          : ""}
      </AppText>
      <AppText variant="caption" color={C.muted}>
        {next
          ? `Keyingi dars: ${dateLabel(next.startsAt)} · ${timeLabel(next.startsAt)}`
          : "Kelgusi dars belgilanmagan"}
      </AppText>
      <Button
        title="Boshqarish"
        accessibilityLabel={`${group.title.replace(/\s+guruhi$/i, "")} guruhini boshqarish`}
        icon="arrow-up-right"
        variant="soft"
        onPress={
          onManage ||
          (() => navigation.navigate("ManageClass", { id: group.id }))
        }
      />
    </Card>
  );
}

export function TeacherFinance() {
  const { data } = useTeacher(),
    { market, user } = useApp(),
    navigation = useAppNavigation();
  const month = paymentMonth(),
    summary = paymentSummary(market, user.id, month);
  const cost = data.roomPlans
    .filter((p) => paymentMonth(new Date(p.startsAt)) === month)
    .reduce((sum, p) => sum + p.estimatedCost, 0);
  return (
    <Card
      style={{ backgroundColor: C.primarySoft, borderColor: C.primaryBorder }}
    >
      <AppText variant="caption" color={C.primary}>
        Oylik hisobot · {monthLabel(month)}
      </AppText>
      <AppText variant="title" color={C.navy}>
        {formatPrice(summary.received)}
      </AppText>
      <AppText variant="caption" color={C.ink}>
        To‘langan · {summary.paidCount} o‘quvchi
      </AppText>
      <AppText variant="caption" color={C.muted}>
        To‘lov qoldig‘i: {formatPrice(summary.outstanding)}
      </AppText>
      <AppText variant="caption" color={C.muted}>
        Xona rejalari xarajati: {formatPrice(cost)} · taxminiy
      </AppText>
      <Button
        title="Daromad va to‘lovlar"
        variant="gold"
        icon="credit-card"
        onPress={() => navigation.navigate("TeacherFinance")}
      />
    </Card>
  );
}

export function TeacherProfileSummary() {
  const { market, user } = useApp();
  const profile = market.tutorProfiles.find((p) => p.userId === user.id);
  const overview = teacherOverview(market, user.id),
    reviews = market.reviews.filter((r) => r.tutorId === user.id);
  const rating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(
        1,
      )
    : "—";
  return (
    <Card style={{ alignItems: "center" }}>
      <Chip
        label={
          profile?.verification === "approved"
            ? "Tasdiqlangan ustoz"
            : "Profil tekshiruvi"
        }
        tone="gold"
      />
      <AppText variant="heading" style={{ textAlign: "center" }}>
        {user.name}
      </AppText>
      <AppText
        variant="caption"
        color={C.purple}
        style={{ textAlign: "center" }}
      >
        {profile?.specialty || "Mutaxassislik kiritilmagan"}
      </AppText>
      <View style={uiStyles.wrap}>
        <Chip label={`Reyting ${rating} · ${reviews.length} sharh`} />
        <Chip
          label={`${overview.studentIds.size} faol o‘quvchi`}
          tone="green"
        />
        <Chip
          label={`${overview.classes.length} guruh va dars`}
          tone="purple"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandButton: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },
  roleBadge: {
    backgroundColor: "#FBBF24",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  action: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF18",
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F43F5E",
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  track: {
    height: 5,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  masteryPill: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  topBadge: {
    backgroundColor: C.mint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});
