import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { C, font } from "../theme";

export function Brand({
  wordmark = true,
  width = 140,
  height,
  light = false,
}: {
  wordmark?: boolean;
  width?: number;
  height?: number;
  light?: boolean;
}) {
  const iconSize = height || (wordmark ? Math.round(width * 0.32) : width);
  const fontSize = Math.round(iconSize * 0.84);
  const containerHeight = wordmark
    ? Math.max(height || 0, Math.round(iconSize * 1.25), 36)
    : height || iconSize;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="O‘qi"
      style={{
        width,
        minHeight: containerHeight,
        flexDirection: "row",
        alignItems: "center",
        gap: Math.max(6, Math.round(iconSize * 0.2)),
        overflow: "visible",
      }}
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 64 64">
        <Rect
          width="64"
          height="64"
          rx="20"
          fill={light ? C.navyLight : C.navy}
        />
        <Circle
          cx="29"
          cy="34"
          r="14"
          fill="none"
          stroke={C.mint}
          strokeWidth="7"
        />
        <Path d="M47 13h7l-5 14h-6z" fill={C.mint} />
      </Svg>
      {wordmark ? (
        <Text
          style={{
            color: light ? C.white : C.navy,
            fontFamily: font.extra,
            fontSize,
            lineHeight: Math.round(fontSize * 1.3),
            letterSpacing: -1,
            includeFontPadding: false,
            paddingBottom: 2,
            overflow: "visible",
          }}
        >
          O‘qi
        </Text>
      ) : null}
    </View>
  );
}
