import { AssistantAccessProvider } from "./src/state/AssistantAccess";
import {
  StudentTestsScreen,
  StudentGroupsScreen,
  StudentAttendanceScreen,
  StudentPaymentsScreen,
  StudentGroupScreen,
  LearningLibraryScreen,
} from "./src/screens/StudentWorkspaceScreens";
import { TeacherFinanceScreen } from "./src/screens/TeacherFinanceScreen";
import { TutorApprovalScreen } from "./src/screens/TutorApprovalScreen";
import { ClassroomProvider } from "./src/state/ClassroomContext";
import {
  TeacherStudentsScreen,
  TeacherStudentDetailScreen,
  TeacherAttendanceScreen,
  TeacherDebtorsScreen,
} from "./src/screens/TeacherDashboardScreens";
import {
  UploadMockTestScreen,
  MockTestScreen,
} from "./src/screens/MockTestsScreens";
import { GroupConversationScreen } from "./src/screens/ChatScreens";
import { I18nProvider, useI18n } from "./src/i18n";
import { LocaleBridge } from "./src/state/LocaleBridge";
import { MfaGate } from "./src/components/TwoFactor";
import { GroupInvitationBanner } from "./src/components/GroupInvitationBanner";
import { ConnectionLinkHandler } from "./src/components/ConnectionLinkHandler";
import {
  SettingsScreen,
  LanguageSettingsScreen,
  PrivacySettingsScreen,
  SecuritySettingsScreen,
  NotificationSettingsScreen,
  DataSettingsScreen,
  SupportScreen,
  AccountReportsScreen,
} from "./src/screens/SettingsScreens";
import {
  ProfileIdScreen,
  ScanContactScreen,
  ContactsScreen,
  InvitationsScreen,
  InviteToGroupScreen,
} from "./src/screens/ConnectionScreens";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  useNavigationContainerRef,
} from "@react-navigation/native";
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
  ProviderScreen,
  SignInScreen,
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
  const { t } = useI18n();
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
      title: "Dars & Klub",
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
      title: "Boshqaruv",
      icon: "grid" as const,
      component: TutorHomeScreen,
    },
    {
      name: "TeacherStudents",
      title: "O‘quvchilar",
      icon: "users" as const,
      component: TeacherStudentsScreen,
    },
    {
      name: "TeacherTests",
      title: "Test yuklash",
      icon: "check-square" as const,
      component: UploadMockTestScreen,
    },
    {
      name: "Chats",
      title: "Guruh chat",
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
        tabBarActiveTintColor: C.primary,
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
            title: t(tab.title),
            tabBarAccessibilityLabel: t(tab.title),
            tabBarBadge:
              tab.name === "Applications" &&
              requests.some((r) => r.status === "pending")
                ? requests.filter((r) => r.status === "pending").length
                : undefined,
            tabBarIcon: ({ focused, color }) => (
              <View style={[styles.tabIcon, focused && styles.activeTab]}>
                <Icon name={tab.icon} color={color} size={22} />
              </View>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
function Navigator() {
  const { ready, signedIn, authenticated, user, market } = useApp();
  const approvalRequired =
    user.role === "tutor" &&
    !market.tutorProfiles.some(
      (p) => p.userId === user.id && p.verification === "approved",
    );
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const [navigationReady, setNavigationReady] = useState(false);
  if (!ready)
    return (
      <View style={styles.loading}>
        <Image
          source={require("./assets/oqi_loading.gif")}
          style={styles.loadingGif}
          resizeMode="cover"
        />
      </View>
    );
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => setNavigationReady(true)}
      theme={theme}
    >
      <View style={{ flex: 1 }}>
        <ConnectionLinkHandler
          signedIn={signedIn}
          ready={navigationReady}
          onOpen={(id) => navigationRef.navigate("Contacts", { query: id })}
        />
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
              <Stack.Screen name="Providers" component={ProviderScreen} />
            </Stack.Group>
          ) : !signedIn ? (
            <Stack.Group navigationKey="onboarding">
              <Stack.Screen name="Setup" component={SetupScreen} />
            </Stack.Group>
          ) : (
            <Stack.Group navigationKey={`app-${user.id}-${user.role}`}>
              <Stack.Screen
                name="Main"
                component={approvalRequired ? TutorApprovalScreen : MainTabs}
              />
              <Stack.Screen
                name="StudentGroups"
                component={StudentGroupsScreen}
              />
              <Stack.Screen
                name="StudentTests"
                component={StudentTestsScreen}
              />
              <Stack.Screen
                name="StudentAttendance"
                component={StudentAttendanceScreen}
              />
              <Stack.Screen
                name="StudentPayments"
                component={StudentPaymentsScreen}
              />
              <Stack.Screen
                name="StudentGroup"
                component={StudentGroupScreen}
              />
              <Stack.Screen
                name="LearningLibrary"
                component={LearningLibraryScreen}
              />
              <Stack.Screen
                name="TeacherFinance"
                component={TeacherFinanceScreen}
              />
              <Stack.Screen
                name="TeacherClasses"
                component={TutorClassesScreen}
              />
              <Stack.Screen
                name="TeacherRooms"
                component={TeacherRoomsScreen}
              />
              <Stack.Screen
                name="TeacherClubs"
                component={TeacherClubsScreen}
              />
              <Stack.Screen
                name="TeacherAttendance"
                component={TeacherAttendanceScreen}
              />
              <Stack.Screen
                name="TeacherDebtors"
                component={TeacherDebtorsScreen}
              />
              <Stack.Screen
                name="TeacherStudentDetail"
                component={TeacherStudentDetailScreen}
              />
              <Stack.Screen
                name="UploadMockTest"
                component={UploadMockTestScreen}
              />
              <Stack.Screen name="MockTest" component={MockTestScreen} />
              <Stack.Screen
                name="GroupConversation"
                component={GroupConversationScreen}
              />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen
                name="LanguageSettings"
                component={LanguageSettingsScreen}
              />
              <Stack.Screen
                name="PrivacySettings"
                component={PrivacySettingsScreen}
              />
              <Stack.Screen
                name="SecuritySettings"
                component={SecuritySettingsScreen}
              />
              <Stack.Screen
                name="NotificationSettings"
                component={NotificationSettingsScreen}
              />
              <Stack.Screen
                name="DataSettings"
                component={DataSettingsScreen}
              />
              <Stack.Screen name="Support" component={SupportScreen} />
              <Stack.Screen name="ProfileId" component={ProfileIdScreen} />
              <Stack.Screen name="ScanContact" component={ScanContactScreen} />
              <Stack.Screen name="Contacts" component={ContactsScreen} />
              <Stack.Screen name="Invitations" component={InvitationsScreen} />
              <Stack.Screen
                name="InviteToGroup"
                component={InviteToGroupScreen}
              />
              <Stack.Screen
                name="AccountReports"
                component={AccountReportsScreen}
              />

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
              <Stack.Screen
                name="Applications"
                component={ApplicationsScreen}
              />
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
              <Stack.Screen
                name="Conversation"
                component={ConversationScreen}
              />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen
                name="TutorProfile"
                component={TutorProfileScreen}
              />
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
        {signedIn && navigationReady ? (
          <GroupInvitationBanner
            onOpen={() => navigationRef.navigate("Invitations")}
          />
        ) : null}
      </View>
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
            <I18nProvider>
              <MfaGate>
                <AppProvider>
                  <LocaleBridge />
                  <LearningProvider>
                    <TeacherProvider>
                      <ClassroomProvider>
                        <AssistantAccessProvider>
                          <View style={{ flex: 1 }}>
                            <Navigator />
                            <FloatingAssistant />
                          </View>
                        </AssistantAccessProvider>
                      </ClassroomProvider>
                    </TeacherProvider>
                  </LearningProvider>
                </AppProvider>
              </MfaGate>
            </I18nProvider>
          ) : (
            <View style={styles.loading}>
              <Image
                source={require("./assets/oqi_loading.gif")}
                style={styles.loadingGif}
                resizeMode="cover"
              />
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
    backgroundColor: C.navy,
  },
  loadingGif: {
    width: "100%",
    height: "100%",
  },
  tabIcon: {
    width: 44,
    height: 28,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: { backgroundColor: C.primarySoft },
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
