import React from 'react';
import { Pressable, ScrollView, Text, View, type ScrollViewProps } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenShellProps = {
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  /** Vertically centers title + children (back stays at top). Good for short auth-style forms. */
  centerContent?: boolean;
  showBack?: boolean;
  children: React.ReactNode;
  contentClassName?: string;
} & Pick<ScrollViewProps, 'keyboardShouldPersistTaps'>;

export function ScreenShell({
  title,
  subtitle,
  scroll = false,
  centerContent = false,
  showBack = false,
  children,
  contentClassName = 'px-lg pb-lg gap-md w-full',
  keyboardShouldPersistTaps,
}: ScreenShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const backButton = showBack ? (
    <Pressable
      onPress={() => router.back()}
      className="flex-row items-center gap-0.5 -ml-1 active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel="Înapoi"
    >
      <Ionicons name="chevron-back" size={22} color="#0F6B66" />
      <Text className="text-base font-medium text-primary">Înapoi</Text>
    </Pressable>
  ) : null;

  const titleBlock =
    title || subtitle ? (
      <View className={`gap-1 ${centerContent ? 'items-center w-full' : ''}`}>
        {title ? (
          <Text
            className={`text-2xl font-semibold text-text-primary ${centerContent ? 'text-center' : ''}`}
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text className={`text-sm text-text-secondary ${centerContent ? 'text-center' : ''}`}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    ) : null;

  const standardHeader = (
    <View className="gap-1 mb-md">
      {backButton}
      {title ? <Text className="text-2xl font-semibold text-text-primary">{title}</Text> : null}
      {subtitle ? <Text className="text-sm text-text-secondary">{subtitle}</Text> : null}
    </View>
  );

  if (centerContent) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        {backButton ? <View className="px-lg pb-sm">{backButton}</View> : null}
        <ScrollView
          contentContainerClassName={`flex-grow justify-center ${contentClassName}`}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? 'handled'}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          {titleBlock}
          {children}
        </ScrollView>
      </View>
    );
  }

  const body = (
    <>
      {standardHeader}
      {children}
    </>
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {scroll ? (
        <ScrollView
          contentContainerClassName={contentClassName}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${contentClassName}`}>{body}</View>
      )}
    </View>
  );
}
