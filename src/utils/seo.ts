import { useEffect } from 'react';

interface SeoOptions {
  title: string;
  description: string;
}

export function usePageSeo({ title, description }: SeoOptions): void {
  useEffect(() => {
    document.title = title;

    const updateMeta = (selector: string, content: string) => {
      const el = document.querySelector<HTMLMetaElement>(selector);
      if (el) {
        el.setAttribute('content', content);
      }
    };

    updateMeta('meta[name="description"]', description);
    updateMeta('meta[property="og:title"]', title);
    updateMeta('meta[property="og:description"]', description);
    updateMeta('meta[name="twitter:title"]', title);
    updateMeta('meta[name="twitter:description"]', description);
  }, [title, description]);
}
