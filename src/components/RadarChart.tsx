import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";
import { SKILLS, type Skill } from "../data/learning";
import { C } from "../theme";
const point = (i: number, radius: number) => ({
  x: 145 + Math.sin((i * Math.PI * 2) / 5) * radius,
  y: 135 - Math.cos((i * Math.PI * 2) / 5) * radius,
});
export function RadarChart({
  skills,
  compact = false,
}: {
  skills: Record<Skill, { correct: number; total: number }>;
  compact?: boolean;
}) {
  const points = SKILLS.map((s, i) => {
    const v = skills[s];
    const p = point(i, v.total ? (v.correct / v.total) * 85 : 0);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Bilim radari: ${SKILLS.map((s) => `${s} ${skills[s].total ? Math.round((skills[s].correct / skills[s].total) * 100) + "%" : "hali o‘lchanmagan"}`).join(", ")}`}
      style={{ alignItems: "center" }}
    >
      <Svg viewBox="0 0 290 260" width="100%" height={compact ? 160 : 250}>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <Polygon
            key={r}
            points={SKILLS.map((_, i) => {
              const p = point(i, 85 * r);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill={r === 1 ? C.primarySoft : "none"}
            fillOpacity={r === 1 ? 0.45 : 1}
            stroke={C.borderStrong}
            strokeWidth={0.8}
          />
        ))}
        {SKILLS.map((s, i) => {
          const p = point(i, 85),
            label = point(i, 113);
          return (
            <React.Fragment key={s}>
              <Line
                x1="145"
                y1="135"
                x2={p.x}
                y2={p.y}
                stroke={C.borderStrong}
                strokeWidth={0.8}
              />
              <SvgText
                x={label.x}
                y={label.y + 4}
                textAnchor="middle"
                fill={C.muted}
                fontSize="10"
                fontWeight="600"
              >
                {s}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Polygon
          points={points}
          fill={C.accent}
          fillOpacity={0.22}
          stroke={C.accent}
          strokeWidth="2.5"
        />
        <Circle cx="145" cy="135" r="3" fill={C.navy} />
      </Svg>
    </View>
  );
}
