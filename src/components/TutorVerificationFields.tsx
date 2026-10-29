import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import * as Crypto from "expo-crypto";
import { encode } from "base64-arraybuffer";
import { useApp } from "../state/AppContext";
import type { FileAsset, TutorInput } from "../state/domain";
import {
  CERTIFICATE_LIMIT,
  CERTIFICATE_MIME_TYPES,
} from "../state/tutorApplication";
import { pickMaterial } from "../services/materials";
import { requireActorBackend } from "../services/backend";
import { createFileService, FileUploadError } from "../services/files";
import { AppText, Button, Card, Field } from "./ui";
import { OB, OnboardingButton, OnboardingField } from "./OnboardingUI";
import { Feedback, useAction } from "./feedback";
import { C } from "../theme";

export function TutorVerificationFields({
  value,
  onChange,
  dark = false,
  onBusyChange,
}: {
  value: TutorInput;
  onChange: (patch: Partial<TutorInput>) => void;
  dark?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { user, market, mode, command, refresh } = useApp(),
    action = useAction();
  const [pending, setPending] = useState<FileAsset | null>(null);
  const live = useRef(true),
    identity = useRef(user.id),
    update = useRef(onChange);
  identity.current = user.id;
  update.current = onChange;
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    onBusyChange?.(action.busy);
  }, [action.busy, onBusyChange]);
  const asset = market.files?.find(
    (f) =>
      f.id === value.certificateFileId &&
      f.ownerId === user.id &&
      f.state === "ready",
  );
  const accept = async (file: FileAsset, owner: string) => {
    if (!live.current || identity.current !== owner) return;
    update.current({
      certificateFileId: file.id,
      proof:
        value.proof.trim().length >= 5 ? value.proof : "Yuklangan sertifikat",
    });
    setPending(null);
    await refresh();
  };
  const upload = () =>
    action.run(async () => {
      const owner = user.id;
      const input = await pickMaterial(
        CERTIFICATE_MIME_TYPES,
        CERTIFICATE_LIMIT,
      );
      if (!input || !live.current) return;
      if (identity.current !== owner)
        throw new Error("Akkaunt o‘zgardi. Amalni qayta boshlang.");
      if (mode === "demo") {
        if (input.bytes.byteLength > 1024 * 1024)
          throw new Error(
            "Sinov rejimida 1 MB gacha fayl tanlang. Supabase rejimida 10 MB gacha yuklanadi.",
          );
        const id = Crypto.randomUUID();
        const file: FileAsset = {
          id,
          ownerId: owner,
          purpose: "verification",
          bucketId: "darsino-verifications",
          objectPath: `${owner}/${id}`,
          originalName: input.originalName,
          mimeType: input.mimeType,
          sizeBytes: input.bytes.byteLength,
          state: "ready",
          conversationId: null,
          offeringId: null,
          createdAt: new Date().toISOString(),
          demoUri: `data:${input.mimeType};base64,${encode(input.bytes)}`,
        };
        await command({ type: "demo-verification-file", file });
        await accept(file, owner);
        return;
      }
      const files = createFileService(await requireActorBackend(owner));
      try {
        await accept(
          await files.upload({ ...input, purpose: "verification" }),
          owner,
        );
      } catch (error) {
        if (
          error instanceof FileUploadError &&
          error.stage === "finalize" &&
          live.current &&
          identity.current === owner
        )
          setPending(error.asset);
        if (error instanceof FileUploadError && error.stage === "upload")
          await files.remove(error.asset.id).catch(() => {});
        throw error;
      }
    });
  const inputProps = {
    label: "Telefon raqami (majburiy)",
    placeholder: "+998 90 123 45 67",
    value: value.contactPhone || "",
    keyboardType: "phone-pad" as const,
    maxLength: 24,
    onChangeText: (contactPhone: string) => onChange({ contactPhone }),
  };
  return (
    <View style={{ gap: 14 }}>
      {dark ? <OnboardingField {...inputProps} /> : <Field {...inputProps} />}
      <Card
        style={{
          backgroundColor: dark ? OB.card : C.background,
          borderColor: C.borderStrong,
        }}
      >
        <AppText variant="heading" color={C.ink}>
          Sertifikat (majburiy)
        </AppText>
        <AppText variant="caption" color={dark ? OB.muted : C.muted}>
          PDF, JPG, PNG yoki WebP · 10 MB gacha
        </AppText>
        {asset || value.certificateFileId ? (
          <AppText color={C.green} localize={false}>
            {asset?.originalName || "Sertifikat yuklandi"}
          </AppText>
        ) : null}
        {dark ? (
          <OnboardingButton
            title={
              value.certificateFileId
                ? "Sertifikatni almashtirish"
                : "Sertifikat yuklash"
            }
            secondary
            busy={action.busy}
            onPress={upload}
          />
        ) : (
          <Button
            title={
              value.certificateFileId
                ? "Sertifikatni almashtirish"
                : "Sertifikat yuklash"
            }
            icon="upload"
            variant="soft"
            loading={action.busy}
            onPress={upload}
          />
        )}
        {pending ? (
          <Button
            title="Sertifikat yuklashni yakunlash"
            loading={action.busy}
            onPress={() =>
              action.run(async () => {
                const owner = user.id;
                const file = await createFileService(
                  await requireActorBackend(owner),
                ).finalize(pending.id);
                await accept(file, owner);
              })
            }
          />
        ) : null}
        <AppText variant="caption" color={dark ? OB.muted : C.muted}>
          Telefon raqami va sertifikat faqat siz hamda adminga ko‘rinadi. Admin
          tasdiqlagach o‘qituvchi sifatida ishlaysiz.
        </AppText>
        {mode === "demo" ? (
          <AppText variant="caption" color={dark ? OB.muted : C.muted}>
            Sinov rejimi: fayl faqat shu brauzer yoki qurilmada saqlanadi.
          </AppText>
        ) : null}
        <Feedback {...action} />
      </Card>
    </View>
  );
}
