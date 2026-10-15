import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
export type RootStackParamList = {
  Splash: undefined;
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
          | "Moderation";
      }
    | undefined;
  Tutors: undefined;
  Chats: undefined;
  Quiz: { id: string };
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
};
export const useAppNavigation = () =>
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();
