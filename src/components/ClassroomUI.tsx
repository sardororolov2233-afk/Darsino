import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { LocalizedPressable as Pressable } from "../i18n/native";
import { AppText, Button, Card, EmptyState, Icon, uiStyles } from "./ui";
import { UserAvatar } from "./UserAvatar";
import { useAppNavigation } from "../navigation";
import { useApp } from "../state/AppContext";
import { C, font } from "../theme";
import { dateLabel, localDate, timeLabel } from "../state/domain";
import {
  dailyAttendance,
  shiftDay,
  weekdayOf,
  WEEKDAYS,
} from "../state/teacherDashboard";
export const WORKSPACE = C.primary;

export function WorkspaceHeader({
  title,
  back = false,
}: {
  title: string;
  back?: boolean;
}) {
  const { user, notifications } = useApp(),
    navigation = useAppNavigation();
  return (
    <View style={styles.header}>
      {back ? (
        <Button
          title=""
          icon="arrow-left"
          variant="soft"
          accessibilityLabel="Orqaga"
          onPress={() => navigation.goBack()}
          style={{ paddingHorizontal: 10 }}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ustoz bosh sahifasi"
          onPress={() => navigation.navigate("Main", { screen: "Home" })}
          style={styles.brand}
        >
          <Icon name="book-open" size={15} color="white" />
          <AppText
            variant="caption"
            color="white"
            style={{ fontFamily: font.bold }}
          >
            {user.role === "tutor" ? "O‘qi Ustoz" : "O‘qi"}
          </AppText>
        </Pressable>
      )}
      <AppText variant="label" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bildirishnomalar"
        onPress={() => navigation.navigate("Notifications")}
        style={styles.action}
      >
        <Icon name="bell" size={20} color={C.ink} />
        {notifications.some((n) => !n.read) ? (
          <View style={styles.dot} />
        ) : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profilni ochish"
        onPress={() => navigation.navigate("Main", { screen: "Profile" })}
      >
        <UserAvatar
          userId={user.id}
          initials={user.name?.slice(0, 1) || "U"}
          size={32}
        />
      </Pressable>
    </View>
  );
}
export function WorkspaceTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: {
    value: T;
    label: string;
    icon?: React.ComponentProps<typeof Icon>["name"];
  }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.tabs}>
      {items.map((item) => (
        <Pressable
          key={item.value}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: value === item.value }}
          onPress={() => onChange(item.value)}
          style={[styles.tab, value === item.value && styles.selectedTab]}
        >
          {item.icon ? (
            <Icon
              name={item.icon}
              size={18}
              color={value === item.value ? WORKSPACE : C.muted}
            />
          ) : null}
          <AppText
            variant="caption"
            style={{
              textAlign: "center",
              fontFamily: font.bold,
              flexShrink: 1,
            }}
            color={value === item.value ? WORKSPACE : C.muted}
          >
            {item.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
export function TeacherSchedule({
  initialGroup = "all",
  attendance = false,
}: {
  initialGroup?: string;
  attendance?: boolean;
}) {
  const { market, user } = useApp(),
    navigation = useAppNavigation();
  const [day, setDay] = useState(localDate(new Date()));
  const summary = dailyAttendance(market, user.id, day);
  const sessions = summary.sessions
    .filter((s) => initialGroup === "all" || s.offeringId === initialGroup)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const weekday = WEEKDAYS.find((d) => d.day === weekdayOf(day))?.label || "";
  return (
    <Card style={{ gap: 16, borderRadius: 20, borderColor: C.primaryBorder }}>
      <View style={uiStyles.between}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="heading">
            {attendance ? "Davomat jadvali" : "Dars jadvali"}
          </AppText>
          <AppText color={C.muted}>
            {dateLabel(day)} · {weekday}
          </AppText>
        </View>
        <Button
          title=""
          icon="chevron-left"
          variant="outline"
          accessibilityLabel="Oldingi kun"
          onPress={() => setDay(shiftDay(day, -1))}
          style={styles.arrow}
        />
        <Button
          title=""
          icon="chevron-right"
          variant="outline"
          accessibilityLabel="Keyingi kun"
          onPress={() => setDay(shiftDay(day, 1))}
          style={styles.arrow}
        />
      </View>
      {day !== localDate(new Date()) ? (
        <Button
          title="Bugunga qaytish"
          variant="soft"
          onPress={() => setDay(localDate(new Date()))}
        />
      ) : null}
      {sessions.map((session) => {
        const group = market.offerings.find((g) => g.id === session.offeringId);
        const recorded = market.attendance.filter(
          (a) => a.sessionId === session.id,
        );
        return (
          <Pressable
            key={session.id}
            accessibilityRole="button"
            accessibilityLabel={`${session.title}: jadval va davomat`}
            onPress={() =>
              navigation.navigate("ManageClass", {
                id: session.offeringId,
                tab: "Davomat",
                sessionId: session.id,
              })
            }
            style={styles.lesson}
          >
            <View style={styles.lessonLine} />
            <View style={{ flex: 1, gap: 6 }}>
              <AppText variant="label" color={C.primary} localize={false}>
                {session.title}
              </AppText>
              <AppText variant="caption" color={C.muted}>
                {group?.subject} ·{" "}
                {group?.type === "individual" ? "Individual" : "Guruh darsi"}
              </AppText>
              <View style={[uiStyles.row, { flexWrap: "wrap" }]}>
                <AppText color={C.primary}>
                  {timeLabel(session.startsAt)}–{timeLabel(session.endsAt)}
                </AppText>
                <AppText
                  variant="caption"
                  color={C.primary}
                  style={styles.location}
                >
                  {session.location}
                </AppText>
              </View>
              {attendance ? (
                <AppText variant="caption" color={C.muted}>
                  {recorded.filter((a) => a.status === "present").length}{" "}
                  qatnashgan · {recorded.length} belgilangan
                </AppText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
      {!sessions.length ? (
        <EmptyState
          title="Bu kunda dars yo‘q"
          subtitle="Boshqa kunni tanlang yoki yangi guruh jadvalini yarating."
          icon="calendar"
        />
      ) : null}
    </Card>
  );
}
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  brand: {
    backgroundColor: WORKSPACE,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 22,
  },
  action: {
    height: 40,
    width: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    position: "absolute",
    top: 5,
    right: 5,
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  tabs: {
    flexDirection: "row",
    gap: 5,
    padding: 5,
    backgroundColor: C.primarySoft,
    borderRadius: 15,
  },
  tab: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 5,
    borderRadius: 11,
  },
  selectedTab: { backgroundColor: C.white, boxShadow: "0 2px 5px #14213D09" },
  arrow: { minHeight: 38, width: 36, paddingHorizontal: 0, borderRadius: 11 },
  lesson: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: C.primarySoft,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  lessonLine: { width: 3, borderRadius: 3, backgroundColor: C.primary },
  location: {
    backgroundColor: C.primaryBorder,
    borderRadius: 9,
    paddingHorizontal: 7,
    flexShrink: 1,
  },
});
