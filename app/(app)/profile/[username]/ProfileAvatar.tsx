"use client";

import { useState } from "react";
import Image from "next/image";

interface ProfileAvatarProps {
  src: string;
  username: string;
}

export function ProfileAvatar({ src, username }: ProfileAvatarProps) {
  const [broken, setBroken] = useState(false);
  const initials = username.charAt(0).toUpperCase();

  if (broken) {
    return (
      <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#1A1A18] dark:border-[#3A3D38] shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38] bg-[#B84A1C] dark:bg-[#FF6B2C] select-none">
        <span className="font-sans text-3xl font-bold text-white">{initials}</span>
      </span>
    );
  }

  return (
    <span className="relative flex h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-[#1A1A18] dark:border-[#3A3D38] shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38]">
      <Image
        src={src}
        alt={`Avatar di ${username}`}
        fill
        className="object-cover"
        unoptimized
        onError={() => setBroken(true)}
      />
    </span>
  );
}
