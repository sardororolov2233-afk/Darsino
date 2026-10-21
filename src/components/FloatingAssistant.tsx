import { LocalizedPressable as Pressable } from "../i18n/native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import { AppText, Button, Field, Icon, uiStyles } from "./ui";
import { Feedback } from "./feedback";
import { useApp } from "../state/AppContext";
import { requireBackend } from "../services/backend";
import {
  AssistantServiceError,
  createAssistantService,
} from "../services/assistant";
import {
  clampAssistantPosition,
  type AssistantMessage,
  type AssistantPosition,
} from "../state/assistant";
import { C } from "../theme";

function AssistantChat({ onClose }: { onClose: () => void }) {
  const { user, mode } = useApp();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState(""),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0),
    [historyError, setHistoryError] = useState(false);
  const scroll = useRef<ScrollView>(null),
    active = useRef(true),
    pending = useRef(false);
  const retry = useRef<{
    message: string;
    requestId: string;
    conversationId: string | null;
  } | null>(null);
  useEffect(() => {
    active.current = true;
    let live = true;
    setLoading(true);
    setError("");
    setHistoryError(false);
    const load = async () => {
      const data =
        mode === "demo"
          ? { messages: [], conversationId: null }
          : await createAssistantService(requireBackend()).history();
      if (live) {
        setMessages(data.messages);
        setConversationId(data.conversationId);
      }
    };
    void load()
      .catch((e) => {
        if (live) {
          setError(e.message);
          setHistoryError(true);
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      active.current = false;
    };
  }, [user.id, mode, historyVersion]);
  const send = async () => {
    const text = draft.trim();
    if (
      !text ||
      text.length > 2000 ||
      pending.current ||
      loading ||
      historyError
    )
      return;
    pending.current = true;
    setBusy(true);
    setError("");
    const request =
      retry.current?.message === text &&
      retry.current.conversationId === conversationId
        ? retry.current
        : { message: text, requestId: Crypto.randomUUID(), conversationId };
    retry.current = request;
    const own: AssistantMessage = {
      id: request.requestId,
      role: "user",
      content: text,
    };
    setMessages((previous) => [...previous, own]);
    try {
      const result =
        mode === "demo"
          ? {
              conversationId: "demo",
              reply:
                "Sinov rejimi: bu chat oynasining namunasidir. Haqiqiy AI javoblari Supabase funksiyasi va AI xizmati sozlangach ishlaydi. O‘qish bo‘yicha savolingizni shu yerga yozishingiz mumkin.",
            }
          : await createAssistantService(requireBackend()).send(
              text,
              conversationId,
              request.requestId,
            );
      if (active.current) {
        setConversationId(result.conversationId);
        setMessages((previous) => [
          ...previous,
          {
            id: `${request.requestId}-reply`,
            role: "assistant",
            content: result.reply,
          },
        ]);
        setDraft("");
        retry.current = null;
      }
    } catch (e) {
      if (e instanceof AssistantServiceError && e.confirmedFailure)
        retry.current = null;
      if (active.current) {
        setMessages((previous) => previous.filter((m) => m.id !== own.id));
        setError(
          e instanceof Error ? e.message : "Savol yuborilmadi. Qayta urining.",
        );
      }
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  };
  return (
    <View style={styles.chat}>
      <View style={[uiStyles.between, styles.chatHeader]}>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">O‘qi AI yordamchi</AppText>
          <AppText variant="caption" color={C.muted}>
            {mode === "demo" ? "Sinov rejimi" : "O‘qishdagi hamrohingiz"}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="AI chatni yopish"
          onPress={onClose}
          style={styles.close}
        >
          <Icon name="x" />
        </Pressable>
      </View>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: true })
        }
      >
        {!messages.length ? (
          <View style={styles.intro}>
            <Icon name="message-circle" size={32} color={C.green} />
            <AppText variant="title">Birga o‘rganamiz</AppText>
            <AppText color={C.muted}>
              Tushunmagan mavzu, mashq yoki o‘qish rejangiz haqida savol bering.
            </AppText>
          </View>
        ) : null}
        {loading ? (
          <AppText color={C.muted}>Suhbat yuklanmoqda…</AppText>
        ) : null}
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.message,
              message.role === "user" ? styles.own : styles.assistant,
            ]}
          >
            <AppText
              variant="caption"
              color={message.role === "user" ? C.navy : C.green}
            >
              {message.role === "user" ? "Siz" : "O‘qi AI"}
            </AppText>
            <AppText selectable>{message.content}</AppText>
          </View>
        ))}
        {busy ? (
          <AppText color={C.green} accessibilityLiveRegion="polite">
            AI javob tayyorlayapti…
          </AppText>
        ) : null}
      </ScrollView>
      <View style={styles.composer}>
        <Feedback error={error} />
        {historyError ? (
          <Button
            title="Suhbatni qayta yuklash"
            variant="soft"
            onPress={() => setHistoryVersion((n) => n + 1)}
          />
        ) : null}
        <Field
          label="AI uchun savolingiz"
          placeholder="Masalan: kasrlarni tushuntirib ber"
          value={draft}
          onChangeText={setDraft}
          editable={!busy}
          multiline
          maxLength={2000}
          style={{ maxHeight: 110 }}
        />
        <View style={[uiStyles.row, { alignItems: "center" }]}>
          <Button
            title="Yangi suhbat"
            variant="soft"
            disabled={busy || loading}
            style={{ flex: 1 }}
            onPress={() => {
              setMessages([]);
              setConversationId(null);
              setError("");
              setHistoryError(false);
              retry.current = null;
            }}
          />
          <Button
            title="AIga yuborish"
            icon="send"
            loading={busy}
            disabled={!draft.trim() || loading || historyError}
            style={{ flex: 1 }}
            onPress={() => void send()}
          />
        </View>
        <AppText variant="caption" color={C.muted}>
          AI xato qilishi mumkin. Muhim javoblarni dars manbasi bilan
          tekshiring.
        </AppText>
      </View>
    </View>
  );
}

