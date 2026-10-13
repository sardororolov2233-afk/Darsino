import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AppText,
  Avatar,
  Card,
  Icon,
  Screen,
  uiStyles,
} from "../components/ui";
import { C } from "../theme";
import { useApp } from "../state/AppContext";
import { useAppNavigation } from "../navigation";
import { tutors, events, formatPrice } from "../data/catalog";
export function HomeScreen() {
  const navigation = useAppNavigation();
  const { user, favorites, toggleFavorite, requests, storageError } = useApp();
  const tutor = tutors[0];
  const quickLinks = [
    { title: "Ustozlar", icon: "user" as const, route: "Tutors" as const },
    { title: "Guruhlar", icon: "users" as const, route: "Groups" as const },
    { title: "Tadbirlar", icon: "star" as const, route: "Events" as const },
    { title: "Xonalar", icon: "grid" as const, route: "Rooms" as const },
  ];
  return (
    <Screen>
      <View style={uiStyles.between}>
        <View>
          <AppText variant="caption" color={C.muted}>
            Xayrli kun, {user.name.split(" ")[0] || "Sardor"}!
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Shaharni o‘zgartirish"
            onPress={() => navigation.navigate("EditProfile")}
            style={uiStyles.row}
          >
            <Icon name="map-pin" size={16} />
            <AppText variant="label">{user.city}</AppText>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="So‘rovlar va bildirishnomalar"
          style={styles.bell}
          onPress={() => navigation.navigate("Main", { screen: "Lessons" })}
        >
          <Icon name="bell" />
          {requests.length ? <View style={styles.notificationDot} /> : null}
        </Pressable>
      </View>
      <AppText variant="title">Bugun nimani o‘rganamiz?</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fan, ustoz yoki hududni qidirish"
        style={styles.search}
        onPress={() => navigation.navigate("Main", { screen: "Search" })}
      >
        <Icon name="search" color={C.muted} />
        <AppText color={C.muted}>Fan, ustoz yoki hududni qidiring</AppText>
      </Pressable>
      <View style={styles.quickRow}>
        {quickLinks.map((link) => (
          <Pressable
            key={link.title}
            style={styles.quick}
            accessibilityRole="button"
            accessibilityLabel={link.title}
            onPress={() => navigation.navigate(link.route)}
          >
            <View style={styles.quickIcon}>
              <Icon name={link.icon} />
            </View>
            <AppText variant="caption" color={C.navy}>
              {link.title}
            </AppText>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bugungi IELTS Speaking darsini ko‘rish"
        style={styles.lessonBanner}
        onPress={() => navigation.navigate("Main", { screen: "Lessons" })}
      >
        <View style={{ gap: 4 }}>
          <AppText variant="caption" color={C.gold}>
            BUGUN · 18:00
          </AppText>
          <AppText variant="label" color={C.white}>
            IELTS · Speaking
          </AppText>
          <AppText variant="caption" color="#BBCDE2">
            Dilnoza Karimova bilan
          </AppText>
        </View>
        <View style={styles.arrow}>
          <Icon name="arrow-right" size={22} />
        </View>
      </Pressable>
      <Section
        title="Sizga mos ustozlar"
        onPress={() => navigation.navigate("Tutors")}
      />
      <Card
        accessibilityLabel={`${tutor.name} profilini ko‘rish`}
        onPress={() => navigation.navigate("Tutor", { id: tutor.id })}
        style={styles.featuredCard}
      >
        <View style={uiStyles.row}>
          <Avatar initials={tutor.initials} />
          <View style={{ flex: 1, gap: 3 }}>
            <AppText variant="label">{tutor.name}</AppText>
            <AppText variant="caption" color={C.muted}>
              {tutor.subject} · {tutor.specialty}
            </AppText>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Icon name="star" size={15} color={C.gold} />
              <AppText variant="caption" color={C.muted}>
                {tutor.rating} ({tutor.reviews} sharh)
              </AppText>
            </View>
          </View>
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={
              favorites.includes(`tutor:${tutor.id}`)
                ? "Ustozni saqlanganlardan olib tashlash"
                : "Ustozni saqlash"
            }
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorite(`tutor:${tutor.id}`);
            }}
          >
            <Icon
              name="heart"
              color={favorites.includes(`tutor:${tutor.id}`) ? C.gold : C.muted}
              size={23}
            />
          </Pressable>
        </View>
        <View style={uiStyles.divider} />
        <View style={uiStyles.between}>
          <View style={uiStyles.row}>
            <Icon name="map-pin" color={C.muted} size={16} />
            <AppText variant="caption" color={C.muted}>
              {tutor.area}
            </AppText>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <AppText variant="label">{formatPrice(tutor.price)}</AppText>
            <AppText variant="caption" color={C.muted}>
              1 soat uchun
            </AppText>
          </View>
        </View>
      </Card>
      <Section
        title="Yaqin tadbirlar"
        onPress={() => navigation.navigate("Events")}
      />
      {events.slice(0, 2).map((event) => (
        <Card
          key={event.id}
          accessibilityLabel={`${event.title} tafsilotlari`}
          onPress={() => navigation.navigate("Event", { id: event.id })}
        >
          <View style={uiStyles.row}>
            <View style={styles.dateTile}>
              <AppText variant="label">{event.day}</AppText>
              <AppText variant="label">{event.month}</AppText>
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <AppText variant="label">{event.title}</AppText>
              <AppText variant="caption" color={C.purple}>
                {event.category.toLocaleUpperCase("uz")}
              </AppText>
            </View>
            <Icon name="chevron-right" color={C.muted} />
          </View>
          <View style={uiStyles.between}>
            <AppText variant="caption" color={C.muted}>
              {event.area} · {event.time}
            </AppText>
            <AppText variant="caption" color={C.green}>
              {event.price === 0 ? "Bepul" : formatPrice(event.price)}
            </AppText>
          </View>
        </Card>
      ))}
      <AppText
        variant="caption"
        color={C.muted}
        style={{ textAlign: "center", marginTop: 4 }}
      >
        {storageError
          ? "Qurilmada saqlash ishlamadi. Ma’lumotlar ushbu sessiyada saqlanadi."
          : "Demo rejim · ma’lumotlar qurilmangizda saqlanadi"}
      </AppText>
    </Screen>
  );
}
function Section({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <View style={uiStyles.between}>
      <AppText variant="heading">{title}</AppText>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}: barchasi`}
        hitSlop={10}
      >
        <AppText variant="caption" color={C.navy}>
          Barchasi
        </AppText>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.gold,
    top: 9,
    right: 11,
  },
  search: {
    height: 55,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quickRow: { flexDirection: "row", gap: 8 },
  quick: {
    flex: 1,
    minHeight: 88,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.blueSoft,
  },
  lessonBanner: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: C.navy,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  arrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  featuredCard: {
    paddingVertical: 20,
    boxShadow: "0 5px 18px rgba(9,43,83,0.04)",
  },
  dateTile: {
    width: 54,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.goldSoft,
  },
});
