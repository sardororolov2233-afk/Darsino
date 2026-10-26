import React, { useEffect, useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import * as Crypto from "expo-crypto";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useApp } from "../state/AppContext";
import { useClassroom } from "../state/ClassroomContext";
import { useAppNavigation, type RootStackParamList } from "../navigation";
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Icon,
  Screen,
  uiStyles,
} from "../components/ui";
import { WorkspaceHeader, WORKSPACE } from "../components/ClassroomUI";
import { UserAvatar } from "../components/UserAvatar";
import { AssessmentMessage } from "../components/AssessmentMessage";
import { Feedback, useAction } from "../components/feedback";
import { LocalizedPressable as Pressable } from "../i18n/native";
import { assessmentLabel } from "../state/assessments";
import { dateLabel, dmId, timeLabel, type Marketplace } from "../state/domain";
import type { GroupMessage } from "../state/classroom";
import { matchesSearch } from "../state/learning";
import { requireActorBackend } from "../services/backend";
import { createFileService } from "../services/files";
import { pickMaterial } from "../services/materials";
import { C, font } from "../theme";

function otherUser(id: string, actor: string, market: Marketplace) {
  return market.users.find(
    (u) =>
      u.id ===
      id
        .split(":")
        .slice(1)
        .find((uid) => uid !== actor),
  );
}
function chatTime(date?: string) {
  return date
    ? new Date(date).toDateString() === new Date().toDateString()
      ? timeLabel(date)
      : dateLabel(date)
    : "";
}

