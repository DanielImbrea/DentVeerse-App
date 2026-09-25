import React from 'react';
import { Text, View } from 'react-native';

export type BadgeVariant = 'verified' | 'openForCollaboration' | 'neutral';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

/**
 * A single Badge component with variants — used for Verified, Open for
 * Collaboration, and specialization/service tags. The "verified" variant is
 * the ONLY place a gradient (teal→accent) is used in the design system, per
 * docs/04-mobile.md §4.1 — gradients are meaningful signals, not decoration.
 */
export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  return (
    <View className={containerClassName(variant)} accessibilityRole="text">
      <Text className={textClassName(variant)}>{label}</Text>
    </View>
  );
}

function containerClassName(variant: BadgeVariant): string {
  const base = 'flex-row items-center rounded-full px-md py-xs self-start';
  switch (variant) {
    case 'verified':
      return `${base} bg-primary`; // gradient applied at the native-image/asset level, not via className
    case 'openForCollaboration':
      return `${base} bg-success/10 border border-success`;
    case 'neutral':
    default:
      return `${base} bg-border/40`;
  }
}

function textClassName(variant: BadgeVariant): string {
  const base = 'font-body text-caption font-medium';
  switch (variant) {
    case 'verified':
      return `${base} text-white`;
    case 'openForCollaboration':
      return `${base} text-success`;
    case 'neutral':
    default:
      return `${base} text-text-secondary`;
  }
}
