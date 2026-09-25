import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, type LinkProps } from 'expo-router';

type ProfileMenuRowProps = {
  label: string;
  description?: string;
  href?: LinkProps['href'];
  onPress?: () => void;
  destructive?: boolean;
  icon?: string;
};

export function ProfileMenuRow({ label, description, href, onPress, destructive, icon }: ProfileMenuRowProps) {
  const content = (
    <View className="flex-row items-center gap-md py-md px-md">
      {icon ? (
        <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
          <Text className="text-lg">{icon}</Text>
        </View>
      ) : null}
      <View className="flex-1">
        <Text className={`text-base font-medium ${destructive ? 'text-error' : 'text-text-primary'}`}>{label}</Text>
        {description ? <Text className="text-sm text-text-secondary mt-0.5">{description}</Text> : null}
      </View>
      {!destructive ? <Text className="text-text-secondary">›</Text> : null}
    </View>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable className="active:opacity-70">{content}</Pressable>
      </Link>
    );
  }

  return (
    <Pressable onPress={onPress} className="active:opacity-70">
      {content}
    </Pressable>
  );
}