export function ChatsScreen() {
  const { user, market, messages, requests } = useApp(),
    classroom = useClassroom(),
    navigation = useAppNavigation(),
    action = useAction();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [compose, setCompose] = useState<"announcement" | "private" | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [text, setText] = useState(""),
    [sent, setSent] = useState(0);
  const batch = useRef(new Map<string, string>()),
    delivered = useRef(new Set<string>());
  const own = classroom.data.groups.filter((g) => g.tutorId === user.id);
  const approved = market.tutorProfiles.some(
    (p) => p.userId === user.id && p.verification === "approved",
  );
  const ids = [
    ...new Set([
      ...Object.keys(messages),
      ...requests
        .map((r) => r.conversationId)
        .filter((id): id is string => !!id),
    ]),
  ];
  const groups = classroom.data.groups
    .filter((g) =>
      matchesSearch(
        `${g.title} ${g.subject} ${g.lastMessage?.text || ""}`,
        query,
      ),
    )
    .sort(
      (a, b) =>
        Number(!!b.announcement) - Number(!!a.announcement) ||
        (b.lastMessage?.createdAt || "").localeCompare(
          a.lastMessage?.createdAt || "",
        ),
    );
  const privateIds = ids.filter((id) =>
    matchesSearch(
      `${otherUser(id, user.id, market)?.name || ""} ${messages[id]?.at(-1)?.text || ""}`,
      query,
    ),
  );
  const members = [
    ...new Set(
      market.enrollments
        .filter((e) => e.active && own.some((g) => g.id === e.offeringId))
        .map((e) => e.studentId),
    ),
  ];
  const contacts = market.users.filter(
    (u) =>
      u.id !== user.id &&
      (user.role === "tutor" ? members.includes(u.id) : u.role === "tutor"),
  );
  const open = (mode: "announcement" | "private") => {
    setCompose(mode);
    setText("");
    setSent(0);
    setSelected(own.map((g) => g.id));
    batch.current.clear();
    delivered.current.clear();
  };
  return (
    <Screen
      lightTop
      top={
        <WorkspaceHeader
          title={user.role === "tutor" ? "Guruh chat" : "Suhbatlar"}
        />
      }
      bottom={
        <Button
          title="Yangi xabar"
          icon="edit"
          onPress={() => open("private")}
          style={{
            backgroundColor: WORKSPACE,
            alignSelf: "flex-end",
            borderRadius: 26,
          }}
        />
      }
    >
      {user.role === "tutor" ? (
        <Card
          style={{
            backgroundColor: WORKSPACE,
            borderColor: WORKSPACE,
            gap: 14,
            borderRadius: 20,
          }}
        >
          <View style={uiStyles.row}>
            <View style={styles.heroIcon}>
              <Icon name="volume-2" color="white" size={25} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="heading" color="white">
                Tezkor e’lon yuborish
              </AppText>
              <AppText variant="caption" color="#DBD6FF">
                {members.length} ta o‘quvchi · {own.length} ta o‘quv guruhi
              </AppText>
            </View>
          </View>
          <Button
            title="Shoshilinch xabar"
            icon="send"
            variant="outline"
            disabled={!own.length || !approved}
            onPress={() => open("announcement")}
            style={{ alignSelf: "flex-end", minHeight: 42 }}
          />
        </Card>
      ) : null}
      <Field
        accessibilityLabel="Chatlarni qidirish"
        placeholder="Guruhlar, o‘quvchilar yoki xabarlarni izlash..."
        icon="search"
        value={query}
        onChangeText={setQuery}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: 8 }}
      >
        <Chip
          label={`Barchasi · ${classroom.data.groups.length + ids.length}`}
          selected={category === "all"}
          onPress={() => setCategory("all")}
        />
        <Chip
          label="O‘quv guruhlari"
          selected={category === "group"}
          onPress={() => setCategory("group")}
        />
        <Chip
          label="Shaxsiy savollar"
          selected={category === "private"}
          onPress={() => setCategory("private")}
        />
      </ScrollView>
      {category !== "private"
        ? groups.map((group) => (
            <Card
              key={group.id}
              accessibilityLabel={`Guruh suhbati: ${group.title}`}
              onPress={() =>
                navigation.navigate("GroupConversation", { id: group.id })
              }
              style={styles.chatCard}
            >
              <View style={uiStyles.row}>
                <View
                  style={[
                    styles.roomIcon,
                    {
                      backgroundColor: group.announcement
                        ? "#ECE8FF"
                        : "#DDF8EF",
                    },
                  ]}
                >
                  <Icon
                    name={group.announcement ? "book-open" : "users"}
                    color={group.announcement ? WORKSPACE : C.green}
                    size={23}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={uiStyles.between}>
                    <AppText
                      variant="label"
                      numberOfLines={1}
                      localize={false}
                      style={{ flex: 1 }}
                    >
                      {group.announcement ? "⌖ " : ""}
                      {group.title}
                    </AppText>
                    <AppText
                      variant="caption"
                      color={group.unread ? WORKSPACE : C.muted}
                    >
                      {chatTime(group.lastMessage?.createdAt)}
                    </AppText>
                  </View>
                  <AppText variant="caption" color={C.muted}>
                    {group.memberCount} o‘quvchi · {group.subject}
                  </AppText>
                  <AppText
                    variant="caption"
                    color={C.muted}
                    numberOfLines={1}
                    localize={false}
                  >
                    {group.lastMessage
                      ? `${group.lastMessage.senderName}: ${group.lastMessage.text}`
                      : "Guruhdagi birinchi xabarni yozing"}
                  </AppText>
                </View>
                {group.unread > 0 ? (
                  <View style={styles.unread}>
                    <AppText variant="caption" color="white">
                      {group.unread > 99 ? "99+" : group.unread}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </Card>
          ))
        : null}
      {category !== "group"
        ? privateIds.map((id) => {
            const person = otherUser(id, user.id, market),
              last = messages[id]?.at(-1),
              name = person?.name || "Suhbatdoshingiz";
            return (
              <Card
                key={id}
                accessibilityLabel={`Suhbat: ${name}`}
                onPress={() => navigation.navigate("Conversation", { id })}
                style={styles.chatCard}
              >
                <View style={uiStyles.row}>
                  <UserAvatar userId={person?.id} initials={name.slice(0, 1)} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="label" localize={false}>
                      {name}
                    </AppText>
                    <AppText variant="caption" color={WORKSPACE}>
                      Shaxsiy savol
                    </AppText>
                    <AppText
                      variant="caption"
                      color={C.muted}
                      numberOfLines={1}
                      localize={false}
                    >
                      {last
                        ? assessmentLabel(last.text)
                        : "Ariza tafsilotlarini kelishing"}
                    </AppText>
                  </View>
                  <AppText variant="caption" color={C.muted}>
                    {last?.time || ""}
                  </AppText>
                </View>
              </Card>
            );
          })
        : null}
      {!(category === "group"
        ? groups.length
        : category === "private"
          ? privateIds.length
          : groups.length + privateIds.length) ? (
        <EmptyState
          title="Hech qanday chat topilmadi"
          subtitle="Qidiruvni o‘zgartiring yoki yangi suhbat boshlang."
          icon="message-circle"
        />
      ) : null}
      <Feedback error={classroom.error} />
      {compose ? (
        <Modal
          visible={!!compose}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!action.busy) setCompose(null);
          }}
        >
          <View style={styles.overlay}>
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Card style={{ width: "100%", maxWidth: 440, gap: 16 }}>
                <View style={uiStyles.between}>
                  <AppText variant="heading">
                    {compose === "announcement"
                      ? "Shoshilinch e’lon"
                      : "Yangi shaxsiy suhbat"}
                  </AppText>
                  <Button
                    title=""
                    icon="x"
                    accessibilityLabel="Yopish"
                    variant="soft"
                    disabled={action.busy}
                    onPress={() => setCompose(null)}
                  />
                </View>
                {compose === "announcement" ? (
                  <>
                    <AppText color={C.muted}>Kimlarga yuborilsin?</AppText>
                    <View style={uiStyles.wrap}>
                      {own.map((group) => (
                        <Chip
                          key={group.id}
                          label={group.title}
                          selected={selected.includes(group.id)}
                          onPress={
                            action.busy || sent > 0
                              ? undefined
                              : () =>
                                  setSelected((old) =>
                                    old.includes(group.id)
                                      ? old.filter((id) => id !== group.id)
                                      : [...old, group.id],
                                  )
                          }
                        />
                      ))}
                    </View>
                    <Field
                      label="E’lon matni"
                      multiline
                      value={text}
                      maxLength={2000}
                      editable={!action.busy && sent === 0}
                      onChangeText={setText}
                    />
                    {sent ? (
                      <AppText color={C.green}>
                        {sent}/{selected.length} guruhga yuborildi
                      </AppText>
                    ) : null}
                    <Button
                      title="Tarqatish"
                      icon="send"
                      loading={action.busy}
                      disabled={!selected.length || !text.trim()}
                      style={{ backgroundColor: WORKSPACE }}
                      onPress={() =>
                        action.run(async () => {
                          for (const group of selected) {
                            if (!batch.current.has(group))
                              batch.current.set(group, Crypto.randomUUID());
                            if (!delivered.current.has(group)) {
                              await classroom.send(
                                group,
                                text,
                                batch.current.get(group)!,
                                true,
                              );
                              delivered.current.add(group);
                              setSent(delivered.current.size);
                            }
                          }
                          setCompose(null);
                        })
                      }
                    />
                  </>
                ) : (
                  <>
                    {contacts.map((person) => (
                      <Button
                        key={person.id}
                        title={person.name || "O‘quvchi"}
                        icon="message-circle"
                        variant="soft"
                        onPress={() => {
                          setCompose(null);
                          navigation.navigate("Conversation", {
                            id:
                              user.role === "tutor"
                                ? dmId(person.id, user.id)
                                : dmId(user.id, person.id),
                          });
                        }}
                      />
                    ))}
                    {!contacts.length ? (
                      <AppText color={C.muted}>
                        Guruh o‘quvchisi yoki ustoz profilidan suhbat
                        boshlashingiz mumkin.
                      </AppText>
                    ) : null}
                  </>
                )}
                <Feedback {...action} />
                <Button
                  title="Bekor qilish"
                  variant="outline"
                  disabled={action.busy}
                  onPress={() => setCompose(null)}
                />
              </Card>
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </Screen>
  );
}

