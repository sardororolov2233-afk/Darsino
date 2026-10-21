import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LocalizedPressable as Pressable } from "../i18n/native";
import { AppText, Button, Icon, uiStyles } from "./ui";
import { Feedback, useAction } from "./feedback";
import { useApp } from "../state/AppContext";
import { C } from "../theme";
import { money } from "../screens/DiscoveryScreens";

export function GroupInvitationBanner({ onOpen }: { onOpen: () => void }) {
  const { market, user, signedIn, command } = useApp(),
    insets = useSafeAreaInsets(),
    action = useAction();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const offset = useRef(new Animated.Value(-240)).current;
  const invitation = (market.groupInvitations || []).find(
    (i) =>
      signedIn &&
      i.studentId === user.id &&
      i.status === "pending" &&
      Date.parse(i.expiresAt) > Date.now() &&
      !dismissed.includes(i.id),
  );
  useEffect(() => {
    setDismissed([]);
  }, [user.id]);
  useEffect(() => {
    offset.setValue(-240);
    if (!invitation) return;
    const animation = Animated.timing(offset, {
      toValue: 0,
      duration: 220,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [invitation?.id, offset]);
  if (!invitation) return null;
  const group = market.offerings.find((g) => g.id === invitation.offeringId);
  const teacher = market.users.find((u) => u.id === invitation.tutorId);
  return (
    <Animated.View
      style={[
        s.banner,
        { top: insets.top + 8, transform: [{ translateY: offset }] },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={uiStyles.row}>
        <Icon name="user-plus" color={C.green} />
        <AppText variant="label" style={{ flex: 1 }}>
          Guruhga taklif
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Taklifni keyinroq ko‘rish"
          style={s.close}
          onPress={() => setDismissed((ids) => [...ids, invitation.id])}
        >
          <Icon name="x" size={18} />
        </Pressable>
      </View>
      <AppText localize={false} variant="label">
        {teacher?.name || "O‘qi"}
      </AppText>
      <AppText localize={false} numberOfLines={2}>
        {group?.title || "O‘qi"}
      </AppText>
      {group ? (
        <AppText variant="caption" color={C.muted}>
          {money(group.price) + " · " + group.days + " · " + group.time}
        </AppText>
      ) : null}
      <View style={uiStyles.row}>
        <Button
          title="Qabul qilish"
          icon="check"
          style={{ flex: 1 }}
          disabled={action.busy}
          onPress={() =>
            action.run(() =>
              command({
                type: "group-invite-decide",
                invitationId: invitation.id,
                accept: true,
              }),
            )
          }
        />
        <Button
          title="Batafsil"
          variant="soft"
          style={{ flex: 1 }}
          onPress={() => {
            setDismissed((ids) => [...ids, invitation.id]);
            onOpen();
          }}
        />
      </View>
      <Feedback {...action} />
    </Animated.View>
  );
}
const s = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 1000,
    elevation: 20,
    padding: 16,
    gap: 6,
    backgroundColor: C.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.accent,
    boxShadow: "0 10px 32px rgba(15,38,92,0.2)",
  },
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
