import React from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';

/**
 * Single-line inputs use fixed height + zero vertical padding so text sits
 * visually centered on iOS/Android (default TextInput + py-3.5 sits too low).
 */
export function AppTextInput({
  multiline,
  className,
  style,
  placeholderTextColor = '#9CA3AF',
  ...props
}: TextInputProps) {
  const isMultiline = multiline === true;

  return (
    <TextInput
      placeholderTextColor={placeholderTextColor}
      textAlignVertical={isMultiline ? 'top' : 'center'}
      multiline={multiline}
      includeFontPadding={false}
      className={[
        'border border-border rounded-xl px-md text-base text-text-primary bg-background',
        isMultiline ? 'min-h-[120px] py-md' : 'h-12',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={[
        !isMultiline
          ? Platform.select({
              ios: { paddingTop: 0, paddingBottom: 0, lineHeight: 20 },
              android: { paddingVertical: 0 },
              default: {},
            })
          : undefined,
        style,
      ]}
      {...props}
    />
  );
}
