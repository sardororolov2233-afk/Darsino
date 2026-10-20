import { LocalizedPressable as Pressable } from "../i18n/native";
import React, { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText, Button, Card, Chip, Icon, uiStyles } from "./ui";
import { C } from "../theme";

export function FilterPanel({
  children,
  onReset,
  count = 0,
  initiallyOpen = false,
}: {
  children: ReactNode;
  onReset?: () => void;
  count?: number;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <Card style={styles.panel}>
      <View style={uiStyles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtrlarni ochish yoki yopish"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
          style={styles.toggle}
        >
          <Icon name="sliders" size={18} />
          <AppText variant="label" style={{ flex: 1 }}>
            Filtrlar{count ? ` · ${count} faol` : ""}
          </AppText>
          <Icon name={open ? "chevron-up" : "chevron-down"} size={18} />
        </Pressable>
        {onReset && count > 0 ? (
          <Button
            title="Tozalash"
            variant="soft"
            onPress={onReset}
            style={{ minHeight: 44, paddingHorizontal: 12 }}
          />
        ) : null}
      </View>
      {open ? <View style={{ gap: 16 }}>{children}</View> : null}
    </Card>
  );
}

export function FilterOptions<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 6, minWidth: 0 }}>
      <AppText variant="caption" color={C.muted}>
        {label}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={o.value === value}
            onPress={disabled ? undefined : () => onChange(o.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export function FilterSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6, minWidth: 0 }}>
      <AppText variant="caption" color={C.muted}>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label || "Tanlang"}`}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen((v) => !v)}
        style={[styles.select, disabled && { opacity: 0.5 }]}
      >
        <AppText style={{ flex: 1, minWidth: 0 }} numberOfLines={2}>
          {selected?.label || "Tanlang"}
        </AppText>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={18} />
      </Pressable>
      {open && !disabled ? (
        <ScrollView
          nestedScrollEnabled
          style={styles.options}
          keyboardShouldPersistTaps="handled"
        >
          {options.map((o) => (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ checked: value === o.value }}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={[
                styles.option,
                value === o.value && { backgroundColor: C.blueSoft },
              ]}
            >
              <AppText style={{ flex: 1, minWidth: 0 }}>{o.label}</AppText>
              {value === o.value ? <Icon name="check" size={18} /> : null}
            </Pressable>
          ))}
          {!options.length ? (
            <AppText color={C.muted} style={{ padding: 12 }}>
              Tanlovlar mavjud emas
            </AppText>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}
export const filterChoices = (values: string[]) =>
  values.map((value) => ({ value, label: value }));
const styles = StyleSheet.create({
  panel: { padding: 12, gap: 12, borderRadius: 18 },
  toggle: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  select: {
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  options: {
    maxHeight: 240,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.white,
  },
  option: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
