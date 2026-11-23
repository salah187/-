import React, { useState } from 'react';
import { getInitials } from '../utils/format';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'navy' | 'green' | 'red' | 'neutral';
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-16 h-16 text-lg',
};

const TONE_CLASSES: Record<NonNullable<AvatarProps['tone']>, string> = {
  navy: 'bg-[#0F2547] text-white dark:bg-sky-900/70 dark:text-sky-100',
  green: 'bg-emerald-600 text-white dark:bg-emerald-900/70 dark:text-emerald-100',
  red: 'bg-rose-600 text-white dark:bg-rose-900/70 dark:text-rose-100',
  neutral: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  tone = 'navy',
}) => {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${SIZE_CLASSES[size]} rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} rounded-full flex items-center justify-center font-semibold shrink-0 select-none`}
    >
      {getInitials(name)}
    </div>
  );
};
