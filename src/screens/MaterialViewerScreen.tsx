import React, { useEffect, useState } from "react";
import { Image, Linking, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppText, Button, Header, Screen } from "../components/ui";
import { Feedback, useAction } from "../components/feedback";
import { useApp } from "../state/AppContext";
import { useAppNavigation, type RootStackParamList } from "../navigation";
import { requireBackend } from "../services/backend";
import { createFileService } from "../services/files";
import { C } from "../theme";
function LessonPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    const position = player.currentTime,
      playing = player.playing;
    setLoadError("");
    void player
      .replaceAsync(uri)
      .then(() => {
        if (!active) return;
        player.currentTime = position;
        if (playing) player.play();
      })
      .catch(() => {
        if (active)
          setLoadError("Videoni yuklab bo‘lmadi. Havolani yangilang.");
      });
    return () => {
      active = false;
    };
  }, [uri, player]);
  const { status, error } = useEvent(player, "statusChange", {
    status: player.status,
  });
  return (
    <View style={{ gap: 10 }}>
      <VideoView
        player={player}
        style={{ width: "100%", height: 230, backgroundColor: "#000" }}
        nativeControls
      />
      {status === "loading" ? (
        <AppText color={C.muted}>Video yuklanmoqda…</AppText>
      ) : null}
      <Feedback
        error={
          loadError ||
          (error
            ? "Videoni o‘qib bo‘lmadi. Havolani yangilang yoki qurilmangiz qo‘llaydigan MP4 formatini tanlang."
            : "")
        }
      />
    </View>
  );
}
export function MaterialViewerScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "MaterialViewer">) {
  const { user, mode } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const [source, setSource] = useState<{ uri: string; mime: string } | null>(
    null,
  );
  const [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    setSource(null);
  }, [route.params.fileId, user.id]);
  useEffect(() => {
    let active = true;
    setError("");
    const load = async () => {
      if (mode === "demo")
        throw new Error("Bu faylni ko‘rish uchun Supabase rejimini yoqing.");
      const files = createFileService(requireBackend());
      const file = await files.getFile(route.params.fileId);
      const uri = await files.signedUrl(file.id);
      if (active) setSource({ uri, mime: file.mimeType });
    };
    void load().catch((e) => {
      if (active) {
        setError(e.message);
        setSource(null);
      }
    });
    // Signed URLs last five minutes. Renew while mounted; stop playback on unmount.
    const timer = setInterval(() => setVersion((n) => n + 1), 240000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [route.params.fileId, user.id, mode, version]);
  return (
    <Screen>
      <Header title={route.params.title} onBack={() => navigation.goBack()} />
      {source?.mime.startsWith("video/") ? (
        <LessonPlayer key={route.params.fileId} uri={source.uri} />
      ) : source?.mime.startsWith("image/") ? (
        <Image
          source={{ uri: source.uri }}
          style={{ width: "100%", height: 350 }}
          resizeMode="contain"
          accessibilityLabel={route.params.title}
        />
      ) : source ? (
        <AppText color={C.muted}>
          Hujjat qurilmangizdagi hujjat ko‘ruvchisida yoki brauzerda ochiladi.
        </AppText>
      ) : !error ? (
        <AppText>Material yuklanmoqda…</AppText>
      ) : null}
      {source ? (
        <Button
          title="Faylni ochish"
          icon="external-link"
          variant="soft"
          loading={action.busy}
          onPress={() => action.run(() => Linking.openURL(source.uri))}
        />
      ) : null}
      <Button
        title="Havolani yangilash"
        variant="outline"
        onPress={() => setVersion((n) => n + 1)}
      />
      <Feedback error={error || action.error} />
    </Screen>
  );
}
