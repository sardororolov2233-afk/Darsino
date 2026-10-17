import React, { useState } from "react";
import { View } from "react-native";
import { AppText, Button, Card, Field, Chip, uiStyles } from "./ui";
import { Feedback, useAction } from "./feedback";
import { useApp } from "../state/AppContext";
import { useAppNavigation } from "../navigation";
import { requireBackend } from "../services/backend";
import { createFileService, FileUploadError } from "../services/files";
import { pickMaterial } from "../services/materials";
import { C } from "../theme";
export function LessonMaterials({
  offeringId,
  sessionId,
  videosOnly = false,
  heading = true,
}: {
  offeringId?: string;
  sessionId?: string;
  videosOnly?: boolean;
  heading?: boolean;
}) {
  const { market, user, mode, refresh } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState<{
    fileId: string;
    title: string;
    sessionId?: string;
  } | null>(null);
  const [remove, setRemove] = useState<string | null>(null);
  const owner =
    !!offeringId &&
    market.offerings.some((o) => o.id === offeringId && o.tutorId === user.id);
  const list = (market.lessonFiles || []).filter(
    (f) =>
      (!offeringId || f.offeringId === offeringId) &&
      (!sessionId || !f.sessionId || f.sessionId === sessionId) &&
      (!videosOnly ||
        market.files
          ?.find((a) => a.id === f.fileId)
          ?.mimeType.startsWith("video/")),
  );
  const finish = async (item: NonNullable<typeof pending>) => {
    const files = createFileService(requireBackend());
    await files.finalize(item.fileId);
    await files.attachMaterial(item.fileId, item.title, item.sessionId);
    await refresh();
    setPending(null);
    setTitle("");
    action.setSuccess("Material joylandi. Guruh o‘quvchilari ko‘ra oladi.");
  };
  return (
    <View style={{ gap: 12 }}>
      {heading ? (
        <AppText variant="heading">
          {videosOnly ? "Guruhlarim videolari" : "Video va materiallar"}
        </AppText>
      ) : null}
      {owner ? (
        <Card>
          <AppText variant="caption" color={C.muted}>
            PDF, Office, rasm, MP4 yoki WebM · 20 MB gacha. Faylni guruhga qabul
            qilingan o‘quvchilar ko‘radi.
          </AppText>
          <Field
            label="Material sarlavhasi"
            maxLength={150}
            value={title}
            onChangeText={setTitle}
          />
          <Button
            title="Video yoki material yuklash"
            icon="upload"
            loading={action.busy}
            disabled={title.trim().length < 2 || !!pending}
            onPress={() =>
              action.run(async () => {
                if (mode === "demo")
                  throw new Error("Fayl yuklash Supabase rejimida ishlaydi.");
                const input = await pickMaterial();
                if (!input) return;
                let fileId: string;
                try {
                  const asset = await createFileService(
                    requireBackend(),
                  ).upload({ ...input, purpose: "material", offeringId });
                  fileId = asset.id;
                } catch (e) {
                  if (e instanceof FileUploadError && e.stage === "finalize")
                    setPending({
                      fileId: e.asset.id,
                      title: title.trim(),
                      sessionId,
                    });
                  if (e instanceof FileUploadError && e.stage === "upload") {
                    // Best effort release of a failed reservation; no linked file can be removed.
                    await createFileService(requireBackend())
                      .remove(e.asset.id)
                      .catch(() => {});
                  }
                  throw e;
                }
                const item = { fileId, title: title.trim(), sessionId };
                setPending(item);
                await finish(item);
              })
            }
          />
          {mode === "demo" ? (
            <AppText variant="caption" color={C.muted}>
              Sinov rejimi: haqiqiy fayllar serverga yuborilmaydi.
            </AppText>
          ) : null}
          {pending ? (
            <>
              <AppText color={C.muted}>
                Fayl yuklangan. Bog‘lashni qayta yakunlashingiz mumkin.
              </AppText>
              <Button
                title="Yuklashni yakunlash"
                loading={action.busy}
                onPress={() => action.run(() => finish(pending))}
              />
            </>
          ) : null}
        </Card>
      ) : null}
      {list.map((material) => {
        const asset = market.files?.find((f) => f.id === material.fileId);
        return (
          <Card key={material.id}>
            <View style={uiStyles.wrap}>
              <Chip
                label={
                  asset?.mimeType.startsWith("video/")
                    ? "Video dars"
                    : "Material"
                }
                tone="purple"
              />
              {owner ? (
                <Chip
                  label={material.published ? "E’lon qilingan" : "Yashirilgan"}
                  tone={material.published ? "green" : undefined}
                />
              ) : null}
            </View>
            <AppText variant="heading">{material.title}</AppText>
            <AppText variant="caption" color={C.muted}>
              {asset?.originalName}
              {asset ? ` · ${(asset.sizeBytes / 1048576).toFixed(1)} MB` : ""}
            </AppText>
            <Button
              title={`Ochish: ${material.title}`}
              variant="soft"
              icon="play-circle"
              onPress={() =>
                navigation.navigate("MaterialViewer", {
                  fileId: material.fileId,
                  title: material.title,
                })
              }
            />
            {owner ? (
              <>
                <Button
                  title={
                    material.published
                      ? "Materialni yashirish"
                      : "Materialni ko‘rsatish"
                  }
                  variant="outline"
                  loading={action.busy}
                  onPress={() =>
                    action.run(async () => {
                      await createFileService(requireBackend()).manageMaterial(
                        material.id,
                        { published: !material.published },
                      );
                      await refresh();
                    })
                  }
                />
                {remove === material.id ? (
                  <>
                    <AppText color={C.error}>
                      Bu materialni o‘chirish tasdiqlansinmi?
                    </AppText>
                    <Button
                      title="Materialni o‘chirishni tasdiqlash"
                      variant="outline"
                      loading={action.busy}
                      onPress={() =>
                        action.run(async () => {
                          const files = createFileService(requireBackend());
                          await files.manageMaterial(material.id, {
                            remove: true,
                          });
                          try {
                            await files.remove(material.fileId);
                          } finally {
                            await refresh();
                            setRemove(null);
                          }
                        })
                      }
                    />
                    <Button
                      title="O‘chirishni bekor qilish"
                      variant="soft"
                      onPress={() => setRemove(null)}
                    />
                  </>
                ) : (
                  <Button
                    title="Materialni o‘chirish"
                    variant="outline"
                    onPress={() => setRemove(material.id)}
                  />
                )}
              </>
            ) : null}
          </Card>
        );
      })}
      {!list.length ? (
        <AppText variant="caption" color={C.muted}>
          {owner
            ? "Birinchi video yoki hujjatingizni joylang."
            : "Hozircha material joylanmagan. Ustoz yuklagach shu yerda ko‘rinadi."}
        </AppText>
      ) : null}
      <Feedback {...action} />
    </View>
  );
}
