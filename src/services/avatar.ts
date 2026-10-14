import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";

export type AvatarPhoto = { bytes: ArrayBuffer; previewUri: string };
export async function pickAvatar(): Promise<AvatarPhoto | null> {
  // The system photo picker grants access to the selected image; full-library
  // permission is unnecessary for this flow.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const image = result.assets[0];
  if (!image.width || !image.height)
    throw new Error("Rasmni o‘qib bo‘lmadi. Boshqa rasm tanlang.");
  const side = Math.min(image.width, image.height);
  const context = ImageManipulator.manipulate(image.uri);
  context.crop({
    originX: Math.floor((image.width - side) / 2),
    originY: Math.floor((image.height - side) / 2),
    width: side,
    height: side,
  });
  context.resize({ width: 512, height: 512 });
  try {
    const rendered = await context.renderAsync();
    try {
      const saved = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.78,
        base64: true,
      });
      if (!saved.base64) throw new Error("Rasmni tayyorlab bo‘lmadi.");
      const bytes = decode(saved.base64);
      if (bytes.byteLength > 2097152)
        throw new Error("Rasm hajmi 2 MB dan katta. Boshqa rasm tanlang.");
      return { bytes, previewUri: `data:image/jpeg;base64,${saved.base64}` };
    } finally {
      rendered.release();
    }
  } finally {
    context.release();
  }
}
