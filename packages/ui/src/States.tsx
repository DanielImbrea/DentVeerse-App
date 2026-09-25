import React from 'react';
import { Text, View } from 'react-native';
import { Button } from './Button';

/**
 * Every list-bearing screen must implement all four states explicitly —
 * loading (skeleton, never a bare spinner for list content), empty
 * (illustration slot + message + primary action), error (retry action,
 * human message), and populated. See docs/04-mobile.md §5.
 */

export interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center justify-center px-xl py-xxxl gap-sm">
      <Text className="font-display text-heading3 text-text-primary text-center">{title}</Text>
      {message ? (
        <Text className="font-body text-body text-text-secondary text-center">{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View className="pt-md">
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel: string;
}

export function ErrorState({ message, onRetry, retryLabel }: ErrorStateProps) {
  return (
    <View className="items-center justify-center px-xl py-xxxl gap-sm">
      <Text className="font-body text-body text-error text-center">{message}</Text>
      {onRetry ? (
        <View className="pt-md">
          <Button label={retryLabel} variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

export interface SkeletonRowProps {
  height?: number;
}

/** Shimmer placeholder matching final layout height — never a bare spinner. */
export function SkeletonRow({ height = 72 }: SkeletonRowProps) {
  return <View className="bg-border/40 rounded-md w-full mb-sm" style={{ height }} />;
}
