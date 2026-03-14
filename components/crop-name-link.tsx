import { ReactNode } from 'react';
import Link from 'next/link';
import { getCropHrefByName } from '@/shared/crop-encyclopedia';

interface CropNameLinkProps {
  cropName: string;
  className?: string;
  children?: ReactNode;
}

export function CropNameLink({ cropName, className = '', children }: CropNameLinkProps) {
  const href = getCropHrefByName(cropName);
  const content = children ?? cropName;

  if (!href) {
    return <span className={className}>{content}</span>;
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
