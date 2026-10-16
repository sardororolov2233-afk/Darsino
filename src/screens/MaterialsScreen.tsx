import React from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Header, Screen } from "../components/ui";
import { LessonMaterials } from "../components/LessonMaterials";
import { useAppNavigation, type RootStackParamList } from "../navigation";
export function MaterialsScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, "Materials">) {
  const navigation = useAppNavigation();
  return (
    <Screen>
      <Header title="Dars materiallari" onBack={() => navigation.goBack()} />
      <LessonMaterials
        offeringId={route.params.offeringId}
        sessionId={route.params.sessionId}
      />
    </Screen>
  );
}
