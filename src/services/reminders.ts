import { Platform } from "react-native";
import type { LessonSession } from "../state/domain";

export async function registerReminderHandler() {
  if (Platform.OS === "web") return;
  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduleReminder(session: LessonSession) {
  if (Platform.OS === "web")
    throw new Error(
      "Telefon eslatmalari Android va iOS ilovasida yoqiladi. Jadval shu yerda ham ko‘rinadi.",
    );
  const Notifications = await import("expo-notifications");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("lessons", {
      name: "Darslar",
      importance: Notifications.AndroidImportance.HIGH,
    });
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Eslatma uchun telefon sozlamalarida bildirishnomalarga ruxsat bering.",
    );
  const date = new Date(new Date(session.startsAt).getTime() - 15 * 60000);
  if (date.getTime() <= Date.now())
    throw new Error(
      "Eslatma darsdan 15 daqiqa oldin yuboriladi. Bu darsning eslatma vaqti o‘tgan.",
    );
  const identifier = `darsino-${session.id}`;
  await Notifications.cancelScheduledNotificationAsync(identifier);
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: "Darsingiz boshlanadi",
      body: `${session.title} — 15 daqiqadan so‘ng.`,
      data: { offeringId: session.offeringId, startsAt: session.startsAt },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: "lessons",
    },
  });
}

// Only update reminders the student explicitly enabled. Never prompt during sync.
export async function reconcileReminders(sessions: LessonSession[]) {
  if (Platform.OS === "web") return;
  const Notifications = await import("expo-notifications");
  const reminders = await Notifications.getAllScheduledNotificationsAsync();
  for (const reminder of reminders.filter((r) =>
    r.identifier.startsWith("darsino-"),
  )) {
    const session = sessions.find(
      (s) => `darsino-${s.id}` === reminder.identifier,
    );
    const date = session
      ? new Date(new Date(session.startsAt).getTime() - 15 * 60000)
      : null;
    if (!session || !date || date.getTime() <= Date.now())
      await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
    else if (reminder.content.data?.startsAt !== session.startsAt) {
      await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.identifier,
        content: {
          title: "Darsingiz boshlanadi",
          body: `${session.title} — 15 daqiqadan so‘ng.`,
          data: { offeringId: session.offeringId, startsAt: session.startsAt },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: "lessons",
        },
      });
    }
  }
}
