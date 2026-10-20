import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  AppText,
  Button,
  Card,
  Chip,
  Header,
  Icon,
  Screen,
  uiStyles,
} from "../components/ui";
import { LocalizedPressable as Pressable } from "../i18n/native";
import { SettingRow, SettingsSection } from "../components/SettingsUI";
import { UserAvatar } from "../components/UserAvatar";
import { useApp } from "../state/AppContext";
import { useAppNavigation } from "../navigation";
import { useLearning } from "../state/LearningContext";
import { learningStats } from "../state/learning";
import { publicIdOf } from "../state/account";
import { initials } from "../state/model";
import { verificationLabel } from "../state/domain";
import { TutorCard } from "./DiscoveryScreens";
import { C } from "../theme";

export function CompactProfileScreen() {
  const { user, market, favorites, tutors } = useApp(),
    navigation = useAppNavigation();
  const { data } = useLearning(),
    [saved, setSaved] = useState(false);
  const stats = learningStats(data);
  const groups = market.offerings.filter((g) => g.tutorId === user.id);
  const students = new Set(
    market.enrollments
      .filter((e) => e.active && groups.some((g) => g.id === e.offeringId))
      .map((e) => e.studentId),
  );
  const tutor = market.tutorProfiles.find((p) => p.userId === user.id);
  const incoming =
    (market.groupInvitations || []).filter(
      (i) =>
        i.studentId === user.id &&
        i.status === "pending" &&
        Date.parse(i.expiresAt) > Date.now(),
    ).length +
    (market.contactRequests || []).filter(
      (r) => r.recipientId === user.id && r.status === "pending",
    ).length;
  return (
    <Screen>
      <Header
        title="Profil"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profil sozlamalari"
            onPress={() => navigation.navigate("Settings")}
            style={s.headerButton}
          >
            <Icon name="settings" />
          </Pressable>
        }
      />
      <Card style={{ padding: 18, gap: 18 }}>
        <View style={uiStyles.row}>
          <UserAvatar
            userId={user.id}
            initials={initials(user.name)}
            size={68}
          />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <AppText variant="heading" numberOfLines={2} localize={false}>
              {user.name}
            </AppText>
            <AppText variant="caption" color={C.muted} localize={false}>
              {"@" + publicIdOf(user)}
            </AppText>
            <Chip
              label={
                user.role === "student"
                  ? "O‘quvchi"
                  : user.role === "tutor"
                    ? "Repetitor"
                    : "Moderator"
              }
              tone="green"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mening ID va QR kodim"
            style={s.headerButton}
            onPress={() => navigation.navigate("ProfileId")}
          >
            <Icon name="grid" size={25} />
          </Pressable>
        </View>
        <View style={uiStyles.row}>
          <Button
            title="Tahrirlash"
            icon="edit-2"
            variant="soft"
            style={{ flex: 1 }}
            onPress={() => navigation.navigate("EditProfile")}
          />
          <Button
            title="ID va QR"
            icon="grid"
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => navigation.navigate("ProfileId")}
          />
        </View>
      </Card>
      {user.role === "student" ? (
        <View style={uiStyles.row}>
          <Card style={s.stat}>
            <AppText variant="heading">{stats.xp + " XP"}</AppText>
            <AppText variant="caption" color={C.muted}>
              Umumiy ball
            </AppText>
          </Card>
          <Card style={s.stat}>
            <AppText variant="heading">{stats.streak}</AppText>
            <AppText variant="caption" color={C.muted}>
              Uzluksiz o‘qish
            </AppText>
          </Card>
          <Card style={s.stat}>
            <Icon name="target" color={C.purple} />
            <AppText variant="caption" color={C.muted}>
              Tez kunda
            </AppText>
          </Card>
        </View>
      ) : user.role === "tutor" ? (
        <View style={uiStyles.row}>
          <Card style={s.stat}>
            <AppText variant="heading">{groups.length}</AppText>
            <AppText variant="caption" color={C.muted}>
              Guruhlar
            </AppText>
          </Card>
          <Card style={s.stat}>
            <AppText variant="heading">{students.size}</AppText>
            <AppText variant="caption" color={C.muted}>
              O‘quvchilar
            </AppText>
          </Card>
        </View>
      ) : null}
      <SettingsSection title="Aloqalar">
        <SettingRow
          title="Kontaktlarim"
          icon="users"
          onPress={() => navigation.navigate("Contacts")}
        />
        <SettingRow
          title="Takliflar"
          value={incoming ? String(incoming) : undefined}
          icon="user-plus"
          onPress={() => navigation.navigate("Invitations")}
        />
        <SettingRow
          title="Suhbatlarim"
          icon="message-circle"
          onPress={() => navigation.navigate("Chats")}
        />
        <SettingRow
          title="Bildirishnomalar"
          icon="bell"
          onPress={() => navigation.navigate("Notifications")}
        />
      </SettingsSection>
      {user.role === "tutor" ? (
        <SettingsSection title="Ustoz kabineti">
          <SettingRow
            title="Repetitor profili"
            subtitle={verificationLabel[tutor?.verification || "draft"]}
            icon="briefcase"
            onPress={() => navigation.navigate("TutorProfile")}
          />
          <SettingRow
            title="O‘quvchini guruhga taklif qilish"
            icon="user-plus"
            onPress={() => navigation.navigate("InviteToGroup")}
          />
          <SettingRow
            title="Dars manzilini belgilash"
            icon="map-pin"
            onPress={() => navigation.navigate("TutorLocation")}
          />
        </SettingsSection>
      ) : null}
      {user.role === "student" ? (
        <SettingsSection title="Ta’lim">
          <SettingRow
            title="O‘qish maqsadi"
            subtitle={user.goal}
            icon="target"
            onPress={() => navigation.navigate("EditProfile")}
          />
          {data.followedClubs.length ? (
            <SettingRow
              title="Kuzatayotgan klublarim"
              icon="award"
              value={String(data.followedClubs.length)}
              onPress={() => navigation.navigate("Main", { screen: "Lessons" })}
            />
          ) : null}
          <SettingRow
            title="Saqlanganlar"
            icon="heart"
            value={String(favorites.length)}
            onPress={() => setSaved((v) => !v)}
          />
        </SettingsSection>
      ) : null}
      {saved
        ? tutors
            .filter((t) => favorites.includes(t.id))
            .map((t) => <TutorCard key={t.id} tutor={t} />)
        : null}
      {saved && !favorites.length ? (
        <AppText color={C.muted}>
          Yoqtirgan ustozlaringizni qidiruvdagi yurakcha bilan saqlang.
        </AppText>
      ) : null}
      <SettingsSection title="Ilova">
        <SettingRow
          title="Sozlamalar"
          icon="settings"
          onPress={() => navigation.navigate("Settings")}
        />
        <SettingRow
          title="Yordam va qo‘llab-quvvatlash"
          icon="help-circle"
          onPress={() => navigation.navigate("Support")}
        />
      </SettingsSection>
    </Screen>
  );
}
const s = StyleSheet.create({
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  stat: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 88,
  },
});
