import { useState } from 'react';

interface TabFaviconProps {
  src: string;
}

export function TabFavicon({ src }: TabFaviconProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = failedUrl === src;

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      hidden={failed}
      onError={() => setFailedUrl(src)}
      onLoad={() => setFailedUrl((previousUrl) => (previousUrl === src ? null : previousUrl))}
    />
  );
}
