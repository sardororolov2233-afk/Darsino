import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
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
import { RadarChart } from "./RadarChart";
import { SKILLS } from "../data/learning";
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
        >
          <Brand width={100} light />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText
            variant="caption"
            color={C.mint}
            style={{ fontFamily: font.extra, fontSize: 10 }}
          >
            USTOZ
          </AppText>
        </View>
        {[
          {
            icon: "inbox" as const,
            label: "Arizalarni ochish",
            onPress: () => navigation.navigate("Applications"),
            count: pending,
          },
          {
            icon: "message-circle" as const,
            label: "Chatni ochish",
            onPress: () => navigation.navigate("Chats"),
            count: 0,
          },
          {
            icon: "bell" as const,
            label: "Bildirishnomalarni ochish",
            onPress: () => navigation.navigate("Notifications"),
            count: unread,
          },
        ].map((a) => (
          <Pressable
            key={a.icon}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            onPress={a.onPress}
            hitSlop={5}
            style={styles.action}
          >
            <Icon name={a.icon} color={C.white} size={18} />
            {a.count ? <View style={styles.dot} /> : null}
          </Pressable>
        ))}
      </View>
      <View style={uiStyles.between}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="label" color={C.white} numberOfLines={1}>
            {user.name}
          </AppText>
          <AppText variant="caption" color="#C6D5F1" numberOfLines={1}>
            {profile?.subjects.join(" · ") || "Ustoz kabineti"}
          </AppText>
        </View>
        <Button
          title="Test berish"
          icon="target"
          variant="gold"
          disabled={profile?.verification !== "approved"}
          onPress={() => navigation.navigate("AssignDiagnostic")}
          style={{ minHeight: 44, paddingHorizontal: 12 }}
        />
      </View>
    </View>
  );
}
export function TeacherMetric({
  title,
  value,
  subtitle,
  icon,
  dark = false,
  onPress,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  dark?: boolean;
  onPress?: () => void;
}) {
  return (
    <Card
      style={{
        flexBasis: "46%",
        flexGrow: 1,
        padding: 14,
        gap: 7,
        backgroundColor: dark ? C.navy : C.white,
        borderColor: dark ? C.navy : C.border,
      }}
      onPress={onPress}
      accessibilityLabel={onPress ? title : undefined}
    >
      <View style={uiStyles.between}>
        <AppText
          variant="caption"
          color={dark ? "#C6D5F1" : C.muted}
          style={{ flex: 1, fontSize: 11 }}
        >
          {title}
        </AppText>
        <View
          style={[
            styles.metricIcon,
            { backgroundColor: dark ? "#FFFFFF18" : C.blueSoft },
          ]}
        >
          <Icon name={icon} color={dark ? C.mint : C.purple} size={17} />
        </View>
      </View>
      <AppText
        variant="title"
        color={dark ? C.mint : C.ink}
        style={{ fontSize: 21 }}
      >
        {value}
      </AppText>
      <AppText
        variant="caption"
        color={dark ? "#C6D5F1" : C.muted}
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
  const summary = assessmentSummary(market, user.id, offeringId);
  return (
    <Card>
      <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
        <AppText variant="heading" style={{ flex: 1 }}>
          O‘quvchilar bilim radari
        </AppText>
        <Chip
          label={
            summary.score === null ? "Natija kutilmoqda" : `${summary.score}%`
          }
          tone="green"
        />
      </View>
      {onSelect ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          <Chip
            label="Barcha guruhlar"
            selected={offeringId === "all"}
            onPress={() => onSelect("all")}
          />
          {classes.map((g) => (
            <Chip
              key={g.id}
              label={g.title}
              selected={offeringId === g.id}
              onPress={() => onSelect(g.id)}
            />
          ))}
        </ScrollView>
      ) : null}
      <RadarChart skills={summary.skills} compact={compact} />
      {summary.total ? (
        <>
          <View style={{ gap: 9 }}>
            {SKILLS.map((s) => {
              const v = summary.skills[s];
              const value = v.total
                ? Math.round((v.correct / v.total) * 100)
                : null;
              return (
                <View key={s} style={{ gap: 4 }}>
                  <View style={uiStyles.between}>
                    <AppText variant="caption" color={C.muted}>
                      {s}
                    </AppText>
                    <AppText variant="caption">
                      {value === null ? "—" : `${value}%`}
                    </AppText>
                  </View>
                  <View style={styles.track}>
                    <View
                      style={{
                        height: 5,
                        width: `${value || 0}%`,
                        backgroundColor:
                          value !== null && value < 60 ? C.amber : C.accent,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <AppText variant="caption" color={C.muted}>
            {summary.results.length} ta o‘quvchi/test natijasi. O‘quvchilar
            chatda ulashgan javoblardan hisoblangan.
          </AppText>
        </>
      ) : (
        <AppText variant="caption" color={C.muted}>
          Guruhga test yuboring. O‘quvchi natijasini siz bilan ulashgach, radar
          yangilanadi.
        </AppText>
      )}
      <Button
        title="Guruhga test yuborish"
        icon="target"
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
export function TeacherGroupCard({ group }: { group: Offering }) {
  const { market, user } = useApp();
  const navigation = useAppNavigation();
  const overview = teacherOverview(market, user.id, group.id);
  const count =
    group.enrolledCount ?? overview.enrollments.length + group.reservedSeats;
  const score = assessmentSummary(market, user.id, group.id).score;
  const attendance = overview.attendance.length
    ? Math.round((overview.present / overview.attendance.length) * 100)
    : null;
  return (
    <Card>
      <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
        <Chip
          label={
            isClubOffering(group)
              ? "Klub"
              : group.type === "group"
                ? "O‘quv guruhi"
                : "Individual"
          }
          tone="purple"
        />
        <Chip
          label={group.published ? "Qabul ochiq" : "Qabul yopiq"}
          tone={group.published ? "green" : undefined}
        />
      </View>
      <AppText variant="heading">{group.title}</AppText>
      <AppText variant="caption" color={C.muted}>
        {group.subject} · {group.mode}
      </AppText>
      <AppText variant="caption" color={C.muted}>
        {group.days} · {group.time}
      </AppText>
      <View style={uiStyles.between}>
        <AppText variant="caption">
          {count}/{group.capacity} o‘rin
        </AppText>
        <AppText variant="caption" color={C.green}>
          {Math.round((count / group.capacity) * 100)}% to‘lgan
        </AppText>
      </View>
      <View style={styles.track}>
        <View
          style={{
            height: 5,
            width: `${Math.min(100, (count / group.capacity) * 100)}%`,
            backgroundColor: C.accent,
            borderRadius: 3,
          }}
        />
      </View>
      <View style={uiStyles.row}>
        <Chip
          label={`Radar ${score === null ? "—" : `${score}%`}`}
          tone="green"
        />
        <Chip
          label={`Davomat ${attendance === null ? "—" : `${attendance}%`}`}
          tone="purple"
        />
      </View>
      <AppText variant="caption" color={C.muted}>
        {group.location}
      </AppText>
      <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
        <AppText variant="label" style={{ flexShrink: 1 }}>
          {group.price === 0 ? "Bepul" : formatPrice(group.price)}
        </AppText>
        <Button
          title="Boshqarish"
          accessibilityLabel={`${group.title}ni boshqarish`}
          icon="arrow-up-right"
          variant="soft"
          style={{ minHeight: 44 }}
          onPress={() => navigation.navigate("ManageClass", { id: group.id })}
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
    <Card style={{ backgroundColor: C.navy, borderColor: C.navy, padding: 20 }}>
      <View style={uiStyles.row}>
        <Icon name="credit-card" color={C.mint} />
        <AppText variant="label" color="#C6D5F1">
          XONA XARAJATLARI REJASI
        </AppText>
      </View>
      <AppText variant="title" color={C.mint}>
        {formatPrice(cost)}
      </AppText>
      <AppText variant="caption" color="#C6D5F1">
        {data.roomPlans.length} ta saqlangan reja. Bu taxminiy xarajat; to‘lov
        olinmagan va xona band qilinmagan.
      </AppText>
      <Button
        title="Xona rejalarim"
        variant="gold"
        icon="grid"
        onPress={() => navigation.popTo("Main", { screen: "TeacherRooms" })}
      />
      {error ? (
        <AppText variant="caption" color="#FFC5CA">
          {error}
        </AppText>
      ) : null}
    </Card>
  );
}
const styles = StyleSheet.create({
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 15,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  action: {
    width: 34,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF18",
  },
  dot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.mint,
  },
  metricIcon: {
    width: 29,
    height: 29,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    height: 5,
    backgroundColor: C.border,
    borderRadius: 3,
    overflow: "hidden",
  },
});

export function TeacherProfileSummary() {
  const { market, user, tutors } = useApp();
  const profile = market.tutorProfiles.find((p) => p.userId === user.id);
  const publicProfile = tutors.find((t) => t.id === user.id);
  const overview = teacherOverview(market, user.id);
  return (
    <Card>
      <AppText variant="heading">
        {profile?.subjects.join(" · ") || "Mutaxassislik"}
      </AppText>
      <AppText variant="caption" color={C.purple}>
        {profile?.specialty || "Profilni to‘ldiring"}
      </AppText>
      <View style={uiStyles.row}>
        {[
          {
            label: "Reyting",
            value: publicProfile?.reviews ? String(publicProfile.rating) : "—",
            caption: `${publicProfile?.reviews || 0} ta fikr`,
          },
          {
            label: "Faol o‘quvchi",
            value: overview.studentIds.size,
            caption: "tasdiqlangan a’zo",
          },
          {
            label: "Tajriba",
            value: `${profile?.experience || 0} yil`,
            caption: "profil bo‘yicha",
          },
        ].map((item) => (
          <View
            key={item.label}
            style={{ flex: 1, alignItems: "center", gap: 3 }}
          >
            <AppText variant="heading" color={C.green}>
              {item.value}
            </AppText>
            <AppText
              variant="caption"
              style={{ fontSize: 10, textAlign: "center" }}
            >
              {item.label}
            </AppText>
            <AppText
              variant="caption"
              color={C.muted}
              style={{ fontSize: 9, textAlign: "center" }}
            >
              {item.caption}
            </AppText>
          </View>
        ))}
      </View>
      {profile?.bio ? (
        <AppText variant="caption" color={C.muted}>
          {profile.bio}
        </AppText>
      ) : null}
    </Card>
  );
}
