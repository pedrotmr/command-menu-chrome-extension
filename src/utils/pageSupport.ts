export const isOverlayPage = (url?: string): boolean => {
  if (!url || !/^https?:\/\//i.test(url)) {
    return false;
  }

  try {
    const parsed = new URL(url);

    if (parsed.hostname === 'chromewebstore.google.com') {
      return false;
    }

    if (parsed.hostname === 'chrome.google.com' && parsed.pathname.startsWith('/webstore')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};
