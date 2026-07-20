import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';

export function usePrivateImage(path: string | undefined): string | undefined {
  const [blobUrl, setBlobUrl] = useState<string>();

  useEffect(() => {
    if (!path) {
      setBlobUrl(undefined);
      return;
    }

    let revoked = false;
    const src = path.startsWith('/') ? path : `/${path}`;

    api
      .get(src, { responseType: 'blob', baseURL: '' })
      .then(({ data }) => {
        if (!revoked) setBlobUrl(URL.createObjectURL(data));
      })
      .catch(() => {
        if (!revoked) setBlobUrl(undefined);
      });

    return () => {
      revoked = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return undefined;
      });
    };
  }, [path]);

  return blobUrl;
}
