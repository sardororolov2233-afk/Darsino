import React from "react";
import { View } from "react-native";
import { useApp } from "../state/AppContext";
import { useAppNavigation } from "../navigation";
import { AppText, Button, Card, Icon, Screen } from "../components/ui";
import { Feedback, useAction } from "../components/feedback";
import { C } from "../theme";

export function TutorApprovalScreen() {
  const { market, user, refresh, signOut } = useApp(),
    action = useAction(),
    navigation = useAppNavigation();
  const profile = market.tutorProfiles.find((p) => p.userId === user.id);
  const rejected = profile?.verification === "rejected";
  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 16, paddingVertical: 24 }}>
        <Icon
          name={rejected ? "alert-circle" : "shield"}
          size={60}
          color={rejected ? C.error : C.purple}
        />
        <AppText variant="title">
          {rejected ? "Arizani tuzatish kerak" : "Admin tasdig‘i kutilmoqda"}
        </AppText>
        <AppText color={C.muted} style={{ textAlign: "center" }}>
          Profilingiz, telefon raqamingiz va sertifikatingiz admin tekshiruviga
          yuborildi. Tasdiqlangach o‘qituvchi kabineti ochiladi.
        </AppText>
      </View>
      <Card>
        <AppText variant="heading" localize={false}>
          {user.name}
        </AppText>
        <AppText color={C.muted}>{profile?.subjects.join(" · ")}</AppText>
        <AppText localize={false}>
          {profile?.contactPhone || "Telefon raqamini kiriting"}
        </AppText>
        {profile?.certificateFileId ? (
          <Button
            title="Sertifikatni ko‘rish"
            icon="file-text"
            variant="soft"
            onPress={() =>
              navigation.navigate("MaterialViewer", {
                fileId: profile.certificateFileId!,
                title: "O‘qituvchi sertifikati",
              })
            }
          />
        ) : (
          <AppText color={C.error}>
            Telefon raqami va sertifikat bilan arizani qayta yuboring.
          </AppText>
        )}
        {profile?.moderationNote ? (
          <AppText color={rejected ? C.error : C.muted}>
            {profile.moderationNote}
          </AppText>
        ) : null}
      </Card>
      <Button
        title="Holatni yangilash"
        icon="refresh-cw"
        variant="gold"
        loading={action.busy}
        onPress={() => action.run(refresh)}
      />
      <Button
        title={
          rejected
            ? "Arizani tuzatib qayta yuborish"
            : "Ariza ma’lumotlarini tahrirlash"
        }
        icon="edit"
        variant="outline"
        onPress={() => navigation.navigate("TutorProfile")}
      />
      <Button
        title="Sozlamalar"
        icon="settings"
        variant="soft"
        onPress={() => navigation.navigate("Settings")}
      />
      <Button
        title="Hisobdan chiqish"
        icon="log-out"
        variant="outline"
        loading={action.busy}
        onPress={() => action.run(signOut)}
      />
      <Feedback {...action} />
    </Screen>
  );
}
