import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { C } from "../theme";
export function WelcomeIllustration({ height = 224 }: { height?: number }) {
  return (
    <View
      style={{ borderRadius: 28, overflow: "hidden", backgroundColor: C.navy }}
    >
      <Svg viewBox="0 0 350 224" width="100%" height={height}>
        <Rect width="350" height="224" fill={C.navy} />
        <Circle cx="310" cy="25" r="100" fill={C.navyLight} />
        <Circle cx="25" cy="220" r="85" fill={C.navyLight} />
        <Circle
          cx="180"
          cy="111"
          r="83"
          fill="none"
          stroke={`${C.mint}50`}
          strokeDasharray="5 5"
        />
        <Circle cx="180" cy="111" r="64" fill="none" stroke={`${C.mint}80`} />
        <Rect x="122" y="40" width="112" height="156" rx="24" fill="white" />
        <Rect
          x="131"
          y="52"
          width="94"
          height="62"
          rx="14"
          fill={C.primarySoft}
        />
        <Path
          d="M148 66q14-5 30 3q14-8 30-3v31q-14-4-30 3q-15-7-30-3z M178 69v31"
          fill="none"
          stroke={C.navy}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <Rect x="140" y="128" width="76" height="7" rx="3" fill={C.border} />
        <Rect x="140" y="143" width="53" height="7" rx="3" fill={C.border} />
        <Rect x="140" y="164" width="76" height="16" rx="8" fill={C.mint} />
        <Circle cx="74" cy="80" r="27" fill={C.mint} />
        <Path
          d="m61 80 9 9 17-20"
          fill="none"
          stroke={C.navy}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Rect x="259" y="131" width="49" height="49" rx="16" fill={C.primary} />
        <Path d="m283 142 3 9 10 3-10 4-3 10-3-10-10-4 10-3z" fill="white" />
        <Circle cx="265" cy="54" r="5" fill={C.mint} />
        <Circle cx="93" cy="170" r="4" fill={C.mint} />
      </Svg>
    </View>
  );
}
export function RoomIllustration({ height = 156 }: { height?: number }) {
  return (
    <View
      style={{
        backgroundColor: C.blueSoft,
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      <Svg viewBox="0 0 350 156" width="100%" height={height}>
        <Rect width="350" height="156" fill={C.primarySoft} />
        <Rect y="117" width="350" height="39" fill="#FFF4D8" />
        <Rect x="20" y="18" width="92" height="100" rx="8" fill="white" />
        <Path d="M20 65h92M66 18v100" stroke={C.borderStrong} strokeWidth="2" />
        <Rect x="169" y="25" width="154" height="76" rx="9" fill={C.navy} />
        <Path
          d="M188 43h90M188 54h61M188 66h111M188 80h92"
          stroke="white"
          strokeWidth="2"
        />
        <Circle cx="139" cy="42" r="16" fill="white" />
        <Path
          d="M139 32v11l8 5"
          stroke={C.navy}
          strokeWidth="1.5"
          fill="none"
        />
        <Rect x="37" y="118" width="94" height="12" rx="5" fill={C.gold} />
        <Rect x="54" y="135" width="59" height="15" rx="4" fill={C.navy} />
        <Path d="M45 130v26M126 130v26" stroke={C.navy} strokeWidth="3" />
        <Rect x="204" y="118" width="94" height="12" rx="5" fill={C.gold} />
        <Rect x="219" y="135" width="60" height="15" rx="4" fill={C.navy} />
        <Path d="M212 130v26M290 130v26" stroke={C.navy} strokeWidth="3" />
      </Svg>
    </View>
  );
}
export function EventIllustration({ height = 156 }: { height?: number }) {
  return (
    <View
      style={{
        backgroundColor: C.purpleSoft,
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      <Svg viewBox="0 0 350 156" width="100%" height={height}>
        <Rect width="350" height="156" fill={C.purpleSoft} />
        <Circle cx="175" cy="79" r="60" fill={C.navy} />
        <Rect x="163" y="36" width="24" height="58" rx="12" fill={C.gold} />
        <Path
          d="M149 76v5a26 26 0 0 0 52 0v-5M175 108v18M159 126h32"
          stroke="white"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <Rect x="28" y="31" width="63" height="37" rx="15" fill="white" />
        <Path d="M43 45h35M43 54h23" stroke={C.navy} strokeWidth="2" />
        <Path d="M40 64l-8 12 25-10" fill="white" />
        <Rect x="258" y="83" width="66" height="39" rx="14" fill={C.gold} />
        <Path d="M271 96h39M271 106h25" stroke={C.navy} strokeWidth="2" />
        <Path d="M307 119l13 13-4-20" fill={C.gold} />
        <Circle cx="62" cy="120" r="6" fill={C.purple} />
        <Path d="M286 19l3 10 10 3-10 3-3 10-3-10-10-3 10-3z" fill={C.purple} />
      </Svg>
    </View>
  );
}
