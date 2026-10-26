import React from "react";
import { View } from "react-native";
import { useClassroom } from "../state/ClassroomContext";
import { useApp } from "../state/AppContext";
import { useAppNavigation } from "../navigation";
import { AppText, Button, Card, Chip, Icon, uiStyles } from "./ui";
import { C } from "../theme";
export function MockTestCards({
  offeringId,
  heading = true,
}: {
  offeringId?: string;
  heading?: boolean;
}) {
  const { data } = useClassroom(),
    { user } = useApp(),
    navigation = useAppNavigation();
  const tests = data.tests.filter(
    (t) =>
      (!offeringId || t.offeringId === offeringId) &&
      (t.status === "published" || t.tutorId === user.id),
  );
  if (!tests.length) return null;
  return (
    <View style={{ gap: 12 }}>
      {heading ? <AppText variant="heading">Mock testlar</AppText> : null}
      {tests.map((test) => {
        const attempts = data.attempts.filter(
          (a) => a.testId === test.id && a.completedAt,
        );
        const own = attempts.find((a) => a.studentId === user.id);
        return (
          <Card key={test.id}>
            <View style={uiStyles.row}>
              <Icon name="file-text" color={C.purple} />
              <AppText variant="label" localize={false} style={{ flex: 1 }}>
                {test.title}
              </AppText>
              <Chip
                label={test.status === "draft" ? "Qoralama" : "Faol"}
                tone={test.status === "draft" ? "gold" : "green"}
              />
            </View>
            <AppText variant="caption" color={C.muted}>
              {test.questionCount} savol · {test.minutes} daqiqa ·{" "}
              {test.subject}
            </AppText>
            {test.tutorId === user.id ? (
              <AppText variant="caption" color={C.muted}>
                {attempts.length} o‘quvchi topshirdi
                {attempts.length
                  ? ` · O‘rtacha: ${Math.round(attempts.reduce((n, a) => n + (a.percentage || 0), 0) / attempts.length)}%`
                  : ""}
              </AppText>
            ) : own ? (
              <Chip label={`Natija: ${own.percentage}%`} tone="green" />
            ) : null}
            <Button
              title={
                test.status === "draft"
                  ? "Qoralamani davom ettirish"
                  : test.tutorId === user.id
                    ? "Test va natijalarni ochish"
                    : own
                      ? "Natijani ko‘rish"
                      : "Mock testni boshlash"
              }
              variant="soft"
              icon={test.status === "draft" ? "edit-3" : "arrow-right"}
              onPress={() =>
                test.status === "draft"
                  ? navigation.navigate("UploadMockTest", { id: test.id })
                  : navigation.navigate("MockTest", { id: test.id })
              }
            />
          </Card>
        );
      })}
    </View>
  );
}
