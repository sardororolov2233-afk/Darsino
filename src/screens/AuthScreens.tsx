import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, TextInput, View } from "react-native";
import {
  AppText,
  Avatar,
  Button,
  Chip,
  Field,
  Header,
  Icon,
  Screen,
} from "../components/ui";
import { Brand } from "../components/Brand";
import { WelcomeIllustration } from "../components/Illustrations";
import { useAppNavigation } from "../navigation";
import { useApp } from "../state/AppContext";
import { C } from "../theme";

const DEMO_CODE = "421806";
const INTERESTS = [
  "Ingliz tili",
  "Matematika",
  "Tarix",
  "IT",
  "Rus tili",
  "Fizika",
];
const ROLES = [
  { value: "student" as const, label: "O‘quvchi" },
  { value: "tutor" as const, label: "Repetitor" },
  { value: "owner" as const, label: "Xona egasi" },
];

function NumberPad({
  onDigit,
  onDelete,
}: {
  onDigit: (digit: string) => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.keypad}>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"].map(
        (key, index) =>
          key === "" ? (
            <View key={`empty-${index}`} style={styles.key} />
          ) : (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={
                key === "delete" ? "Oxirgi raqamni o‘chirish" : `${key} raqami`
              }
              onPress={() => (key === "delete" ? onDelete() : onDigit(key))}
              style={({ pressed }) => [
                styles.key,
                styles.activeKey,
                pressed && styles.pressedKey,
              ]}
            >
              {key === "delete" ? (
                <Icon name="delete" size={21} color={C.navy} />
              ) : (
                <AppText variant="heading" style={styles.keyText}>
                  {key}
                </AppText>
              )}
            </Pressable>
          ),
      )}
    </View>
  );
}

function InlineError({ message }: { message: string }) {
  return message ? (
    <AppText
      variant="caption"
      accessibilityLiveRegion="polite"
      style={styles.error}
    >
      {message}
    </AppText>
  ) : null;
}

export function SplashScreen() {
  const navigation = useAppNavigation();
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    const timeout = setTimeout(() => navigation.replace("Welcome"), 1200);
    return () => {
      clearTimeout(timeout);
      animation.stop();
    };
  }, [navigation, pulse]);
  return (
    <Screen scroll={false} background={C.white} style={styles.authContent}>
      <View style={styles.splash}>
        <Brand width={282} />
        <AppText style={styles.tagline}>Bilim sari ochiq yo‘l</AppText>
        <Animated.View
          style={[styles.loadingDots, { opacity: pulse }]}
          accessibilityLabel="Ilova yuklanmoqda"
        >
          <View style={[styles.dot, { backgroundColor: C.navy }]} />
          <View style={[styles.dot, { backgroundColor: C.gold }]} />
          <View style={[styles.dot, { backgroundColor: C.border }]} />
        </Animated.View>
        <AppText variant="caption" style={styles.loadingCaption}>
          Yangi imkoniyatlar tayyorlanmoqda...
        </AppText>
      </View>
    </Screen>
  );
}

export function WelcomeScreen() {
  const navigation = useAppNavigation();
  const { user, setUser } = useApp();
  return (
    <Screen
      background={C.white}
      style={styles.authContent}
      bottom={
        <View style={styles.welcomeBottom}>
          <Button
            title="Boshlash"
            variant="gold"
            onPress={() => navigation.navigate("Phone")}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mavjud hisobga kirish"
            onPress={() => navigation.navigate("Phone")}
            style={styles.loginLink}
          >
            <AppText variant="caption" style={styles.navy}>
              Hisobingiz bormi? <AppText variant="label">Kirish</AppText>
            </AppText>
          </Pressable>
        </View>
      }
    >
      <View style={styles.welcomeBrand}>
        <Brand width={171} />
      </View>
      <View style={styles.illustration}>
        <WelcomeIllustration height={220} />
      </View>
      <AppText variant="title" style={styles.welcomeTitle}>
        Darsingga{"\n"}hammasi tayyor.
      </AppText>
      <AppText style={styles.description}>
        Ustozlar, guruhlar va amaliy tadbirlar — barchasi bir joyda.
      </AppText>
      <AppText variant="caption" style={styles.roleLabel}>
        Darsinodan kim sifatida foydalanasiz?
      </AppText>
      <View style={styles.chips}>
        {ROLES.map((role) => (
          <Chip
            key={role.value}
            label={role.label}
            selected={user.role === role.value}
            onPress={() => setUser({ role: role.value })}
          />
        ))}
      </View>
    </Screen>
  );
}

