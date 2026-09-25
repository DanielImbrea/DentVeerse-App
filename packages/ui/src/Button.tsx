import React from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Single Button implementation covering every variant via a `variant` prop —
 * do not create a second Button component for a new use case; add a variant.
 * See docs/04-mobile.md §4.4 for the full component inventory and the
 * required state checklist (default/pressed/focused/disabled/loading).
 */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled = false,
  ...pressableProps
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={buttonClassName(variant, isDisabled)}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#0F6B66'} />
      ) : (
        <Text className={labelClassName(variant, isDisabled)}>{label}</Text>
      )}
    </Pressable>
  );
}

function buttonClassName(variant: ButtonVariant, isDisabled: boolean): string {
  const base = 'flex-row items-center justify-center rounded-md px-lg py-md min-h-[44px]';
  const opacity = isDisabled ? 'opacity-50' : 'active:opacity-80';
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary',
    secondary: 'bg-surface border border-border',
    ghost: 'bg-transparent',
    destructive: 'bg-error',
  };
  return `${base} ${variants[variant]} ${opacity}`;
}

function labelClassName(variant: ButtonVariant, _isDisabled: boolean): string {
  const base = 'font-button text-body';
  const colors: Record<ButtonVariant, string> = {
    primary: 'text-white',
    secondary: 'text-text-primary',
    ghost: 'text-primary',
    destructive: 'text-white',
  };
  return `${base} ${colors[variant]}`;
}