function Composer({
  text,
  setText,
  send,
  busy,
  attach,
}: {
  text: string;
  setText: (v: string) => void;
  send: () => void;
  busy: boolean;
  attach?: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      {attach ? (
        <Button
          title=""
          icon="paperclip"
          accessibilityLabel="Chatga fayl biriktirish"
          variant="soft"
          disabled={busy}
          onPress={attach}
          style={{ width: 42, paddingHorizontal: 0 }}
        />
      ) : null}
      <View style={{ flex: 1 }}>
        <Field
          accessibilityLabel="Xabar yozing"
          placeholder="Xabar yozing..."
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          editable={!busy}
        />
      </View>
      <Button
        title=""
        icon="send"
        accessibilityLabel="Xabarni yuborish"
        disabled={!text.trim() || busy}
        loading={busy}
        onPress={send}
        style={{ width: 46, paddingHorizontal: 0, backgroundColor: WORKSPACE }}
      />
    </View>
  );
}
export function GroupConversationScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "GroupConversation">) {
  const { user } = useApp(),
    classroom = useClassroom(),
    navigation = useAppNavigation(),
    action = useAction();
  const id = route.params.id,
    group = classroom.data.groups.find((g) => g.id === id);
  const [rows, setRows] = useState<GroupMessage[]>([]),
    [text, setText] = useState(""),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const methods = useRef(classroom),
    scroll = useRef<ScrollView>(null),
    nearBottom = useRef(true),
    intent = useRef<{ text: string; id: string } | null>(null);
  methods.current = classroom;
  useEffect(() => {
    let active = true;
    if (!group) return;
    void methods.current
      .messages(id)
      .then(async (messages) => {
        if (!active) return;
        setRows((old) =>
          [
            ...new Map([...old, ...messages].map((m) => [m.id, m])).values(),
          ].sort(
            (a, b) =>
              a.createdAt.localeCompare(b.createdAt) ||
              a.id.localeCompare(b.id),
          ),
        );
        setMore(messages.length === 50);
        setLoading(false);
        setError("");
        if (messages.length)
          await methods.current.markRead(id, messages.at(-1)!.createdAt);
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Xabarlar yuklanmadi.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id, group?.lastMessage?.id, !!group]);
  if (!group)
    return (
      <Screen>
        <Button
          title="Orqaga"
          icon="arrow-left"
          variant="soft"
          onPress={() => navigation.goBack()}
        />
        <EmptyState
          title={
            classroom.ready ? "Guruh suhbati mavjud emas" : "Guruh yuklanmoqda"
          }
          subtitle="Suhbat faqat guruhning faol qatnashchilariga ochiq."
        />
        <Feedback error={classroom.error} />
      </Screen>
    );
  return (
    <Screen
      scroll={false}
      style={{ padding: 0, gap: 0 }}
      bottom={
        <>
          <Feedback error={action.error || error} />
          <Composer
            text={text}
            setText={setText}
            busy={action.busy}
            send={() =>
              action.run(async () => {
                if (!intent.current || intent.current.text !== text.trim())
                  intent.current = {
                    text: text.trim(),
                    id: Crypto.randomUUID(),
                  };
                await classroom.send(
                  id,
                  intent.current.text,
                  intent.current.id,
                );
                intent.current = null;
                setText("");
                nearBottom.current = true;
              })
            }
          />
        </>
      }
    >
      <View style={styles.conversationHeader}>
        <Button
          title=""
          icon="arrow-left"
          accessibilityLabel="Orqaga"
          variant="soft"
          onPress={() => navigation.goBack()}
          style={{ paddingHorizontal: 10 }}
        />
        <View style={[styles.roomIcon, { backgroundColor: "#EFECFF" }]}>
          <Icon name="users" color={WORKSPACE} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" numberOfLines={1} localize={false}>
            {group.title}
          </AppText>
          <AppText variant="caption" color={C.muted}>
            {group.memberCount} o‘quvchi · Guruh darsi
          </AppText>
        </View>
      </View>
      {group.announcement ? (
        <View style={styles.pinned}>
          <Icon name="volume-2" size={17} color={WORKSPACE} />
          <AppText
            variant="caption"
            localize={false}
            numberOfLines={2}
            style={{ flex: 1 }}
            color={WORKSPACE}
          >
            {group.announcement.text}
          </AppText>
        </View>
      ) : null}
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={100}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        onContentSizeChange={() => {
          if (nearBottom.current)
            scroll.current?.scrollToEnd({ animated: false });
        }}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } =
            event.nativeEvent;
          nearBottom.current =
            contentSize.height - layoutMeasurement.height - contentOffset.y <
            100;
        }}
      >
        {more ? (
          <Button
            title="Oldingi xabarlarni yuklash"
            variant="soft"
            loading={action.busy}
            onPress={() =>
              action.run(async () => {
                nearBottom.current = false;
                const older = await classroom.messages(id, rows[0]?.id);
                setRows((all) => [
                  ...new Map([...older, ...all].map((m) => [m.id, m])).values(),
                ]);
                setMore(older.length === 50);
              })
            }
          />
        ) : null}
        {!rows.length ? (
          <EmptyState
            title={loading ? "Xabarlar yuklanmoqda" : "Suhbatni boshlang"}
            subtitle="Dars va guruh bo‘yicha yozishing."
            icon="message-circle"
          />
        ) : null}
        {rows.map((message, index) => (
          <React.Fragment key={message.id}>
            {index === 0 ||
            dateLabel(rows[index - 1].createdAt) !==
              dateLabel(message.createdAt) ? (
              <AppText
                variant="caption"
                color={C.muted}
                style={{ textAlign: "center" }}
              >
                {dateLabel(message.createdAt)}
              </AppText>
            ) : null}
            <View
              style={[
                styles.bubble,
                {
                  alignSelf:
                    message.senderId === user.id ? "flex-end" : "flex-start",
                  backgroundColor:
                    message.senderId === user.id ? WORKSPACE : "white",
                },
              ]}
            >
              {message.senderId !== user.id ? (
                <AppText
                  variant="caption"
                  color={WORKSPACE}
                  localize={false}
                  style={{ fontFamily: font.bold }}
                >
                  {message.senderName}
                </AppText>
              ) : null}
              {message.announcement ? (
                <AppText
                  variant="caption"
                  color={message.senderId === user.id ? "#DDD7FF" : C.purple}
                >
                  E’lon
                </AppText>
              ) : null}
              <AppText
                localize={false}
                color={message.senderId === user.id ? "white" : C.ink}
              >
                {message.text}
              </AppText>
              <AppText
                variant="caption"
                color={message.senderId === user.id ? "#DDD7FF" : C.muted}
                style={{ alignSelf: "flex-end" }}
              >
                {timeLabel(message.createdAt)}
              </AppText>
            </View>
          </React.Fragment>
        ))}
      </ScrollView>
    </Screen>
  );
}

