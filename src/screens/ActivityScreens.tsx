import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useRoute } from "@react-navigation/native";
import {
  AppText,
  Avatar,
  Button,
  Card,
  Chip,
  Field,
  Header,
  Icon,
  Screen,
} from "../components/ui";
import { C, font } from "../theme";
import { RootStackParamList, useAppNavigation } from "../navigation";
import { useApp } from "../state/AppContext";
import { tutors, groups, events, rooms, formatPrice } from "../data/catalog";

const CONVERSATIONS = [
  {
    id: "dilnoza",
    name: "Dilnoza Karimova",
    initials: "DK",
    preview: "Bugun 18:00 da ko‘rishamiz.",
    time: "10:42",
    unread: 2,
    kind: "teacher",
    tone: "gold",
  },
  {
    id: "ielts",
    name: "IELTS 6.5+ guruhi",
    initials: "IG",
    preview: "Dilnoza: yangi mashqlar yuklandi",
    time: "09:18",
    unread: 5,
    kind: "group",
    tone: "blue",
  },
  {
    id: "azizbek",
    name: "Azizbek Komilov",
    initials: "AK",
    preview: "Ha, payshanba kuni bo‘shman.",
    time: "Kecha",
    unread: 0,
    kind: "teacher",
    tone: "green",
  },
  {
    id: "speaking",
    name: "Speaking club",
    initials: "SC",
    preview: "17-oktabr uchun yangi dastur",
    time: "Kecha",
    unread: 1,
    kind: "group",
    tone: "purple",
  },
] as const;
function getConversation(id: string) {
  const known = CONVERSATIONS.find((item) => item.id === id);
  if (known) return known;
  const tutor = tutors.find((item) => item.id === id);
  if (tutor)
    return {
      id,
      name: tutor.name,
      initials: tutor.initials,
      kind: "teacher",
      tone: "gold" as const,
      preview: "Yangi suhbat",
      time: "",
      unread: 0,
    };
  const [kind, key] = id.split(":");
  const item =
    kind === "group"
      ? groups.find((g) => g.id === key)
      : kind === "event"
        ? events.find((e) => e.id === key)
        : rooms.find((r) => r.id === key);
  return {
    id,
    name: item?.title || "Yangi suhbat",
    initials: kind === "room" ? "X" : "G",
    kind: "group",
    tone: "blue" as const,
    preview: "Yangi suhbat",
    time: "",
    unread: 0,
  };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <AppText variant="heading" style={styles.sectionTitle}>
      {children}
    </AppText>
  );
}

function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Oynani yopish"
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHeading}>
            <AppText variant="heading" style={styles.flex}>
              {title}
            </AppText>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Yopish"
              style={styles.iconButton}
            >
              <Icon name="x" />
            </Pressable>
          </View>
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function RequestScreen() {
  const navigation = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "Request">>();
  const { requests } = useApp();
  const request = requests.find((item) => item.id === route.params.id);
  const conversationId =
    request?.conversationId ||
    (request?.kind === "group"
      ? "ielts"
      : request?.kind === "event"
        ? "speaking"
        : "dilnoza");
  return (
    <Screen background={C.white}>
      <View style={styles.confirmIntro}>
        <View style={styles.successCircle}>
          <Icon name="check" size={31} color={C.green} />
        </View>
        <AppText variant="title" style={styles.confirmTitle}>
          So‘rovingiz{"\n"}yuborildi
        </AppText>
        <AppText style={styles.centerMuted}>
          So‘rovingiz “Darslarim” bo‘limida ko‘rinadi.
        </AppText>
        <AppText variant="caption" style={styles.centerMuted}>
          Demo so‘rov qurilmada saqlandi. Server orqali tasdiqlash hali
          ulanmagan.
        </AppText>
      </View>
      <Card style={styles.progressCard}>
        <ProgressRow
          name="check"
          color={C.green}
          background={C.greenSoft}
          title="So‘rov qabul qilindi"
          subtitle={request?.title || "Profil ma’lumotlaringiz yuborildi"}
        />
        <ProgressRow
          name="clock"
          color={C.navy}
          background={C.blueSoft}
          title="Tasdiqlash kutilmoqda"
          subtitle="Holatini “Darslarim”da kuzating"
        />
        <ProgressRow
          name="calendar"
          color={C.muted}
          background={C.blueSoft}
          title="Jadvalingizga qo‘shiladi"
          subtitle="Tasdiqlangach vaqt va manzil ko‘rinadi"
        />
      </Card>
      <View style={styles.paymentNote}>
        <AppText variant="caption" style={styles.center}>
          Hozir to‘lov olinmaydi.
        </AppText>
      </View>
      <View style={styles.buttonStack}>
        <Button
          title="Darslarimni ko‘rish"
          onPress={() => navigation.popTo("Main", { screen: "Lessons" })}
        />
        <Button
          title="Chatni ochish"
          variant="soft"
          onPress={() =>
            navigation.navigate("Conversation", { id: conversationId })
          }
        />
      </View>
    </Screen>
  );
}

