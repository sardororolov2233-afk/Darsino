import React, { useEffect, useState } from "react";
import { Linking, Platform, Share, View } from "react-native";
import { LocalizedPressable as Pressable } from "../i18n/native";
import { AppText, Button, Card, Chip, EmptyState, Field, Header, Icon, Screen, uiStyles } from "../components/ui";
import { SettingRow, SettingsSection, SettingToggle } from "../components/SettingsUI";
import { Feedback, useAction } from "../components/feedback";
import { TwoFactorPanel } from "../components/TwoFactor";
import { useAppNavigation } from "../navigation";
import { useApp } from "../state/AppContext";
import { useLearning } from "../state/LearningContext";
import { useTeacher } from "../state/TeacherContext";
import {
  LANGUAGES, publicIdOf, readAccountSettings,
  type AccountSettings, type ContactPolicy,
} from "../state/account";
import { useI18n } from "../i18n";
import { ownSessions, revokeOtherSessions, type AccountSession } from "../services/account";
import { dateLabel, timeLabel } from "../state/domain";
import { FilterOptions } from "../components/FilterControls";
import { C } from "../theme";

export const SUPPORT_URL = "https://t.me/sardorbekuralov";
export function SettingsScreen() {
  const navigation = useAppNavigation(), { user, mode, signOut, syncError, storageError } = useApp();
  const { language } = useI18n(), action = useAction();
  const [logout, setLogout] = useState(false);
  return <Screen>
    <Header title="Sozlamalar" onBack={() => navigation.goBack()} />
    <SettingsSection title="Akkaunt">
      <SettingRow title="Profilni tahrirlash" subtitle={user.name} icon="user" onPress={() => navigation.navigate("EditProfile")} />
      <SettingRow title="Mening ID va QR kodim" value={"@" + publicIdOf(user)} icon="grid" onPress={() => navigation.navigate("ProfileId")} />
      <SettingRow title="Til" value={LANGUAGES.find((l) => l.code === language)?.name} icon="globe" onPress={() => navigation.navigate("LanguageSettings")} />
    </SettingsSection>
    <SettingsSection title="Boshqaruv">
      <SettingRow title="Xavfsizlik" subtitle="Ikki bosqichli himoya va sessiyalar" icon="shield" onPress={() => navigation.navigate("SecuritySettings")} />
      <SettingRow title="Maxfiylik" subtitle="Kimlar siz bilan bog‘lanishi mumkin" icon="lock" onPress={() => navigation.navigate("PrivacySettings")} />
      <SettingRow title="Bildirishnomalar" subtitle="Dars eslatmalarini boshqarish" icon="bell" onPress={() => navigation.navigate("NotificationSettings")} />
      <SettingRow title="Ma’lumotlar va xotira" icon="database" onPress={() => navigation.navigate("DataSettings")} />
    </SettingsSection>
    <SettingsSection title="Yordam">
      <SettingRow title="Yordam va qo‘llab-quvvatlash" icon="help-circle" onPress={() => navigation.navigate("Support")} />
      <SettingRow title="Ilova ruxsatlari" icon="smartphone" onPress={() => navigation.navigate("Permissions")} />
      {user.role === "moderator" ? <SettingRow title="Foydalanuvchilar shikoyatlari" icon="flag" onPress={() => navigation.navigate("AccountReports")} /> : null}
      <SettingRow title="Hisobdan chiqish" icon="log-out" danger onPress={() => setLogout(true)} />
    </SettingsSection>
    {logout ? <Card>
      <AppText variant="heading">Hisobdan chiqasizmi?</AppText>
      <Button title="Chiqishni tasdiqlash" loading={action.busy} onPress={() => action.run(signOut)} />
      <Button title="Qolish" variant="outline" onPress={() => setLogout(false)} />
    </Card> : null}
    <AppText variant="caption" color={C.muted} style={{ textAlign: "center" }}>
      {mode === "demo" ? "Sinov rejimi · shu qurilmada saqlanadi" : "Akkaunt bilan sinxronlanadi"}
    </AppText>
    <Feedback error={syncError || (storageError ? "Qurilmaga saqlashda xato." : action.error)} />
    <AppText variant="caption" color={C.muted} style={{ textAlign: "center" }}>O‘qi · 1.0.0</AppText>
  </Screen>;
}
export function LanguageSettingsScreen() {
  const navigation = useAppNavigation(), { user, market, command } = useApp();
  const { language, setLanguage } = useI18n(), action = useAction();
  return <Screen>
    <Header title="Ilova tili" onBack={() => navigation.goBack()} />
    <AppText color={C.muted}>Interfeys tili barcha asosiy oynalarda o‘zgaradi. Xabarlar va dars materiallari asl tilida qoladi.</AppText>
    <SettingsSection title="Tilni tanlang">
      {LANGUAGES.map((item) => <Pressable key={item.code} accessibilityRole="radio"
        accessibilityLabel={item.name} accessibilityState={{ checked: language === item.code, disabled: action.busy }}
        disabled={action.busy} onPress={() => action.run(async () => {
          await command({ type: "account-settings", settings: { ...readAccountSettings(market.accountSettings?.[user.id]), language: item.code }, publicId: publicIdOf(user) });
          setLanguage(item.code);
        })} style={{ minHeight: 64, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Icon name="globe" color={language === item.code ? C.green : C.muted} />
        <AppText localize={false} style={{ flex: 1 }}>{item.name}</AppText>
        {language === item.code ? <Icon name="check-circle" color={C.green} /> : <Icon name="circle" color={C.border} />}
      </Pressable>)}
    </SettingsSection>
    <Feedback {...action} />
  </Screen>;
}
export function PrivacySettingsScreen() {
  const navigation = useAppNavigation(), { user, market, command } = useApp(), action = useAction();
  const [settings, setSettings] = useState<AccountSettings>(() => readAccountSettings(market.accountSettings?.[user.id]));
  const [publicId, setPublicId] = useState(publicIdOf(user));
  const policies: { value: ContactPolicy; label: string }[] = [
    { value: "everyone", label: "Hamma" }, { value: "contacts", label: "Kontaktlarim" }, { value: "nobody", label: "Hech kim" },
  ];
  return <Screen bottom={<Button title="O‘zgarishlarni saqlash" icon="check" loading={action.busy}
    onPress={() => action.run(() => command({ type: "account-settings", settings, publicId: publicId.trim().toLowerCase().replace(/^@/, "") }),
      () => action.setSuccess("Sozlamalar saqlandi."))} />}>
    <Header title="Maxfiylik" onBack={() => navigation.goBack()} />
    <Card>
      <Field label="O‘qi ID" value={publicId} onChangeText={setPublicId} autoCapitalize="none"
        autoCorrect={false} maxLength={24} />
      <AppText variant="caption" color={C.muted}>ID 5–24 ta kichik lotin harfi, raqam yoki pastki chiziqdan iborat bo‘lsin.</AppText>
      <AppText variant="caption" color={C.muted}>ID o‘zgarsa, eski QR kod va havola ishlamaydi.</AppText>
    </Card>
    <SettingsSection title="Profil ko‘rinishi">
      <SettingToggle title="ID orqali topish" subtitle="Yangi foydalanuvchilar ID va QR orqali sizni topishi mumkin."
        value={settings.discoverable} onChange={(v) => setSettings((p) => ({ ...p, discoverable: v }))} />
      <SettingToggle title="Hududni ko‘rsatish" subtitle="Profilingizdagi shahar va tumanni ko‘rsatadi. E’lon qilingan dars manzili alohida ko‘rinadi."
        value={settings.showArea} onChange={(v) => setSettings((p) => ({ ...p, showArea: v }))} />
    </SettingsSection>
    <Card>
      <FilterOptions label="Profil rasmimni kim ko‘radi?" options={policies} value={settings.avatarVisibility}
        onChange={(v) => setSettings((p) => ({ ...p, avatarVisibility: v }))} />
      <FilterOptions label="Menga kim yozishi mumkin?" options={policies} value={settings.messagePolicy}
        onChange={(v) => setSettings((p) => ({ ...p, messagePolicy: v }))} />
      <FilterOptions label="Guruhga kim taklif qilishi mumkin?" options={policies} value={settings.invitePolicy}
        onChange={(v) => setSettings((p) => ({ ...p, invitePolicy: v }))} />
    </Card>
    <SettingsSection title="Aloqa">
      <SettingRow title="Bloklangan foydalanuvchilar" value={String((market.blocks || []).filter((b) => b.userId === user.id).length)}
        icon="slash" onPress={() => navigation.navigate("Contacts", { view: "blocked" })} />
    </SettingsSection>
    <AppText variant="caption" color={C.muted}>Email va telefon raqamingiz boshqa foydalanuvchilarga ko‘rsatilmaydi. Bloklash yangi xabar va takliflarni to‘xtatadi; avvalgi dars va to‘lov yozuvlari saqlanadi.</AppText>
    <Feedback {...action} />
  </Screen>;
}
export function SecuritySettingsScreen() {
  const navigation = useAppNavigation(), { user, mode } = useApp(), action = useAction();
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [confirm, setConfirm] = useState(false);
  const reload = async () => setSessions(await ownSessions());
  useEffect(() => { if (mode !== "demo") void action.run(reload); }, [mode]);
  return <Screen>
    <Header title="Xavfsizlik" onBack={() => navigation.goBack()} />
    <Card>
      <AppText variant="heading">Kirish usuli</AppText>
      <AppText localize={false} selectable>{user.email || "—"}</AppText>
      <AppText variant="caption" color={C.muted}>Email kodi, Google yoki Apple orqali kirasiz. Parol ilovada saqlanmaydi.</AppText>
    </Card>
    <TwoFactorPanel />
    <Card>
      <AppText variant="heading">Faol sessiyalar</AppText>
      {sessions.map((session) => <View key={session.id} style={{ gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <AppText localize={false}>{session.userAgent?.slice(0, 120) || "O‘qi"}</AppText>
        {session.current ? <Chip label="Joriy sessiya" tone="green" /> : null}
        <AppText variant="caption" color={C.muted}>{dateLabel(session.createdAt)} · {timeLabel(session.createdAt)}</AppText>
      </View>)}
      {!sessions.length ? <AppText color={C.muted}>{mode === "demo" ? "Bu imkoniyat jonli akkauntda ishlaydi." : "Sessiyalar ro‘yxati bo‘sh."}</AppText> : null}
      <Button title="Yangilash" icon="refresh-cw" variant="soft" disabled={mode === "demo"} loading={action.busy}
        onPress={() => action.run(reload)} />
      <Button title="Boshqa sessiyalardan chiqish" icon="log-out" variant="outline" disabled={mode === "demo" || action.busy}
        onPress={() => setConfirm(true)} />
      {confirm ? <>
        <AppText>Boshqa qurilmalardagi sessiyalarni yopasizmi?</AppText>
        <Button title="Chiqishni tasdiqlash" loading={action.busy} onPress={() => action.run(async () => {
          await revokeOtherSessions(); setConfirm(false); await reload();
        }, () => action.setSuccess("Boshqa sessiyalar yopildi."))} />
        <Button title="Bekor qilish" variant="outline" onPress={() => setConfirm(false)} />
      </> : null}
    </Card>
    <Feedback {...action} />
  </Screen>;
}
export function NotificationSettingsScreen() {
  const navigation = useAppNavigation(), { user, market, command } = useApp(), action = useAction();
  const settings = readAccountSettings(market.accountSettings?.[user.id]);
  return <Screen>
    <Header title="Bildirishnomalar" onBack={() => navigation.goBack()} />
    <SettingsSection title="Darslar">
      <SettingToggle title="Dars eslatmalari" subtitle="O‘zingiz yoqqan dars eslatmalarini olish. O‘chirilsa, rejalashtirilgan eslatmalar bekor qilinadi."
        value={settings.lessonReminders} disabled={action.busy}
        onChange={(value) => action.run(() => command({ type: "account-settings", settings: { ...settings, lessonReminders: value }, publicId: publicIdOf(user) }))} />
      <SettingRow title="Telefon ruxsatlari" icon="smartphone" onPress={() => navigation.navigate("Permissions")} />
      <SettingRow title="Guruh takliflari ruxsati" icon="users" onPress={() => navigation.navigate("PrivacySettings")} />
    </SettingsSection>
    <AppText color={C.muted}>Ariza, to‘lov va takliflar ilova ichida ko‘rinadi. Dars eslatmalari Android va iOS qurilmalarida ishlaydi.</AppText>
    <Feedback {...action} />
  </Screen>;
}
export function DataSettingsScreen() {
  const navigation = useAppNavigation(), { user, market } = useApp(), action = useAction();
  const learning = useLearning(), teacher = useTeacher();
  const [clear, setClear] = useState(false);
  const exportData = async () => {
    const mine = (id: string) => market.offerings.some((g) => g.id === id && g.tutorId === user.id);
    const payload = {
      exportedAt: new Date().toISOString(), profile: user, settings: readAccountSettings(market.accountSettings?.[user.id]),
      contacts: (market.contacts || []).filter((r) => r.userId === user.id),
      contactRequests: (market.contactRequests || []).filter((r) => r.senderId === user.id || r.recipientId === user.id),
      blocks: (market.blocks || []).filter((r) => r.userId === user.id),
      applications: market.applications.filter((r) => r.studentId === user.id || r.tutorId === user.id),
      enrollments: market.enrollments.filter((r) => r.studentId === user.id || mine(r.offeringId)),
      payments: (market.payments || []).filter((r) => r.studentId === user.id || mine(r.offeringId)),
      messages: market.messages.filter((r) => r.senderId === user.id || r.recipientId === user.id),
      invitations: (market.groupInvitations || []).filter((r) => r.studentId === user.id || r.tutorId === user.id),
      learning: learning.data, workspace: user.role === "tutor" ? teacher.data : undefined,
    };
    const text = JSON.stringify(payload, null, 2);
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "oqi-account.json";
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else await Share.share({ message: text, title: "O‘qi" });
  };
  return <Screen>
    <Header title="Ma’lumotlar va xotira" onBack={() => navigation.goBack()} />
    <Card>
      <AppText variant="heading">Ma’lumotlarimni olish</AppText>
      <AppText color={C.muted}>Profil, kontaktlar, yozishmalar, to‘lovlar va o‘quv progressining nusxasini oling.</AppText>
      <Button title="Ma’lumotlarni eksport qilish" icon="download" loading={action.busy}
        disabled={!learning.ready || (user.role === "tutor" && !teacher.ready)}
        onPress={() => action.run(exportData)} />
    </Card>
    <Card>
      <AppText variant="heading">Qidiruv tarixi</AppText>
      <AppText color={C.muted}>Qidiruv tarixini tozalash darslar va to‘lovlarni o‘chirmaydi.</AppText>
      <Button title="Qidiruv tarixini tozalash" variant="outline" onPress={() => setClear(true)} />
      {clear ? <>
        <Button title="Tozalashni tasdiqlash" loading={action.busy}
          onPress={() => action.run(learning.clearSearches, () => { setClear(false); action.setSuccess("Qidiruv tarixi tozalandi."); })} />
        <Button title="Bekor qilish" variant="soft" onPress={() => setClear(false)} />
      </> : null}
    </Card>
    <Feedback error={action.error || learning.error || teacher.error} success={action.success} />
  </Screen>;
}
export function SupportScreen() {
  const navigation = useAppNavigation(), action = useAction();
  return <Screen>
    <Header title="Yordam va qo‘llab-quvvatlash" onBack={() => navigation.goBack()} />
    <Card style={{ backgroundColor: C.navy }}>
      <Icon name="send" color={C.mint} size={28} />
      <AppText variant="title" color={C.white}>Yordam kerakmi?</AppText>
      <AppText color="#D8E3F8">Savol yoki muammo bo‘lsa, Telegram orqali bog‘laning.</AppText>
      <Button title="Telegram orqali yordam" icon="send" variant="gold" loading={action.busy}
        onPress={() => action.run(async () => { await Linking.openURL(SUPPORT_URL); })} />
      <AppText localize={false} color="#D8E3F8" selectable>@sardorbekuralov</AppText>
    </Card>
    <Card>
      <AppText variant="heading">Guruhga qanday qo‘shilaman?</AppText>
      <AppText color={C.muted}>Ustoz taklifini qabul qiling yoki ochiq guruhga ariza yuboring. Tasdiqlangach dars jadvali ochiladi.</AppText>
      <AppText variant="heading">To‘lovlar qanday qayd etiladi?</AppText>
      <AppText color={C.muted}>To‘lov holatini ustoz belgilaydi. Hisobot pul o‘tkazmasi emas; kelishmovchilik bo‘lsa ustoz bilan bog‘laning.</AppText>
      <AppText variant="heading">Maxfiyligimni qanday boshqaraman?</AppText>
      <AppText color={C.muted}>Sozlamalarda ID orqali topilish, rasm, hudud, xabarlar va takliflar ruxsatini o‘zgartiring.</AppText>
    </Card>
    <Feedback {...action} />
  </Screen>;
}
export function AccountReportsScreen() {
  const navigation = useAppNavigation(), { user, market } = useApp();
  if (user.role !== "moderator") return <Screen><Header title="Shikoyatlar" onBack={() => navigation.goBack()} />
    <EmptyState title="Moderator huquqi kerak" subtitle="Bu bo‘lim moderator akkaunti uchun." /></Screen>;
  return <Screen>
    <Header title="Foydalanuvchilar shikoyatlari" onBack={() => navigation.goBack()} />
    {(market.accountReports || []).map((report) => <Card key={report.id}>
      <Chip label="Shikoyat" />
      <AppText localize={false}>{report.reason}</AppText>
      <AppText variant="caption" localize={false}>{report.reporterId + " → " + report.targetId}</AppText>
      <AppText variant="caption" color={C.muted}>{dateLabel(report.createdAt)}</AppText>
    </Card>)}
    {!market.accountReports?.length ? <EmptyState title="Shikoyatlar yo‘q" subtitle="Yangi murojaatlar shu yerda ko‘rinadi." icon="flag" /> : null}
  </Screen>;
}
