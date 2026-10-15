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
  const size = height || (wordmark ? width * 0.32 : width);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="O‘qi"
      style={{
        width,
        height: size,
        flexDirection: "row",
        alignItems: "center",
        gap: size * 0.2,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Rect
          width="64"
          height="64"
          rx="20"
          fill={light ? "#24457C" : C.navy}
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
            fontSize: size * 0.82,
            letterSpacing: -1.5,
          }}
        >
          O‘qi
        </Text>
      ) : null}
    </View>
  );
}
