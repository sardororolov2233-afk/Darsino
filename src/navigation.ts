import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Phone: undefined;
  Verify: undefined;
  Setup: undefined;
  Main:
    | { screen?: "Home" | "Search" | "Lessons" | "Chats" | "Profile" }
    | undefined;
  Tutors: undefined;
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
};
export const useAppNavigation = () =>
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();
