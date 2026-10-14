import React, { useState } from "react";
import { View } from "react-native";
import { AppText, Button, uiStyles } from "./ui";
import { UserAvatar } from "./UserAvatar";
import { Feedback, useAction } from "./feedback";
import { useApp } from "../state/AppContext";
import { pickAvatar, type AvatarPhoto } from "../services/avatar";
import { C } from "../theme";

export function AvatarEditor() {
  const { user, updateAvatar } = useApp();
  const [draft, setDraft] = useState<AvatarPhoto | null>(null);
  const action = useAction();
  const initials =
    user.name
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || "D";
  const existing = !!(user.avatarFileId || user.demoAvatarUri);
  return (
    <View style={{ gap: 12, alignItems: "center", width: "100%" }}>
      <UserAvatar
        userId={user.id}
        initials={initials}
        size={96}
        previewUri={draft?.previewUri}
      />
      <Button
        title={
          draft
            ? "Boshqa rasm tanlash"
            : existing
              ? "Rasmni o‘zgartirish"
              : "Rasm yuklash"
        }
        icon="camera"
        variant="soft"
        disabled={action.busy}
        onPress={() =>
          action.run(async () => {
            const photo = await pickAvatar();
            if (photo) setDraft(photo);
          })
        }
      />
      {draft ? (
        <>
          <AppText variant="caption" color={C.muted}>
            Yangi rasmni saqlash orqali tasdiqlang.
          </AppText>
          <View style={[uiStyles.wrap, { justifyContent: "center" }]}>
            <Button
              title="Rasmni saqlash"
              loading={action.busy}
              onPress={() =>
                action.run(
                  () => updateAvatar(draft),
                  () => {
                    setDraft(null);
                    action.setSuccess("Profil rasmi yangilandi.");
                  },
                )
              }
            />
            <Button
              title="Rasmni bekor qilish"
              variant="outline"
              disabled={action.busy}
              onPress={() => setDraft(null)}
            />
          </View>
        </>
      ) : existing ? (
        <Button
          title="Rasmni olib tashlash"
          variant="outline"
          loading={action.busy}
          onPress={() =>
            action.run(
              () => updateAvatar(null),
              () => action.setSuccess("Profil rasmi olib tashlandi."),
            )
          }
        />
      ) : null}
      <View style={{ width: "100%" }}>
        <Feedback {...action} />
      </View>
    </View>
  );
}
