import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
export type RootStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  VerifyEmail: undefined;
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
          | "Classes"
          | "TeacherRooms"
          | "TeacherClubs"
          | "Moderation";
      }
    | undefined;
  Tutors: undefined;
  Chats: undefined;
  Quiz: { id: string; invitationMessageId?: string };
  Applications: { offeringId?: string } | undefined;
  AssignDiagnostic: { offeringId?: string } | undefined;
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
  ManageClass: { id: string };
  ModerateTutor: { id: string };
  Notifications: undefined;
  Review: { sessionId: string };
  Permissions: undefined;
  TutorLocation: undefined;
  MaterialViewer: { fileId: string; title: string };
  Materials: { offeringId: string; sessionId?: string };
};
export const useAppNavigation = () =>
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();
