import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { C } from "../theme";
export function WelcomeIllustration({ height = 224 }: { height?: number }) {
  return (
    <View
      style={{
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: C.blueSoft,
      }}
    >
      <Svg viewBox="0 0 350 224" width="100%" height={height}>
        <Rect width="350" height="224" fill="#EAF1FA" />
        <Circle cx="54" cy="179" r="70" fill="#F0EBFA" />
        <Circle cx="311" cy="167" r="55" fill="#FFF4D8" />
        <Path
          d="M104 205V86a71 71 0 0 1 142 0v119h-28V87a43 43 0 0 0-86 0v118z"
          fill={C.navy}
        />
        <Path d="M133 61l47 23v110l-47-9z" fill={C.gold} />
        <Path
          d="M180 84l-47-23v124l-18 1c-51 0-84 18-90 38h45c8-11 27-16 56-16l54-14z"
          fill={C.gold}
        />
        <Circle cx="61" cy="69" r="27" fill="white" />
        <Path d="M61 50l4 14 14 5-14 5-4 15-5-15-14-5 14-5z" fill={C.gold} />
        <Rect x="251" y="32" width="66" height="67" rx="17" fill="white" />
        <Path
          d="M266 49q12-5 19 0q10-5 18 0v30q-11-5-18 0q-10-5-19 0zM285 49v30"
          stroke={C.navy}
          strokeWidth="1.5"
          fill="none"
        />
        <Circle cx="59" cy="146" r="5" fill={C.navy} />
        <Circle cx="298" cy="131" r="5" fill={C.gold} />
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
        <Rect width="350" height="156" fill="#EAF1FA" />
        <Rect y="117" width="350" height="39" fill="#FFF4D8" />
        <Rect x="20" y="18" width="92" height="100" rx="8" fill="white" />
        <Path d="M20 65h92M66 18v100" stroke="#CEDAEB" strokeWidth="2" />
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