function ProgressRow({
  name,
  color,
  background,
  title,
  subtitle,
}: {
  name: React.ComponentProps<typeof Icon>["name"];
  color: string;
  background: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.progressRow}>
      <View style={[styles.progressIcon, { backgroundColor: background }]}>
        <Icon name={name} color={color} size={20} />
      </View>
      <View style={styles.flex}>
        <AppText variant="label" style={{ color }}>
          {title}
        </AppText>
        <AppText variant="caption" style={styles.rowSubtitle}>
          {subtitle}
        </AppText>
      </View>
    </View>
  );
}

export function LessonsScreen() {
  const navigation = useAppNavigation();
  const { requests } = useApp();
  const [tab, setTab] = useState("Jadval");
  const [day, setDay] = useState(13);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const pending = requests.filter((request) => request.status === "pending");
  const week = ["Du", "Se", "Chor", "Pa", "Ju", "Sh", "Ya"];
  return (
    <Screen>
      <Header
        title="Darslarim"
        right={
          <Pressable
            style={styles.iconButton}
            onPress={() => setCalendarOpen(true)}
            accessibilityLabel="Taqvimni ochish"
          >
            <Icon name="calendar" />
          </Pressable>
        }
      />
      <View style={styles.chipRow}>
        {["Jadval", "Guruhlar", "So‘rovlar"].map((item) => (
          <Chip
            key={item}
            label={
              item === "So‘rovlar" ? `So‘rovlar · ${pending.length}` : item
            }
            selected={tab === item}
            onPress={() => setTab(item)}
          />
        ))}
      </View>
      {tab === "Jadval" && (
        <>
          <View style={styles.week}>
            {week.map((label, index) => (
              <Pressable
                key={label}
                onPress={() => setDay(12 + index)}
                style={[styles.day, day === 12 + index && styles.dayActive]}
                accessibilityRole="button"
                accessibilityLabel={`${12 + index} oktabr`}
                accessibilityState={{ selected: day === 12 + index }}
              >
                <AppText variant="caption" style={styles.dayLabel}>
                  {label}
                </AppText>
                <AppText variant="heading">{12 + index}</AppText>
              </Pressable>
            ))}
          </View>
          {pending.length > 0 && (
            <Pressable
              style={styles.pendingBanner}
              onPress={() => setTab("So‘rovlar")}
              accessibilityRole="button"
            >
              <Icon name="clock" size={21} />
              <View style={styles.flex}>
                <AppText variant="label">
                  {pending.length} ta so‘rov javob kutmoqda
                </AppText>
                <AppText variant="caption" style={styles.rowSubtitle}>
                  Holatni ko‘rish →
                </AppText>
              </View>
            </Pressable>
          )}
          <SectionTitle>
            {day === 13 ? "Bugun, 13 oktabr" : `${day} oktabr`}
          </SectionTitle>
          {day === 13 ? (
            <LessonCard
              title="IELTS · Speaking"
              subtitle="Dilnoza Karimova · Onlayn"
              time="18:00–19:00 · 60 daqiqa"
              badge="Bugun"
              onMessage={() =>
                navigation.navigate("Conversation", { id: "dilnoza" })
              }
            />
          ) : day === 14 ? (
            <LessonCard
              title="IELTS 6.5+ guruhi"
              subtitle="Study Hub · 2-xona · Oflayn"
              time="18:00–19:30 · 90 daqiqa"
              badge="Ertaga"
              onMessage={() =>
                navigation.navigate("Conversation", { id: "ielts" })
              }
            />
          ) : (
            <EmptyCard
              icon="calendar"
              title="Bu kunga dars belgilanmagan"
              text="O‘zingizga mos ustoz yoki guruhni topib, yangi darsga yoziling."
              button="Dars topish"
              onPress={() => navigation.navigate("Main", { screen: "Search" })}
            />
          )}
          <SectionTitle>Keyingi dars</SectionTitle>
          <LessonCard
            title="IELTS 6.5+ guruhi"
            subtitle="Study Hub · 2-xona · Oflayn"
            time="14 oktabr · 18:00–19:30"
            badge="Ertaga"
            onMessage={() =>
              navigation.navigate("Conversation", { id: "ielts" })
            }
          />
          {requests
            .filter((request) => request.status === "approved")
            .map((request) => (
              <Card key={request.id} style={styles.requestCard}>
                <AppText variant="label">{request.title}</AppText>
                <AppText variant="caption" style={styles.rowSubtitle}>
                  {request.subtitle}
                </AppText>
                <View style={styles.requestBottom}>
                  <AppText variant="caption">{request.time}</AppText>
                  <AppText variant="caption" style={{ color: C.green }}>
                    Tasdiqlangan
                  </AppText>
                </View>
              </Card>
            ))}
        </>
      )}
      {tab === "Guruhlar" && (
        <>
          <SectionTitle>Mening guruhlarim</SectionTitle>
          <Card style={styles.lessonCard}>
            <View style={styles.row}>
              <Avatar initials="IG" tone="blue" size={48} />
              <View style={styles.flex}>
                <AppText variant="label">IELTS 6.5+ guruhi</AppText>
                <AppText variant="caption" style={styles.rowSubtitle}>
                  Dilnoza Karimova · 8 o‘quvchi
                </AppText>
              </View>
            </View>
            <AppText style={styles.groupDescription}>
              Haftada 3 kun: dushanba, chorshanba va juma. Speaking, Reading va
              Writing mashg‘ulotlari.
            </AppText>
            <View style={styles.detailLine}>
              <Icon name="clock" size={17} color={C.muted} />
              <AppText variant="caption">18:00–19:30 · Study Hub</AppText>
            </View>
            <Button
              title="Guruh chatini ochish"
              variant="soft"
              onPress={() =>
                navigation.navigate("Conversation", { id: "ielts" })
              }
            />
          </Card>
          <Button
            title="Yangi guruh topish"
            variant="outline"
            onPress={() => navigation.navigate("Groups")}
          />
        </>
      )}
      {tab === "So‘rovlar" && (
        <>
          <SectionTitle>Yuborilgan so‘rovlar</SectionTitle>
          <AppText variant="caption" style={styles.requestsIntro}>
            Ustoz yoki tashkilotchi javob bergach, tasdiqlangan mashg‘ulot
            jadvalingizda ko‘rinadi.
          </AppText>
          {requests.length ? (
            requests.map((request) => (
              <Card
                key={request.id}
                style={styles.requestCard}
                onPress={() =>
                  navigation.navigate("Request", { id: request.id })
                }
              >
                <View style={styles.cardTitleRow}>
                  <AppText variant="label" style={styles.flex}>
                    {request.title}
                  </AppText>
                  <Icon name="chevron-right" size={19} color={C.muted} />
                </View>
                <AppText variant="caption" style={styles.rowSubtitle}>
                  {request.subtitle}
                </AppText>
                <View style={styles.detailLine}>
                  <Icon name="calendar" size={16} color={C.muted} />
                  <AppText variant="caption">{request.time}</AppText>
                </View>
                <View style={styles.requestBottom}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          request.status === "pending"
                            ? C.goldSoft
                            : C.greenSoft,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={{
                        color: request.status === "pending" ? C.navy : C.green,
                      }}
                    >
                      {request.status === "pending"
                        ? "Tasdiqlash kutilmoqda"
                        : "Tasdiqlangan"}
                    </AppText>
                  </View>
                  <AppText variant="caption">
                    {request.price
                      ? formatPrice(request.price)
                      : "To‘lov olinmagan"}
                  </AppText>
                </View>
              </Card>
            ))
          ) : (
            <EmptyCard
              icon="inbox"
              title="Hozircha so‘rovlar yo‘q"
              text="Ustoz, guruh yoki tadbirga yozilganingizda so‘rov shu yerda ko‘rinadi."
              button="Qidirishga o‘tish"
              onPress={() => navigation.navigate("Main", { screen: "Search" })}
            />
          )}
        </>
      )}
      <Sheet
        visible={calendarOpen}
        title="Oktabr 2026"
        onClose={() => setCalendarOpen(false)}
      >
        <View style={styles.calendarGrid}>
          {Array.from({ length: 31 }, (_, index) => index + 1).map((date) => (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={`${date} oktabr`}
              onPress={() => {
                setDay(date);
                setTab("Jadval");
                setCalendarOpen(false);
              }}
              style={[styles.calendarDate, date === day && styles.dayActive]}
            >
              <AppText variant="label">{date}</AppText>
            </Pressable>
          ))}
        </View>
        <AppText variant="caption" style={styles.centerMuted}>
          Jadvalni ko‘rish uchun kunni tanlang.
        </AppText>
      </Sheet>
    </Screen>
  );
}

