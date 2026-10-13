import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Icon } from "./ui";
import { C } from "../theme";
import { useAppNavigation } from "../navigation";
type TabName = "Home" | "Search" | "Lessons" | "Chats" | "Profile";
export function BottomNavigation({ active }: { active: TabName }) {
  const navigation = useAppNavigation();
  return (
    <View style={styles.row}>
      {[
        { name: "Home" as const, title: "Bosh", icon: "home" as const },
        { name: "Search" as const, title: "Qidirish", icon: "search" as const },
        {
          name: "Lessons" as const,
          title: "Darslarim",
          icon: "book-open" as const,
        },
        {
          name: "Chats" as const,
          title: "Chat",
          icon: "message-circle" as const,
        },
        { name: "Profile" as const, title: "Profil", icon: "user" as const },
      ].map((tab) => (
        <Pressable
          key={tab.name}
          style={styles.item}
          accessibilityRole="tab"
          accessibilityLabel={tab.title}
          accessibilityState={{ selected: tab.name === active }}
          onPress={() => navigation.popTo("Main", { screen: tab.name })}
        >
          <View
            style={[
              styles.icon,
              active === tab.name && { backgroundColor: C.goldSoft },
            ]}
          >
            <Icon
              name={tab.icon}
              color={active === tab.name ? C.navy : C.muted}
              size={21}
            />
          </View>
          <AppText
            variant="caption"
            style={{ fontSize: 10 }}
            color={active === tab.name ? C.navy : C.muted}
          >
            {tab.title}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -12,
  },
  item: { flex: 1, alignItems: "center", gap: 4 },
  icon: {
    width: 44,
    height: 28,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
