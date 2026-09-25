import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { FeedAuthorFilter, FeedContentFilter, FeedSortMode } from '@dental/api';

export type FeedFiltersState = {
  sortMode: FeedSortMode;
  authorFilter: FeedAuthorFilter;
  contentFilter: FeedContentFilter;
  followedOnly: boolean;
};

export const DEFAULT_FEED_FILTERS: FeedFiltersState = {
  sortMode: 'for_you',
  authorFilter: 'all',
  contentFilter: 'all',
  followedOnly: false,
};

type ChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  accent?: 'primary' | 'accent';
};

function FilterChip({ label, active, onPress, accent = 'primary' }: ChipProps) {
  const activeClass =
    accent === 'accent'
      ? 'bg-accent border-accent'
      : 'bg-primary border-primary';

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-md py-2 border ${active ? activeClass : 'bg-surface border-border'}`}
    >
      <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-text-secondary'}`}>{label}</Text>
    </Pressable>
  );
}

type FeedFilterBarProps = {
  value: FeedFiltersState;
  onChange: (next: FeedFiltersState) => void;
  canFilterFollowed: boolean;
};

export function FeedFilterBar({ value, onChange, canFilterFollowed }: FeedFilterBarProps) {
  function patch(partial: Partial<FeedFiltersState>) {
    onChange({ ...value, ...partial });
  }

  return (
    <View className="gap-sm mb-md">
      <View className="flex-row rounded-2xl bg-surface border border-border p-1">
        <Pressable
          onPress={() => patch({ sortMode: 'for_you' })}
          className={`flex-1 rounded-xl py-2 items-center ${value.sortMode === 'for_you' ? 'bg-primary' : ''}`}
        >
          <Text className={`text-sm font-semibold ${value.sortMode === 'for_you' ? 'text-white' : 'text-text-secondary'}`}>
            Pentru tine
          </Text>
        </Pressable>
        <Pressable
          onPress={() => patch({ sortMode: 'recent' })}
          className={`flex-1 rounded-xl py-2 items-center ${value.sortMode === 'recent' ? 'bg-primary' : ''}`}
        >
          <Text className={`text-sm font-semibold ${value.sortMode === 'recent' ? 'text-white' : 'text-text-secondary'}`}>
            Cele mai noi
          </Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-xs">
        <FilterChip label="Toate" active={value.contentFilter === 'all' && value.authorFilter === 'all' && !value.followedOnly} onPress={() => patch({ contentFilter: 'all', authorFilter: 'all', followedOnly: false })} />
        {canFilterFollowed ? (
          <FilterChip label="Urmărite" active={value.followedOnly} onPress={() => patch({ followedOnly: !value.followedOnly, sortMode: value.followedOnly ? value.sortMode : 'recent' })} />
        ) : null}
        <FilterChip label="Clinici" active={value.authorFilter === 'clinic'} onPress={() => patch({ authorFilter: value.authorFilter === 'clinic' ? 'all' : 'clinic', followedOnly: false })} />
        <FilterChip label="Laboratoare" active={value.authorFilter === 'laboratory'} onPress={() => patch({ authorFilter: value.authorFilter === 'laboratory' ? 'all' : 'laboratory', followedOnly: false })} accent="accent" />
        <FilterChip label="Foto/Video" active={value.contentFilter === 'media'} onPress={() => patch({ contentFilter: value.contentFilter === 'media' ? 'all' : 'media', followedOnly: false })} />
        <FilterChip label="Anunțuri" active={value.contentFilter === 'announcement'} onPress={() => patch({ contentFilter: value.contentFilter === 'announcement' ? 'all' : 'announcement', followedOnly: false })} />
        <FilterChip label="Cazuri" active={value.contentFilter === 'portfolio'} onPress={() => patch({ contentFilter: value.contentFilter === 'portfolio' ? 'all' : 'portfolio', followedOnly: false })} />
        <FilterChip label="Colaborări" active={value.contentFilter === 'collaboration'} onPress={() => patch({ contentFilter: value.contentFilter === 'collaboration' ? 'all' : 'collaboration', followedOnly: false })} />
      </ScrollView>

      <Text className="text-xs text-text-secondary">
        {value.sortMode === 'recent'
          ? 'Ordine cronologică — cele mai recente postări primele.'
          : 'Mix personalizat: prioritar de la conturile urmărite, plus descoperiri noi.'}
      </Text>
    </View>
  );
}
