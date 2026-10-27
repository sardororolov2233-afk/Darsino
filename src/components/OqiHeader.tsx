import {
  LocalizedPressable as Pressable,
  LocalizedTextInput as TextInput,
} from "../i18n/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useAppNavigation } from "../navigation";
import { useApp } from "../state/AppContext";
import { useAssistantAccess } from "../state/AssistantAccess";
import { initials } from "../state/model";
import { C, font } from "../theme";
import { AppText, Icon } from "./ui";
import { Brand } from "./Brand";
import { UserAvatar } from "./UserAvatar";
export function OqiHeader({
  query,
  onChangeQuery,
  onSubmitSearch,
}: {
  query?: string;
  onChangeQuery?: (text: string) => void;
  onSubmitSearch?: () => void;
}) {
  const navigation = useAppNavigation(),
    { user, notifications, filters } = useApp(),
    assistant = useAssistantAccess();
  const unread = notifications.filter((n) => !n.read).length;
  const filterActive =
    filters.subject !== "Barchasi" ||
    filters.mode !== "Barchasi" ||
    filters.area !== "Barcha hududlar" ||
    filters.minRating > 0 ||
    filters.minPrice > 0 ||
    filters.maxPrice < 1000000;
  const openFilters = () => {
    if (!onChangeQuery) navigation.popTo("Main", { screen: "Search" });
    navigation.navigate("Filters");
  };
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="O‘qi bosh sahifa"
          onPress={() => navigation.popTo("Main", { screen: "Home" })}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Brand width={78} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="O‘qi AI yordamchini ochish"
          style={[styles.icon, { backgroundColor: C.primarySoft }]}
          onPress={assistant.open}
        >
          <AppText variant="label" color={C.primary} style={{ fontSize: 12 }}>
            AI
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="QR skanerlash"
          style={styles.icon}
          onPress={() => navigation.navigate("ScanContact")}
        >
          <Icon name="maximize" size={20} color={C.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Bildirishnomalar, ${unread} o‘qilmagan`}
          style={styles.icon}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Icon name="bell" size={20} />
          {unread ? <View style={styles.dot} /> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chatni ochish"
          style={styles.icon}
          onPress={() => navigation.navigate("Chats")}
        >
          <Icon name="message-circle" size={20} />
        </Pressable>
      </View>
      <View style={styles.row}>
        <View style={styles.search}>
          <Icon name="search" size={19} color={C.muted} />
          {onChangeQuery ? (
            <TextInput
              accessibilityLabel="Repetitor qidirish"
              placeholder="Fan, ustoz yoki guruhni izlang"
              placeholderTextColor={C.muted}
              value={query}
              onChangeText={onChangeQuery}
              onSubmitEditing={onSubmitSearch}
              returnKeyType="search"
              style={styles.input}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Qidiruvni ochish"
              style={{ flex: 1, paddingVertical: 14 }}
              onPress={() => navigation.popTo("Main", { screen: "Search" })}
            >
              <AppText variant="caption" color={C.muted}>
                Fan, ustoz yoki guruhni izlang
              </AppText>
            </Pressable>
          )}
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Qidiruvni tozalash"
              onPress={() => onChangeQuery?.("")}
              hitSlop={10}
            >
              <Icon name="x" size={16} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtrlarni ochish"
          style={styles.filter}
          onPress={openFilters}
        >
          <Icon name="sliders" size={20} color={C.primary} />
          {filterActive ? <View style={styles.dot} /> : null}
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  icon: {
    width: 42,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  dot: {
    position: "absolute",
    right: 7,
    top: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.error,
  },
  search: {
    backgroundColor: C.background,
    flexDirection: "row",
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 9,
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.border,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    color: C.ink,
    fontFamily: font.medium,
    fontSize: 13,
  },
  filter: {
    backgroundColor: C.primarySoft,
    borderRadius: 14,
    minHeight: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
