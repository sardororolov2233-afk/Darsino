import { useHomework } from "../state/HomeworkContext";
import { latestSubmission } from "../state/homework";
import { LocalizedPressable as Pressable } from "../i18n/native";
import React from "react";
import { View } from "react-native";
import {
  AppText,
  Button,
  Card,
  Chip,
  Icon,
  Screen,
  uiStyles,
} from "../components/ui";
import { OqiHeader } from "../components/OqiHeader";
import { MetricTile, SectionTitle } from "../components/WorkspaceCards";
import { Feedback } from "../components/feedback";
import { OpenLessonCard } from "../components/LearningCards";
import { useApp } from "../state/AppContext";
import { useLearning } from "../state/LearningContext";
import { useClassroom } from "../state/ClassroomContext";
import { studentWorkspace, studentResults } from "../state/studentWorkspace";
import { useAppNavigation } from "../navigation";
import { dateLabel, timeLabel } from "../state/domain";
import { TutorCard, GroupCard } from "./DiscoveryScreens";
import { openLessons } from "../data/learning";
import { formatPrice } from "../data/catalog";
import { C, font } from "../theme";
const subjects = [
  {
    name: "Matematika",
    subject: "Matematika",
    icon: "triangle" as const,
    color: C.primarySoft,
  },
  { name: "Fizika", subject: "Fizika", icon: "zap" as const, color: "#FFF4DD" },
  {
    name: "Ingliz tili",
    subject: "Ingliz tili",
    icon: "globe" as const,
    color: "#E6F6F2",
  },
  {
    name: "Kimyo",
    subject: "Kimyo",
    icon: "droplet" as const,
    color: "#E9F3FF",
  },
  {
    name: "Dasturlash",
    subject: "IT",
    icon: "code" as const,
    color: C.primarySoft,
  },
  { name: "Tarix", subject: "Tarix", icon: "book" as const, color: "#FFF0F1" },
];
export function HomeScreen() {
  const { user, market, tutors, groups, setFilters, mode, syncError } =
      useApp(),
    learning = useLearning(),
    classroom = useClassroom(),
    navigation = useAppNavigation();
  const homework = useHomework();
  const pendingHomework = homework.data.assignments
    .filter((a) => {
      const last = latestSubmission(homework.data.submissions, a.id, user.id);
      return (
        a.status === "published" &&
        (!last || last.status === "changes_requested")
      );
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const applications = market.applications.filter(
    (a) => a.studentId === user.id && a.status === "pending",
  );
  const stats = studentWorkspace(market, user.id, classroom.data),
    results = studentResults(user.id, classroom.data, learning.data.attempts);
  const recommended = tutors
    .filter((t) =>
      user.interests.some((s) => (t.subjects || [t.subject]).includes(s)),
    )
    .sort(
      (a, b) =>
        Number(b.area === user.area) - Number(a.area === user.area) ||
        b.rating - a.rating,
    )
    .slice(0, 2);
  return (
    <Screen top={<OqiHeader />}>
      <View style={{ gap: 5 }}>
        <AppText variant="caption" color={C.muted}>
          Salom, {user.name.split(" ")[0]}
        </AppText>
        <AppText variant="title">Maqsadingiz sari bir qadam</AppText>
      </View>
      {stats.groups.length > 0 ? (
        <>
          <SectionTitle title="Keyingi darsingiz" />
          {stats.next ? (
            <Card
              onPress={() =>
                navigation.navigate("StudentGroup", {
                  id: stats.next!.offeringId,
                })
              }
              accessibilityLabel="Keyingi darsni ko‘rish"
              style={{
                backgroundColor: C.action,
                borderColor: C.primaryBorder,
              }}
            >
              <View style={uiStyles.between}>
                <Chip label={dateLabel(stats.next.startsAt)} tone="green" />
                <AppText variant="label" color={C.primary}>
                  {timeLabel(stats.next.startsAt)}–
                  {timeLabel(stats.next.endsAt)}
                </AppText>
              </View>
              <AppText variant="heading">{stats.next.title}</AppText>
              <AppText color={C.muted}>{stats.next.location}</AppText>
              <AppText variant="caption" color={C.primary}>
                Jadval, materiallar va guruh chati →
              </AppText>
            </Card>
          ) : (
            <Card>
              <AppText variant="heading">
                Yangi dars jadvalini kutyapsiz
              </AppText>
              <AppText color={C.muted}>
                Ustoz keyingi darsni belgilagach shu yerda ko‘rinadi.
              </AppText>
            </Card>
          )}
          <Card>
            <AppText variant="heading">Bugun bajariladigan ishlar</AppText>
            <AppText color={C.muted}>
              {pendingHomework.length} ta uy vazifasi ·{" "}
              {stats.pendingTests.length} ta test
            </AppText>
            {pendingHomework.slice(0, 2).map((a) => (
              <Button
                key={a.id}
                title={a.title}
                variant="soft"
                icon="edit-3"
                onPress={() =>
                  navigation.navigate("AssignmentDetail", { id: a.id })
                }
              />
            ))}
            <View style={uiStyles.row}>
              <Button
                title="Uy vazifalarim"
                icon="edit-3"
                style={{ flex: 1 }}
                onPress={() => navigation.navigate("Assignments")}
              />
              <Button
                title="Testlarim"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => navigation.navigate("StudentTests")}
              />
            </View>
          </Card>
        </>
      ) : null}
      <Card
        style={{
          backgroundColor: stats.groups.length ? C.primarySoft : C.action,
          borderColor: C.primaryBorder,
          padding: 22,
          gap: 12,
          overflow: "hidden",
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: -38,
            top: -48,
            width: 180,
            height: 180,
            borderRadius: 90,
            borderWidth: 26,
            borderColor: "#2668460B",
          }}
        />
        <View style={uiStyles.between}>
          <View style={uiStyles.row}>
            <Icon name="target" color={C.primary} size={18} />
            <AppText variant="caption" color={C.primary}>
              MENING MAQSADIM
            </AppText>
          </View>
          <Chip label={user.studyMode || "Ta’lim"} tone="purple" />
        </View>
        <AppText variant="display" color={C.navy}>
          {user.goal || "Maqsadingizni belgilang"}
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <AppText variant="caption" color={C.primary}>
            {user.interests.join(" · ")}
          </AppText>
          <AppText variant="caption" color={C.primary}>
            {user.studySupport || user.area}
          </AppText>
        </View>
        <Button
          title={
            user.studySupport === "Mustaqil"
              ? "Darslar va materiallarni ko‘rish"
              : "Maqsadimga mos ustoz topish"
          }
          icon="arrow-right"
          variant="outline"
          onPress={() => {
            if (user.studySupport === "Mustaqil")
              navigation.navigate("Main", { screen: "Lessons" });
            else {
              setFilters({
                subject: user.interests[0] || "Barchasi",
                mode: user.studyMode || "Barchasi",
                area: "Barcha hududlar",
              });
              navigation.navigate("Main", { screen: "Search" });
            }
          }}
        />
      </Card>
      {stats.groups.length ? (
        <>
          <SectionTitle
            title="Mening o‘qishim"
            subtitle="Ustozingiz bilan bir joyda"
          />
          <View style={uiStyles.wrap}>
            <MetricTile
              title="Mening guruhlarim"
              value={stats.groups.length}
              caption={`${stats.today.length} ta bugungi dars`}
              icon="users"
              onPress={() => navigation.navigate("StudentGroups")}
            />
            <MetricTile
              title="Mening testlarim"
              value={classroom.ready ? stats.pendingTests.length : "…"}
              caption="Bajarish kutilmoqda"
              icon="check-square"
              onPress={() => navigation.navigate("StudentTests")}
            />
            <MetricTile
              title="Mening davomatim"
              value={
                stats.attendancePercent === null
                  ? "—"
                  : `${stats.attendancePercent}%`
              }
              caption={`${stats.present}/${stats.records.length} belgilangan qatnashuv`}
              icon="calendar"
              tone="green"
              onPress={() => navigation.navigate("StudentAttendance")}
            />
            <MetricTile
              title="Mening to‘lovlarim"
              value={formatPrice(stats.due)}
              caption="Joriy oy · to‘lanmagan"
              icon="credit-card"
              tone={stats.due ? "red" : "green"}
              onPress={() => navigation.navigate("StudentPayments")}
            />
          </View>
          <View style={uiStyles.row}>
            <Button
              title="Guruh chatlari"
              icon="message-circle"
              variant="soft"
              style={{ flex: 1 }}
              onPress={() => navigation.navigate("Chats")}
            />
            <Button
              title="Ustozni QR orqali topish"
              icon="maximize"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => navigation.navigate("ScanContact")}
            />
          </View>
        </>
      ) : (
        <Card>
          <AppText variant="heading">Darslar qanday ishlaydi?</AppText>
          <AppText color={C.muted}>
            Mos ustozni toping → guruhga ariza yuboring → ustoz tasdiqlagach
            jadval va vazifalar ochiladi.
          </AppText>
          <Button
            title="Ochiq guruhlarni ko‘rish"
            variant="soft"
            onPress={() => navigation.navigate("Groups")}
          />
        </Card>
      )}
      {applications.length ? (
        <>
          <SectionTitle title="Ko‘rib chiqilayotgan arizalar" />
          {applications.slice(0, 3).map((a) => (
            <Card
              key={a.id}
              onPress={() => navigation.navigate("Request", { id: a.id })}
              accessibilityLabel={`${a.title}: ariza holati`}
            >
              <Chip label="Ustoz javobi kutilmoqda" tone="green" />
              <AppText variant="label">{a.title}</AppText>
            </Card>
          ))}
        </>
      ) : null}
      <Card
        style={{ backgroundColor: C.primarySoft, borderColor: C.primaryBorder }}
      >
        <View style={uiStyles.between}>
          <View style={{ flex: 1, gap: 5 }}>
            <AppText variant="heading">Bilimim</AppText>
            <AppText color={C.muted}>
              {results.length
                ? `${results.length} ta saqlangan natijangiz bor. Rivojlanishingizni kuzating.`
                : "Birinchi testdan so‘ng shaxsiy natijalaringiz ko‘rinadi."}
            </AppText>
          </View>
          <Icon name="bar-chart-2" size={36} color={C.primary} />
        </View>
        <Button
          title="Natijalar va testlar"
          icon="arrow-right"
          variant="outline"
          onPress={() => navigation.navigate("Main", { screen: "Radar" })}
        />
      </Card>
      {!stats.groups.length ? (
        <>
          <SectionTitle
            title="Fanlar olami"
            subtitle="O‘zingizga mosini tanlang"
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {subjects.map((s) => (
              <Pressable
                key={s.name}
                accessibilityRole="button"
                accessibilityLabel={`${s.name} ustozlarini topish`}
                onPress={() => {
                  setFilters({ subject: s.subject, area: "Barcha hududlar" });
                  navigation.navigate("Main", { screen: "Search" });
                }}
                style={{
                  flexBasis: "30%",
                  flexGrow: 1,
                  paddingVertical: 16,
                  paddingHorizontal: 5,
                  borderRadius: 18,
                  backgroundColor: C.white,
                  alignItems: "center",
                  gap: 7,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    backgroundColor: s.color,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={s.icon} color={C.primary} size={23} />
                </View>
                <AppText variant="caption" style={{ fontFamily: font.bold }}>
                  {s.name}
                </AppText>
                <AppText variant="caption" color={C.muted}>
                  {
                    tutors.filter((t) =>
                      (t.subjects || [t.subject]).includes(s.subject),
                    ).length
                  }{" "}
                  ustoz
                </AppText>
              </Pressable>
            ))}
          </View>
          <Card
            onPress={() => {
              const short = user.area.replace(/ tumani| shahri/g, "");
              const area =
                tutors.find((t) => t.area === user.area || t.area === short)
                  ?.area || user.area;
              setFilters({ area });
              navigation.navigate("Main", { screen: "Search" });
            }}
            accessibilityLabel="Hududimdagi ustozlarni ko‘rish"
            style={{
              backgroundColor: C.primarySoft,
              borderColor: C.primaryBorder,
            }}
          >
            <View style={uiStyles.row}>
              <Icon name="map-pin" color={C.primary} />
              <View style={{ flex: 1 }}>
                <AppText variant="label">
                  {user.area}, {user.city}
                </AppText>
                <AppText variant="caption" color={C.muted}>
                  Hududingizdagi ustoz va guruhlar
                </AppText>
              </View>
              <Icon name="arrow-up-right" color={C.primary} />
            </View>
          </Card>
          <View style={uiStyles.row}>
            <Button
              title="Guruhlar"
              icon="users"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => navigation.navigate("Groups")}
            />
            <Button
              title="Tadbirlar"
              icon="compass"
              variant="outline"
              style={{ flex: 1 }}
              onPress={() => navigation.navigate("Events")}
            />
          </View>
          <SectionTitle
            title="Ochiq video darslar"
            subtitle="Ishonchli ta’lim manbalari"
            action={
              <Button
                title="Barchasi"
                variant="soft"
                onPress={() =>
                  navigation.navigate("LearningLibrary", {
                    section: "Video darslar",
                  })
                }
              />
            }
          />
          {openLessons.slice(0, 2).map((lesson) => (
            <OpenLessonCard key={lesson.id} lesson={lesson} />
          ))}
          <SectionTitle
            title="Sizga mos ustozlar"
            action={
              <Button
                title="Barchasi"
                variant="soft"
                onPress={() => navigation.navigate("Tutors")}
              />
            }
          />
          {recommended.map((t) => (
            <TutorCard key={t.id} tutor={t} />
          ))}
          {!recommended.length ? (
            <AppText color={C.muted}>
              Tanlagan faningiz bo‘yicha ustozlar hozircha yo‘q. Boshqa fanlarni
              ham qidirib ko‘ring.
            </AppText>
          ) : null}
          <SectionTitle title="Ochiq guruhlar" />
          {groups
            .filter((g) => g.spots > 0)
            .slice(0, 2)
            .map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
        </>
      ) : null}
      <Feedback
        error={syncError || learning.error || classroom.error || homework.error}
      />
      {mode === "demo" ? (
        <AppText variant="caption" color={C.muted}>
          Sinov rejimi · ustoz va guruhlar namuna katalogidan.
        </AppText>
      ) : null}
    </Screen>
  );
}
