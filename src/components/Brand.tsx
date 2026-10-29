import React from "react";
import { Image, View } from "react-native";
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
  const imageHeight =
    height || (wordmark ? Math.round((width * 2) / 3) : width);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="O‘qi"
      style={{
        width,
        minHeight: imageHeight,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: light ? 12 : 0,
        overflow: "hidden",
      }}
    >
      <Image
        source={
          wordmark
            ? require("../../assets/oqi-wordmark.png")
            : require("../../assets/icon.png")
        }
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        style={{ width, height: imageHeight }}
      />
    </View>
  );
}
