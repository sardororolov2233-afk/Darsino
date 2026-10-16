import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useAppNavigation } from "../navigation";
import { useApp } from "../state/AppContext";
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
  const navigation = useAppNavigation();
  const { user, notifications, filters } = useApp();
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
          style={styles.brandButton}
        >
          <Brand width={96} light />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hudud filtrini tanlash"
          style={styles.location}
          onPress={openFilters}
        >
          <Icon name="map-pin" color={C.mint} size={13} />
          <AppText
            variant="caption"
            color="#E1E9FA"
            numberOfLines={1}
            style={{ flexShrink: 1, fontSize: 10 }}
          >
            {user.city}
          </AppText>
        </Pressable>
        <Pressable
          hitSlop={6}
          style={styles.icon}
          accessibilityRole="button"
          accessibilityLabel={`Bildirishnomalar, ${unread} o‘qilmagan`}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Icon name="bell" size={17} color={C.white} />
          {unread ? <View style={styles.dot} /> : null}
        </Pressable>
        <Pressable
          hitSlop={6}
          style={styles.icon}
          accessibilityRole="button"
          accessibilityLabel="Chatni ochish"
          onPress={() => navigation.navigate("Chats")}
        >
          <Icon name="message-circle" size={17} color={C.white} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profilni ochish"
          hitSlop={6}
          style={styles.avatar}
          onPress={() => navigation.popTo("Main", { screen: "Profile" })}
        >
          <UserAvatar
            userId={user.id}
            initials={initials(user.name)}
            size={30}
          />
        </Pressable>
      </View>
      <View style={styles.row}>
        <View style={styles.search}>
          <Icon name="search" size={17} color={C.muted} />
          {onChangeQuery ? (
            <TextInput
              accessibilityLabel="Repetitor qidirish"
              placeholder="Fan, ustoz, dars yoki test..."
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
              style={{ flex: 1, paddingVertical: 13 }}
              onPress={() => navigation.popTo("Main", { screen: "Search" })}
            >
              <AppText variant="caption" color={C.muted}>
                Fan, ustoz, dars yoki test...
              </AppText>
            </Pressable>
          )}
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Qidiruvni tozalash"
              onPress={() => onChangeQuery?.("")}
              hitSlop={8}
            >
              <Icon name="x" size={16} color={C.muted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtrlarni ochish"
          style={styles.filter}
          onPress={openFilters}
        >
          <Icon name="sliders" size={17} />
          <AppText
            variant="caption"
            color={C.navy}
            style={{ fontFamily: font.extra }}
          >
            Filtr
          </AppText>
          {filterActive ? (
            <View style={[styles.dot, { backgroundColor: C.white }]} />
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandButton: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },
  location: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    gap: 4,
    paddingVertical: 7,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#243C6D",
    borderRadius: 20,
  },
  icon: {
    width: 32,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#243C6D",
  },
  dot: {
    position: "absolute",
    right: 5,
    top: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.mint,
  },
  avatar: { borderRadius: 18, borderWidth: 2, borderColor: C.mint },
  search: {
    backgroundColor: C.white,
    flexDirection: "row",
    flex: 1,
    minWidth: 0,
    borderRadius: 15,
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    minHeight: 44,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    color: C.ink,
    fontFamily: font.medium,
    fontSize: 12,
  },
  filter: {
    backgroundColor: C.mint,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 12,
  },
});
