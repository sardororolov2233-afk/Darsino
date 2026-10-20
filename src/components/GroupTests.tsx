import React from "react";
import { View } from "react-native";
import { useApp } from "../state/AppContext";
import { useAppNavigation } from "../navigation";
import { parseAssessment, validInvitation } from "../state/assessments";
import { dmId, type Offering } from "../state/domain";
import { diagnostics } from "../data/learning";
import { AppText, Button, Card, Chip, EmptyState, uiStyles } from "./ui";
import { TeacherRadar } from "./TeacherComponents";
import { C } from "../theme";

export function GroupTests({ group }: { group: Offering }) {
  const { market, user } = useApp(),
    navigation = useAppNavigation();
  const invites = market.messages.flatMap((message) => {
    const invite = validInvitation(market, message);
    if (!invite || invite.offeringId !== group.id || invite.tutorId !== user.id)
      return [];
    const test = diagnostics.find((t) => t.id === invite.testId)!;
    const results = market.messages.flatMap((m) => {
      const p = parseAssessment(m.text);
      return p?.kind === "result" &&
        p.invitationId === invite.id &&
        m.senderId === invite.studentId &&
        m.conversationId === dmId(invite.studentId, user.id) &&
        p.answers.length === test.questions.length &&
        p.answers.every((v, i) => v < test.questions[i].options.length)
        ? [p]
        : [];
    });
    const result = results.at(-1);
    const score = result
      ? Math.round(
          (100 *
            test.questions.filter((q, i) => q.correct === result.answers[i])
              .length) /
            test.questions.length,
        )
      : null;
    return [{ invite, message, score }];
  });
  const approved = market.tutorProfiles.some(
    (p) => p.userId === user.id && p.verification === "approved",
  );
  return (
    <View style={{ gap: 14 }}>
      <Button
        title="Guruhga test yuborish"
        icon="send"
        variant="gold"
        disabled={!approved}
        onPress={() =>
          navigation.navigate("AssignDiagnostic", { offeringId: group.id })
        }
      />
      <AppText variant="caption" color={C.muted}>
        Test har bir tanlangan o‘quvchining chatiga keladi. O‘quvchi yakunda
        natijani ustozga ulashadi.
      </AppText>
      <TeacherRadar offeringId={group.id} compact />
      <AppText variant="heading">
        Yuborilgan topshiriqlar · {invites.length}
      </AppText>
      {invites
        .slice(-20)
        .reverse()
        .map(({ invite, message, score }) => (
          <Card key={message.id}>
            <AppText variant="label">{invite.title}</AppText>
            <AppText color={C.muted}>
              {market.users.find((u) => u.id === invite.studentId)?.name ||
                "O‘quvchi"}
            </AppText>
            <View style={[uiStyles.between, { flexWrap: "wrap" }]}>
              <Chip
                label={
                  score === null ? "Javob kutilmoqda" : `Natija: ${score}%`
                }
                tone={score === null ? "gold" : "green"}
              />
              <Button
                title="Chatni ochish"
                variant="soft"
                onPress={() =>
                  navigation.navigate("Conversation", {
                    id: dmId(invite.studentId, user.id),
                  })
                }
              />
            </View>
          </Card>
        ))}
      {!invites.length ? (
        <EmptyState
          title="Hali test yuborilmagan"
          subtitle="Guruhga yoki alohida o‘quvchiga diagnostik test yuboring."
          icon="check-square"
        />
      ) : null}
    </View>
  );
}
