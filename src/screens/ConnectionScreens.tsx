import { offeringScheduleLabel } from "../state/domain";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform, Share, View } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  scanFromURLAsync,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { prepareQrScanner } from "../services/qrScanner";
import { WorkspaceHeader } from "../components/ClassroomUI";
import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Header,
  Icon,
  Screen,
  uiStyles,
} from "../components/ui";
import { Feedback, useAction } from "../components/feedback";
import { QRCode } from "../components/QRCode";
import { UserAvatar } from "../components/UserAvatar";
import { FilterOptions, FilterSelect } from "../components/FilterControls";
import { useApp } from "../state/AppContext";
import { useAppNavigation, type RootStackParamList } from "../navigation";
import { findAccount } from "../services/account";
import {
  areContacts,
  contactLink,
  conversationFor,
  normalizePublicId,
  parseContactQr,
  publicIdOf,
  validPublicId,
  readAccountSettings,
  type GroupInvitation,
} from "../state/account";
import { dateLabel, type User } from "../state/domain";
import { initials } from "../state/model";
import { money } from "./DiscoveryScreens";
import { C } from "../theme";
import { useI18n } from "../i18n";

function Person({ user }: { user: User }) {
  return (
    <View style={uiStyles.row}>
      <UserAvatar userId={user.id} initials={initials(user.name)} size={48} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="label" localize={false}>
          {user.name}
        </AppText>
        <AppText variant="caption" color={C.muted} localize={false}>
          {"@" + publicIdOf(user)}
        </AppText>
      </View>
      <Chip
        label={
          user.role === "tutor"
            ? "Repetitor"
            : user.role === "student"
              ? "O‘quvchi"
              : "Moderator"
        }
      />
    </View>
  );
}
export function ProfileIdScreen() {
  const { user, market } = useApp(),
    navigation = useAppNavigation(),
    action = useAction(),
    { t } = useI18n();
  const id = publicIdOf(user),
    link = contactLink(id);
  const share = async () => {
    if (
      Platform.OS === "web" &&
      typeof navigator !== "undefined" &&
      navigator.clipboard
    ) {
      await navigator.clipboard.writeText(link);
      action.setSuccess("Havola nusxalandi.");
    } else await Share.share({ message: user.name + "\n@" + id + "\n" + link });
  };
  return (
    <Screen>
      <Header
        title="Mening ID va QR kodim"
        onBack={() => navigation.goBack()}
      />
      <Card style={{ alignItems: "center", paddingVertical: 28 }}>
        <UserAvatar userId={user.id} initials={initials(user.name)} size={72} />
        <AppText variant="heading" localize={false}>
          {user.name}
        </AppText>
        <QRCode value={link} label={t("O‘qi kontakt QR kodi")} />
        <AppText variant="heading" localize={false} selectable>
          {"@" + id}
        </AppText>
        <AppText color={C.muted} style={{ textAlign: "center" }}>
          QR kodni O‘qi skanerida oching yoki ID orqali kontakt toping.
        </AppText>
      </Card>
      {!readAccountSettings(market.accountSettings?.[user.id]).discoverable ? (
        <Card>
          <AppText>
            ID orqali topish yopilgan. Yangi kontaktlar QR orqali ham topa
            olmaydi.
          </AppText>
          <Button
            title="Maxfiylik"
            variant="soft"
            onPress={() => navigation.navigate("PrivacySettings")}
          />
        </Card>
      ) : null}
      <Button
        title="Havolani ulashish"
        icon="share-2"
        loading={action.busy}
        onPress={() => action.run(share)}
      />
      <Button
        title="QR skanerlash"
        icon="camera"
        variant="soft"
        onPress={() => navigation.navigate("ScanContact")}
      />
      <Button
        title="ID orqali kontakt topish"
        icon="search"
        variant="outline"
        onPress={() => navigation.navigate("Contacts")}
      />
      <AppText variant="caption" color={C.muted}>
        QR kodda faqat ochiq ID bor. Kontakt qo‘shish va guruhga kirish alohida
        tasdiqlanadi.
      </AppText>
      <Feedback {...action} />
    </Screen>
  );
}
export function ScanContactScreen() {
  const navigation = useAppNavigation(),
    action = useAction(),
    { user } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(AppState.currentState === "active"),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [torch, setTorch] = useState(false),
    [retry, setRetry] = useState(0);
  const focused = useIsFocused(),
    scanned = useRef(false),
    invalid = useRef("");
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    let live = true;
    setReady(false);
    void prepareQrScanner()
      .then(() => {
        if (live) {
          setReady(true);
          setError("");
        }
      })
      .catch(() => {
        if (live) setError("QR o‘qish tayyorlanmadi. Qayta urinib ko‘ring.");
      });
    return () => {
      live = false;
    };
  }, [retry]);
  const receive = (data: string) => {
    if (scanned.current) return;
    const id = parseContactQr(data);
    if (!id) {
      if (invalid.current !== data) {
        invalid.current = data;
        setError(
          "Bu O‘qi kontaktining QR kodi emas. O‘qi ilovasidagi QR kodni skanerlang.",
        );
      }
      return;
    }
    if (id === publicIdOf(user)) {
      setError(
        "Bu o‘zingizning QR kodingiz. Boshqa foydalanuvchining kodini skanerlang.",
      );
      return;
    }
    scanned.current = true;
    setError("");
    navigation.replace("Contacts", { query: id });
  };
  return (
    <Screen
      lightTop
      top={<WorkspaceHeader title="Kontaktni QR orqali topish" back />}
    >
      <AppText variant="title">Skanerlang va bog‘laning</AppText>
      <AppText color={C.muted}>
        O‘qituvchi yoki o‘quvchining O‘qi QR kodini kamera ichiga joylashtiring.
      </AppText>
      {!permission?.granted ? (
        <Card>
          <Icon name="camera" size={34} color={C.primary} />
          <AppText>
            Kamera faqat QR kodni o‘qish uchun ishlatiladi. Tasvir serverga
            yuborilmaydi.
          </AppText>
          <Button
            title={
              permission?.canAskAgain === false && Platform.OS !== "web"
                ? "Qurilma sozlamalari"
                : "Kameraga ruxsat berish"
            }
            icon="camera"
            loading={action.busy}
            onPress={() =>
              action.run(async () => {
                if (permission?.canAskAgain === false && Platform.OS !== "web")
                  await Linking.openSettings();
                else await requestPermission();
              })
            }
          />
        </Card>
      ) : focused && active && ready ? (
        <View
          style={{
            height: 300,
            backgroundColor: C.navy,
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => receive(data)}
            onMountError={() =>
              setError(
                "Kamerani ochib bo‘lmadi. Kamera ruxsatini tekshiring yoki QR rasmini tanlang.",
              )
            }
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 36,
              bottom: 36,
              left: 36,
              right: 36,
              borderColor: "#FFFFFFCC",
              borderWidth: 2,
              borderRadius: 22,
            }}
          />
        </View>
      ) : (
        <Card>
          <AppText color={C.muted}>
            {ready
              ? "Kamera sahifaga qaytganda davom etadi."
              : "QR o‘qish tayyorlanmoqda…"}
          </AppText>
        </Card>
      )}
      <View style={uiStyles.row}>
        <Button
          title="QR rasmini tanlash"
          icon="image"
          variant="soft"
          style={{ flex: 1 }}
          loading={action.busy}
          onPress={() =>
            action.run(async () => {
              await prepareQrScanner();
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: false,
                quality: 1,
              });
              if (result.canceled) return;
              const codes = await scanFromURLAsync(result.assets[0].uri, [
                "qr",
              ]);
              const code = codes.find((c) => parseContactQr(c.data));
              if (!code)
                throw new Error(
                  "Rasmda O‘qi QR kodi topilmadi. Kod to‘liq va tiniq ko‘rinsin.",
                );
              receive(code.data);
            })
          }
        />
        {permission?.granted && Platform.OS !== "web" ? (
          <Button
            title=""
            icon="zap"
            accessibilityLabel="Fonarni yoqish yoki o‘chirish"
            variant="outline"
            style={{ width: 48, paddingHorizontal: 0 }}
            onPress={() => setTorch((v) => !v)}
          />
        ) : null}
      </View>
      {error ? (
        <Button
          title="Skanerni qayta tayyorlash"
          icon="refresh-cw"
          variant="outline"
          onPress={() => {
            scanned.current = false;
            invalid.current = "";
            setRetry((v) => v + 1);
          }}
        />
      ) : null}
      <Button
        title="Mening QR kodim"
        icon="grid"
        variant="outline"
        onPress={() => navigation.replace("ProfileId")}
      />
      <Button
        title="ID orqali kontakt topish"
        icon="search"
        variant="soft"
        onPress={() => navigation.replace("Contacts")}
      />
      <Feedback error={action.error || error} />
    </Screen>
  );
}
export function ContactsScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Contacts">) {
  const { user, market, command } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const [query, setQuery] = useState(route.params?.query || ""),
    [result, setResult] = useState<User | null>(null);
  const [searched, setSearched] = useState(false),
    [view, setView] = useState<"contacts" | "blocked">(
      route.params?.view || "contacts",
    );
  const lookupRevision = useRef(0),
    actor = useRef(user.id);
  actor.current = user.id;
  const [report, setReport] = useState<User | null>(null),
    [reason, setReason] = useState("");
  const blocks = (market.blocks || []).filter((r) => r.userId === user.id);
  const requests = (market.contactRequests || []).filter(
    (r) => r.recipientId === user.id && r.status === "pending",
  );
  const pending = (market.contactRequests || []).filter(
    (r) => r.senderId === user.id && r.status === "pending",
  );
  const contacts = (market.contacts || [])
    .filter((r) => r.userId === user.id)
    .map((r) => market.users.find((u) => u.id === r.peerId))
    .filter((u): u is User => !!u);
  const lookup = (value: string) =>
    action.run(async () => {
      const ticket = ++lookupRevision.current,
        owner = user.id;
      setResult(null);
      setSearched(false);
      const person = await findAccount(value, owner, market);
      if (actor.current === owner && ticket === lookupRevision.current) {
        setResult(person);
        setSearched(true);
      }
    });
  useEffect(() => {
    const value = route.params?.query;
    if (value) {
      setQuery(value);
      void lookup(value);
    }
  }, [route.params?.query]);
  const controls = (person: User) => {
    const linked = areContacts(market, user.id, person.id);
    const blocked = blocks.some((r) => r.peerId === person.id);
    const already = pending.some((r) => r.recipientId === person.id);
    return (
      <View style={{ gap: 8 }}>
        {person.id !== user.id && !blocked ? (
          <>
            {linked ? (
              <Button
                title="Yozish"
                icon="message-circle"
                variant="soft"
                onPress={() =>
                  navigation.navigate("Conversation", {
                    id: conversationFor(user, person),
                  })
                }
              />
            ) : (
              <Button
                title={
                  already ? "Javob kutilmoqda" : "Kontakt taklifi yuborish"
                }
                icon="user-plus"
                disabled={action.busy || already}
                onPress={() =>
                  action.run(
                    () =>
                      command({ type: "contact-request", peerId: person.id }),
                    () => action.setSuccess("Kontakt taklifi yuborildi."),
                  )
                }
              />
            )}
            {linked && user.role === "tutor" && person.role === "student" ? (
              <Button
                title="Guruhga taklif qilish"
                icon="users"
                variant="outline"
                onPress={() =>
                  navigation.navigate("InviteToGroup", { studentId: person.id })
                }
              />
            ) : null}
            {linked ? (
              <Button
                title="Kontaktdan olib tashlash"
                variant="outline"
                disabled={action.busy}
                onPress={() =>
                  action.run(() =>
                    command({ type: "contact-remove", peerId: person.id }),
                  )
                }
              />
            ) : null}
            <View style={uiStyles.row}>
              <Button
                title="Bloklash"
                icon="slash"
                variant="outline"
                style={{ flex: 1 }}
                disabled={action.busy}
                onPress={() =>
                  action.run(
                    () =>
                      command({
                        type: "block-user",
                        peerId: person.id,
                        blocked: true,
                      }),
                    () => setResult(null),
                  )
                }
              />
              <Button
                title="Shikoyat qilish"
                icon="flag"
                variant="outline"
                style={{ flex: 1 }}
                disabled={action.busy}
                onPress={() => {
                  setReport(person);
                  setReason("");
                }}
              />
            </View>
          </>
        ) : blocked ? (
          <Button
            title="Blokdan chiqarish"
            icon="unlock"
            variant="outline"
            disabled={action.busy}
            onPress={() =>
              action.run(() =>
                command({
                  type: "block-user",
                  peerId: person.id,
                  blocked: false,
                }),
              )
            }
          />
        ) : null}
      </View>
    );
  };
  return (
    <Screen>
      <Header
        title="Kontaktlar"
        onBack={() => navigation.goBack()}
        right={
          <Button
            title="Mening QR"
            icon="grid"
            variant="soft"
            onPress={() => navigation.navigate("ProfileId")}
          />
        }
      />
      <Card>
        <Field
          label="ID yoki O‘qi havolasi"
          placeholder="@oqi_..."
          value={query}
          onChangeText={(value) => {
            lookupRevision.current++;
            setQuery(value);
            setResult(null);
            setSearched(false);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => void lookup(query)}
        />
        <View style={uiStyles.row}>
          <Button
            title="Qidirish"
            icon="search"
            style={{ flex: 1 }}
            loading={action.busy}
            onPress={() => void lookup(query)}
          />
          <Button
            title="QR skanerlash"
            icon="camera"
            variant="soft"
            style={{ flex: 1 }}
            onPress={() => navigation.navigate("ScanContact")}
          />
        </View>
      </Card>
      <Feedback {...action} />
      {result ? (
        <Card>
          <Person user={result} />
          {controls(result)}
        </Card>
      ) : searched ? (
        <AppText color={C.muted}>
          Foydalanuvchi topilmadi yoki ID orqali topish yopilgan.
        </AppText>
      ) : null}
      {requests.map((request) => {
        const sender = market.users.find((u) => u.id === request.senderId);
        return (
          <Card key={request.id} style={{ borderColor: C.accent }}>
            <Chip label="Kontakt taklifi" tone="green" />
            {sender ? <Person user={sender} /> : null}
            <View style={uiStyles.row}>
              <Button
                title="Qabul qilish"
                style={{ flex: 1 }}
                disabled={action.busy}
                onPress={() =>
                  action.run(() =>
                    command({
                      type: "contact-decide",
                      requestId: request.id,
                      accept: true,
                    }),
                  )
                }
              />
              <Button
                title="Rad etish"
                variant="outline"
                style={{ flex: 1 }}
                disabled={action.busy}
                onPress={() =>
                  action.run(() =>
                    command({
                      type: "contact-decide",
                      requestId: request.id,
                      accept: false,
                    }),
                  )
                }
              />
            </View>
          </Card>
        );
      })}
      <FilterOptions
        label="Kontaktlar ko‘rinishi"
        value={view}
        onChange={setView}
        options={[
          { value: "contacts", label: "Kontaktlarim" },
          { value: "blocked", label: "Bloklanganlar" },
        ]}
      />
      {view === "contacts"
        ? contacts.map((person) => (
            <Card key={person.id}>
              <Person user={person} />
              {controls(person)}
            </Card>
          ))
        : blocks.map((block) => {
            const person = market.users.find((u) => u.id === block.peerId);
            return person ? (
              <Card key={block.peerId}>
                <Person user={person} />
                {controls(person)}
              </Card>
            ) : null;
          })}
      {view === "contacts" && !contacts.length ? (
        <EmptyState
          title="Kontaktlar hali yo‘q"
          subtitle="ID yoki QR orqali toping va kontakt taklifini yuboring."
          icon="users"
        />
      ) : null}
      {view === "blocked" && !blocks.length ? (
        <EmptyState
          title="Bloklanganlar yo‘q"
          subtitle="Bloklangan foydalanuvchilar shu yerda ko‘rinadi."
          icon="shield"
        />
      ) : null}
      {report ? (
        <Card style={{ borderColor: C.amber }}>
          <AppText variant="heading">Shikoyat qilish</AppText>
          <AppText localize={false}>{report.name}</AppText>
          <Field
            label="Sabab"
            multiline
            maxLength={1000}
            value={reason}
            onChangeText={setReason}
          />
          <Button
            title="Shikoyatni yuborish"
            loading={action.busy}
            disabled={reason.trim().length < 10}
            onPress={() =>
              action.run(
                () =>
                  command({ type: "report-user", peerId: report.id, reason }),
                () => {
                  setReport(null);
                  setReason("");
                  action.setSuccess("Shikoyat moderatorga yuborildi.");
                },
              )
            }
          />
          <Button
            title="Bekor qilish"
            variant="outline"
            onPress={() => setReport(null)}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
export function InvitationCard({
  invitation,
}: {
  invitation: GroupInvitation;
}) {
  const { user, market, command } = useApp(),
    action = useAction(),
    navigation = useAppNavigation();
  const group = market.offerings.find((g) => g.id === invitation.offeringId);
  const teacher = market.users.find((u) => u.id === invitation.tutorId);
  const student = market.users.find((u) => u.id === invitation.studentId);
  const pending =
    invitation.status === "pending" &&
    Date.parse(invitation.expiresAt) > Date.now();
  const status =
    invitation.status === "accepted"
      ? "Qabul qilingan"
      : invitation.status === "declined"
        ? "Rad etilgan"
        : invitation.status === "cancelled"
          ? "Bekor qilingan"
          : pending
            ? "Javob kutilmoqda"
            : "Muddati tugagan";
  return (
    <Card style={{ borderColor: pending ? C.accent : C.border }}>
      <Chip label={status} tone={pending ? "green" : undefined} />
      {teacher ? <Person user={teacher} /> : null}
      <AppText variant="heading" localize={false}>
        {group?.title || "O‘qi"}
      </AppText>
      {user.role === "tutor" && student ? (
        <AppText localize={false}>{student.name}</AppText>
      ) : null}
      {group ? (
        <>
          <AppText>{money(group.price)}</AppText>
          <AppText variant="caption" color={C.muted}>
            {offeringScheduleLabel(group) + " · " + group.mode}
          </AppText>
          <AppText variant="caption" color={C.muted} localize={false}>
            {group.location}
          </AppText>
        </>
      ) : null}
      {pending ? (
        <AppText variant="caption" color={C.muted}>
          {"Amal qiladi: " + dateLabel(invitation.expiresAt)}
        </AppText>
      ) : null}
      {pending && invitation.studentId === user.id ? (
        <View style={uiStyles.row}>
          <Button
            title="Qabul qilish"
            icon="check"
            style={{ flex: 1 }}
            disabled={action.busy}
            onPress={() =>
              action.run(
                () =>
                  command({
                    type: "group-invite-decide",
                    invitationId: invitation.id,
                    accept: true,
                  }),
                () => action.setSuccess("Guruhga qo‘shildingiz."),
              )
            }
          />
          <Button
            title="Rad etish"
            variant="outline"
            style={{ flex: 1 }}
            disabled={action.busy}
            onPress={() =>
              action.run(() =>
                command({
                  type: "group-invite-decide",
                  invitationId: invitation.id,
                  accept: false,
                }),
              )
            }
          />
        </View>
      ) : pending && invitation.tutorId === user.id ? (
        <Button
          title="Taklifni bekor qilish"
          variant="outline"
          disabled={action.busy}
          onPress={() =>
            action.run(() =>
              command({
                type: "group-invite-cancel",
                invitationId: invitation.id,
              }),
            )
          }
        />
      ) : null}
      {invitation.status === "accepted" && invitation.studentId === user.id ? (
        <Button
          title="Darslarim"
          variant="soft"
          onPress={() => navigation.navigate("Main", { screen: "Lessons" })}
        />
      ) : null}
      <Feedback {...action} />
    </Card>
  );
}
export function InvitationsScreen() {
  const navigation = useAppNavigation(),
    { market, user } = useApp();
  const invitations = (market.groupInvitations || [])
    .filter((i) => i.studentId === user.id || i.tutorId === user.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const contactCount = (market.contactRequests || []).filter(
    (r) => r.recipientId === user.id && r.status === "pending",
  ).length;
  return (
    <Screen>
      <Header title="Takliflar" onBack={() => navigation.goBack()} />
      {contactCount ? (
        <Button
          title={"Kontakt takliflari · " + contactCount}
          icon="user-plus"
          variant="soft"
          onPress={() => navigation.navigate("Contacts")}
        />
      ) : null}
      {user.role === "tutor" ? (
        <Button
          title="O‘quvchini guruhga taklif qilish"
          icon="user-plus"
          onPress={() => navigation.navigate("InviteToGroup")}
        />
      ) : null}
      {invitations.map((invitation) => (
        <InvitationCard key={invitation.id} invitation={invitation} />
      ))}
      {!invitations.length ? (
        <EmptyState
          title="Guruh takliflari yo‘q"
          subtitle="Yangi guruh takliflari shu yerda ko‘rinadi."
          icon="inbox"
        />
      ) : null}
    </Screen>
  );
}
export function InviteToGroupScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "InviteToGroup">) {
  const { user, market, command } = useApp(),
    navigation = useAppNavigation(),
    action = useAction();
  const groups = market.offerings.filter(
    (g) => g.tutorId === user.id && g.type === "group",
  );
  const [offeringId, setOfferingId] = useState(
    route.params?.offeringId || groups[0]?.id || "",
  );
  const [query, setQuery] = useState("");
  const ids = new Set(
    (market.contacts || [])
      .filter((c) => c.userId === user.id)
      .map((c) => c.peerId),
  );
  for (const e of market.enrollments)
    if (
      e.active &&
      market.offerings.some(
        (g) => g.id === e.offeringId && g.tutorId === user.id,
      )
    )
      ids.add(e.studentId);
  const candidates = market.users.filter(
    (u) =>
      u.role === "student" &&
      ids.has(u.id) &&
      (!route.params?.studentId || u.id === route.params.studentId) &&
      (u.name + " " + publicIdOf(u))
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()) &&
      !market.enrollments.some(
        (e) => e.offeringId === offeringId && e.studentId === u.id && e.active,
      ),
  );
  const approved =
    user.role === "tutor" &&
    market.tutorProfiles.some(
      (p) => p.userId === user.id && p.verification === "approved",
    );
  return (
    <Screen>
      <Header
        title="Guruhga taklif qilish"
        onBack={() => navigation.goBack()}
      />
      {!approved ? (
        <EmptyState
          title="Tasdiqlangan ustoz profili kerak"
          subtitle="Profilingizni to‘ldiring va moderator tasdig‘ini kuting."
          icon="shield"
        />
      ) : !groups.length ? (
        <EmptyState title="Guruh hali yo‘q" subtitle="Avval guruh yarating." />
      ) : (
        <>
          <Card>
            <FilterSelect
              label="Guruhni tanlang"
              options={groups.map((g) => ({ value: g.id, label: g.title }))}
              value={offeringId}
              onChange={setOfferingId}
            />
            <Field
              label="O‘quvchi ismi yoki ID"
              value={query}
              onChangeText={setQuery}
              icon="search"
            />
            <AppText variant="caption" color={C.muted}>
              Kontaktlaringiz yoki avvalgi guruhlaringizdagi o‘quvchilarni
              taklif qiling. Taklif o‘rin band qilmaydi; o‘quvchi qabul qilganda
              sig‘im tekshiriladi.
            </AppText>
          </Card>
          <Button
            title="ID yoki QR orqali kontakt qo‘shish"
            variant="soft"
            icon="user-plus"
            onPress={() => navigation.navigate("Contacts")}
          />
          <Feedback {...action} />
          {candidates.map((student) => {
            const invitation = market.groupInvitations?.find(
              (i) =>
                i.offeringId === offeringId &&
                i.studentId === student.id &&
                i.status === "pending" &&
                Date.parse(i.expiresAt) > Date.now(),
            );
            return (
              <Card key={student.id}>
                <Person user={student} />
                <Button
                  title={invitation ? "Taklif yuborilgan" : "Taklif yuborish"}
                  icon="send"
                  disabled={action.busy || !!invitation}
                  onPress={() =>
                    action.run(
                      () =>
                        command({
                          type: "group-invite",
                          offeringId,
                          studentId: student.id,
                        }),
                      () => action.setSuccess("Guruh taklifi yuborildi."),
                    )
                  }
                />
              </Card>
            );
          })}
          {!candidates.length ? (
            <EmptyState
              title="Taklif qilinadigan o‘quvchi yo‘q"
              subtitle="Avval ID yoki QR orqali kontakt qo‘shing."
              icon="users"
            />
          ) : null}
          {(market.groupInvitations || [])
            .filter(
              (i) =>
                i.offeringId === offeringId &&
                i.tutorId === user.id &&
                i.status === "pending" &&
                Date.parse(i.expiresAt) > Date.now(),
            )
            .map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))}
        </>
      )}
    </Screen>
  );
}
