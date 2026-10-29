import React, { useRef, useState } from "react";
import { View } from "react-native";
import * as Crypto from "expo-crypto";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppNavigation, type RootStackParamList } from "../navigation";
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
import {
  FilterOptions,
  FilterSelect,
  filterChoices,
} from "../components/FilterControls";
import { CalendarField, TimeField } from "../components/ScheduleFields";
import { useApp } from "../state/AppContext";
import { useHomework } from "../state/HomeworkContext";
import {
  assignmentStatus,
  latestSubmission,
  HOMEWORK_LIMIT,
  HOMEWORK_MIME,
  type AssignmentDraft,
  type Assignment,
  type Submission,
} from "../state/homework";
import { dateLabel, timeLabel, localDate, toLessonTime } from "../state/domain";
import { pickMaterial } from "../services/materials";
import { C } from "../theme";
export function HomeworkSync() {
  const h = useHomework(),
    action = useAction();
  return (
    <View style={{ gap: 8 }}>
      {!h.ready && !h.error ? (
        <AppText color={C.muted}>Vazifalar yuklanmoqda…</AppText>
      ) : null}
      {h.offline ? (
        <Card style={{ backgroundColor: C.goldSoft }}>
          <AppText variant="label">Saqlangan nusxa ko‘rsatilmoqda</AppText>
          <AppText variant="caption" color={C.muted}>
            Yangilanish va javob topshirish uchun internetga ulaning.
          </AppText>
        </Card>
      ) : null}
      <Feedback error={action.error || h.error} />
      {h.error ? (
        <Button
          title="Vazifalarni qayta yuklash"
          variant="soft"
          loading={action.busy}
          onPress={() => action.run(h.refresh)}
        />
      ) : null}
    </View>
  );
}
export function HomeworkCards({ offeringId }: { offeringId?: string }) {
  const h = useHomework(),
    { user } = useApp(),
    nav = useAppNavigation();
  const rows = h.data.assignments.filter(
    (a) => !offeringId || a.offeringId === offeringId,
  );
  return (
    <View style={{ gap: 12 }}>
      <HomeworkSync />
      {user.role === "tutor" ? (
        <Button
          title="Uy vazifasi berish"
          icon="plus"
          onPress={() => nav.navigate("CreateAssignment", { offeringId })}
        />
      ) : null}
      {rows.map((a) => {
        const s = latestSubmission(h.data.submissions, a.id, user.id);
        const replies = h.data.submissions.filter(
          (s) => s.assignmentId === a.id,
        );
        return (
          <Card
            key={a.id}
            onPress={() => nav.navigate("AssignmentDetail", { id: a.id })}
            accessibilityLabel={`${a.title}: vazifani ochish`}
          >
            <View style={uiStyles.between}>
              <Chip label={a.subject} tone="green" />
              <Chip label={assignmentStatus(a, s)} />
            </View>
            <AppText variant="heading" localize={false}>
              {a.title}
            </AppText>
            <AppText variant="caption" color={C.muted}>
              Muddat: {dateLabel(a.dueAt)} · {timeLabel(a.dueAt)}
            </AppText>
            {user.role === "tutor" ? (
              <AppText variant="caption" color={C.primary}>
                {new Set(replies.map((s) => s.studentId)).size} nafar topshirgan
                · {replies.filter((s) => s.status === "submitted").length} ta
                tekshiruvda
              </AppText>
            ) : null}
          </Card>
        );
      })}
      {h.ready && !rows.length ? (
        <EmptyState
          title="Uy vazifalari hali yo‘q"
          subtitle={
            user.role === "tutor"
              ? "Guruh yoki alohida o‘quvchi uchun birinchi vazifani bering."
              : "Ustoz e’lon qilgan vazifalar shu yerda ko‘rinadi."
          }
          icon="edit-3"
        />
      ) : null}
    </View>
  );
}
export function AssignmentsScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Assignments">) {
  const nav = useAppNavigation(),
    h = useHomework(),
    { user } = useApp();
  const cleanup = useAction();
  const [filter, setFilter] = useState("Barchasi");
  const groups = new Set(
    h.data.assignments
      .filter((a) => {
        const s = latestSubmission(h.data.submissions, a.id, user.id);
        return (
          filter === "Barchasi" ||
          (filter === "Bajarish kerak" &&
            a.status === "published" &&
            (!s || s.status === "changes_requested")) ||
          (filter === "Tekshiruvda" &&
            h.data.submissions.some(
              (s) => s.assignmentId === a.id && s.status === "submitted",
            )) ||
          (filter === "Qabul qilindi" && s?.status === "accepted")
        );
      })
      .map((a) => a.id),
  );
  return (
    <Screen>
      <Header title="Uy vazifalari" onBack={() => nav.goBack()} />
      <AppText color={C.muted}>
        Vazifani ko‘ring, javob topshiring va ustoz fikrini kuzating.
      </AppText>
      <FilterOptions
        label="Vazifa holati"
        options={filterChoices([
          "Barchasi",
          "Bajarish kerak",
          "Tekshiruvda",
          "Qabul qilindi",
        ])}
        value={filter}
        onChange={setFilter}
      />
      {filter === "Barchasi" ? (
        <HomeworkCards offeringId={route.params?.offeringId} />
      ) : (
        <>
          <HomeworkSync />
          {h.data.assignments
            .filter(
              (a) =>
                groups.has(a.id) &&
                (!route.params?.offeringId ||
                  a.offeringId === route.params.offeringId),
            )
            .map((a) => (
              <Card
                key={a.id}
                onPress={() => nav.navigate("AssignmentDetail", { id: a.id })}
                accessibilityLabel={`${a.title}: vazifani ochish`}
              >
                <AppText variant="heading">{a.title}</AppText>
                <AppText variant="caption" color={C.muted}>
                  {dateLabel(a.dueAt)} · {timeLabel(a.dueAt)}
                </AppText>
              </Card>
            ))}
          {!groups.size ? (
            <EmptyState
              title="Bu holatda vazifa yo‘q"
              subtitle="Boshqa filtrni tanlang."
            />
          ) : null}
        </>
      )}
      {h.data.files
        .filter(
          (f) =>
            f.ownerId === user.id &&
            f.state !== "deleted" &&
            !h.data.assignments.some((a) => a.fileIds.includes(f.id)) &&
            !h.data.submissions.some((a) => a.fileIds.includes(f.id)),
        )
        .map((f) => (
          <Card key={f.id}>
            <AppText variant="label">Biriktirilmagan fayl</AppText>
            <AppText localize={false}>{f.name}</AppText>
            <Button
              title="Biriktirilmagan faylni o‘chirish"
              variant="outline"
              loading={cleanup.busy}
              onPress={() => cleanup.run(() => h.removeFile(f.id))}
            />
          </Card>
        ))}
      <Feedback {...cleanup} />
    </Screen>
  );
}
function HomeworkUploadRecovery({
  assignmentId,
  scope,
  onUploaded,
}: {
  assignmentId: string;
  scope: "task" | "answer";
  onUploaded: (id: string) => void;
}) {
  const h = useHomework(),
    action = useAction();
  if (
    h.pendingUpload?.assignmentId !== assignmentId ||
    h.pendingUpload.scope !== scope
  )
    return null;
  return (
    <Card style={{ backgroundColor: C.errorSoft }}>
      <AppText variant="label">Fayl yuklash tugamadi</AppText>
      <AppText localize={false}>{h.pendingUpload.name}</AppText>
      <Button
        title="Fayl yuklashni davom ettirish"
        icon="refresh-cw"
        loading={action.busy}
        onPress={() => action.run(h.retryUpload, (f) => onUploaded(f.id))}
      />
      <Button
        title="Yuklashni bekor qilish"
        variant="outline"
        loading={action.busy}
        onPress={() => action.run(() => h.removeFile(h.pendingUpload!.id))}
      />
      <Feedback {...action} />
    </Card>
  );
}
function FileButtons({
  ids,
  onRemove,
}: {
  ids: string[];
  onRemove?: (id: string) => void;
}) {
  const h = useHomework(),
    action = useAction();
  return (
    <View style={{ gap: 8 }}>
      {ids.map((id) => {
        const f = h.data.files.find((f) => f.id === id);
        return (
          <View key={id} style={uiStyles.row}>
            <Button
              title={f?.name || "Biriktirilgan fayl"}
              icon="file-text"
              variant="soft"
              loading={action.busy}
              style={{ flex: 1 }}
              onPress={() => action.run(() => h.openFile(id))}
            />
            {onRemove ? (
              <Button
                title=""
                accessibilityLabel={`${f?.name || "Fayl"}ni olib tashlash`}
                icon="x"
                variant="outline"
                onPress={() => onRemove(id)}
              />
            ) : null}
          </View>
        );
      })}
      <Feedback {...action} />
    </View>
  );
}
export function CreateAssignmentScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "CreateAssignment">) {
  const nav = useAppNavigation(),
    h = useHomework(),
    { market, user } = useApp(),
    action = useAction();
  const groups = market.offerings.filter((g) => g.tutorId === user.id);
  const existing = h.data.assignments.find((a) => a.id === route.params?.id),
    id = useRef(existing?.id || Crypto.randomUUID());
  const [group, setGroup] = useState(
      existing?.offeringId || route.params?.offeringId || groups[0]?.id || "",
    ),
    [title, setTitle] = useState(existing?.title || ""),
    [description, setDescription] = useState(existing?.description || "");
  const [date, setDate] = useState(
      existing
        ? localDate(new Date(existing.dueAt))
        : localDate(new Date(Date.now() + 86400000)),
    ),
    [time, setTime] = useState(existing ? timeLabel(existing.dueAt) : "18:00"),
    [recipient, setRecipient] = useState(existing?.recipientIds[0] || "all"),
    [files, setFiles] = useState(existing?.fileIds || []);
  const revision = useRef(existing?.revision || 0),
    [saved, setSaved] = useState(!!existing);
  const offering = groups.find((g) => g.id === group);
  const students = market.enrollments
    .filter((e) => e.offeringId === group && e.active)
    .map((e) => market.users.find((u) => u.id === e.studentId))
    .filter((u) => !!u);
  const draft = (status: "draft" | "published"): AssignmentDraft => ({
    id: id.current,
    offeringId: group,
    subject: offering?.subject || "",
    title,
    description,
    dueAt: toLessonTime(date, time).startsAt,
    recipientIds: recipient === "all" ? [] : [recipient],
    fileIds: files,
    revision: revision.current,
    status,
  });
  const save = async (status: "draft" | "published") => {
    const payload = draft(status);
    revision.current = await h.save(payload);
    setSaved(true);
    return id.current;
  };
  if (!offering)
    return (
      <Screen>
        <Header title="Uy vazifasi" onBack={() => nav.goBack()} />
        <EmptyState
          title="Avval guruh yarating"
          subtitle="Vazifa o‘zingiz boshqaradigan guruhga biriktiriladi."
        />
      </Screen>
    );
  return (
    <Screen>
      <Header title="Uy vazifasi berish" onBack={() => nav.goBack()} />
      <HomeworkSync />
      <FilterSelect
        label="Vazifa guruhi"
        value={group}
        disabled={saved || action.busy}
        options={groups.map((g) => ({ value: g.id, label: g.title }))}
        onChange={(v) => {
          setGroup(v);
          setRecipient("all");
        }}
      />
      <Field
        label="Vazifa sarlavhasi"
        value={title}
        onChangeText={setTitle}
        maxLength={150}
        editable={!action.busy}
      />
      <Field
        label="Vazifa tavsifi"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={10000}
        editable={!action.busy}
      />
      <Chip label={offering.subject} tone="green" />
      <FilterSelect
        label="Vazifa kimga beriladi"
        value={recipient}
        disabled={action.busy}
        options={[
          { value: "all", label: "Butun guruh" },
          ...students.map((u) => ({ value: u!.id, label: u!.name })),
        ]}
        onChange={setRecipient}
      />
      <CalendarField
        label="Vazifa muddati (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />
      <TimeField
        label="Topshirish vaqti (HH:MM)"
        value={time}
        onChangeText={setTime}
      />
      <HomeworkUploadRecovery
        assignmentId={id.current}
        scope="task"
        onUploaded={(file) => setFiles((old) => [...new Set([...old, file])])}
      />
      <FileButtons
        ids={files}
        onRemove={(file) => {
          void action.run(async () => {
            const remaining = files.filter((f) => f !== file);
            revision.current = await h.save({
              ...draft("draft"),
              fileIds: remaining,
            });
            await h.removeFile(file);
            setFiles(remaining);
          });
        }}
      />

      <AppText variant="caption" color={C.muted}>
        PDF yoki rasm · 10 MB gacha · 5 tagacha fayl. Fayl yuklashdan oldin
        vazifa qoralamasi saqlanadi.
      </AppText>
      <Button
        title="Vazifaga fayl biriktirish"
        icon="paperclip"
        variant="outline"
        loading={action.busy}
        disabled={files.length >= 5}
        onPress={() =>
          action.run(async () => {
            const input = await pickMaterial(HOMEWORK_MIME, HOMEWORK_LIMIT);
            if (!input) return;
            await save("draft");
            const file = await h.upload(id.current, "task", input);
            setFiles((old) => [...old, file.id]);
          })
        }
      />
      <Feedback {...action} />
      <Button
        title="Vazifani e’lon qilish"
        icon="send"
        loading={action.busy}
        disabled={!h.ready}
        onPress={() =>
          action.run(
            () => save("published"),
            (id) => nav.replace("AssignmentDetail", { id }),
          )
        }
      />
      <Button
        title="Vazifa qoralamasini saqlash"
        variant="soft"
        loading={action.busy}
        onPress={() =>
          action.run(
            () => save("draft"),
            () => action.setSuccess("Qoralama saqlandi."),
          )
        }
      />
    </Screen>
  );
}
function ReviewCard({
  submission,
  a,
}: {
  submission: Submission;
  a: Assignment;
}) {
  const h = useHomework(),
    { market } = useApp(),
    action = useAction(),
    [feedback, setFeedback] = useState(submission.feedback);
  return (
    <Card>
      <View style={uiStyles.between}>
        <AppText variant="label">
          {market.users.find((u) => u.id === submission.studentId)?.name ||
            "O‘quvchi"}
        </AppText>
        <Chip label={`${submission.version}-urinish`} />
      </View>
      <AppText variant="caption" color={C.muted}>
        {dateLabel(submission.submittedAt)} ·{" "}
        {timeLabel(submission.submittedAt)}
        {Date.parse(submission.submittedAt) > Date.parse(a.dueAt)
          ? " · kech topshirilgan"
          : ""}
      </AppText>
      <AppText localize={false}>{submission.content}</AppText>
      <FileButtons ids={submission.fileIds} />
      <Chip label={assignmentStatus(a, submission)} tone="green" />
      {submission.status === "submitted" ? (
        <>
          <Field
            label="Ustoz izohi"
            multiline
            value={feedback}
            onChangeText={setFeedback}
            maxLength={5000}
          />
          <Button
            title="Javobni qabul qilish"
            loading={action.busy}
            onPress={() =>
              action.run(() => h.review(submission.id, "accepted", feedback))
            }
          />
          <Button
            title="Qayta ishlashga yuborish"
            variant="outline"
            loading={action.busy}
            onPress={() =>
              action.run(() =>
                h.review(submission.id, "changes_requested", feedback),
              )
            }
          />
        </>
      ) : submission.feedback ? (
        <AppText localize={false}>{submission.feedback}</AppText>
      ) : null}
      <Feedback {...action} />
    </Card>
  );
}
export function AssignmentDetailScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "AssignmentDetail">) {
  const nav = useAppNavigation(),
    h = useHomework(),
    { user } = useApp(),
    action = useAction();
  const a = h.data.assignments.find((a) => a.id === route.params.id),
    [content, setContent] = useState(""),
    [files, setFiles] = useState<string[]>([]),
    [closing, setClosing] = useState(false);
  const requestId = useRef(Crypto.randomUUID());
  if (!a)
    return (
      <Screen>
        <Header title="Uy vazifasi" onBack={() => nav.goBack()} />
        <HomeworkSync />
        {h.ready ? (
          <EmptyState
            title="Vazifa mavjud emas"
            subtitle="Faqat o‘zingizga tegishli vazifani ochishingiz mumkin."
          />
        ) : null}
      </Screen>
    );
  const own = a.teacherId === user.id,
    rows = h.data.submissions
      .filter((s) => s.assignmentId === a.id)
      .sort((a, b) => b.version - a.version),
    latest = latestSubmission(rows, a.id, user.id),
    canSubmit =
      !own &&
      a.status === "published" &&
      (!latest || latest.status === "changes_requested");
  return (
    <Screen>
      <Header title="Uy vazifasi" onBack={() => nav.goBack()} />
      <HomeworkSync />
      <Card
        style={{ backgroundColor: C.primarySoft, borderColor: C.primaryBorder }}
      >
        <View style={uiStyles.between}>
          <Chip label={a.subject} tone="green" />
          <Chip label={assignmentStatus(a, latest)} />
        </View>
        <AppText variant="title" localize={false}>
          {a.title}
        </AppText>
        <AppText variant="caption" color={C.muted}>
          Muddat: {dateLabel(a.dueAt)} · {timeLabel(a.dueAt)}
        </AppText>
        {Date.parse(a.dueAt) < Date.now() && a.status === "published" ? (
          <AppText variant="caption" color={C.error}>
            Muddat o‘tgan. Kech topshirilgan javob alohida belgilanadi.
          </AppText>
        ) : null}
        <AppText localize={false}>{a.description}</AppText>
        <FileButtons ids={a.fileIds} />
      </Card>
      {own && a.status === "draft" ? (
        <Button
          title="Vazifa qoralamasini tahrirlash"
          icon="edit-3"
          onPress={() => nav.navigate("CreateAssignment", { id: a.id })}
        />
      ) : null}
      {canSubmit ? (
        <Card>
          <HomeworkUploadRecovery
            assignmentId={a.id}
            scope="answer"
            onUploaded={(file) =>
              setFiles((old) => [...new Set([...old, file])])
            }
          />
          <AppText variant="heading">
            {latest ? "Javobni qayta topshirish" : "Javobingiz"}
          </AppText>
          {latest?.feedback ? (
            <AppText localize={false}>{latest.feedback}</AppText>
          ) : null}
          <Field
            label="Uy vazifasi javobi"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={10000}
            editable={!action.busy}
          />
          <FileButtons
            ids={files}
            onRemove={(id) => {
              void action.run(async () => {
                await h.removeFile(id);
                setFiles(files.filter((f) => f !== id));
              });
            }}
          />
          <Button
            title="Javobga fayl biriktirish"
            icon="paperclip"
            variant="outline"
            disabled={files.length >= 5}
            loading={action.busy}
            onPress={() =>
              action.run(async () => {
                const input = await pickMaterial(HOMEWORK_MIME, HOMEWORK_LIMIT);
                if (input) {
                  const f = await h.upload(a.id, "answer", input);
                  setFiles((old) => [...old, f.id]);
                }
              })
            }
          />
          <AppText variant="caption" color={C.muted}>
            Matn yoki PDF/rasm · 10 MB gacha · 5 tagacha fayl
          </AppText>
          <Button
            title="Vazifani topshirish"
            icon="send"
            loading={action.busy}
            disabled={!content.trim() && !files.length}
            onPress={() =>
              action.run(
                () => h.submit(requestId.current, a.id, content, files),
                () => {
                  setContent("");
                  setFiles([]);
                  requestId.current = Crypto.randomUUID();
                  action.setSuccess(
                    "Javob topshirildi. Ustoz tekshiruvini kuting.",
                  );
                },
              )
            }
          />
        </Card>
      ) : null}
      {rows.length ? (
        <AppText variant="heading">
          {own ? "Topshirilgan javoblar" : "Javoblar tarixi"}
        </AppText>
      ) : null}
      {rows.map((s) =>
        own ? (
          <ReviewCard key={s.id} submission={s} a={a} />
        ) : (
          <Card key={s.id}>
            <View style={uiStyles.between}>
              <AppText variant="label">{s.version}-urinish</AppText>
              <Chip label={assignmentStatus(a, s)} />
            </View>
            <AppText localize={false}>{s.content}</AppText>
            <FileButtons ids={s.fileIds} />
            <AppText variant="caption" color={C.muted}>
              {dateLabel(s.submittedAt)} · {timeLabel(s.submittedAt)}
            </AppText>
            {s.feedback ? (
              <>
                <AppText variant="label">Ustoz fikri</AppText>
                <AppText localize={false}>{s.feedback}</AppText>
              </>
            ) : null}
          </Card>
        ),
      )}
      {own && a.status !== "archived" ? (
        closing ? (
          <Card>
            <AppText>
              Vazifani yopgach yangi javob qabul qilinmaydi. Avvalgi ishlar
              saqlanadi.
            </AppText>
            <Button
              title="Vazifani yopishni tasdiqlash"
              loading={action.busy}
              onPress={() =>
                action.run(
                  () => h.archive(a.id),
                  () => setClosing(false),
                )
              }
            />
            <Button
              title="Yopishni bekor qilish"
              variant="outline"
              onPress={() => setClosing(false)}
            />
          </Card>
        ) : (
          <Button
            title="Vazifani yopish"
            variant="outline"
            onPress={() => setClosing(true)}
          />
        )
      ) : null}
      <Feedback {...action} />
    </Screen>
  );
}
export function HomeworkNotifications() {
  const h = useHomework(),
    nav = useAppNavigation(),
    action = useAction();
  return (
    <View style={{ gap: 12 }}>
      {h.data.events.length ? (
        <>
          <View style={uiStyles.between}>
            <AppText variant="heading">Vazifalar haqida</AppText>
            <Button
              title="Vazifa xabarlarini o‘qish"
              variant="soft"
              loading={action.busy}
              onPress={() => action.run(h.readEvents)}
            />
          </View>
          {h.data.events.map((e) => (
            <Card
              key={e.id}
              onPress={() =>
                nav.navigate("AssignmentDetail", { id: e.assignmentId })
              }
              accessibilityLabel={`${e.title}: vazifani ochish`}
            >
              <View style={uiStyles.between}>
                <AppText variant="label">{e.title}</AppText>
                {!e.read ? (
                  <Icon name="circle" color={C.primary} size={12} />
                ) : null}
              </View>
              <AppText localize={false}>{e.body}</AppText>
              <AppText variant="caption" color={C.muted}>
                {dateLabel(e.createdAt)} · {timeLabel(e.createdAt)}
              </AppText>
            </Card>
          ))}
        </>
      ) : null}
      <Feedback {...action} />
    </View>
  );
}
