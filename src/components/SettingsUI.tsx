import React from "react";
import { StyleSheet, Switch, View } from "react-native";
import { LocalizedPressable as Pressable } from "../i18n/native";
import { AppText, Icon } from "./ui";
import { C } from "../theme";
import { useI18n } from "../i18n";

type SettingIcon = React.ComponentProps<typeof Icon>["name"];
export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <AppText
        variant="caption"
        color={C.muted}
        style={{ paddingHorizontal: 4 }}
      >
        {title}
      </AppText>
      <View style={s.section}>{children}</View>
    </View>
  );
}
export function SettingRow({
  title,
  subtitle,
  icon,
  value,
  onPress,
  danger = false,
}: {
  title: string;
  subtitle?: string;
  icon: SettingIcon;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        s.row,
        pressed && { backgroundColor: C.background },
      ]}
    >
      <View
        style={[s.icon, { backgroundColor: danger ? C.errorSoft : C.blueSoft }]}
      >
        <Icon name={icon} size={19} color={danger ? C.error : C.navy} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="label" color={danger ? C.error : C.ink}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={C.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText
          variant="caption"
          color={C.muted}
          style={{ maxWidth: "35%", textAlign: "right" }}
        >
          {value}
        </AppText>
      ) : null}
      <Icon name="chevron-right" size={17} color={C.muted} />
    </Pressable>
  );
}
export function SettingToggle({
  title,
  subtitle,
  value,
  onChange,
  disabled,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <View style={s.row}>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption" color={C.muted}>
          {subtitle}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={t(title)}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: "#CBD5E1", true: C.accent }}
        thumbColor={C.white}
      />
    </View>
  );
}
const s = StyleSheet.create({
  section: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
