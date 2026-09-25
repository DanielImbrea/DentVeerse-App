import Image from 'next/image';

type SiteLogoProps = {
  size?: number;
  className?: string;
};

/** DentVeerse mark only — no wordmark under the icon. */
export function SiteLogo({ size = 160, className }: SiteLogoProps) {
  return (
    <Image
      src="/dentveerse-mark.svg"
      alt="DentVeerse"
      width={size}
      height={size}
      priority
      className={className ?? 'object-contain'}
      style={{ width: size, height: size }}
    />
  );
}
