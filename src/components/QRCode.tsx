import React, { useMemo } from "react";
import Svg, { Path, Rect } from "react-native-svg";
import { qrcodegen } from "../vendor/qrcodegen";
export function QRCode({ value, size = 216, label = "QR kod" }: {
  value: string; size?: number; label?: string;
}) {
  const qr = useMemo(() => qrcodegen.QrCode.encodeText(value, qrcodegen.QrCode.Ecc.MEDIUM), [value]);
  const path = useMemo(() => {
    const parts: string[] = [];
    for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++)
      if (qr.getModule(x, y)) parts.push("M" + (x + 4) + " " + (y + 4) + "h1v1h-1z");
    return parts.join("");
  }, [qr]);
  return <Svg width={size} height={size} viewBox={"0 0 " + (qr.size + 8) + " " + (qr.size + 8)}
    accessibilityLabel={label} accessibilityRole="image">
    <Rect width="100%" height="100%" fill="#FFFFFF" />
    <Path d={path} fill="#0F265C" />
  </Svg>;
}
