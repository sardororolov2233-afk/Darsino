import React from "react";
import { View } from "react-native";
import { AppText, Card, Icon, uiStyles } from "./ui";
import { C, font } from "../theme";
export function MetricTile({
  title,
  value,
  caption,
  icon,
  tone = "purple",
  onPress,
}: {
  title: string;
  value: string | number;
  caption?: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  tone?: "purple" | "green" | "red";
  onPress?: () => void;
}) {
  const color =
    tone === "green" ? C.green : tone === "red" ? C.error : C.primary;
  return (
    <Card
      accessibilityLabel={title}
      onPress={onPress}
      style={{
        flexBasis: "46%",
        flexGrow: 1,
        minWidth: 0,
        gap: 12,
        padding: 16,
        borderRadius: 20,
        backgroundColor: tone === "red" ? C.white : C.primarySoft,
        borderColor: tone === "red" ? C.border : C.primaryBorder,
      }}
    >
      <View style={uiStyles.between}>
        <View
          style={{
            height: 36,
            width: 36,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              tone === "green"
                ? C.greenSoft
                : tone === "red"
                  ? C.errorSoft
                  : C.white,
          }}
        >
          <Icon name={icon} size={18} color={color} />
        </View>
        {onPress ? (
          <Icon name="arrow-up-right" size={16} color={C.muted} />
        ) : null}
      </View>
      <View style={{ gap: 4 }}>
        <AppText variant="heading" color={C.ink}>
          {value}
        </AppText>
        <AppText
          variant="caption"
          color={C.muted}
          style={{ fontFamily: font.bold }}
        >
          {title}
        </AppText>
        {caption ? (
          <AppText variant="caption" color={C.muted}>
            {caption}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}
export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={[uiStyles.between, { gap: 12 }]}>
      <View style={{ flex: 1 }}>
        <AppText variant="heading">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={C.muted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}
