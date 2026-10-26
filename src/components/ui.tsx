import {
  LocalizedPressable as Pressable,
  LocalizedTextInput as TextInput,
} from "../i18n/native";
import { localizedChildren, useI18n } from "../i18n";
import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { StatusBar } from "expo-status-bar";
import { C, font } from "../theme";

type IconName = React.ComponentProps<typeof Feather>["name"];
export function Icon({
  name,
  size = 20,
  color = C.navy,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Feather
      name={name}
      size={size}
      color={color}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
const textVariants: Record<string, TextStyle> = {
  display: { fontFamily: font.extra, fontSize: 28, lineHeight: 36 },
  title: { fontFamily: font.extra, fontSize: 22, lineHeight: 30 },
  heading: { fontFamily: font.bold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: font.medium, fontSize: 14, lineHeight: 22 },
  label: { fontFamily: font.bold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 18 },
};
export function AppText({
  children,
  variant = "body",
  color = C.ink,
  style,
  numberOfLines,
  localize = true,
  ...rest
}: {
  children?: ReactNode;
  variant?: keyof typeof textVariants;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  localize?: boolean;
} & Pick<
  React.ComponentProps<typeof Text>,
  | "onPress"
  | "accessibilityLabel"
  | "accessibilityLiveRegion"
  | "testID"
  | "selectable"
>) {
  const { language, t } = useI18n();
  return (
    <Text
      {...rest}
      accessibilityLabel={
        rest.accessibilityLabel ? t(rest.accessibilityLabel) : undefined
      }
      numberOfLines={numberOfLines}
      style={[textVariants[variant], { color }, style]}
    >
      {localize ? localizedChildren(children, language) : children}
    </Text>
  );
}
export function Screen({
  children,
  scroll = true,
  background = C.background,
  bottom,
  style,
  top,
  lightTop = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  background?: string;
  bottom?: ReactNode;
  style?: StyleProp<ViewStyle>;
  top?: ReactNode;
  lightTop?: boolean;
}) {
  return (
    <SafeAreaView
      style={[
        styles.screen,
        { backgroundColor: top && !lightTop ? C.navy : background },
      ]}
      edges={["top", "left", "right"]}
    >
      <StatusBar style={top && !lightTop ? "light" : "dark"} />
      <KeyboardAvoidingView
        style={[styles.fill, { backgroundColor: background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {top}
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, style]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.fill, style]}>{children}</View>
        )}
        {bottom ? (
          <SafeAreaView edges={["bottom"]} style={styles.footer}>
            <View style={styles.footerContent}>{bottom}</View>
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Header({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Orqaga"
          hitSlop={12}
          style={styles.headerIcon}
        >
          <Icon name="chevron-left" size={24} />
        </Pressable>
      ) : null}
      <AppText variant={onBack ? "heading" : "title"} style={styles.fill}>
        {title}
      </AppText>
      {right}
    </View>
  );
}
export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  icon,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "gold" | "soft" | "outline";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
  accessibilityLabel?: string;
}) {
  const bg = {
    primary: C.navy,
    gold: C.gold,
    soft: C.blueSoft,
    outline: C.white,
  }[variant];
  const fg = variant === "primary" ? C.white : C.navy;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: C.border,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} color={fg} size={18} /> : null}
          <AppText
            variant="label"
            color={fg}
            style={{ flexShrink: 1, textAlign: "center" }}
          >
            {title}
          </AppText>
        </>
      )}
    </Pressable>
  );
}
export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  if (onPress)
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.card,
          style,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        {children}
      </Pressable>
    );
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Chip({
  label,
  selected = false,
  onPress,
  tone,
  style,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: "gold" | "green" | "purple";
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
}) {
  const bg = selected
    ? C.navy
    : tone === "gold"
      ? C.goldSoft
      : tone === "green"
        ? C.greenSoft
        : tone === "purple"
          ? C.purpleSoft
          : C.white;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? label : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      style={[
        styles.chip,
        { backgroundColor: bg, borderColor: selected ? C.navy : C.border },
        style,
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={14}
          color={selected ? C.white : tone === "green" ? C.green : C.muted}
        />
      ) : null}
      <AppText
        variant="caption"
        color={selected ? C.white : tone === "green" ? C.green : C.muted}
        style={{ flexShrink: 1 }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
export function Avatar({
  initials,
  size = 48,
  tone = "gold",
  uri,
  label,
}: {
  initials: string;
  size?: number;
  tone?: "gold" | "blue" | "green" | "purple";
  uri?: string;
  label?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [uri]);
  const bg = {
    gold: C.goldSoft,
    blue: C.blueSoft,
    green: C.greenSoft,
    purple: C.purpleSoft,
  }[tone];
  return (
    <View
      accessibilityLabel={label || initials}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          accessibilityLabel={label || "Profil rasmi"}
          resizeMode="cover"
          onError={() => setFailed(true)}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <AppText
          variant={size > 70 ? "display" : "label"}
          style={{ fontSize: size > 70 ? 28 : Math.max(13, size * 0.28) }}
        >
          {initials}
        </AppText>
      )}
    </View>
  );
}
export function Field({
  label,
  icon,
  style,
  error,
  ...props
}: TextInputProps & { label?: string; icon?: IconName; error?: string }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={styles.fieldWrap}>
      {label ? (
        <AppText variant="caption" color={C.muted}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          { borderColor: error ? C.error : focused ? C.gold : C.border },
        ]}
      >
        {icon ? <Icon name={icon} color={C.muted} /> : null}
        <TextInput
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={C.muted}
          accessibilityLabel={
            props.accessibilityLabel || label || props.placeholder
          }
          style={[styles.input, style]}
        />
      </View>
      {error ? (
        <AppText variant="caption" color={C.error} accessibilityLabel={error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
export function EmptyState({
  title,
  subtitle,
  icon = "search",
}: {
  title: string;
  subtitle: string;
  icon?: IconName;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={28} />
      </View>
      <AppText variant="heading">{title}</AppText>
      <AppText color={C.muted} style={{ textAlign: "center" }}>
        {subtitle}
      </AppText>
    </View>
  );
}
export const uiStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
});
const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
    flexGrow: 1,
  },
  footer: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  footerContent: { paddingHorizontal: 22, paddingVertical: 16, gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
    marginBottom: 2,
  },
  headerIcon: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -10,
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    minWidth: 0,
    flexShrink: 1,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    maxWidth: "100%",
    flexShrink: 1,
  },
  fieldWrap: { gap: 8 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    color: C.ink,
    fontSize: 14,
    fontFamily: font.medium,
    ...Platform.select({ web: { outlineWidth: 0 } }),
  },
  empty: { alignItems: "center", paddingVertical: 42, gap: 12 },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