export function FloatingAssistant() {
  const { signedIn, user } = useApp();
  // The key unmounts all chat/request state immediately when the account changes.
  return signedIn && user.role === "student" ? (
    <StudentAssistant key={user.id} userId={user.id} />
  ) : null;
}
function StudentAssistant({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [positionReady, setPositionReady] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const dragged = useRef(false);
  const current = useRef<AssistantPosition | null>(null),
    start = useRef<AssistantPosition>({ x: 0, y: 0 });
  const bounds = useRef({ ...size, top: insets.top, bottom: insets.bottom });
  bounds.current = { ...size, top: insets.top, bottom: insets.bottom };
  const storageKey = `@oqi/assistant-position/${userId}`;
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!active || !raw) return;
        const point = JSON.parse(raw);
        if (Number.isFinite(point?.x) && Number.isFinite(point?.y))
          current.current = point;
      })
      .catch(() => {})
      .finally(() => {
        if (active) setPositionReady(true);
      });
    return () => {
      active = false;
    };
  }, [storageKey]);
  useEffect(() => {
    if (!size.width || !positionReady) return;
    const point = current.current || {
      x: size.width - 76,
      y: size.height * 0.6,
    };
    current.current = clampAssistantPosition(
      point,
      size.width,
      size.height,
      insets.top,
      insets.bottom,
    );
    position.setValue(current.current);
  }, [
    size.width,
    size.height,
    insets.top,
    insets.bottom,
    positionReady,
    position,
  ]);
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        dragged.current = false;
        start.current = current.current || { x: 12, y: 100 };
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) + Math.abs(gesture.dy) >= 6)
          dragged.current = true;
        const b = bounds.current;
        current.current = clampAssistantPosition(
          { x: start.current.x + gesture.dx, y: start.current.y + gesture.dy },
          b.width,
          b.height,
          b.top,
          b.bottom,
        );
        position.setValue(current.current);
      },
      onPanResponderRelease: (_, gesture) => {
        if (!dragged.current) setOpen(true);
        else if (current.current)
          void AsyncStorage.setItem(
            storageKey,
            JSON.stringify(current.current),
          ).catch(() => {});
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;
  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setSize(e.nativeEvent.layout)}
    >
      {size.width > 0 && positionReady ? (
        <Animated.View
          {...responder.panHandlers}
          style={[
            styles.bubble,
            { transform: position.getTranslateTransform() },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="O‘qi AI yordamchini ochish"
            accessibilityHint="Ekran bo‘ylab surish yoki chatni ochish uchun bosing"
            onPress={(event) => {
              const keyboardClick =
                "detail" in event.nativeEvent && event.nativeEvent.detail === 0;
              if (!dragged.current || keyboardClick) setOpen(true);
            }}
            style={[
              styles.bubblePress,
              Platform.OS === "web"
                ? ({ touchAction: "none" } as ViewStyle & {
                    touchAction: "none";
                  })
                : undefined,
            ]}
            testID="floating-assistant"
          >
            <Icon name="message-circle" color="white" size={23} />
            <AppText variant="caption" color="white" style={{ fontSize: 10 }}>
              AI
            </AppText>
          </Pressable>
        </Animated.View>
      ) : null}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modal}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Chat tashqarisini yopish"
            onPress={() => setOpen(false)}
          />
          <View
            style={[
              styles.chatShell,
              { paddingBottom: Math.max(12, insets.bottom), maxHeight: "90%" },
            ]}
          >
            {open ? <AssistantChat onClose={() => setOpen(false)} /> : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 58,
    height: 62,
    borderRadius: 25,
    backgroundColor: C.navy,
    borderWidth: 3,
    borderColor: C.white,
    boxShadow: "0 6px 22px rgba(15,38,92,0.28)",
    zIndex: 20,
  },
  bubblePress: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  modal: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(9,22,47,0.4)",
  },
  chatShell: {
    width: "100%",
    maxWidth: 440,
    height: "85%",
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  chat: { flex: 1 },
  chatHeader: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.background,
    borderRadius: 22,
  },
  intro: { gap: 10, paddingVertical: 20 },
  message: { maxWidth: "94%", borderRadius: 18, padding: 14, gap: 6 },
  own: { alignSelf: "flex-end", backgroundColor: C.blueSoft },
  assistant: { alignSelf: "flex-start", backgroundColor: C.greenSoft },
  composer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderColor: C.border,
  },
});
