import React, { useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { LocalizedPressable as Pressable } from "../i18n/native";
import { AppText, Button, Card, Field, Icon, uiStyles } from "./ui";
import { localDate } from "../state/domain";
import { shiftDay, weekdayOf, WEEKDAYS } from "../state/teacherDashboard";
import { monthLabel, paymentMonth, shiftMonth } from "../state/payments";
import { C } from "../theme";
function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return visible ? (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "#14213D88",
          justifyContent: "center",
          alignItems: "center",
          padding: 12,
        }}
      >
        <Card
          style={{ width: "100%", maxWidth: 410, maxHeight: "94%", gap: 16 }}
        >
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Card>
      </View>
    </Modal>
  ) : null;
}
export function CalendarField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(paymentMonth);
  const year = Number(month.slice(0, 4)),
    number = Number(month.slice(5, 7)),
    count = new Date(Date.UTC(year, number, 0)).getUTCDate(),
    offset = (weekdayOf(`${month}-01`) + 6) % 7;
  const choose = (date: string) => {
    onChangeText(date);
    setOpen(false);
  };
  return (
    <>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <Field
            label={label}
            value={value}
            onChangeText={onChangeText}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <Button
          title=""
          icon="calendar"
          accessibilityLabel={`${label}: kalendardan tanlash`}
          variant="soft"
          style={{ width: 50, paddingHorizontal: 0 }}
          onPress={() => {
            try {
              shiftDay(value, 0);
              setMonth(value.slice(0, 7));
            } catch {
              setMonth(paymentMonth());
            }
            setOpen(true);
          }}
        />
      </View>
      <Sheet visible={open} onClose={() => setOpen(false)}>
        <View style={uiStyles.between}>
          <AppText variant="heading">Dars sanasini tanlang</AppText>
          <Button
            title=""
            icon="x"
            accessibilityLabel="Kalendarni yopish"
            variant="soft"
            onPress={() => setOpen(false)}
          />
        </View>
        <View style={uiStyles.between}>
          <Button
            title=""
            icon="chevron-left"
            accessibilityLabel="Oldingi oy"
            variant="outline"
            onPress={() => setMonth(shiftMonth(month, -1))}
          />
          <AppText variant="label">{monthLabel(month)}</AppText>
          <Button
            title=""
            icon="chevron-right"
            accessibilityLabel="Keyingi oy"
            variant="outline"
            onPress={() => setMonth(shiftMonth(month, 1))}
          />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {WEEKDAYS.map((d) => (
            <View
              key={d.day}
              style={{
                width: `${100 / 7}%`,
                alignItems: "center",
                paddingVertical: 8,
              }}
            >
              <AppText variant="caption" color={C.muted}>
                {d.short}
              </AppText>
            </View>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <View
              key={`blank${i}`}
              style={{ width: `${100 / 7}%`, height: 44 }}
            />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={`Sana: ${date}`}
                accessibilityState={{ selected: date === value }}
                onPress={() => choose(date)}
                style={{
                  width: `${100 / 7}%`,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  backgroundColor:
                    date === value
                      ? C.primary
                      : date === localDate(new Date())
                        ? C.primarySoft
                        : "transparent",
                }}
              >
                <AppText
                  variant="label"
                  color={date === value ? "white" : C.ink}
                >
                  {i + 1}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <Button
          title="Bugunni tanlash"
          variant="soft"
          onPress={() => choose(localDate(new Date()))}
        />
      </Sheet>
    </>
  );
}
export function TimeField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [hour, setHour] = useState("18"),
    [minute, setMinute] = useState("00");
  const option = (
    v: string,
    chosen: string,
    select: (v: string) => void,
    caption: string,
  ) => (
    <Pressable
      key={v}
      accessibilityRole="radio"
      accessibilityLabel={`${caption}: ${v}`}
      accessibilityState={{ checked: v === chosen }}
      onPress={() => select(v)}
      style={{
        height: 44,
        minWidth: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        backgroundColor: v === chosen ? C.primary : C.background,
      }}
    >
      <AppText variant="label" color={v === chosen ? "white" : C.ink}>
        {v}
      </AppText>
    </Pressable>
  );
  return (
    <>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <Field
            label={label}
            value={value}
            onChangeText={onChangeText}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <Button
          title=""
          icon="clock"
          accessibilityLabel={`${label}: soatdan tanlash`}
          variant="soft"
          style={{ width: 50, paddingHorizontal: 0 }}
          onPress={() => {
            const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
            setHour(match?.[1] || "18");
            setMinute(match?.[2] || "00");
            setOpen(true);
          }}
        />
      </View>
      <Sheet visible={open} onClose={() => setOpen(false)}>
        <View style={uiStyles.between}>
          <AppText variant="heading">Dars vaqtini tanlang</AppText>
          <Button
            title=""
            icon="x"
            accessibilityLabel="Soat tanlagichini yopish"
            variant="soft"
            onPress={() => setOpen(false)}
          />
        </View>
        <AppText
          variant="display"
          color={C.primary}
          style={{ textAlign: "center" }}
        >
          {hour}:{minute}
        </AppText>
        <AppText variant="caption" color={C.muted}>
          Soat · Toshkent vaqti
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {Array.from({ length: 24 }, (_, i) =>
            option(String(i).padStart(2, "0"), hour, setHour, "Soat"),
          )}
        </View>
        <AppText variant="caption" color={C.muted}>
          Daqiqa
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {[
            ...new Set([
              ...Array.from({ length: 12 }, (_, i) =>
                String(i * 5).padStart(2, "0"),
              ),
              minute,
            ]),
          ]
            .sort()
            .map((v) => option(v, minute, setMinute, "Daqiqa"))}
        </View>
        <Button
          title="Vaqtni tanlash"
          icon="check"
          onPress={() => {
            onChangeText(`${hour}:${minute}`);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}
