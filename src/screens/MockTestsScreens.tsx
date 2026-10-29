import React, { useEffect, useRef, useState } from "react";
import { Switch, View } from "react-native";
import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useApp } from "../state/AppContext";
import { useClassroom } from "../state/ClassroomContext";
import { useAppNavigation, type RootStackParamList } from "../navigation";
import type { MockDraft, MockQuestion } from "../state/classroom";
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
import {
  WorkspaceHeader,
  WorkspaceTabs,
  WORKSPACE,
} from "../components/ClassroomUI";
import { FilterSelect } from "../components/FilterControls";
import { Feedback, useAction } from "../components/feedback";
import { MockTestCards } from "../components/MockTestCards";
import { LocalizedPressable as Pressable } from "../i18n/native";
import { requireActorBackend } from "../services/backend";
import { createFileService, FileUploadError } from "../services/files";
import { pickMockDocument } from "../services/materials";
import { diagnostics } from "../data/learning";
import { C, font } from "../theme";
import { dateLabel } from "../state/domain";

const LETTERS = ["A", "B", "C", "D"];
type EditableQuestion = MockQuestion & { correct: number | null };
const blankQuestion = (): EditableQuestion => ({
  prompt: "",
  options: ["", "", "", ""],
  correct: null,
});
function AnswerButtons({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: number | null;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 7 }}>
      {LETTERS.map((letter, index) => (
        <Pressable
          key={letter}
          accessibilityRole="radio"
          accessibilityLabel={`${label}: ${letter}`}
          accessibilityState={{ checked: value === index, disabled }}
          disabled={disabled}
          onPress={() => onChange(index)}
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: value === index ? WORKSPACE : "#F3F4F8",
            borderWidth: 1,
            borderColor: value === index ? WORKSPACE : C.border,
          }}
        >
          <AppText variant="label" color={value === index ? "white" : C.muted}>
            {letter}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

export function UploadMockTestScreen({
  route,
}: {
  route: { params?: RootStackParamList["UploadMockTest"] };
}) {
  const { user, market, mode, refresh } = useApp(),
    classroom = useClassroom(),
    action = useAction(),
    navigation = useAppNavigation();
  const profile = market.tutorProfiles.find((p) => p.userId === user.id);
  const groups = market.offerings.filter((g) => g.tutorId === user.id);
  const bank = diagnostics.filter(
    (t) =>
      profile?.subjects.includes(t.subject) &&
      t.questions.every((q) => q.options.length === 4),
  );
  const [id, setId] = useState(() => route.params?.id || Crypto.randomUUID());
  const [source, setSource] = useState<MockDraft["source"]>("file"),
    [title, setTitle] = useState(""),
    [subject, setSubject] = useState(profile?.subjects[0] || ""),
    [group, setGroup] = useState(
      route.params?.offeringId || groups[0]?.id || "",
    ),
    [count, setCount] = useState("30"),
    [minutes, setMinutes] = useState("80"),
    [difficulty, setDifficulty] = useState<MockDraft["difficulty"]>("medium"),
    [scoring, setScoring] = useState<MockDraft["scoring"]>("dtm"),
    [keys, setKeys] = useState<(number | null)[]>(Array(50).fill(null)),
    [keysOpen, setKeysOpen] = useState(false),
    [manual, setManual] = useState<EditableQuestion[]>([blankQuestion()]),
    [catalog, setCatalog] = useState(bank[0]?.id || ""),
    [file, setFile] = useState<{
      id: string;
      name: string;
      group: string;
      ready: boolean;
    } | null>(null);
  const hydrated = useRef(""),
    identity = useRef(user.id);
  identity.current = user.id;
  const newTest = () => {
    setId(Crypto.randomUUID());
    setTitle("");
    setFile(null);
    setSource("file");
    setKeys(Array(50).fill(null));
    setKeysOpen(false);
    setManual([blankQuestion()]);
    setCount("30");
    setMinutes("80");
    setScoring("dtm");
    hydrated.current = route.params?.id || "";
  };
  const editing = classroom.data.tests.find((t) => t.id === id);
  const locked =
    action.busy || classroom.data.attempts.some((a) => a.testId === id);
  useEffect(() => {
    const wanted = route.params?.id;
    if (!wanted || !classroom.ready || hydrated.current === wanted) return;
    const test = classroom.data.tests.find(
      (t) => t.id === wanted && t.tutorId === user.id,
    );
    if (!test) return;
    hydrated.current = wanted;
    setId(test.id);
    setSource(test.source);
    setTitle(test.title);
    setSubject(test.subject);
    setGroup(test.offeringId);
    setCount(String(test.questionCount));
    setMinutes(String(test.minutes));
    setDifficulty(test.difficulty);
    setScoring(test.scoring);
    setKeys([...(test.answerKey || []), ...Array(50).fill(null)].slice(0, 50));
    if (test.source !== "file") {
      setSource("manual");
      setManual(
        test.questions.map((q, index) => ({
          ...q,
          correct: test.answerKey?.[index] ?? null,
        })),
      );
    }
    if (test.fileId)
      setFile({
        id: test.fileId,
        name:
          market.files?.find((f) => f.id === test.fileId)?.originalName ||
          "Yuklangan savollar fayli",
        group: test.offeringId,
        ready: true,
      });
  }, [
    route.params?.id,
    classroom.ready,
    classroom.data.tests,
    market.files,
    user.id,
  ]);
  useEffect(() => {
    if (!group && groups[0]) setGroup(groups[0].id);
    if (!subject && profile?.subjects[0]) setSubject(profile.subjects[0]);
    if (!catalog && bank[0]) setCatalog(bank[0].id);
  }, [
    groups[0]?.id,
    profile?.subjects[0],
    bank[0]?.id,
    group,
    subject,
    catalog,
  ]);
  const chosen = bank.find((t) => t.id === catalog);
  const questionCount =
    source === "manual"
      ? manual.length
      : source === "catalog"
        ? chosen?.questions.length || 0
        : Number(count);
  useEffect(() => {
    if (questionCount !== 30) setScoring("uniform");
  }, [questionCount]);
  const answerKey =
    source === "manual"
      ? manual.map((q) => q.correct)
      : source === "catalog"
        ? chosen?.questions.map((q) => q.correct) || []
        : keys.slice(0, Math.max(0, questionCount));
  const updateQuestion = (index: number, patch: Partial<EditableQuestion>) =>
    setManual((all) =>
      all.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  const save = (status: "draft" | "published") =>
    action.run(async () => {
      if (
        source === "file" &&
        status === "published" &&
        answerKey.some((a) => a === null)
      )
        setKeysOpen(true);
      const draft: MockDraft = {
        id,
        offeringId: group,
        title,
        subject,
        source,
        fileId:
          source === "file" && file?.group === group && file.ready
            ? file.id
            : null,
        questionCount,
        minutes: Number(minutes),
        difficulty,
        scoring,
        answerKey,
        status,
        questions:
          source === "manual"
            ? manual.map(({ prompt, options }) => ({ prompt, options }))
            : source === "catalog"
              ? chosen?.questions.map((q) => ({
                  prompt: q.text,
                  options: q.options,
                })) || []
              : [],
      };
      await classroom.saveTest(draft);
      await refresh();
      action.setSuccess(
        status === "published"
          ? "Test e’lon qilindi. Guruh o‘quvchilari ishlashi mumkin."
          : "Qoralama saqlandi.",
      );
    });
  const upload = () =>
    action.run(async () => {
      if (!group) throw new Error("Avval guruhni tanlang.");
      if (mode === "demo")
        throw new Error(
          "Haqiqiy PDF/DOCX yuklash Supabase rejimida ishlaydi. Sinovda qo‘lda test tuzishingiz mumkin.",
        );
      const owner = user.id,
        targetGroup = group,
        client = await requireActorBackend(owner),
        input = await pickMockDocument();
      if (!input) return;
      if (identity.current !== owner) throw new Error("Akkaunt o‘zgardi.");
      const service = createFileService(client);
      try {
        const asset = await service.upload({
          ...input,
          purpose: "material",
          offeringId: targetGroup,
        });
        if (identity.current === owner)
          setFile({
            id: asset.id,
            name: input.originalName,
            group: targetGroup,
            ready: true,
          });
      } catch (error) {
        if (
          error instanceof FileUploadError &&
          error.stage === "finalize" &&
          identity.current === owner
        )
          setFile({
            id: error.asset.id,
            name: input.originalName,
            group: targetGroup,
            ready: false,
          });
        if (error instanceof FileUploadError && error.stage === "upload")
          await service.remove(error.asset.id).catch(() => {});
        throw error;
      }
    });
  if (user.role !== "tutor")
    return (
      <Screen>
        <EmptyState
          title="Ustoz hisobiga kiring"
          subtitle="Testni tasdiqlangan ustoz yaratadi."
        />
      </Screen>
    );
  return (
    <Screen
      lightTop
      top={<WorkspaceHeader title="Test yuklash" back={!!route.params?.id} />}
      bottom={
        <View style={{ gap: 8 }}>
          <Feedback {...action} />
          <Button
            title={
              editing?.status === "published"
                ? "Testni yangilash"
                : "Testni e’lon qilish"
            }
            icon="send"
            disabled={
              locked ||
              !classroom.ready ||
              profile?.verification !== "approved" ||
              !groups.length
            }
            loading={action.busy}
            onPress={() => save("published")}
            style={{ backgroundColor: C.action }}
          />
          <Button
            title="Qoralama sifatida saqlash"
            icon="save"
            variant="soft"
            disabled={locked || !classroom.ready || !groups.length}
            onPress={() => save("draft")}
          />
        </View>
      }
    >
      <Card
        style={{ backgroundColor: C.primarySoft, borderColor: C.primaryBorder }}
      >
        <View style={uiStyles.row}>
          <View
            style={{
              padding: 10,
              borderRadius: 13,
              backgroundColor: WORKSPACE,
            }}
          >
            <Icon name="file-plus" color="white" size={23} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="heading">Yangi mock test yaratish</AppText>
            <AppText variant="caption" color={C.muted}>
              Fayl, savollar va javob kalitini tayyorlang
            </AppText>
          </View>
        </View>
      </Card>
      <WorkspaceTabs
        value={source}
        onChange={(value) => {
          if (!locked) {
            setSource(value);
            if (value === "catalog" && chosen) {
              setSubject(chosen.subject);
              setTitle((s) => s || chosen.title);
              setMinutes(String(chosen.minutes));
            }
          }
        }}
        items={[
          { value: "file", label: "Fayldan import", icon: "upload" },
          { value: "manual", label: "Qo‘lda kiritish", icon: "edit-3" },
          { value: "catalog", label: "O‘qi bazasi", icon: "database" },
        ]}
      />
      {source === "file" ? (
        <Card
          style={{
            borderStyle: "dashed",
            borderColor: C.primaryBorder,
            alignItems: "center",
            paddingVertical: 25,
          }}
        >
          <Icon name="upload-cloud" size={40} color={WORKSPACE} />
          <AppText variant="heading">PDF yoki Word faylni tanlang</AppText>
          <AppText
            variant="caption"
            color={C.muted}
            style={{ textAlign: "center" }}
          >
            Savollar faylini yuklang, to‘g‘ri javoblarni esa kalitda belgilang.
            PDF yoki DOCX · 20 MB gacha.
          </AppText>
          <Button
            title="Faylni tanlash"
            icon="folder"
            onPress={upload}
            disabled={locked || !group}
            loading={action.busy}
            style={{ backgroundColor: C.action, alignSelf: "stretch" }}
          />
          {file?.group === group ? (
            <View style={uiStyles.row}>
              <Icon
                name={file.ready ? "check-circle" : "clock"}
                color={C.green}
              />
              <AppText variant="caption" localize={false} style={{ flex: 1 }}>
                {file.name}
              </AppText>
              <Chip
                label={file.ready ? "Tayyor" : "Yakunlash kerak"}
                tone="green"
              />
            </View>
          ) : null}
          {file?.group === group && !file.ready ? (
            <Button
              title="Yuklashni yakunlash"
              variant="outline"
              disabled={locked}
              onPress={() =>
                action.run(async () => {
                  const client = await requireActorBackend(user.id);
                  await createFileService(client).finalize(file.id);
                  setFile({ ...file, ready: true });
                })
              }
            />
          ) : null}
        </Card>
      ) : null}
      {source === "manual" ? (
        <Card>
          <AppText variant="heading">Savollar konstruktori</AppText>
          <AppText variant="caption" color={C.muted}>
            Savol, to‘rtta variant va to‘g‘ri javobni kiriting.
          </AppText>
          {manual.map((q, index) => (
            <View
              key={index}
              style={{
                gap: 10,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
              }}
            >
              <Field
                label={`${index + 1}-savol matni`}
                multiline
                value={q.prompt}
                maxLength={2000}
                editable={!locked}
                onChangeText={(value) =>
                  updateQuestion(index, { prompt: value })
                }
              />
              {q.options.map((option, optionIndex) => (
                <Field
                  key={optionIndex}
                  label={`${index + 1}-savol ${LETTERS[optionIndex]} varianti`}
                  value={option}
                  maxLength={500}
                  editable={!locked}
                  onChangeText={(value) =>
                    updateQuestion(index, {
                      options: q.options.map((v, i) =>
                        i === optionIndex ? value : v,
                      ),
                    })
                  }
                />
              ))}
              <AppText variant="caption" color={C.muted}>
                To‘g‘ri javob
              </AppText>
              <AnswerButtons
                value={q.correct}
                label={`${index + 1}-savol kaliti`}
                disabled={locked}
                onChange={(correct) => updateQuestion(index, { correct })}
              />
              {manual.length > 1 ? (
                <Button
                  title={`${index + 1}-savolni olib tashlash`}
                  icon="trash-2"
                  variant="outline"
                  disabled={locked}
                  onPress={() =>
                    setManual((all) => all.filter((_, i) => i !== index))
                  }
                />
              ) : null}
            </View>
          ))}
          <Button
            title="Yana savol qo‘shish"
            icon="plus"
            variant="soft"
            disabled={locked || manual.length >= 50}
            onPress={() => setManual((all) => [...all, blankQuestion()])}
          />
        </Card>
      ) : null}
      {source === "catalog" ? (
        <Card style={{ backgroundColor: C.greenSoft }}>
          <AppText variant="heading">O‘qi diagnostika bazasi</AppText>
          <AppText variant="caption" color={C.muted}>
            {bank.length} ta profilingizga mos tayyor test.
          </AppText>
          {bank.length ? (
            <FilterSelect
              label="Bazadagi test"
              value={catalog}
              onChange={(value) => {
                setCatalog(value);
                const test = bank.find((t) => t.id === value);
                if (test) {
                  setTitle(test.title);
                  setSubject(test.subject);
                  setMinutes(String(test.minutes));
                }
              }}
              options={bank.map((t) => ({
                value: t.id,
                label: `${t.title} · ${t.questions.length} savol`,
              }))}
              disabled={locked}
            />
          ) : (
            <AppText color={C.muted}>
              Bu fan uchun tayyor test yo‘q. Qo‘lda savol kiriting.
            </AppText>
          )}
        </Card>
      ) : null}
      <Card>
        <View style={uiStyles.between}>
          <AppText variant="heading">Test parametrlari</AppText>
          <Chip
            label={scoring === "dtm" ? "DTM formati" : "Mock test"}
            tone="purple"
          />
        </View>
        <Field
          label="Test nomi"
          placeholder="Masalan, matematika — 1-blok mock"
          value={title}
          maxLength={150}
          editable={!locked}
          onChangeText={setTitle}
        />
        <FilterSelect
          label="Fan va yo‘nalish"
          value={subject}
          onChange={setSubject}
          disabled={locked || source === "catalog"}
          options={(profile?.subjects || []).map((s) => ({
            value: s,
            label: s,
          }))}
        />
        <FilterSelect
          label="Qaysi guruh uchun?"
          value={group}
          onChange={(value) => {
            if (!editing) setGroup(value);
          }}
          disabled={locked || !!editing}
          options={groups.map((g) => ({ value: g.id, label: g.title }))}
        />
        <View style={uiStyles.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Savollar soni"
              keyboardType="number-pad"
              value={source === "file" ? count : String(questionCount)}
              editable={!locked && source === "file"}
              onChangeText={setCount}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Test vaqti (daqiqa)"
              keyboardType="number-pad"
              value={minutes}
              editable={!locked}
              onChangeText={setMinutes}
            />
          </View>
        </View>
        <AppText variant="caption" color={C.muted}>
          Murakkablik darajasi
        </AppText>
        <View style={uiStyles.wrap}>
          {[
            { id: "easy", name: "Oson" },
            { id: "medium", name: "O‘rta" },
            { id: "advanced", name: "Milliy sertifikat" },
          ].map((d) => (
            <Chip
              key={d.id}
              label={d.name}
              selected={difficulty === d.id}
              onPress={
                locked
                  ? undefined
                  : () => setDifficulty(d.id as MockDraft["difficulty"])
              }
            />
          ))}
        </View>
        <AppText variant="caption" color={C.muted}>
          Ball hisoblash tizimi
        </AppText>
        <View style={uiStyles.wrap}>
          <Chip
            label="Har savolga 1 ball"
            selected={scoring === "uniform"}
            onPress={locked ? undefined : () => setScoring("uniform")}
          />
          {questionCount === 30 ? (
            <Chip
              label="DTM standart"
              selected={scoring === "dtm"}
              onPress={locked ? undefined : () => setScoring("dtm")}
            />
          ) : null}
        </View>
        {scoring === "dtm" ? (
          <View style={uiStyles.row}>
            {["1–10 · 1.1 ball", "11–20 · 2.1 ball", "21–30 · 3.1 ball"].map(
              (text) => (
                <View
                  key={text}
                  style={{
                    flex: 1,
                    backgroundColor: C.primarySoft,
                    borderRadius: 10,
                    padding: 8,
                  }}
                >
                  <AppText
                    variant="caption"
                    color={WORKSPACE}
                    style={{ textAlign: "center" }}
                  >
                    {text}
                  </AppText>
                </View>
              ),
            )}
          </View>
        ) : null}
      </Card>
      {source === "file" ? (
        <Card>
          <Button
            title={`Javob kalitini kiritish · ${answerKey.filter((a) => a !== null).length}/${Math.max(0, questionCount)}`}
            icon="key"
            variant="soft"
            onPress={() => setKeysOpen((v) => !v)}
          />
          {keysOpen ? (
            Array.from(
              { length: Math.max(0, Math.min(50, questionCount || 0)) },
              (_, i) => (
                <View
                  key={i}
                  style={[uiStyles.row, { justifyContent: "space-between" }]}
                >
                  <AppText variant="label">{i + 1}.</AppText>
                  <AnswerButtons
                    value={keys[i]}
                    label={`${i + 1}-savol kaliti`}
                    disabled={locked}
                    onChange={(value) =>
                      setKeys((old) =>
                        old.map((v, at) => (at === i ? value : v)),
                      )
                    }
                  />
                </View>
              ),
            )
          ) : (
            <AppText variant="caption" color={C.muted}>
              E’lon qilishdan oldin barcha javoblarni belgilang. Javob kaliti
              o‘quvchilarga ko‘rsatilmaydi.
            </AppText>
          )}
        </Card>
      ) : null}
      {locked && !action.busy ? (
        <AppText color={C.muted}>
          Ishlash boshlangan testni o‘zgartirib bo‘lmaydi.
        </AppText>
      ) : null}
      {!groups.length ? (
        <EmptyState
          title="Avval guruh yarating"
          subtitle="Test o‘z guruhingizdagi o‘quvchilar uchun yaratiladi."
          icon="users"
        />
      ) : null}
      <View style={uiStyles.between}>
        <AppText variant="heading">So‘nggi testlar</AppText>
        <Button
          title="Diagnostika yuborish"
          icon="target"
          variant="soft"
          onPress={() =>
            navigation.navigate(
              "AssignDiagnostic",
              group ? { offeringId: group } : undefined,
            )
          }
        />
      </View>
      {editing ? (
        <Button
          title="Yangi test yaratish"
          icon="plus"
          variant="outline"
          onPress={newTest}
          disabled={action.busy}
        />
      ) : null}
      <MockTestCards heading={false} />
      <Feedback error={classroom.error} />
    </Screen>
  );
}

export function MockTestScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "MockTest">) {
  const { user, market } = useApp(),
    classroom = useClassroom(),
    navigation = useAppNavigation(),
    action = useAction();
  const test = classroom.data.tests.find((t) => t.id === route.params.id),
    owner = test?.tutorId === user.id;
  const attempt = classroom.data.attempts.find(
    (a) => a.testId === test?.id && a.studentId === user.id,
  );
  const [answers, setAnswers] = useState<(number | null)[]>([]),
    [hydrated, setHydrated] = useState(""),
    [seconds, setSeconds] = useState(0),
    [confirm, setConfirm] = useState(false),
    [draftError, setDraftError] = useState("");
  const auto = useRef(false),
    latest = useRef({ classroom, answers });
  latest.current = { classroom, answers };
  const key = attempt ? `@oqi/mock-draft:${user.id}:${attempt.id}` : "";
  useEffect(() => {
    let active = true;
    auto.current = false;
    if (!attempt || !test || owner) return;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (!active) return;
        let saved: (number | null)[] = Array(test.questionCount).fill(null);
        try {
          const parsed = raw ? JSON.parse(raw) : null;
          if (
            Array.isArray(parsed) &&
            parsed.length === test.questionCount &&
            parsed.every(
              (a) => a === null || (Number.isInteger(a) && a >= 0 && a <= 3),
            )
          )
            saved = parsed;
        } catch {
          /* Invalid local drafts are not submitted. */
        }
        setAnswers(attempt.answers || saved);
        setHydrated(attempt.id);
      })
      .catch(() => {
        if (active) {
          setAnswers(Array(test.questionCount).fill(null));
          setHydrated(attempt.id);
          setDraftError("Javoblarni qurilmada saqlab bo‘lmadi.");
        }
      });
    return () => {
      active = false;
    };
  }, [attempt?.id, test?.id, key, owner]);
  useEffect(() => {
    if (!key || !attempt || attempt.completedAt || hydrated !== attempt.id)
      return;
    const timer = setTimeout(() => {
      void AsyncStorage.setItem(key, JSON.stringify(answers)).catch(() =>
        setDraftError("Javoblarni qurilmada saqlab bo‘lmadi."),
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [answers, key, attempt?.completedAt, hydrated]);
  useEffect(() => {
    if (!test || !attempt || attempt.completedAt || hydrated !== attempt.id)
      return;
    const update = () => {
      const value = Math.max(
        0,
        Math.ceil(
          (Date.parse(attempt.startedAt) + test.minutes * 60000 - Date.now()) /
            1000,
        ),
      );
      setSeconds(value);
      if (value === 0 && !auto.current) {
        auto.current = true;
        void action.run(async () => {
          await latest.current.classroom.submitTest(
            test.id,
            latest.current.answers,
          );
          await AsyncStorage.removeItem(key);
        });
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [test?.id, attempt?.id, attempt?.completedAt, hydrated, key]);
  if (!test)
    return (
      <Screen lightTop top={<WorkspaceHeader title="Mock test" back />}>
        <EmptyState
          title={classroom.ready ? "Test topilmadi" : "Test yuklanmoqda"}
          subtitle="Test faqat guruhning faol o‘quvchilariga ochiq."
        />
        <Feedback error={classroom.error} />
      </Screen>
    );
  const results = classroom.data.attempts.filter(
    (a) => a.testId === test.id && a.completedAt,
  );
  const answered = answers.filter((a) => a !== null).length;
  return (
    <Screen
      lightTop
      top={<WorkspaceHeader title="Mock test" back />}
      bottom={
        !owner && attempt && !attempt.completedAt ? (
          <>
            <Feedback error={action.error || draftError} />
            <Button
              title="Testni yakunlash"
              icon="check"
              disabled={action.busy || hydrated !== attempt.id}
              onPress={() => setConfirm(true)}
            />
            {confirm ? (
              <Card>
                <AppText>
                  {test.questionCount - answered} ta savol javobsiz. Natijani
                  yuborasizmi?
                </AppText>
                <Button
                  title="Javoblarni yuborishni tasdiqlash"
                  loading={action.busy}
                  onPress={() =>
                    action.run(async () => {
                      await classroom.submitTest(test.id, answers);
                      await AsyncStorage.removeItem(key);
                      setConfirm(false);
                    })
                  }
                />
                <Button
                  title="Davom etish"
                  variant="outline"
                  disabled={action.busy}
                  onPress={() => setConfirm(false)}
                />
              </Card>
            ) : null}
          </>
        ) : undefined
      }
    >
      <Card
        style={{ backgroundColor: C.primarySoft, borderColor: C.primaryBorder }}
      >
        <AppText variant="title" localize={false}>
          {test.title}
        </AppText>
        <AppText color={C.muted}>
          {test.subject} · {test.questionCount} savol · {test.minutes} daqiqa
        </AppText>
        {attempt && !attempt.completedAt && !owner ? (
          <Chip
            label={`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} qoldi`}
            tone={seconds < 60 ? "gold" : "purple"}
          />
        ) : null}
      </Card>
      {test.fileId ? (
        <Button
          title="Savollar faylini ochish"
          icon="file-text"
          variant="outline"
          onPress={() =>
            navigation.navigate("MaterialViewer", {
              fileId: test.fileId!,
              title: test.title,
            })
          }
        />
      ) : null}
      {owner ? (
        <>
          <AppText variant="heading">Topshirganlar · {results.length}</AppText>
          {results.map((result) => (
            <Card key={result.id}>
              <AppText variant="heading">
                {market.users.find((u) => u.id === result.studentId)?.name ||
                  "O‘quvchi"}{" "}
                · {result.percentage}% · {result.correctCount}/
                {test.questionCount}
              </AppText>
              <AppText variant="caption" color={C.muted}>
                {dateLabel(result.completedAt!)}
              </AppText>
              <Button
                title="O‘quvchi tahlilini ochish"
                variant="soft"
                onPress={() =>
                  navigation.navigate("TeacherStudentDetail", {
                    id: result.studentId,
                    groupId: test.offeringId,
                  })
                }
              />
            </Card>
          ))}
          {!results.length ? (
            <EmptyState
              title="Hali topshirilmagan"
              subtitle="Guruh o‘quvchilari testni ishlagach natijalar shu yerda ko‘rinadi."
              icon="bar-chart-2"
            />
          ) : null}
          <Button
            title="Testni tahrirlash"
            variant="outline"
            disabled={classroom.data.attempts.some((a) => a.testId === test.id)}
            onPress={() =>
              navigation.navigate("UploadMockTest", { id: test.id })
            }
          />
        </>
      ) : attempt?.completedAt ? (
        <Card>
          <Icon name="award" size={40} color={C.green} />
          <AppText variant="display" color={C.green}>
            {attempt.percentage}%
          </AppText>
          <AppText variant="heading">
            {attempt.correctCount}/{test.questionCount} to‘g‘ri javob
          </AppText>
          <AppText>
            {attempt.score} / {attempt.maxScore} ball
          </AppText>
          <AppText color={C.muted}>
            Natija ustozingizning tahlil panelida ko‘rinadi.
          </AppText>
        </Card>
      ) : !attempt ? (
        <Card>
          <AppText variant="heading">Tayyor bo‘lsangiz boshlang</AppText>
          <AppText color={C.muted}>
            Vaqt boshlash tugmasi bosilgach hisoblanadi. Qayta ochilganda vaqt
            yangidan boshlanmaydi.
          </AppText>
          <Button
            title="Testni boshlash"
            icon="play"
            loading={action.busy}
            onPress={() => action.run(() => classroom.beginTest(test.id))}
            style={{ backgroundColor: C.action }}
          />
          <Feedback {...action} />
        </Card>
      ) : (
        <>
          <AppText variant="label">
            Belgilangan: {answered}/{test.questionCount}
          </AppText>
          {Array.from({ length: test.questionCount }, (_, index) => (
            <Card key={index}>
              <AppText variant="heading">{index + 1}-savol</AppText>
              {test.questions[index] ? (
                <>
                  <AppText localize={false}>
                    {test.questions[index].prompt}
                  </AppText>
                  {test.questions[index].options.map((option, i) => (
                    <Pressable
                      key={i}
                      accessibilityRole="radio"
                      accessibilityLabel={`${index + 1}-savol: ${LETTERS[i]}`}
                      accessibilityState={{
                        checked: answers[index] === i,
                        disabled: action.busy || hydrated !== attempt.id,
                      }}
                      disabled={action.busy || hydrated !== attempt.id}
                      onPress={() =>
                        setAnswers((all) =>
                          all.map((a, at) => (at === index ? i : a)),
                        )
                      }
                      style={{
                        borderWidth: 1,
                        borderColor:
                          answers[index] === i ? WORKSPACE : C.border,
                        backgroundColor:
                          answers[index] === i ? C.primarySoft : "white",
                        padding: 13,
                        borderRadius: 12,
                      }}
                    >
                      <AppText localize={false}>
                        {LETTERS[i]}. {option}
                      </AppText>
                    </Pressable>
                  ))}
                </>
              ) : (
                <AnswerButtons
                  value={answers[index] ?? null}
                  label={`${index + 1}-savol`}
                  disabled={action.busy || hydrated !== attempt.id}
                  onChange={(value) =>
                    setAnswers((all) =>
                      all.map((a, at) => (at === index ? value : a)),
                    )
                  }
                />
              )}
            </Card>
          ))}
        </>
      )}
      <Feedback error={classroom.error} />
    </Screen>
  );
}
