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
import { TeacherProvider } from "./src/state/TeacherContext";
import {
  TeacherRoomsScreen,
  PlanRoomScreen,
  TeacherClubsScreen,
  CreateClubScreen,
  AssignDiagnosticScreen,
} from "./src/screens/TeacherWorkspaceScreens";
import { LearningProvider } from "./src/state/LearningContext";
import { SearchScreen } from "./src/screens/SearchScreen";
import {
  RadarScreen,
  QuizScreen,
  OpenLessonScreen,
} from "./src/screens/LearningScreens";
import { C, font } from "./src/theme";
import { Icon } from "./src/components/ui";
import { Brand } from "./src/components/Brand";
import type { RootStackParamList } from "./src/navigation";
import { FloatingAssistant } from "./src/components/FloatingAssistant";
import { PermissionScreen } from "./src/screens/PermissionScreen";
import { TutorLocationScreen } from "./src/screens/TutorLocationScreen";
import { MaterialViewerScreen } from "./src/screens/MaterialViewerScreen";
import { MaterialsScreen } from "./src/screens/MaterialsScreen";
import {
  WelcomeScreen,
  SignInScreen,
  VerifyEmailScreen,
  SetupScreen,
} from "./src/screens/AuthScreens";
import { HomeScreen } from "./src/screens/HomeScreen";
import {
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
      component: SearchScreen,
    },
    {
      name: "Radar",
      title: "Radar",
      icon: "target" as const,
      component: RadarScreen,
    },
    {
      name: "Lessons",
      title: "Darslarim",
      icon: "video" as const,
      component: LessonsScreen,
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
      title: "Tahlil",
      icon: "bar-chart-2" as const,
      component: TutorHomeScreen,
    },
    {
      name: "Classes",
      title: "Guruhlar",
      icon: "users" as const,
      component: TutorClassesScreen,
    },
    {
      name: "TeacherRooms",
      title: "Xonalar",
      icon: "grid" as const,
      component: TeacherRoomsScreen,
    },
    {
      name: "TeacherClubs",
      title: "Klublar",
      icon: "award" as const,
      component: TeacherClubsScreen,
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
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
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
              <View
                style={[
                  styles.tabIcon,
                  focused && styles.activeTab,
                  (tab.name === "Radar" || tab.name === "TeacherRooms") &&
                    styles.radarTab,
                  tab.name === "TeacherRooms" && { backgroundColor: C.purple },
                ]}
              >
                <Icon
                  name={tab.icon}
                  color={
                    tab.name === "Radar" || tab.name === "TeacherRooms"
                      ? C.white
                      : color
                  }
                  size={
                    tab.name === "Radar" || tab.name === "TeacherRooms"
                      ? 25
                      : 21
                  }
                />
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
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </Stack.Group>
        ) : !signedIn ? (
          <Stack.Group navigationKey="onboarding">
            <Stack.Screen name="Setup" component={SetupScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group navigationKey={`app-${user.id}-${user.role}`}>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Permissions" component={PermissionScreen} />
            <Stack.Screen
              name="TutorLocation"
              component={TutorLocationScreen}
            />
            <Stack.Screen
              name="MaterialViewer"
              component={MaterialViewerScreen}
            />
            <Stack.Screen name="Materials" component={MaterialsScreen} />
            <Stack.Screen name="Tutors" component={SearchScreen} />
            <Stack.Screen name="Chats" component={ChatsScreen} />
            <Stack.Screen name="Applications" component={ApplicationsScreen} />
            <Stack.Screen
              name="AssignDiagnostic"
              component={AssignDiagnosticScreen}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="PlanRoom"
              component={PlanRoomScreen}
              options={{ presentation: "modal" }}
            />
            <Stack.Screen name="CreateClub" component={CreateClubScreen} />
            <Stack.Screen name="Quiz" component={QuizScreen} />
            <Stack.Screen name="OpenLesson" component={OpenLessonScreen} />
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
              <LearningProvider>
                <TeacherProvider>
                  <View style={{ flex: 1 }}>
                    <Navigator />
                    <FloatingAssistant />
                  </View>
                </TeacherProvider>
              </LearningProvider>
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
    backgroundColor: Platform.OS === "web" ? "#0B1222" : C.background,
    alignItems: "center",
  },
  app: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 440 : undefined,
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
  radarTab: {
    width: 50,
    height: 50,
    marginTop: -20,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: C.white,
    backgroundColor: C.accent,
    boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
  },
});