function LessonCard({
  title,
  subtitle,
  time,
  badge,
  onMessage,
}: {
  title: string;
  subtitle: string;
  time: string;
  badge: string;
  onMessage: () => void;
}) {
  return (
    <Card style={styles.lessonCard}>
      <View style={styles.cardTitleRow}>
        <AppText variant="label" style={styles.flex}>
          {title}
        </AppText>
        <View style={styles.badge}>
          <AppText variant="caption">{badge}</AppText>
        </View>
      </View>
      <AppText variant="caption" style={styles.lessonSubtitle}>
        {subtitle}
      </AppText>
      <View style={styles.detailLine}>
        <Icon name="clock" color={C.muted} size={17} />
        <AppText variant="caption">{time}</AppText>
      </View>
      <View style={styles.lessonDivider} />
      <Button title="Ustozga yozish" variant="soft" onPress={onMessage} />
    </Card>
  );
}

function EmptyCard({
  icon,
  title,
  text,
  button,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  text: string;
  button?: string;
  onPress?: () => void;
}) {
  return (
    <Card style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={26} color={C.muted} />
      </View>
      <AppText variant="label" style={styles.center}>
        {title}
      </AppText>
      <AppText variant="caption" style={styles.emptyText}>
        {text}
      </AppText>
      {button && onPress && (
        <Button title={button} variant="soft" onPress={onPress} />
      )}
    </Card>
  );
}

