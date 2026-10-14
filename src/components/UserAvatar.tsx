import React, { useEffect, useState } from "react";
import { Avatar } from "./ui";
import { useApp } from "../state/AppContext";
import { createFileService } from "../services/files";
import { requireBackend } from "../services/backend";

export function UserAvatar({
  userId,
  initials,
  size = 48,
  previewUri,
}: {
  userId?: string;
  initials: string;
  size?: number;
  previewUri?: string;
}) {
  const { market, user: actor, mode } = useApp();
  const user = market.users.find((u) => u.id === userId);
  const fileId = user?.avatarFileId;
  const [signed, setSigned] = useState<{
    fileId: string;
    actorId: string;
    uri: string;
  }>();
  useEffect(() => {
    if (mode !== "supabase" || !fileId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const uri = await createFileService(requireBackend()).signedUrl(fileId);
        if (active) {
          setSigned({ fileId, actorId: actor.id, uri });
          timer = setTimeout(load, 240000);
        }
      } catch {
        if (active) setSigned(undefined);
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fileId, mode, actor.id]);
  const uri =
    previewUri ||
    (mode === "demo"
      ? user?.demoAvatarUri
      : signed && signed.fileId === fileId && signed.actorId === actor.id
        ? signed.uri
        : undefined);
  return (
    <Avatar
      initials={initials}
      size={size}
      uri={uri}
      label={user?.name ? `${user.name} profil rasmi` : "Profil rasmi"}
    />
  );
}
