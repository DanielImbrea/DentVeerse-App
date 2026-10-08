import React from 'react';
import { Text, View } from 'react-native';
import tokens from '@dental/config/tokens';
import { AppLogo } from '@mobile/components/AppLogo';

type AuthBrandHeaderProps = {
  title: string;
  subtitle?: string;
  logoSize?: number;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

/** Sign-in / sign-up hero — explicit text colors so iOS dark mode cannot wash out the title. */
export function AuthBrandHeader({
  title,
  subtitle,
  logoSize = 120,
  className,
  titleClassName = 'text-3xl',
  subtitleClassName = 'text-base',
}: AuthBrandHeaderProps) {
  return (
    <View className={className ?? 'items-center mb-xl w-full'}>
      <AppLogo size={logoSize} className="mb-md self-center" />
      <Text
        className={`font-semibold tracking-tight text-center text-foreground ${titleClassName}`}
        style={{ color: tokens.color.textPrimary }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          className={`mt-1 text-center text-muted ${subtitleClassName}`}
          style={{ color: tokens.color.textSecondary }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
