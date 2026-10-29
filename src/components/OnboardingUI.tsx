import {
  LocalizedPressable as Pressable,
  LocalizedTextInput as TextInput,
} from "../i18n/native";
import React, { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { AppText, Icon } from "./ui";
import { Brand } from "./Brand";
import { C, font } from "../theme";

export const OB = {
  bg: C.background,
  card: C.white,
  line: C.borderStrong,
  muted: C.muted,
  ink: C.ink,
  blue: C.action,
};
export function OnboardingShell({
  children,
  title,
  subtitle,
  onBack,
  footer,
  step,
  total = 5,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  footer?: ReactNode;
  step?: number;
  total?: number;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: OB.bg }}>
      <StatusBar style="dark" />
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 440 900"
      >
        <Defs>
          <RadialGradient id="onboardingGlow">
            <Stop offset="0" stopColor={C.mint} stopOpacity=".65" />
            <Stop offset="1" stopColor={OB.bg} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="onboardingLeaf">
            <Stop offset="0" stopColor={C.primaryBorder} stopOpacity=".35" />
            <Stop offset="1" stopColor={OB.bg} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect
          x="-180"
          y="-170"
          width="600"
          height="500"
          fill="url(#onboardingGlow)"
        />
        <Rect
          x="100"
          y="170"
          width="430"
          height="430"
          fill="url(#onboardingLeaf)"
        />
        <Rect
          x="160"
          y="650"
          width="500"
          height="430"
          fill="url(#onboardingGlow)"
        />
      </Svg>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <View style={s.headerSide}>
            {onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Orqaga"
                onPress={onBack}
                style={s.back}
              >
                <Icon name="chevron-left" color={C.navy} size={24} />
              </Pressable>
            ) : null}
          </View>
          <Brand width={115} />
          <View style={s.headerSide} />
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            key={title}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            <View style={s.heading}>
              {step ? (
                <AppText
                  variant="caption"
                  color={C.primary}
                  style={{ letterSpacing: 2 }}
                >
                  {step} / {total} · SIZGA MOS O‘QI
                </AppText>
              ) : null}
              <AppText
                variant="display"
                color={OB.ink}
                style={{ textAlign: "center" }}
              >
                {title}
              </AppText>
              {subtitle ? (
                <AppText color={OB.muted} style={{ textAlign: "center" }}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            {children}
          </ScrollView>
          {footer ? <View style={s.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
export function OnboardingButton({
  title,
  onPress,
  busy = false,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: busy || disabled, busy }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: secondary ? "transparent" : OB.blue,
          borderWidth: 1,
          borderColor: secondary ? C.borderStrong : C.primaryBorder,
          opacity: disabled || busy ? 0.55 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={C.onAction} />
      ) : (
        <AppText variant="label" color={C.onAction}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}
export function OnboardingOption({
  title,
  description,
  icon,
  selected = false,
  onPress,
  compact = false,
  dense = false,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentProps<typeof Icon>["name"];
  selected?: boolean;
  onPress: () => void;
  compact?: boolean;
  dense?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed }) => [
        s.option,
        compact && s.compact,
        dense && { minHeight: 112 },
        compact && !icon && { minHeight: 64, justifyContent: "center" },
        selected && s.selected,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {icon ? (
        <View style={s.symbol}>
          <Icon name={icon} color={C.primary} size={compact ? 23 : 28} />
        </View>
      ) : null}
      <View style={{ flex: compact ? undefined : 1, gap: 4 }}>
        <AppText color={OB.ink} variant={compact ? "label" : "heading"}>
          {title}
        </AppText>
        {description ? (
          <AppText color={selected ? C.primary : OB.muted} variant="caption">
            {description}
          </AppText>
        ) : null}
      </View>
      {!compact ? (
        <Icon
          name={selected ? "check-circle" : "chevron-right"}
          color={C.primary}
        />
      ) : selected ? (
        <View style={{ position: "absolute", right: 10, top: 10 }}>
          <Icon name="check-circle" color={C.primary} size={16} />
        </View>
      ) : null}
    </Pressable>
  );
}
export function OnboardingField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="caption" color={OB.muted}>
        {label}
      </AppText>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={OB.muted}
        selectionColor={C.primary}
        style={[
          s.input,
          props.multiline && { minHeight: 94, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function OnboardingSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const normalize = (v: string) => v.toLowerCase().replace(/[‘’']/g, "");
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="caption" color={OB.muted}>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
        style={[
          s.input,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <AppText color={value ? OB.ink : OB.muted} style={{ flex: 1 }}>
          {value || `${label}ni tanlang`}
        </AppText>
        <Icon name="chevron-down" color={OB.muted} />
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: "#203C3777",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <View
            style={{
              backgroundColor: OB.bg,
              borderRadius: 24,
              padding: 20,
              gap: 16,
              width: "100%",
              maxWidth: 440,
              maxHeight: "90%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <AppText variant="heading" color={OB.ink}>
                {label}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tanlovni yopish"
                onPress={() => setOpen(false)}
                style={s.back}
              >
                <Icon name="x" color={C.navy} />
              </Pressable>
            </View>
            <OnboardingField
              label={`${label}ni qidirish`}
              value={query}
              onChangeText={setQuery}
              placeholder="Qidirish..."
            />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 8 }}
            >
              {options
                .filter((v) => normalize(v).includes(normalize(query)))
                .map((v) => (
                  <OnboardingOption
                    key={v}
                    title={v}
                    selected={value === v}
                    onPress={() => {
                      onChange(v);
                      setOpen(false);
                    }}
                  />
                ))}
              {!options.some((v) => normalize(v).includes(normalize(query))) ? (
                <AppText color={OB.muted}>
                  Topilmadi. Boshqa nom bilan qidiring.
                </AppText>
              ) : null}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  headerSide: { width: 44 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingTop: 32,
    paddingBottom: 36,
    gap: 16,
  },
  heading: { gap: 12, alignItems: "center", marginBottom: 16 },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 18, gap: 6 },
  button: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  option: {
    minHeight: 92,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: OB.line,
    backgroundColor: OB.card,
    padding: 16,
    gap: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  compact: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 144,
    alignItems: "flex-start",
    flexDirection: "column",
    gap: 12,
  },
  selected: { backgroundColor: C.action, borderColor: C.primary },
  symbol: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 56,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: OB.line,
    backgroundColor: C.white,
    color: OB.ink,
    fontFamily: font.medium,
    fontSize: 14,
    ...Platform.select({ web: { outlineWidth: 0 } }),
  },
});
