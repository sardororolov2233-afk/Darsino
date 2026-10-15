import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import type { Tutor } from "../data/catalog";
import { AppText, Card, Icon } from "./ui";
import { TutorCard } from "../screens/DiscoveryScreens";
import { C, font } from "../theme";
const districtPoints: Record<string, { x: number; y: number }> = {
  Yunusobod: { x: 190, y: 55 },
  "Mirzo Ulug‘bek": { x: 268, y: 98 },
  Chilonzor: { x: 86, y: 178 },
  Yakkasaroy: { x: 188, y: 185 },
  Shayxontohur: { x: 100, y: 75 },
};
export function TutorMap({ tutors }: { tutors: Tutor[] }) {
  const [selectedId, setSelectedId] = useState("");
  const located = tutors.filter((t) => districtPoints[t.area]);
  const selected = located.find((t) => t.id === selectedId) || located[0];
  return (
    <>
      <Card style={{ padding: 12 }}>
        <AppText variant="label">Ustozlar hududlar bo‘yicha</AppText>
        <AppText variant="caption" color={C.muted}>
          Toshkent sxemasi · belgilar aniq manzil emas
        </AppText>
        <View style={styles.map}>
          <Svg
            viewBox="0 0 340 250"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
          >
            <Rect width="340" height="250" fill="#E9EFF8" />
            <Path
              d="M12 30Q60 2 96 35L112 85Q55 110 18 80Z M245 172Q310 140 338 198L325 245H248Z"
              fill="#C8EAD3"
            />
            <Path
              d="M-20 203Q130 181 200 113T370 27"
              fill="none"
              stroke="#A3CFF2"
              strokeWidth="12"
            />
            <Line
              x1="0"
              y1="90"
              x2="340"
              y2="130"
              stroke="white"
              strokeWidth="7"
            />
            <Line
              x1="104"
              y1="0"
              x2="160"
              y2="250"
              stroke="white"
              strokeWidth="7"
            />
            <Line
              x1="271"
              y1="0"
              x2="229"
              y2="250"
              stroke="white"
              strokeWidth="6"
            />
            <Line
              x1="0"
              y1="217"
              x2="340"
              y2="168"
              stroke="white"
              strokeWidth="5"
            />
            <Circle
              cx="170"
              cy="130"
              r="48"
              fill="#10B9810A"
              stroke={C.accent}
              strokeDasharray="4 4"
            />
            <Circle
              cx="170"
              cy="130"
              r="86"
              fill="none"
              stroke={C.accent}
              strokeDasharray="4 4"
              strokeOpacity="0.35"
            />
          </Svg>
          {located.map((t, i) => {
            const p = districtPoints[t.area];
            const sameDistrictIndex = located
              .slice(0, i)
              .filter((other) => other.area === t.area).length;
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityLabel={`${t.name}, ${t.area} xarita belgisi`}
                accessibilityState={{ selected: selected?.id === t.id }}
                onPress={() => setSelectedId(t.id)}
                style={[
                  styles.pin,
                  {
                    left: `${(Math.min(p.x + sameDistrictIndex * 38, 306) / 340) * 100}%`,
                    top: `${(p.y / 250) * 100}%`,
                    backgroundColor: selected?.id === t.id ? C.accent : C.navy,
                  },
                ]}
              >
                <AppText
                  color="white"
                  style={{ fontFamily: font.extra, fontSize: 11 }}
                >
                  {t.initials}
                </AppText>
              </Pressable>
            );
          })}
          <View style={styles.label}>
            <Icon name="map-pin" size={12} color={C.green} />
            <AppText variant="caption" color={C.green}>
              Hududlar sxemasi
            </AppText>
          </View>
        </View>
        {tutors.length > located.length ? (
          <AppText variant="caption" color={C.muted}>
            {tutors.length - located.length} ustozning hududi sxemada yo‘q.
            Ularni ro‘yxatdan ko‘ring.
          </AppText>
        ) : null}
        {!located.length ? (
          <AppText variant="caption" color={C.muted}>
            Tanlangan natijalarda xaritada ko‘rsatiladigan Toshkent hududi yo‘q.
          </AppText>
        ) : null}
      </Card>
      {selected ? <TutorCard tutor={selected} /> : null}
    </>
  );
}
const styles = StyleSheet.create({
  map: {
    height: 245,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  pin: {
    position: "absolute",
    width: 36,
    height: 36,
    marginLeft: -18,
    marginTop: -18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: C.white,
  },
  label: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    gap: 4,
    backgroundColor: C.white,
    borderRadius: 9,
    padding: 7,
  },
});
