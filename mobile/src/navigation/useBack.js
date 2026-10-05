import { useRouter } from 'expo-router';

/** @param {import('expo-router').Href} [fallback] */
export function useBack(fallback = '/') {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };
}