export function ConversationScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Conversation">) {
  const { user, market, messages, sendMessage, refresh, mode } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const [text, setText] = useState("");
  const id = route.params.id,
    person = otherUser(id, user.id, market),
    name = person?.name || "Suhbatdoshingiz";
  const parts = id.split(":"),
    valid =
      parts.length === 3 &&
      parts[0] === "dm" &&
      parts.slice(1).includes(user.id);
  const list = messages[id] || [],
    scroll = useRef<ScrollView>(null),
    actor = useRef(user.id);
  actor.current = user.id;
  const attach = () =>
    action.run(async () => {
      if (mode === "demo")
        throw new Error("Haqiqiy fayl yuborish Supabase rejimida ishlaydi.");
      const owner = user.id,
        client = await requireActorBackend(owner),
        input = await pickMaterial([
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
        ]);
      if (!input) return;
      if (input.bytes.byteLength > 10 * 1048576)
        throw new Error("Chat fayli 10 MB gacha bo‘lsin.");
      if (actor.current !== owner) throw new Error("Akkaunt o‘zgardi.");
      const files = createFileService(client),
        asset = await files.upload({
          ...input,
          purpose: "chat",
          conversationId: id,
        });
      await files.sendMessage(asset.id);
      if (actor.current === owner) await refresh();
    });
  return (
    <Screen
      scroll={false}
      style={{ padding: 0, gap: 0 }}
      bottom={
        valid ? (
          <>
            <Feedback {...action} />
            <Composer
              text={text}
              setText={setText}
              busy={action.busy}
              attach={attach}
              send={() =>
                action.run(
                  () => sendMessage(id, text),
                  () => setText(""),
                )
              }
            />
          </>
        ) : undefined
      }
    >
      <View style={styles.conversationHeader}>
        <Button
          title=""
          icon="arrow-left"
          accessibilityLabel="Orqaga"
          variant="soft"
          onPress={() => navigation.goBack()}
          style={{ paddingHorizontal: 10 }}
        />
        <UserAvatar userId={person?.id} initials={name.slice(0, 1)} />
        <View style={{ flex: 1 }}>
          <AppText variant="label" localize={false}>
            {name}
          </AppText>
          <AppText variant="caption" color={C.muted}>
            Shaxsiy suhbat
          </AppText>
        </View>
        <Button
          title="Kontaktlar"
          icon="users"
          variant="soft"
          onPress={() => navigation.navigate("Contacts")}
        />
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        style={{ flex: 1 }}
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: false })
        }
      >
        {!valid ? (
          <EmptyState
            title="Suhbat mavjud emas"
            subtitle="O‘z akkauntingizdagi suhbatni oching."
          />
        ) : !list.length ? (
          <EmptyState
            title="Suhbatni boshlang"
            subtitle="Maqsadingiz va dars vaqti haqida yozishingiz mumkin."
            icon="message-circle"
          />
        ) : (
          list.map((message) => (
            <View
              key={message.id}
              style={[
                styles.bubble,
                {
                  alignSelf: message.mine ? "flex-end" : "flex-start",
                  backgroundColor: message.mine ? C.navy : "white",
                },
              ]}
            >
              <AssessmentMessage message={message} />
              {message.attachmentIds?.map((fileId) => (
                <Button
                  key={fileId}
                  title={
                    market.files?.find((f) => f.id === fileId)?.originalName ||
                    "Biriktirilgan fayl"
                  }
                  icon="file-text"
                  variant="soft"
                  onPress={() =>
                    navigation.navigate("MaterialViewer", {
                      fileId,
                      title:
                        market.files?.find((f) => f.id === fileId)
                          ?.originalName || "Chat fayli",
                    })
                  }
                />
              ))}
              <AppText
                variant="caption"
                color={message.mine ? "#CBD7E5" : C.muted}
                style={{ alignSelf: "flex-end" }}
              >
                {message.time}
              </AppText>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  heroIcon: { padding: 13, borderRadius: 15, backgroundColor: "#FFFFFF20" },
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  chatCard: { borderRadius: 18, padding: 13 },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: WORKSPACE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  overlay: { flex: 1, backgroundColor: "#081B4799" },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: "white",
  },
  bubble: {
    maxWidth: "90%",
    padding: 13,
    borderRadius: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: "#14213D06",
  },
  pinned: {
    backgroundColor: "#F0EDFF",
    padding: 13,
    flexDirection: "row",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#DDD7FF",
  },
});
