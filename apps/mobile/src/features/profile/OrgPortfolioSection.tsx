import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@mobile/lib/supabase';

type PortfolioItem = {
  id: string;
  title?: string | null;
  portfolio_media?: Array<{
    media_type: string;
    storage_path: string;
    thumbnail_url?: string | null;
  }>;
};

type OrgPortfolioSectionProps = {
  ownerType: 'clinic' | 'laboratory';
  ownerId: string;
  orgName: string;
  items: PortfolioItem[];
};

function thumbUri(item: PortfolioItem): string | undefined {
  const m = item.portfolio_media?.[0];
  if (!m) return undefined;
  if (m.media_type === 'video') return m.thumbnail_url ?? undefined;
  return supabase.storage.from('portfolio').getPublicUrl(m.storage_path).data.publicUrl;
}

export function OrgPortfolioSection({ ownerType, ownerId, orgName, items }: OrgPortfolioSectionProps) {
  const router = useRouter();
  if (items.length === 0) return null;

  const galleryHref = {
    pathname: '/portfolio-gallery' as const,
    params: { ownerType, ownerId, title: orgName },
  };

  return (
    <View className="gap-sm w-full rounded-2xl border border-border bg-surface p-lg">
      <View className="flex-row items-center justify-between gap-sm">
        <Text className="text-base font-semibold text-text-primary">Fotografii & lucrări</Text>
        <Link href={galleryHref} asChild>
          <Pressable className="flex-row items-center gap-0.5 active:opacity-70">
            <Text className="text-sm font-medium text-primary">Vezi toate</Text>
            <Ionicons name="chevron-forward" size={16} color="#0F6B66" />
          </Pressable>
        </Link>
      </View>
      <Text className="text-xs text-text-secondary leading-5">
        Lucrări din portofoliul public. Reacțiile și comentariile sunt pe postările din feed.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
        <View className="flex-row gap-sm px-1">
          {items.slice(0, 12).map((p) => {
            const uri = thumbUri(p);
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/portfolio-item/${p.id}`)}
                className="active:opacity-90"
              >
                {uri ? (
                  <Image source={{ uri }} className="w-[108px] h-[108px] rounded-xl bg-border" />
                ) : (
                  <View className="w-[108px] h-[108px] rounded-xl bg-border items-center justify-center">
                    <Ionicons name="images-outline" size={28} color="#9CA3AF" />
                  </View>
                )}
                {p.title ? (
                  <Text className="text-xs text-text-secondary mt-1 max-w-[108px]" numberOfLines={2}>
                    {p.title}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
