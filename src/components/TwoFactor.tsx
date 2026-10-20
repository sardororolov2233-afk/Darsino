import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, View } from "react-native";
import { AppText, Button, Card, Field, Header, Screen } from "./ui";
import { Feedback, useAction } from "./feedback";
import { QRCode } from "./QRCode";
import { backendMode, requireBackend, supabase } from "../services/backend";
import { C } from "../theme";
import { useI18n } from "../i18n";

type Factor = { id: string; friendly_name?: string; status: string };
export function TwoFactorPanel() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollment, setEnrollment] = useState<{ id: string; uri: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [remove, setRemove] = useState<string | null>(null);
  const action = useAction(), { t } = useI18n();
  const draft = useRef<string | null>(null);
  const reload = async () => {
    const { data, error } = await requireBackend().auth.mfa.listFactors();
    if (error) throw error;
    setFactors(data.totp.filter((f) => f.status === "verified"));
  };
  useEffect(() => {
    if (backendMode === "demo") return;
    void action.run(reload);
    return () => {
      const id = draft.current;
      if (id) void requireBackend().auth.mfa.unenroll({ factorId: id }).catch(() => {});
    };
  }, []);
  if (backendMode === "demo") return <Card>
    <AppText variant="heading">Ikki bosqichli tasdiqlash</AppText>
    <AppText color={C.muted}>Bu imkoniyat jonli akkauntda ishlaydi.</AppText>
  </Card>;
  return <Card>
    <AppText variant="heading">Ikki bosqichli tasdiqlash</AppText>
    <AppText color={C.muted}>Authenticator ilovasidagi bir martalik kod akkauntingizni himoya qiladi.</AppText>
    {factors.length ? factors.map((factor) => <View key={factor.id} style={{ gap: 8 }}>
      <AppText variant="label" color={C.green}>Himoya yoqilgan</AppText>
      <Button title="Ikki bosqichli himoyani o‘chirish" variant="outline" disabled={action.busy}
        onPress={() => setRemove(factor.id)} />
    </View>) : enrollment ? <>
      <View style={{ alignItems: "center", backgroundColor: C.white }}>
        <QRCode value={enrollment.uri} label={t("Authenticator QR kodi")} />
      </View>
      <AppText variant="caption" color={C.muted}>QR kodni Authenticator ilovasida oching yoki kalitni qo‘lda kiriting.</AppText>
      <AppText selectable localize={false}>{enrollment.secret}</AppText>
      <Field label="6 xonali kod" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
        keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />
      <Button title="Himoyani yoqish" loading={action.busy} disabled={code.length !== 6}
        onPress={() => action.run(async () => {
          const { error } = await requireBackend().auth.mfa.challengeAndVerify({ factorId: enrollment.id, code });
          if (error) throw error;
          draft.current = null; setEnrollment(null); setCode(""); await reload();
        }, () => action.setSuccess("Ikki bosqichli himoya yoqildi."))} />
      <Button title="Bekor qilish" variant="outline" disabled={action.busy}
        onPress={() => action.run(async () => {
          const { error } = await requireBackend().auth.mfa.unenroll({ factorId: enrollment.id });
          if (error) throw error;
          draft.current = null; setEnrollment(null); setCode("");
        })} />
    </> : <Button title="Ikki bosqichli himoyani sozlash" icon="shield" loading={action.busy}
      onPress={() => action.run(async () => {
        const { data, error } = await requireBackend().auth.mfa.enroll({ factorType: "totp", friendlyName: "O‘qi Authenticator" });
        if (error) throw error;
        draft.current = data.id;
        setEnrollment({ id: data.id, uri: data.totp.uri, secret: data.totp.secret });
      })} />}
    {remove ? <Card style={{ backgroundColor: C.errorSoft }}>
      <AppText>Himoyani o‘chirishni tasdiqlaysizmi?</AppText>
      <Button title="O‘chirishni tasdiqlash" loading={action.busy}
        onPress={() => action.run(async () => {
          const { error } = await requireBackend().auth.mfa.unenroll({ factorId: remove });
          if (error) throw error;
          setRemove(null); await reload();
        }, () => action.setSuccess("Ikki bosqichli himoya o‘chirildi."))} />
      <Button title="Bekor qilish" variant="outline" onPress={() => setRemove(null)} />
    </Card> : null}
    <Feedback {...action} />
  </Card>;
}

// This boundary is outside the authenticated app UI, so AAL1 cannot open a private screen.
export function MfaGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ ready: boolean; required: boolean; factorId: string; error: string }>({
    ready: !supabase, required: false, factorId: "", error: "",
  });
  const [code, setCode] = useState("");
  const action = useAction();
  useEffect(() => {
    if (!supabase) return;
    let active = true, generation = 0;
    const inspect = async () => {
      const current = ++generation;
      try {
        const { data: sessionData, error: sessionError } = await supabase!.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) {
          if (active && current === generation) setState({ ready: true, required: false, factorId: "", error: "" });
          return;
        }
        const { data, error } = await supabase!.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw error;
        const required = data.nextLevel === "aal2" && data.currentLevel !== "aal2";
        let factorId = "";
        if (required) {
          const factors = await supabase!.auth.mfa.listFactors();
          if (factors.error) throw factors.error;
          factorId = factors.data.totp.find((f) => f.status === "verified")?.id || "";
          if (!factorId) throw new Error("Tasdiqlash vositasi topilmadi. Support bilan bog‘laning.");
        }
        if (active && current === generation) setState({ ready: true, required, factorId, error: "" });
      } catch (e) {
        if (active && current === generation) setState({ ready: true, required: true, factorId: "", error: e instanceof Error ? e.message : "Sessiyani tekshirib bo‘lmadi." });
      }
    };
    void inspect();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const { data } = supabase.auth.onAuthStateChange(() => {
      const timer = setTimeout(() => { timers.delete(timer); if (active) void inspect(); }, 0);
      timers.add(timer);
    });
    return () => { active = false; generation++; for (const timer of timers) clearTimeout(timer); data.subscription.unsubscribe(); };
  }, []);
  if (!state.ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></View>;
  if (!state.required) return <>{children}</>;
  return <Screen>
    <Header title="Ikki bosqichli tasdiqlash" />
    <Card>
      <AppText>Davom etish uchun Authenticator ilovasidagi kodni kiriting.</AppText>
      <Field label="6 xonali kod" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
        keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />
      <Button title="Tasdiqlash" loading={action.busy} disabled={code.length !== 6 || !state.factorId}
        onPress={() => action.run(async () => {
          const { error } = await requireBackend().auth.mfa.challengeAndVerify({ factorId: state.factorId, code });
          if (error) throw error;
          setCode(""); setState({ ready: true, required: false, factorId: "", error: "" });
        })} />
      <Feedback error={state.error || action.error} />
      <Button title="Hisobdan chiqish" variant="outline" loading={action.busy}
        onPress={() => action.run(async () => {
          const { error } = await requireBackend().auth.signOut({ scope: "local" });
          if (error) throw error;
        })} />
      <Button title="Telegram orqali yordam" variant="soft" icon="send"
        onPress={() => action.run(async () => { await Linking.openURL("https://t.me/sardorbekuralov"); })} />
    </Card>
  </Screen>;
}