export function ChatsScreen() {
  const navigation = useAppNavigation();
  const { messages, requests } = useApp();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("Hammasi");
  const ids = [
    ...new Set([
      ...CONVERSATIONS.map((chat) => chat.id),
      ...Object.keys(messages),
      ...requests.flatMap((request) =>
        request.conversationId ? [request.conversationId] : [],
      ),
    ]),
  ];
  const visible = ids
    .map(getConversation)
    .filter(
      (chat) =>
        (tab === "Hammasi" ||
          chat.kind === (tab === "Ustozlar" ? "teacher" : "group")) &&
        chat.name
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase()),
    );
  return (
    <Screen>
      <Header
        title="Xabarlar"
        right={
          <Pressable
            style={styles.composeCircle}
            onPress={() => navigation.navigate("Tutors")}
            accessibilityLabel="Yangi ustoz topish"
          >
            <Icon name="send" size={22} />
          </Pressable>
        }
      />
      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Chatlardan qidirish"
        icon="search"
        accessibilityLabel="Chatlardan qidirish"
      />
      <View style={styles.chatTabs}>
        {["Hammasi", "Ustozlar", "Guruhlar"].map((item) => (
          <Chip
            key={item}
            label={item}
            selected={tab === item}
            onPress={() => setTab(item)}
          />
        ))}
      </View>
      {visible.map((chat) => {
        const lastMessage = messages[chat.id]?.slice(-1)[0];
        return (
          <Card
            key={chat.id}
            accessibilityLabel={`Suhbat: ${chat.name}`}
            style={styles.chatCard}
            onPress={() => navigation.navigate("Conversation", { id: chat.id })}
          >
            <Avatar initials={chat.initials} size={46} tone={chat.tone} />
            <View style={styles.chatBody}>
              <AppText variant="label" numberOfLines={1}>
                {chat.name}
              </AppText>
              <AppText
                variant="caption"
                style={styles.chatPreview}
                numberOfLines={1}
              >
                {lastMessage?.mine ? `Siz: ${lastMessage.text}` : chat.preview}
              </AppText>
            </View>
            <View style={styles.chatMeta}>
              <AppText variant="caption" style={styles.chatTime}>
                {lastMessage?.mine ? lastMessage.time : chat.time}
              </AppText>
              {chat.unread > 0 && !lastMessage?.mine && (
                <View style={styles.unread}>
                  <AppText variant="caption" style={styles.unreadText}>
                    {chat.unread}
                  </AppText>
                </View>
              )}
            </View>
          </Card>
        );
      })}
      {!visible.length && (
        <EmptyCard
          icon="search"
          title="Chat topilmadi"
          text="Boshqa ism bilan qidirib ko‘ring yoki barcha chatlarni oching."
        />
      )}
      <View style={styles.securityNote}>
        <Icon name="shield" size={21} color={C.muted} />
        <AppText variant="caption" style={styles.flex}>
          Ustoz bilan barcha kelishuvlarni shu yerda saqlang.
        </AppText>
      </View>
    </Screen>
  );
}

