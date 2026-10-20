import React, { forwardRef } from "react";
import {
  Pressable as NativePressable,
  TextInput as NativeTextInput,
  type PressableProps,
  type TextInputProps,
} from "react-native";
import { useI18n } from "./index";

export const LocalizedPressable = forwardRef<
  React.ElementRef<typeof NativePressable>,
  PressableProps
>(function LocalizedPressable(props, ref) {
  const { t } = useI18n();
  return (
    <NativePressable
      {...props}
      ref={ref}
      accessibilityLabel={
        props.accessibilityLabel ? t(props.accessibilityLabel) : undefined
      }
      accessibilityHint={
        props.accessibilityHint ? t(props.accessibilityHint) : undefined
      }
    />
  );
});
export const LocalizedTextInput = forwardRef<NativeTextInput, TextInputProps>(
  function LocalizedTextInput(props, ref) {
    const { t } = useI18n();
    return (
      <NativeTextInput
        {...props}
        ref={ref}
        placeholder={props.placeholder ? t(props.placeholder) : undefined}
        accessibilityLabel={
          props.accessibilityLabel ? t(props.accessibilityLabel) : undefined
        }
      />
    );
  },
);
