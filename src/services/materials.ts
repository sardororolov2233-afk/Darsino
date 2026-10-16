import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Platform } from "react-native";

import { materialMimeTypes, validateMaterial } from "../state/materials";

export async function pickMaterial() {
  const result = await DocumentPicker.getDocumentAsync({
    type: Object.values(materialMimeTypes),
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  // Check the advertised size before allocating the native ArrayBuffer.
  if (asset.size !== undefined)
    validateMaterial(asset.name, asset.size, asset.mimeType);
  const localFile = Platform.OS !== "web" ? new File(asset.uri) : null;
  try {
    if (localFile) validateMaterial(asset.name, localFile.size, asset.mimeType);
    const bytes =
      Platform.OS === "web"
        ? await (asset.file
            ? asset.file.arrayBuffer()
            : (await fetch(asset.uri)).arrayBuffer())
        : await localFile!.arrayBuffer();
    const mimeType = validateMaterial(
      asset.name,
      bytes.byteLength,
      asset.mimeType,
    );
    return { bytes, mimeType, originalName: asset.name };
  } finally {
    // Only delete the temporary copy produced by this picker, never a user file.
    if (localFile?.exists) {
      try {
        localFile.delete();
      } catch {
        /* OS can evict its cache later. */
      }
    }
  }
}