export function ConversationScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "Conversation">>();
  const navigation = useAppNavigation();
  const { messages, sendMessage } = useApp();
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const chat = getConversation(route.params.id);
  const conversation = messages[chat.id] || [];
  function send() {
    const text = draft.trim();
    if (!text) return;
    sendMessage(chat.id, text);
    setDraft("");
    setNotice("");
  }
  return (
    <SafeAreaView style={styles.conversation} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.conversationHeader}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Ortga qaytish"
          >
            <Icon name="chevron-left" size={26} />
          </Pressable>
          <Avatar initials={chat.initials} size={43} tone={chat.tone} />
          <View style={styles.flex}>
            <AppText variant="label" numberOfLines={1}>
              {chat.name}
            </AppText>
            <AppText variant="caption" style={styles.online}>
              {chat.kind === "teacher" ? "Onlayn" : "Guruh suhbati"}
            </AppText>
          </View>
          <Pressable
            style={styles.iconButton}
            onPress={() =>
              setNotice(
                "Ovozli qo‘ng‘iroqlar keyingi versiyada qo‘shiladi. Hozir xabar yozishingiz mumkin.",
              )
            }
            accessibilityLabel="Qo‘ng‘iroq haqida"
          >
            <Icon name="phone" size={23} />
          </Pressable>
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          <View style={styles.datePill}>
            <AppText variant="caption">Bugun, 13 oktabr</AppText>
          </View>
          {conversation.length ? (
            conversation.map((message) =>
              message.file ? (
                <Pressable
                  key={message.id}
                  style={styles.fileBubble}
                  onPress={() =>
                    setNotice(
                      "Bu dizayndagi namuna hujjat. Fayl yuklab olish uchun server ulanishi kerak.",
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Namuna hujjat haqida"
                >
                  <View style={styles.fileIcon}>
                    <Icon name="book-open" size={23} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="label">
                      {typeof message.file === "string"
                        ? message.file
                        : "Speaking_practice.pdf"}
                    </AppText>
                    <AppText variant="caption" style={styles.fileDescription}>
                      PDF · Namuna hujjat
                    </AppText>
                  </View>
                </Pressable>
              ) : (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.mine ? styles.mineBubble : styles.theirBubble,
                  ]}
                >
                  <AppText style={styles.messageText}>{message.text}</AppText>
                  <View style={styles.messageTime}>
                    <AppText variant="caption" style={styles.smallTime}>
                      {message.time}
                    </AppText>
                    {message.mine && <Icon name="check" size={13} />}
                  </View>
                </View>
              ),
            )
          ) : (
            <View style={styles.emptyConversation}>
              <Icon name="message-circle" size={34} color={C.muted} />
              <AppText variant="caption" style={styles.emptyText}>
                Suhbatni birinchi xabaringiz bilan boshlang.
              </AppText>
            </View>
          )}
        </ScrollView>
        {!!notice && (
          <Pressable style={styles.chatNotice} onPress={() => setNotice("")}>
            <AppText variant="caption" style={styles.flex}>
              {notice}
            </AppText>
            <Icon name="x" size={16} color={C.muted} />
          </Pressable>
        )}
        <View style={styles.composer}>
          <Pressable
            style={styles.attachmentButton}
            onPress={() =>
              setNotice(
                "Fayl biriktirish server ulanganidan keyin ishlaydi. Hozir matnli xabar yozishingiz mumkin.",
              )
            }
            accessibilityLabel="Fayl biriktirish haqida"
          >
            <Icon name="paperclip" size={23} color={C.muted} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
            placeholder="Xabar yozing..."
            placeholderTextColor={C.muted}
            style={styles.messageInput}
            accessibilityLabel="Xabar yozing"
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim()}
            style={[styles.sendButton, !draft.trim() && styles.sendDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Xabarni yuborish"
            accessibilityState={{ disabled: !draft.trim() }}
          >
            <Icon name="send" size={23} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type ProfileSheet =
  "saved" | "billing" | "language" | "help" | "role" | "logout" | null;
export function ProfileScreen() {
  const navigation = useAppNavigation();
  const { user, favorites, toggleFavorite, requests, setUser, signOut } =
    useApp();
  const [sheet, setSheet] = useState<ProfileSheet>(null);
  const [language, setLanguage] = useState("O‘zbekcha");
  const [languageNotice, setLanguageNotice] = useState("");
  function openSaved(id: string) {
    const [kind, key] = id.split(":");
    setSheet(null);
    if (kind === "tutor") navigation.navigate("Tutor", { id: key });
    if (kind === "group") navigation.navigate("Group", { id: key });
    if (kind === "event") navigation.navigate("Event", { id: key });
    if (kind === "room") navigation.navigate("Room", { id: key });
  }
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "SO";
  const titles: Record<Exclude<ProfileSheet, null>, string> = {
    saved: "Saqlanganlar",
    billing: "To‘lovlar va obunalar",
    language: "Ilova tili",
    help: "Yordam va qo‘llab-quvvatlash",
    role: "Repetitor sifatida o‘tish",
    logout: "Hisobdan chiqish",
  };
  return (
    <Screen>
      <Header
        title="Profil"
        right={
          <Pressable
            style={styles.iconButton}
            onPress={() => navigation.navigate("EditProfile")}
            accessibilityLabel="Profil sozlamalari"
          >
            <Icon name="settings" size={22} />
          </Pressable>
        }
      />
      <View style={styles.profileCard}>
        <Avatar initials={initials} size={60} tone="gold" />
        <View style={styles.flex}>
          <AppText variant="heading" style={styles.profileName}>
            {user.name}
          </AppText>
          <AppText variant="caption" style={styles.profilePhone}>
            {maskPhone(user.phone)}
          </AppText>
          <View style={styles.rolePill}>
            <AppText variant="caption">
              {user.role === "tutor"
                ? "Repetitor"
                : user.role === "owner"
                  ? "Xona egasi"
                  : "O‘quvchi"}
            </AppText>
          </View>
        </View>
      </View>
      <View style={styles.stats}>
        {[
          {
            count:
              3 +
              requests.filter(
                (r) => r.kind === "lesson" && r.status === "approved",
              ).length,
            label: "Dars",
          },
          {
            count:
              2 +
              requests.filter(
                (r) => r.kind === "group" && r.status === "approved",
              ).length,
            label: "Guruh",
          },
          {
            count:
              1 +
              requests.filter(
                (r) => r.kind === "event" && r.status === "approved",
              ).length,
            label: "Tadbir",
          },
        ].map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <AppText variant="heading">{stat.count}</AppText>
            <AppText variant="caption" style={styles.statLabel}>
              {stat.label}
            </AppText>
          </View>
        ))}
      </View>
      <View style={styles.menuCard}>
        <MenuRow
          icon="user"
          label="Profilni tahrirlash"
          onPress={() => navigation.navigate("EditProfile")}
        />
        <MenuRow
          icon="heart"
          label="Saqlanganlar"
          onPress={() => setSheet("saved")}
        />
        <MenuRow
          icon="credit-card"
          label="To‘lovlar va obunalar"
          onPress={() => setSheet("billing")}
        />
        <MenuRow
          icon="globe"
          label={`Til · ${language}`}
          onPress={() => setSheet("language")}
        />
        <MenuRow
          icon="help-circle"
          label="Yordam va qo‘llab-quvvatlash"
          onPress={() => setSheet("help")}
        />
      </View>
      <View style={styles.singleMenu}>
        <MenuRow
          icon="briefcase"
          label={
            user.role === "tutor"
              ? "O‘quvchi sifatida o‘tish"
              : "Repetitor sifatida o‘tish"
          }
          onPress={() => setSheet("role")}
        />
      </View>
      <View style={styles.singleMenu}>
        <MenuRow
          icon="log-out"
          label="Hisobdan chiqish"
          danger
          onPress={() => setSheet("logout")}
        />
      </View>
      <Sheet
        visible={sheet !== null}
        title={sheet ? titles[sheet] : ""}
        onClose={() => setSheet(null)}
      >
        {sheet === "saved" && (
          <>
            {favorites.length ? (
              favorites.map((id) => (
                <View style={styles.savedRow} key={id}>
                  <Pressable
                    style={styles.flex}
                    accessibilityRole="button"
                    accessibilityLabel={`${savedLabel(id)}ni ochish`}
                    onPress={() => openSaved(id)}
                  >
                    <AppText variant="label">{savedLabel(id)}</AppText>
                    <AppText variant="caption" style={styles.rowSubtitle}>
                      Saqlangan e’lon
                    </AppText>
                  </Pressable>
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => toggleFavorite(id)}
                    accessibilityLabel={`${savedLabel(id)}ni saqlanganlardan o‘chirish`}
                  >
                    <Icon name="heart" color={C.error} />
                  </Pressable>
                </View>
              ))
            ) : (
              <EmptyCard
                icon="heart"
                title="Saqlanganlar hali yo‘q"
                text="Ustoz, tadbir yoki xonadagi yurak belgisini bosing. Ular shu yerda saqlanadi."
                button="E’lonlarni ko‘rish"
                onPress={() => {
                  setSheet(null);
                  navigation.navigate("Main", { screen: "Search" });
                }}
              />
            )}
          </>
        )}
        {sheet === "billing" && (
          <>
            <View style={styles.infoIcon}>
              <Icon name="credit-card" size={30} />
            </View>
            <AppText variant="label" style={styles.center}>
              Hozircha to‘lovlar mavjud emas
            </AppText>
            <AppText style={styles.sheetParagraph}>
              So‘rov yuborishda pul olinmaydi. Mashg‘ulot va to‘lov shartlarini
              ustoz yoki tashkilotchi bilan chatda kelishib oling.
            </AppText>
            <View style={styles.paymentNote}>
              <AppText variant="caption" style={styles.center}>
                Ushbu versiyada onlayn to‘lov ulanmagan.
              </AppText>
            </View>
          </>
        )}
        {sheet === "language" && (
          <>
            {["O‘zbekcha", "Русский", "English"].map((item) => (
              <Pressable
                key={item}
                style={styles.languageRow}
                onPress={() => {
                  if (item === "O‘zbekcha") {
                    setLanguage(item);
                    setLanguageNotice("");
                    setSheet(null);
                  } else
                    setLanguageNotice(
                      "Hozircha ilova o‘zbek tilida ishlaydi. Boshqa tillar keyingi versiyada qo‘shiladi.",
                    );
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: language === item }}
              >
                <AppText variant="label">{item}</AppText>
                <Icon
                  name={language === item ? "check-circle" : "circle"}
                  size={21}
                  color={language === item ? C.green : C.muted}
                />
              </Pressable>
            ))}
            {!!languageNotice && (
              <AppText variant="caption" style={styles.sheetParagraph}>
                {languageNotice}
              </AppText>
            )}
          </>
        )}
        {sheet === "help" && (
          <>
            <AppText variant="label">Qanday yordam bera olamiz?</AppText>
            <AppText style={styles.sheetParagraph}>
              Darsga yozilish uchun ustoz yoki guruhni tanlang va so‘rov
              yuboring. So‘rov holatini “Darslarim” → “So‘rovlar” bo‘limida
              kuzating.
            </AppText>
            <AppText variant="label">Ustoz bilan bog‘lanish</AppText>
            <AppText style={styles.sheetParagraph}>
              “Chat” bo‘limidan ustozingizni tanlab, vaqt, manzil va mashg‘ulot
              shartlarini aniqlashtirishingiz mumkin.
            </AppText>
            <View style={styles.paymentNote}>
              <AppText variant="caption">
                Profil va yuborilgan xabarlar hozir ushbu qurilmada saqlanadi.
                Server, qo‘ng‘iroq va to‘lov xizmatlari ulanmagan.
              </AppText>
            </View>
            <Button
              title="Chatlarga o‘tish"
              variant="soft"
              onPress={() => {
                setSheet(null);
                navigation.navigate("Main", { screen: "Chats" });
              }}
            />
          </>
        )}
        {sheet === "role" && (
          <>
            <View style={styles.infoIcon}>
              <Icon name="briefcase" size={30} />
            </View>
            <AppText style={styles.sheetParagraph}>
              Profil rolini {user.role === "tutor" ? "o‘quvchi" : "repetitor"}{" "}
              qilib o‘zgartirish mumkin. Repetitor darslarini boshqarish va
              e’lon joylash funksiyalari keyingi versiyada qo‘shiladi.
            </AppText>
            <Button
              title={
                user.role === "tutor"
                  ? "O‘quvchi roliga o‘tish"
                  : "Repetitor roliga o‘tish"
              }
              onPress={() => {
                setUser({ role: user.role === "tutor" ? "student" : "tutor" });
                setSheet(null);
              }}
            />
          </>
        )}
        {sheet === "logout" && (
          <>
            <AppText style={styles.sheetParagraph}>
              Hisobingizdan chiqmoqchimisiz? Ilovaga kirish sahifasi ochiladi.
            </AppText>
            <View style={styles.buttonStack}>
              <Button
                title="Hisobdan chiqish"
                onPress={() => {
                  setSheet(null);
                  signOut();
                }}
              />
              <Button
                title="Bekor qilish"
                variant="soft"
                onPress={() => setSheet(null)}
              />
            </View>
          </>
        )}
      </Sheet>
    </Screen>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={styles.menuRow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={22} />
      <AppText style={[styles.flex, danger && { color: C.error }]}>
        {label}
      </AppText>
      <Icon name="chevron-right" size={20} color={C.muted} />
    </Pressable>
  );
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9
    ? `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ••• ${digits.slice(-4, -2)} ${digits.slice(-2)}`
    : phone;
}