function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  const hasCountryCode =
    /^\s*\+998/.test(value) ||
    (digits.length === 12 && digits.startsWith("998"));
  return (hasCountryCode ? digits.slice(3) : digits).slice(0, 9);
}

function formatPhone(value: string) {
  return [
    value.slice(0, 2),
    value.slice(2, 5),
    value.slice(5, 7),
    value.slice(7, 9),
  ]
    .filter(Boolean)
    .join(" ");
}

export function PhoneScreen() {
  const navigation = useAppNavigation();
  const { user, setUser } = useApp();
  const [digits, setDigits] = useState(() => phoneDigits(user.phone || ""));
  const [error, setError] = useState("");
  const updateDigits = (value: string) => {
    setDigits(phoneDigits(value));
    setError("");
  };
  const continueToCode = () => {
    if (digits.length !== 9) {
      setError("Telefon raqamingizni 9 ta raqam bilan kiriting.");
      return;
    }
    setUser({ phone: `+998${digits}` });
    navigation.navigate("Verify");
  };
  return (
    <Screen
      background={C.white}
      style={styles.authContent}
      bottom={
        <NumberPad
          onDigit={(digit) => {
            setDigits((current) =>
              current.length < 9 ? current + digit : current,
            );
            setError("");
          }}
          onDelete={() => updateDigits(digits.slice(0, -1))}
        />
      }
    >
      <Header title="Kirish" onBack={() => navigation.goBack()} />
      <AppText variant="title" style={styles.pageTitle}>
        Telefon raqamingiz
      </AppText>
      <AppText style={styles.description}>
        Kirish yoki hisob ochish uchun raqamingizni kiriting.
      </AppText>
      <AppText variant="caption" style={styles.countryLabel}>
        O‘zbekiston · +998
      </AppText>
      <Field
        value={formatPhone(digits)}
        onChangeText={updateDigits}
        placeholder="90 123 45 67"
        icon="phone"
        keyboardType="phone-pad"
        showSoftInputOnFocus={false}
        accessibilityLabel="Telefon raqamingiz"
        textContentType="telephoneNumber"
        autoComplete="tel-national"
        maxLength={17}
      />
      <InlineError message={error} />
      <View style={styles.continueButton}>
        <Button title="Davom etish" onPress={continueToCode} />
      </View>
      <AppText variant="caption" style={styles.disclaimer}>
        Raqamingiz hisobingizni himoyalash uchun ishlatiladi.
      </AppText>
      <AppText variant="caption" style={styles.disclaimer}>
        Davom etish orqali Foydalanish shartlari va Maxfiylik siyosatiga rozilik
        bildirasiz.
      </AppText>
      <View style={styles.demoInfo}>
        <Icon name="info" size={16} color={C.muted} />
        <AppText variant="caption" style={styles.demoText}>
          Sinov rejimi: SMS yuborilmaydi.
        </AppText>
      </View>
    </Screen>
  );
}

