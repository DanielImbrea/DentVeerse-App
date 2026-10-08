import React from 'react';
import { Image, Text, View } from 'react-native';
import type { ReactNode } from 'react';

type OrgPublicProfileHeroProps = {
  logoUrl?: string | null;
  fallbackEmoji: string;
  badges: ReactNode;
  statsLine: string;
  description?: string | null;
};

export function OrgPublicProfileHero({
  logoUrl,
  fallbackEmoji,
  badges,
  statsLine,
  description,
}: OrgPublicProfileHeroProps) {
  return (
    <View className="w-full gap-md">
      <View className="w-full rounded-2xl border border-border bg-surface overflow-hidden">
        <View className="h-2 bg-primary/20" />
        <View className="p-lg gap-md">
          <View className="flex-row items-center gap-md w-full">
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} className="w-[72px] h-[72px] rounded-2xl border border-border bg-background" />
            ) : (
              <View className="w-[72px] h-[72px] rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center">
                <Text className="text-3xl">{fallbackEmoji}</Text>
              </View>
            )}
            <View className="flex-1 min-w-0 gap-sm">
              <View className="flex-row gap-xs flex-wrap">{badges}</View>
              <Text className="text-sm text-text-secondary leading-5">{statsLine}</Text>
            </View>
          </View>
        </View>
      </View>

      {description ? (
        <View className="w-full rounded-2xl border border-border bg-surface px-md py-md">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-sm">Despre</Text>
          <Text className="text-base text-text-primary leading-7 self-stretch" style={{ width: '100%', maxWidth: '100%' }}>
            {description}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
