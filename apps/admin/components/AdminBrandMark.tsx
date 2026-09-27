import Image from 'next/image';

type AdminBrandMarkProps = {
  size?: number;
  className?: string;
};

/** DentVeerse mark — same asset as apps/web (no wordmark). */
export function AdminBrandMark({ size = 56, className }: AdminBrandMarkProps) {
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