export function VerifyScreen() {
  const navigation = useAppNavigation();
  const { user } = useApp();
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(28);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const codeInput = useRef<TextInput>(null);
  useEffect(() => {
    const interval = setInterval(
      () => setRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(interval);
  }, []);
  const updateCode = (value: string) => {
    setCode(value.replace(/\D/g, "").slice(0, 6));
    setError("");
  };
  const verify = () => {
    if (code.length !== 6) {
      setError("6 xonali tasdiqlash kodini kiriting.");
      return;
    }
    if (code !== DEMO_CODE) {
      setError("Kod noto‘g‘ri. Sinov uchun 421806 kodini kiriting.");
      return;
    }
    navigation.navigate("Setup");
  };
  const phone = phoneDigits(user.phone || "");
  const masked =
    phone.length === 9
      ? `+998 ${phone.slice(0, 2)} ••• ${phone.slice(5, 7)} ${phone.slice(7)}`
      : "+998 raqamingiz";
  return (
    <Screen
      background={C.white}
      style={styles.authContent}
      bottom={
        <NumberPad
          onDigit={(digit) => updateCode(code + digit)}
          onDelete={() => updateCode(code.slice(0, -1))}
        />
      }
    >
      <Header title="Tasdiqlash" onBack={() => navigation.goBack()} />
      <AppText variant="title" style={styles.pageTitle}>
        SMS kodni kiriting
      </AppText>
      <AppText style={styles.description}>
        {masked} uchun 6 xonali tasdiqlash kodini kiriting.
      </AppText>
      <Pressable
        onPress={() => codeInput.current?.focus()}
        style={styles.codeContainer}
        accessibilityLabel="Tasdiqlash kodini kiriting"
      >
        <View style={styles.codeBoxes}>
          {Array.from({ length: 6 }, (_, index) => (
            <View
              key={index}
              style={[
                styles.codeBox,
                index === Math.min(code.length, 5) && styles.activeCodeBox,
              ]}
            >
              <AppText variant="heading" style={styles.codeDigit}>
                {code[index] || ""}
              </AppText>
            </View>
          ))}
        </View>
        <TextInput
          ref={codeInput}
          testID="otp-input"
          accessibilityLabel="SMS tasdiqlash kodi"
          value={code}
          onChangeText={updateCode}
          maxLength={6}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          caretHidden
          showSoftInputOnFocus={false}
          style={styles.hiddenCodeInput}
        />
      </Pressable>
      <InlineError message={error} />
      <View style={styles.resendRow}>
        {remaining > 0 ? (
          <AppText variant="caption" style={styles.muted}>
            Kodni qayta yuborish · 00:{String(remaining).padStart(2, "0")}
          </AppText>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRemaining(28);
              setResent(true);
              setCode("");
              setError("");
            }}
          >
            <AppText variant="label" style={styles.navy}>
              Kodni qayta yuborish
            </AppText>
          </Pressable>
        )}
      </View>
      <Button title="Tasdiqlash" onPress={verify} />
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.goBack()}
        style={styles.changeNumber}
      >
        <AppText variant="caption" style={styles.navy}>
          Raqamni o‘zgartirish
        </AppText>
      </Pressable>
      <View style={styles.securityNote}>
        <Icon name="shield" size={22} color={C.navy} />
        <AppText variant="caption" style={styles.navy}>
          Kodni hech kimga bermang.
        </AppText>
      </View>
      <AppText
        variant="caption"
        accessibilityLiveRegion="polite"
        style={styles.demoCode}
      >
        {resent ? "Sinov kodi qayta tayyorlandi: " : "Sinov uchun kod: "}
        <AppText variant="label" style={styles.navy}>
          {DEMO_CODE}
        </AppText>
      </AppText>
    </Screen>
  );
}

