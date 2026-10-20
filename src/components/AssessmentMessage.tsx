import React from "react";
import { View } from "react-native";
import { useApp } from "../state/AppContext";
import { useAppNavigation } from "../navigation";
import { parseAssessment, validInvitation } from "../state/assessments";
import { diagnostics } from "../data/learning";
import { dmId, type Message } from "../state/domain";
import { AppText, Button, Icon, uiStyles } from "./ui";
import { C } from "../theme";
export function AssessmentMessage({ message }: { message: Message }) {
  const { market, user } = useApp();
  const navigation = useAppNavigation();
  const payload = parseAssessment(message.text);
  const color = message.mine ? C.white : C.ink;
  if (!payload)
    return (
      <AppText localize={false} color={color}>
        {message.text}
      </AppText>
    );
  if (payload.kind === "invite") {
    const invite = validInvitation(market, message);
    const test = diagnostics.find((t) => t.id === payload.testId)!;
    return (
      <View style={{ gap: 10 }}>
        <View style={uiStyles.row}>
          <Icon
            name="target"
            color={message.mine ? C.mint : C.green}
            size={18}
          />
          <AppText variant="label" color={color}>
            Test topshirig‘i
          </AppText>
        </View>
        <AppText localize={false} color={color}>
          {payload.title}
        </AppText>
        <AppText variant="caption" color={message.mine ? "#CAD8F1" : C.muted}>
          {test.subject} · {test.questions.length} savol · {test.minutes} daqiqa
        </AppText>
        {invite && user.role === "student" && invite.studentId === user.id ? (
          <Button
            title="Testni ishlash"
            icon="play"
            variant="gold"
            onPress={() =>
              navigation.navigate("Quiz", {
                id: invite.testId,
                invitationMessageId: message.id,
              })
            }
          />
        ) : !invite ? (
          <AppText variant="caption" color={message.mine ? "#CAD8F1" : C.muted}>
            Bu guruh uchun faol topshiriq mavjud emas.
          </AppText>
        ) : null}
      </View>
    );
  }
  const original = market.messages.find((m) => {
    const p = parseAssessment(m.text);
    return p?.kind === "invite" && p.id === payload.invitationId;
  });
  const invite = original && validInvitation(market, original);
  const test = invite && diagnostics.find((t) => t.id === invite.testId);
  const valid =
    invite &&
    test &&
    message.senderId === invite.studentId &&
    message.conversationId === dmId(invite.studentId, invite.tutorId) &&
    payload.answers.length === test.questions.length &&
    payload.answers.every((a, i) => a < test.questions[i].options.length);
  const correct = valid
    ? test.questions.filter((q, i) => q.correct === payload.answers[i]).length
    : null;
  return (
    <View style={{ gap: 6 }}>
      <View style={uiStyles.row}>
        <Icon
          name="bar-chart-2"
          color={message.mine ? C.mint : C.green}
          size={18}
        />
        <AppText variant="label" color={color}>
          Ulashilgan test natijasi
        </AppText>
      </View>
      {correct !== null && test ? (
        <>
          <AppText variant="heading" color={color}>
            {correct}/{test.questions.length} ·{" "}
            {Math.round((correct / test.questions.length) * 100)}%
          </AppText>
          <AppText variant="caption" color={color}>
            {test.title}
          </AppText>
        </>
      ) : (
        <AppText variant="caption" color={color}>
          Topshiriq endi mavjud emas yoki javoblar formati mos emas.
        </AppText>
      )}
    </View>
  );
}
