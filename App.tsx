import React from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { Manrope_800ExtraBold } from "@expo-google-fonts/manrope/800ExtraBold";
import { AppProvider, useApp } from "./src/state/AppContext";
import { C, font } from "./src/theme";
import { Icon } from "./src/components/ui";
import { Brand } from "./src/components/Brand";
import type { RootStackParamList } from "./src/navigation";
import {
  SplashScreen,
  WelcomeScreen,
  PhoneScreen,
  VerifyScreen,
  SetupScreen,
} from "./src/screens/AuthScreens";
import { HomeScreen } from "./src/screens/HomeScreen";
import {
  TutorsScreen,
  FiltersScreen,
  TutorScreen,
  GroupsScreen,
  GroupScreen,
  EventsScreen,
  EventScreen,
  RoomsScreen,
  RoomScreen,
} from "./src/screens/DiscoveryScreens";
import {
  RequestScreen,
  LessonsScreen,
  ChatsScreen,
  ConversationScreen,
  ProfileScreen,
  EditProfileScreen,
  NotificationsScreen,
  ReviewScreen,
} from "./src/screens/ActivityScreens";
import {
  ApplicationsScreen,
  CreateOfferingScreen,
  ManageClassScreen,
  ModerationScreen,
  ModerateTutorScreen,
  TutorClassesScreen,
  TutorHomeScreen,
  TutorProfileScreen,
} from "./src/screens/TutorScreens";
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: C.navy,
    background: C.background,
    card: C.white,
    text: C.ink,
    border: C.border,
    notification: C.gold,
  },
};
function MainTabs() {
  const { user, requests } = useApp();
  const studentTabs = [
    {
      name: "Home",
      title: "Bosh",
      icon: "home" as const,
      component: HomeScreen,
    },
    {
      name: "Search",
      title: "Qidirish",
      icon: "search" as const,
      component: TutorsScreen,
    },
    {
      name: "Lessons",
      title: "Darslarim",
      icon: "book-open" as const,
      component: LessonsScreen,
    },
    {
      name: "Chats",
      title: "Chat",
      icon: "message-circle" as const,
      component: ChatsScreen,
    },
    {
      name: "Profile",
      title: "Profil",
      icon: "user" as const,
      component: ProfileScreen,
    },
  ];
  const tutorTabs = [
    {
      name: "Home",
      title: "Kabinet",
      icon: "home" as const,
      component: TutorHomeScreen,
    },
    {
      name: "Applications",
      title: "Arizalar",
      icon: "inbox" as const,
      component: ApplicationsScreen,
    },
    {
      name: "Classes",
      title: "Darslar",
      icon: "book-open" as const,
      component: TutorClassesScreen,
    },
    {
      name: "Chats",
      title: "Chat",
      icon: "message-circle" as const,
      component: ChatsScreen,
    },
    {
      name: "Profile",
      title: "Profil",
      icon: "user" as const,
      component: ProfileScreen,
    },
  ];
  const tabs =
    user.role === "tutor"
      ? tutorTabs
      : user.role === "moderator"
        ? [
            {
              name: "Moderation",
              title: "Tekshiruv",
              icon: "shield" as const,
              component: ModerationScreen,
            },
            {
              name: "Profile",
              title: "Profil",
              icon: "user" as const,
              component: ProfileScreen,
            },
          ]
        : studentTabs;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.navy,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: {
          fontFamily: font.medium,
          fontSize: 10,
          marginTop: 2,
        },
        tabBarStyle: {
          minHeight: 76,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? undefined : 12,
          borderTopColor: C.border,
        },
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color }) => <Icon name="home" color={color} />,
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarBadge:
              tab.name === "Applications" &&
              requests.some((r) => r.status === "pending")
                ? requests.filter((r) => r.status === "pending").length
                : undefined,
            tabBarIcon: ({ focused, color }) => (
              <View style={[styles.tabIcon, focused && styles.activeTab]}>
                <Icon name={tab.icon} color={color} size={21} />
              </View>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
function Navigator() {
  const { ready, signedIn, authenticated, user } = useApp();
  if (!ready)
    return (
      <View style={styles.loading}>
        <Brand width={220} />
        <ActivityIndicator color={C.gold} />
      </View>
    );
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.background },
          animation: "slide_from_right",
        }}
      >
        {!signedIn && !authenticated ? (
          <Stack.Group navigationKey="auth">
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Phone" component={PhoneScreen} />
            <Stack.Screen name="Verify" component={VerifyScreen} />
          </Stack.Group>
        ) : !signedIn ? (
          <Stack.Group navigationKey="onboarding">
            <Stack.Screen name="Setup" component={SetupScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group navigationKey={`app-${user.id}-${user.role}`}>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Tutors" component={TutorsScreen} />
            <Stack.Screen
              name="Filters"
              component={FiltersScreen}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen name="Tutor" component={TutorScreen} />
            <Stack.Screen name="Groups" component={GroupsScreen} />
            <Stack.Screen name="Group" component={GroupScreen} />
            <Stack.Screen name="Events" component={EventsScreen} />
            <Stack.Screen name="Event" component={EventScreen} />
            <Stack.Screen name="Rooms" component={RoomsScreen} />
            <Stack.Screen name="Room" component={RoomScreen} />
            <Stack.Screen name="Request" component={RequestScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="TutorProfile" component={TutorProfileScreen} />
            <Stack.Screen
              name="CreateOffering"
              component={CreateOfferingScreen}
            />
            <Stack.Screen name="ManageClass" component={ManageClassScreen} />
            <Stack.Screen
              name="ModerateTutor"
              component={ModerateTutorScreen}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
            />
            <Stack.Screen name="Review" component={ReviewScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  return (
    <View style={styles.shell}>
      <View style={styles.app}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          {fontsLoaded || fontError ? (
            <AppProvider>
              <Navigator />
            </AppProvider>
          ) : (
            <View style={styles.loading}>
              <ActivityIndicator color={C.navy} />
            </View>
          )}
        </SafeAreaProvider>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: Platform.OS === "web" ? "#E9EDF3" : C.background,
    alignItems: "center",
  },
  app: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 460 : undefined,
    boxShadow: Platform.OS === "web" ? "0 0 60px rgba(9,43,83,0.1)" : undefined,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    backgroundColor: C.white,
  },
  tabIcon: {
    width: 44,
    height: 28,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: { backgroundColor: C.goldSoft },
});
