import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Polygon, Line, Text as SvgText } from "react-native-svg";
import type Feather from "@expo/vector-icons/Feather";
import { Brand } from "./Brand";
import { AppText, Button, Card, Chip, Icon, uiStyles } from "./ui";
import { useApp } from "../state/AppContext";
import { useTeacher } from "../state/TeacherContext";
import { useAppNavigation } from "../navigation";
import { C, font } from "../theme";
import { assessmentSummary } from "../state/assessments";
import { isClubOffering, teacherOverview } from "../state/teacher";
import type { Offering } from "../state/domain";
import { formatPrice } from "../data/catalog";

export function TeacherHeader() {
  const { user, notifications, requests, market } = useApp();
  const navigation = useAppNavigation();
  const profile = market.tutorProfiles.find((p) => p.userId === user.id);
  const pending = requests.filter(
    (r) => r.tutorId === user.id && r.status === "pending",
  ).length;
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ustoz bosh sahifasi"
          onPress={() => navigation.popTo("Main", { screen: "Home" })}
          style={styles.brandButton}
        >
          <Brand width={96} light />
        </Pressable>
        <View style={styles.roleBadge}>
          <AppText
            variant="caption"
            style={{ fontFamily: font.extra, fontSize: 10, color: "#0B1E47" }}
          >
            USTOZ PRO
          </AppText>
        </View>
        <View style={{ flex: 1 }} />
        <Button
          title="Test berish"
          icon="target"
          variant="gold"
          onPress={() => navigation.navigate("AssignDiagnostic")}
          style={{ minHeight: 36, paddingHorizontal: 10, borderRadius: 12 }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bildirishnomalar"
          onPress={() => navigation.navigate("Notifications")}
          style={styles.action}
        >
          <Icon name="bell" color={C.white} size={18} />
          {unread || pending ? <View style={styles.dot} /> : null}
        </Pressable>
      </View>
      <View style={uiStyles.between}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="label" color={C.white} numberOfLines={1}>
            {user.name || "Aliyev Temur"}
          </AppText>
          <AppText variant="caption" color="#C6D5F1" numberOfLines={1}>
            {profile?.subjects.join(" · ") || "Matematika"} • ⭐ 4.95
          </AppText>
        </View>
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
        flexBasis: "47%",
        flexGrow: 1,
        padding: 13,
        gap: 6,
        backgroundColor: dark ? C.navy : C.white,
        borderColor: dark ? C.navy : C.border,
        borderRadius: 20,
      }}
      onPress={onPress}
      accessibilityLabel={onPress ? title : undefined}
    >
      <View style={uiStyles.between}>
        <AppText
          variant="caption"
          color={dark ? "#C6D5F1" : C.muted}
          style={{ flex: 1, fontSize: 11, fontFamily: font.bold }}
        >
          {title}
        </AppText>
        <View
          style={[
            styles.metricIcon,
            { backgroundColor: dark ? "#FFFFFF18" : "#EEF2FF" },
          ]}
        >
          <Icon name={icon} color={dark ? C.mint : C.purple} size={16} />
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <AppText
          variant="title"
          color={dark ? C.mint : C.ink}
          style={{ fontSize: 20, fontFamily: font.extra }}
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
      <AppText
        variant="caption"
        color={dark ? "#D0DEF5" : C.muted}
        style={{ fontSize: 10 }}
      >
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
  const { market, user } = useApp();
  const navigation = useAppNavigation();
  const classes = market.offerings.filter((g) => g.tutorId === user.id);
  const selectedGroup = classes.find((g) => g.id === offeringId);
  const currentRadarPoints =
    selectedGroup?.radarPoints || "100,22 166,64 140,138 60,138 34,64";

  return (
    <Card style={{ borderRadius: 24, padding: 16 }}>
      <View style={[uiStyles.between, { flexWrap: "wrap", marginBottom: 4 }]}>
        <View style={{ flex: 1, minWidth: 160 }}>
          <AppText variant="heading" style={{ fontSize: 14 }}>
            🎯 O‘quvchilar O‘zlashtirish Radari
          </AppText>
          <AppText variant="caption" color={C.muted} style={{ fontSize: 10 }}>
            Oxirgi diagnostik test natijalari bo‘yicha mavzular tahlili
          </AppText>
        </View>
        <Button
          title="+ Test tayinlash"
          variant="soft"
          style={{ minHeight: 34, paddingHorizontal: 10, borderRadius: 10 }}
          onPress={() =>
            navigation.navigate(
              "AssignDiagnostic",
              offeringId === "all" ? {} : { offeringId },
            )
          }
        />
      </View>

      {onSelect ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
        >
          <Chip
            label="Barcha guruhlar (72)"
            selected={offeringId === "all"}
            onPress={() => onSelect("all")}
          />
          {classes.map((g) => (
            <Chip
              key={g.id}
              label={`${g.title.split(" ")[0]} (${g.mastery || 88}%)`}
              selected={offeringId === g.id}
              onPress={() => onSelect(g.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
        <View style={{ width: 155, height: 140, alignItems: "center", justifyContent: "center" }}>
          <Svg viewBox="0 0 200 170" width="100%" height="100%">
            <Polygon
              points="100,15 172,62 145,145 55,145 28,62"
              fill="#F8FAFC"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            <Polygon
              points="100,40 148,72 130,126 70,126 52,72"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1"
            />
            <Line x1="100" y1="88" x2="100" y2="15" stroke="#E2E8F0" strokeWidth="1" />
            <Line x1="100" y1="88" x2="172" y2="62" stroke="#E2E8F0" strokeWidth="1" />
            <Line x1="100" y1="88" x2="145" y2="145" stroke="#E2E8F0" strokeWidth="1" />
            <Line x1="100" y1="88" x2="55" y2="145" stroke="#E2E8F0" strokeWidth="1" />
            <Line x1="100" y1="88" x2="28" y2="62" stroke="#E2E8F0" strokeWidth="1" />
            <Polygon
              points={currentRadarPoints}
              fill="rgba(16, 185, 129, 0.25)"
              stroke="#10B981"
              strokeWidth="2.5"
            />
            <SvgText x="100" y="11" textAnchor="middle" fill="#334155" fontSize="9" fontWeight="bold">
              Algebra
            </SvgText>
            <SvgText x="175" y="65" textAnchor="start" fill="#475569" fontSize="8" fontWeight="bold">
              Geometriya
            </SvgText>
            <SvgText x="145" y="158" textAnchor="middle" fill="#475569" fontSize="8" fontWeight="bold">
              Logarifm
            </SvgText>
            <SvgText x="55" y="158" textAnchor="middle" fill="#E11D48" fontSize="8" fontWeight="bold">
              Trigonometriya
            </SvgText>
            <SvgText x="25" y="65" textAnchor="end" fill="#475569" fontSize="8" fontWeight="bold">
              Mantiq
            </SvgText>
          </Svg>
        </View>

        <View style={{ flex: 1, gap: 7 }}>
          {[
            { topic: "Algebra & Tenglamalar", pct: 94, color: C.accent },
            { topic: "Logarifm & Hosila", pct: 88, color: C.purple },
            { topic: "Planimetriya", pct: 82, color: "#3B82F6" },
            { topic: "Trigonometriya (Zaif)", pct: 68, color: "#E11D48" },
          ].map((item) => (
            <View key={item.topic} style={{ gap: 2 }}>
              <View style={uiStyles.between}>
                <AppText variant="caption" style={{ fontSize: 10, fontFamily: font.bold, flex: 1 }} numberOfLines={1}>
                  {item.topic}
                </AppText>
                <AppText variant="caption" style={{ fontSize: 10, fontFamily: font.extra }}>
                  {item.pct}%
                </AppText>
              </View>
              <View style={styles.track}>
                <View
                  style={{
                    height: 5,
                    width: `${item.pct}%`,
                    backgroundColor: item.color,
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
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
  const navigation = useAppNavigation();
  const studentsCount = (group as any).studentsCount || group.students || 14;
  const maxQuota = (group as any).maxQuota || group.capacity || 20;
  const fillPct = Math.min(100, Math.round((studentsCount / maxQuota) * 100));

  return (
    <Card style={{ borderRadius: 24, padding: 16, gap: 10 }}>
      <View style={[uiStyles.between, { alignItems: "flex-start" }]}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            <View style={[styles.pill, { backgroundColor: group.mode === "Onlayn" || group.mode === "Online" ? "#F3EFFE" : "#EEF2FF" }]}>
              <AppText variant="caption" style={{ fontSize: 10, fontFamily: font.extra, color: C.purple }}>
                {group.mode}
              </AppText>
            </View>
            <View style={[styles.pill, { backgroundColor: group.isOpenForEnrollment ?? group.published ? "#ECFDF5" : "#F1F5F9" }]}>
              <AppText variant="caption" style={{ fontSize: 10, fontFamily: font.bold, color: group.isOpenForEnrollment ?? group.published ? C.green : C.muted }}>
                {group.isOpenForEnrollment ?? group.published ? "● Qabul ochiq" : "Qabul to‘lgan"}
              </AppText>
            </View>
          </View>
          <AppText variant="heading" style={{ fontSize: 14 }}>
            {group.title}
          </AppText>
          <AppText variant="caption" color={C.muted} style={{ fontSize: 11 }}>
            📅 {group.days} | {group.time}
          </AppText>
          <AppText variant="caption" color={C.muted} style={{ fontSize: 11 }}>
            📍 {group.room || group.location}
          </AppText>
        </View>

        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <View style={styles.masteryPill}>
            <AppText variant="caption" style={{ fontSize: 11, fontFamily: font.extra, color: C.green }}>
              Radar: {group.mastery || 89}%
            </AppText>
          </View>
          <AppText variant="caption" color={C.muted} style={{ fontSize: 10 }}>
            {group.monthlyFee || formatPrice(group.price)}
          </AppText>
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <View style={uiStyles.between}>
          <AppText variant="caption" color={C.muted} style={{ fontSize: 11 }}>
            O‘quvchilar kvotasi: {studentsCount} / {maxQuota} nafar
          </AppText>
          <AppText variant="caption" style={{ fontSize: 11, fontFamily: font.bold, color: C.purple }}>
            {fillPct}% to‘lgan
          </AppText>
        </View>
        <View style={styles.track}>
          <View
            style={{
              height: 6,
              width: `${fillPct}%`,
              backgroundColor: C.accent,
              borderRadius: 3,
            }}
          />
        </View>
      </View>

      <View
        style={[
          uiStyles.between,
          { paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
        ]}
      >
        <AppText variant="caption" color={C.muted} style={{ flex: 1, fontSize: 10 }} numberOfLines={1}>
          Keyingi dars: <AppText variant="caption" style={{ fontFamily: font.bold, fontSize: 10 }}>{group.nextTopic || "Logarifmik tengsizliklar"}</AppText>
        </AppText>
        <Button
          title="Boshqarish"
          icon="arrow-up-right"
          variant="soft"
          style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 12 }}
          onPress={onManage || (() => navigation.navigate("ManageClass", { id: group.id }))}
        />
      </View>
    </Card>
  );
}

export function TeacherFinance() {
  const { data, error } = useTeacher();
  const cost = data.roomPlans.reduce(
    (sum, plan) => sum + plan.estimatedCost,
    0,
  );
  const navigation = useAppNavigation();

  return (
    <Card style={{ backgroundColor: C.navy, borderColor: C.navy, padding: 18, borderRadius: 24, gap: 10 }}>
      <View style={uiStyles.between}>
        <View style={{ gap: 2 }}>
          <AppText variant="caption" color="#C6D5F1" style={{ fontSize: 10, fontFamily: font.bold }}>
            USTOZ HAMYONI (OKTABR OYI)
          </AppText>
          <AppText variant="title" color={C.mint} style={{ fontSize: 22, fontFamily: font.extra }}>
            24 850 000 so‘m
          </AppText>
        </View>
        <Button
          title="Kartaga yechish"
          variant="gold"
          onPress={() => {}}
          style={{ minHeight: 38, paddingHorizontal: 12, borderRadius: 12 }}
        />
      </View>
      <View style={[uiStyles.between, { paddingTop: 8, borderTopWidth: 1, borderTopColor: "#FFFFFF15" }]}>
        <AppText variant="caption" color="#D0DEF5" style={{ fontSize: 11 }}>
          O‘quv xonalari ijarasi xarajati:
        </AppText>
        <AppText variant="caption" style={{ fontSize: 11, fontFamily: font.bold, color: C.amber }}>
          -{cost ? formatPrice(cost) : "1 850 000 so‘m"}
        </AppText>
      </View>
    </Card>
  );
}

export function TeacherProfileSummary() {
  const { market, user } = useApp();
  const profile = market.tutorProfiles.find((p) => p.userId === user.id);

  return (
    <Card style={{ borderRadius: 24, padding: 18, alignItems: "center", gap: 10 }}>
      <View style={styles.topBadge}>
        <AppText variant="caption" style={{ color: "#0B1E47", fontSize: 9, fontFamily: font.extra }}>
          TOP 1%
        </AppText>
      </View>
      <AppText variant="title" style={{ fontSize: 18, textAlign: "center" }}>
        {user.name || "Aliyev Temur"}
      </AppText>
      <AppText variant="caption" color={C.purple} style={{ fontFamily: font.bold, textAlign: "center", fontSize: 11 }}>
        {profile?.specialty || "Matematika, Mantiq & SAT Math Mentori (7 yil tajriba)"}
      </AppText>

      <View style={[uiStyles.row, { width: "100%", paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }]}>
        <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
          <AppText variant="title" style={{ fontSize: 15 }}>
            ⭐ 4.95
          </AppText>
          <AppText variant="caption" color={C.muted} style={{ fontSize: 10 }}>
            214 ta sharh
          </AppText>
        </View>
        <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
          <AppText variant="title" color={C.green} style={{ fontSize: 15 }}>
            96%
          </AppText>
          <AppText variant="caption" color={C.muted} style={{ fontSize: 10 }}>
            Grand/Talaba bo‘lgan
          </AppText>
        </View>
        <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
          <AppText variant="title" color={C.purple} style={{ fontSize: 15 }}>
            72 nafar
          </AppText>
          <AppText variant="caption" color={C.muted} style={{ fontSize: 10 }}>
            Faol o‘quvchi
          </AppText>
        </View>
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