export function SetupScreen() {
  const navigation = useAppNavigation();
  const { user, setUser, completeOnboarding } = useApp();
  const [name, setName] = useState(user.name || "");
  const [city, setCity] = useState(user.city || "Toshkent");
  const [interests, setInterests] = useState<string[]>(
    user.interests?.length ? user.interests : ["Ingliz tili"],
  );
  const [error, setError] = useState("");
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "S";
  const toggleInterest = (interest: string) =>
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((value) => value !== interest)
        : [...current, interest],
    );
  const finish = () => {
    if (name.trim().length < 2) {
      setError("Ism va familiyangizni kiriting.");
      return;
    }
    if (city.trim().length < 2) {
      setError("Shaharingizni kiriting.");
      return;
    }
    if (!interests.length) {
      setError("Kamida bitta qiziqishni tanlang.");
      return;
    }
    setUser({ name: name.trim(), city: city.trim(), interests });
    completeOnboarding();
  };
  return (
    <Screen
      background={C.white}
      style={styles.authContent}
      bottom={
        <Button title="Darsinoga kirish" variant="gold" onPress={finish} />
      }
    >
      <Header title="Profilni to‘ldirish" onBack={() => navigation.goBack()} />
      <View style={styles.profileAvatar}>
        <Avatar initials={initials} size={68} tone="blue" />
        <AppText variant="caption" style={styles.avatarLabel}>
          Sizning profil belgingiz
        </AppText>
      </View>
      <View style={styles.formField}>
        <Field
          label="Ism va familiya"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError("");
          }}
          placeholder="Ism va familiyangiz"
          icon="user"
          textContentType="name"
          autoComplete="name"
          autoCapitalize="words"
          returnKeyType="next"
          accessibilityLabel="Ism va familiya"
        />
      </View>
      <View style={styles.formField}>
        <Field
          label="Shahar"
          value={city}
          onChangeText={(value) => {
            setCity(value);
            setError("");
          }}
          placeholder="Toshkent"
          icon="map-pin"
          textContentType="addressCity"
          autoCapitalize="words"
          accessibilityLabel="Shahar"
        />
      </View>
      <AppText variant="caption" style={styles.interestLabel}>
        Qiziqishlaringiz
      </AppText>
      <View style={styles.interestChips}>
        {INTERESTS.map((interest) => (
          <Chip
            key={interest}
            label={interest}
            selected={interests.includes(interest)}
            onPress={() => {
              toggleInterest(interest);
              setError("");
            }}
          />
        ))}
      </View>
      <View style={styles.goalCard}>
        <Icon name="star" size={23} color={C.navy} />
        <View style={styles.flex}>
          <AppText variant="caption" style={styles.navy}>
            {interests.includes("Ingliz tili")
              ? "Maqsad: IELTS natijamni oshirish"
              : "Maqsad: yangi bilimlarni egallash"}
          </AppText>
          <AppText variant="caption" style={styles.goalCaption}>
            Tavsiyalarni sizga moslaymiz
          </AppText>
        </View>
      </View>
      <InlineError message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  authContent: { gap: 0 },
  flex: { flex: 1 },
  navy: { color: C.navy },
  muted: { color: C.muted },
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 56,
  },
  tagline: { color: C.muted, marginTop: 22, fontSize: 14 },
  loadingDots: { flexDirection: "row", gap: 10, marginTop: 65 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  loadingCaption: { color: C.muted, marginTop: 17, textAlign: "center" },
  welcomeBrand: { paddingTop: 12, marginBottom: 16 },
  illustration: {
    height: 220,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: C.blueSoft,
    marginBottom: 16,
  },
  welcomeTitle: { fontSize: 29, lineHeight: 37, marginBottom: 12 },
  description: { color: C.muted, fontSize: 14, lineHeight: 23 },
  roleLabel: { color: C.muted, marginTop: 16, marginBottom: 13 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  welcomeBottom: { gap: 6 },
  loginLink: { alignItems: "center", paddingVertical: 10 },
  pageTitle: { marginTop: 11, marginBottom: 12, fontSize: 28, lineHeight: 36 },
  countryLabel: { color: C.muted, marginTop: 15, marginBottom: 12 },
  continueButton: { marginTop: 13 },
  disclaimer: { color: C.muted, lineHeight: 19, marginTop: 13 },
  demoInfo: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    marginTop: 15,
  },
  demoText: { color: C.muted },
  error: { color: C.error, marginTop: 9, lineHeight: 19 },
  keypad: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 8 },
  key: {
    width: "31.5%",
    flexGrow: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  activeKey: { backgroundColor: C.background },
  pressedKey: { backgroundColor: C.blueSoft },
  keyText: { fontSize: 18 },
  codeContainer: { position: "relative", marginTop: 17 },
  codeBoxes: { flexDirection: "row", gap: 9 },
  codeBox: {
    flex: 1,
    height: 62,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  activeCodeBox: {
    backgroundColor: C.goldSoft,
    borderColor: C.gold,
    borderWidth: 1.5,
  },
  codeDigit: { fontSize: 23 },
  hiddenCodeInput: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    color: "transparent",
    backgroundColor: "transparent",
    fontSize: 1,
    opacity: 0.01,
  },
  resendRow: { minHeight: 45, justifyContent: "center" },
  changeNumber: { paddingVertical: 16 },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.blueSoft,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 7,
  },
  demoCode: { color: C.muted, marginTop: 12, lineHeight: 20 },
  profileAvatar: { alignItems: "center", marginTop: 8, marginBottom: 18 },
  avatarLabel: { marginTop: 10, color: C.navy },
  formField: { marginBottom: 16 },
  interestLabel: { color: C.muted, marginBottom: 11 },
  interestChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 14,
  },
  goalCard: {
    backgroundColor: C.goldSoft,
    borderRadius: 17,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  goalCaption: { color: C.muted, fontSize: 10, lineHeight: 17 },
});
