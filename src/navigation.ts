import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
export type RootStackParamList = {
  Welcome: undefined;
  Providers: undefined;
  SignIn: undefined;
  RequestPasswordReset: undefined;
  ResetPassword: undefined;
  Setup: undefined;
  Main:
    | {
        screen?:
          | "Home"
          | "Search"
          | "Radar"
          | "Lessons"
          | "Chats"
          | "Profile"
          | "Applications"
          | "TeacherStudents"
          | "TeacherTests"
          | "Moderation";
      }
    | undefined;
  Tutors: undefined;
  Chats: undefined;
  Quiz: { id: string; invitationMessageId?: string };
  Applications: { offeringId?: string } | undefined;
  AssignDiagnostic: { offeringId?: string; studentId?: string } | undefined;
  PlanRoom: { roomId: string };
  CreateClub: undefined;
  OpenLesson: { id: string };
  Filters: undefined;
  Tutor: { id: string };
  Groups: undefined;
  Group: { id: string };
  Events: undefined;
  Event: { id: string };
  Rooms: undefined;
  Room: { id: string };
  Request: { id: string };
  Conversation: { id: string };
  EditProfile: undefined;
  TutorProfile: undefined;
  CreateOffering: undefined;
  TeacherClasses: undefined;
  TeacherFinance: undefined;
  StudentTests: undefined;
  Assignments: { offeringId?: string } | undefined;
  CreateAssignment: { id?: string; offeringId?: string } | undefined;
  AssignmentDetail: { id: string };
  StudentGroups: undefined;
  StudentAttendance: undefined;
  StudentPayments: undefined;
  StudentGroup: { id: string };
  LearningLibrary: { section: "Video darslar" | "Klublar" };
  TeacherRooms: undefined;
  TeacherClubs: undefined;
  TeacherAttendance: undefined;
  TeacherDebtors: undefined;
  TeacherStudentDetail: { id: string; groupId?: string };
  UploadMockTest: { id?: string; offeringId?: string } | undefined;
  MockTest: { id: string };
  GroupConversation: { id: string };
  ManageClass: {
    id: string;
    tab?: "O‘quvchilar" | "Davomat" | "Testlar" | "Materiallar" | "Vazifalar";
    sessionId?: string;
    month?: string;
    paymentStatus?: string;
  };
  ModerateTutor: { id: string };
  Notifications: undefined;
  Review: { sessionId: string };
  Settings: undefined;
  LanguageSettings: undefined;
  PrivacySettings: undefined;
  SecuritySettings: undefined;
  NotificationSettings: undefined;
  DataSettings: undefined;
  Support: undefined;
  ProfileId: undefined;
  ScanContact: undefined;
  Contacts: { query?: string; view?: "contacts" | "blocked" } | undefined;
  Invitations: undefined;
  InviteToGroup: { offeringId?: string; studentId?: string } | undefined;
  AccountReports: undefined;
  Permissions: undefined;
  TutorLocation: undefined;
  MaterialViewer: { fileId: string; title: string };
  Materials: { offeringId: string; sessionId?: string };
};
export const useAppNavigation = () =>
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();