function savedLabel(id: string) {
  const [kind, key] = id.split(":");
  if (kind === "tutor")
    return tutors.find((item) => item.id === key)?.name || "Ustoz";
  if (kind === "group")
    return groups.find((item) => item.id === key)?.title || "Guruh";
  if (kind === "event")
    return events.find((item) => item.id === key)?.title || "Tadbir";
  if (kind === "room")
    return rooms.find((item) => item.id === key)?.title || "Xona";
  return id;
}

export function EditProfileScreen() {
  const navigation = useAppNavigation();
  const { user, setUser } = useApp();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [city, setCity] = useState(user.city);
  const [interests, setInterests] = useState(user.interests);
  const [error, setError] = useState("");
  const choices = [
    "Ingliz tili",
    "Matematika",
    "IT",
    "Rus tili",
    "Fizika",
    "IELTS",
  ];
  function save() {
    if (!name.trim() || !city.trim()) {
      setError("Ismingiz va shahringizni kiriting.");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (!/^(998)?[0-9]{9}$/.test(digits)) {
      setError(
        "To‘g‘ri O‘zbekiston telefon raqamini kiriting: +998 va 9 ta raqam.",
      );
      return;
    }
    setUser({
      name: name.trim(),
      phone: `+${digits.length === 9 ? "998" : ""}${digits}`,
      city: city.trim(),
      interests,
    });
    navigation.goBack();
  }
  return (
    <Screen>
      <Header title="Profilni tahrirlash" onBack={() => navigation.goBack()} />
      <View style={styles.editAvatar}>
        <Avatar
          initials={
            name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p.charAt(0))
              .join("")
              .toUpperCase() || "SO"
          }
          size={82}
          tone="gold"
        />
        <AppText variant="caption" style={styles.centerMuted}>
          Ma’lumotlaringizni yangilang
        </AppText>
      </View>
      <View style={styles.editFields}>
        <Field
          label="Ism va familiya"
          value={name}
          onChangeText={setName}
          placeholder="Ism va familiyangiz"
          autoCapitalize="words"
        />
        <Field
          label="Telefon raqami"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+998 90 123 45 67"
        />
        <Field
          label="Shahar"
          value={city}
          onChangeText={setCity}
          placeholder="Toshkent"
          autoCapitalize="words"
        />
      </View>
      <SectionTitle>Qiziqishlaringiz</SectionTitle>
      <View style={styles.interestRow}>
        {choices.map((item) => (
          <Chip
            key={item}
            label={item}
            selected={interests.includes(item)}
            onPress={() =>
              setInterests((current) =>
                current.includes(item)
                  ? current.filter((value) => value !== item)
                  : [...current, item],
              )
            }
          />
        ))}
      </View>
      {!!error && (
        <AppText variant="caption" style={styles.error}>
          {error}
        </AppText>
      )}
      <View style={styles.saveButton}>
        <Button title="O‘zgarishlarni saqlash" onPress={save} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: "center" },
  centerMuted: { color: C.muted, textAlign: "center", lineHeight: 23 },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  sectionTitle: { marginTop: 18, marginBottom: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowSubtitle: { color: C.muted, marginTop: 4 },
  confirmIntro: { alignItems: "center", paddingTop: 65, paddingBottom: 20 },
  successCircle: {
    width: 88,
    height: 88,
    backgroundColor: C.greenSoft,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  confirmTitle: {
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 17,
    fontSize: 30,
  },
  progressCard: {
    backgroundColor: C.background,
    borderWidth: 0,
    padding: 20,
    gap: 19,
    marginBottom: 17,
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  progressIcon: {
    width: 37,
    height: 37,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentNote: {
    backgroundColor: C.goldSoft,
    borderRadius: 16,
    padding: 15,
    marginBottom: 18,
  },
  buttonStack: { gap: 15 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  week: { flexDirection: "row", gap: 6, marginBottom: 14 },
  day: {
    flex: 1,
    minWidth: 32,
    backgroundColor: C.white,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    gap: 6,
  },
  dayActive: { backgroundColor: C.goldSoft },
  dayLabel: { color: C.muted, fontSize: 10 },
  pendingBanner: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: C.blueSoft,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  lessonCard: { padding: 16, marginBottom: 2, borderRadius: 23 },
  badge: {
    backgroundColor: C.goldSoft,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lessonSubtitle: { color: C.muted, marginTop: 10, marginBottom: 9 },
  detailLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginVertical: 4,
  },
  lessonDivider: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  groupDescription: {
    marginTop: 15,
    marginBottom: 10,
    color: C.muted,
    lineHeight: 23,
  },
  requestCard: { padding: 16, marginBottom: 12 },
  requestBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  requestsIntro: { color: C.muted, marginBottom: 15, lineHeight: 21 },
  emptyCard: { padding: 22, gap: 14, marginBottom: 12 },
  emptyIcon: { alignItems: "center" },
  emptyText: { textAlign: "center", color: C.muted, lineHeight: 22 },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 18,
  },
  calendarDate: {
    width: "12.5%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  composeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.goldSoft,
  },
  chatTabs: { flexDirection: "row", gap: 8, marginTop: 14, marginBottom: 14 },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
    borderWidth: 0,
    marginBottom: 14,
    minHeight: 84,
  },
  chatBody: { flex: 1, gap: 6 },
  chatPreview: { color: C.muted },
  chatMeta: { alignItems: "flex-end", alignSelf: "center", gap: 7 },
  chatTime: { fontSize: 10, color: C.muted },
  unread: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { fontSize: 11 },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    marginBottom: 15,
  },
  conversation: { flex: 1, backgroundColor: C.white },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: { width: 26, height: 42, justifyContent: "center" },
  online: { color: C.green, marginTop: 5 },
  messages: { padding: 20, gap: 14, paddingBottom: 28 },
  datePill: {
    alignSelf: "center",
    backgroundColor: C.blueSoft,
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 2,
  },
  messageBubble: { borderRadius: 18, padding: 13, maxWidth: "82%" },
  theirBubble: { backgroundColor: C.background, alignSelf: "flex-start" },
  mineBubble: { backgroundColor: C.goldSoft, alignSelf: "flex-end" },
  messageText: { lineHeight: 23 },
  messageTime: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
    marginTop: 7,
  },
  smallTime: { fontSize: 10, color: C.muted },
  fileBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    maxWidth: "82%",
    borderRadius: 18,
    backgroundColor: C.blueSoft,
  },
  fileIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  fileDescription: { fontSize: 10, color: C.muted, marginTop: 4 },
  emptyConversation: { alignItems: "center", gap: 12, paddingVertical: 80 },
  chatNotice: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: C.blueSoft,
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  attachmentButton: {
    width: 25,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  messageInput: {
    flex: 1,
    backgroundColor: C.background,
    borderRadius: 17,
    minHeight: 50,
    maxHeight: 120,
    paddingHorizontal: 13,
    paddingTop: 15,
    paddingBottom: 13,
    color: C.ink,
    fontFamily: font.regular,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.5 },
  profileCard: {
    backgroundColor: C.navy,
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  profileName: { color: C.white, fontSize: 19 },
  profilePhone: { color: "#BDCDE1", marginTop: 7, marginBottom: 7 },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: C.goldSoft,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 16,
  },
  stats: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderRadius: 19,
    marginVertical: 14,
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statLabel: { color: C.muted },
  menuCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    paddingVertical: 1,
    marginBottom: 14,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 15,
    minHeight: 57,
  },
  singleMenu: { backgroundColor: C.white, borderRadius: 18, marginBottom: 14 },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(9,43,83,0.35)",
    justifyContent: "center",
    padding: 22,
  },
  sheet: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 430,
    maxHeight: "85%",
    alignSelf: "center",
  },
  sheetHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sheetScroll: { flexGrow: 0 },
  sheetContent: { paddingBottom: 6 },
  sheetParagraph: { color: C.muted, lineHeight: 24, marginVertical: 15 },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoIcon: {
    backgroundColor: C.blueSoft,
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  editAvatar: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
    marginBottom: 8,
  },
  editFields: { gap: 18 },
  interestRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  error: { color: C.error, marginTop: 16 },
  saveButton: { marginTop: 25, marginBottom: 20 },
});
