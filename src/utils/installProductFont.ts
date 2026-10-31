import { CommandBarFontFamily } from '@/types';

const productFontFamilies: Record<CommandBarFontFamily, string> = {
  'open-sans': 'Command Menu Open Sans',
  outfit: 'Command Menu Outfit',
  'nunito-sans': 'Command Menu Nunito Sans',
  sora: 'Command Menu Sora',
  'ibm-plex-mono': 'Command Menu IBM Plex Mono',
};

const fontFaces = [
  {
    family: productFontFamilies['open-sans'],
    path: 'assets/fonts/open-sans/OpenSans-Latin.woff2',
    weight: '300 800',
    unicodeRange:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
  {
    family: productFontFamilies['open-sans'],
    path: 'assets/fonts/open-sans/OpenSans-LatinExt.woff2',
    weight: '300 800',
    unicodeRange:
      'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
  },
  {
    family: productFontFamilies.outfit,
    path: 'assets/fonts/outfit/Outfit-Latin.woff2',
    weight: '100 900',
    unicodeRange:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
  {
    family: productFontFamilies.outfit,
    path: 'assets/fonts/outfit/Outfit-LatinExt.woff2',
    weight: '100 900',
    unicodeRange:
      'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
  },
  {
    family: productFontFamilies['nunito-sans'],
    path: 'assets/fonts/nunito-sans/NunitoSans-Latin.woff2',
    weight: '200 1000',
    unicodeRange:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
  {
    family: productFontFamilies['nunito-sans'],
    path: 'assets/fonts/nunito-sans/NunitoSans-LatinExt.woff2',
    weight: '200 1000',
    unicodeRange:
      'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
  },
  {
    family: productFontFamilies.sora,
    path: 'assets/fonts/sora/Sora-Latin.woff2',
    weight: '100 800',
    unicodeRange:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
  {
    family: productFontFamilies.sora,
    path: 'assets/fonts/sora/Sora-LatinExt.woff2',
    weight: '100 800',
    unicodeRange:
      'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
  },
  ...([400, 500, 600, 700] as const).map((weight) => ({
    family: productFontFamilies['ibm-plex-mono'],
    path: `assets/fonts/ibm-plex-mono/IBMPlexMono-${weight}-Latin.woff2`,
    weight: String(weight),
    unicodeRange:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  })),
];

const preloadPaths: Record<CommandBarFontFamily, string> = {
  'open-sans': 'assets/fonts/open-sans/OpenSans-Latin.woff2',
  outfit: 'assets/fonts/outfit/Outfit-Latin.woff2',
  'nunito-sans': 'assets/fonts/nunito-sans/NunitoSans-Latin.woff2',
  sora: 'assets/fonts/sora/Sora-Latin.woff2',
  'ibm-plex-mono': 'assets/fonts/ibm-plex-mono/IBMPlexMono-400-Latin.woff2',
};
const fontFaceStyle = 'data-command-menu-font-face';
const fontPreload = 'data-command-menu-font-preload';
const pendingPageFontLoads = new WeakMap<Document, Map<CommandBarFontFamily, Promise<void>>>();

export function installProductFont(target: Document, preferredFont: CommandBarFontFamily = 'open-sans'): void {
  if (target.querySelector(`style[${fontFaceStyle}]`)) return;

  const ownerDocument = target;
  const styleParent = target.head ?? target.documentElement;
  if (!styleParent) return;

  const style = ownerDocument.createElement('style');
  style.setAttribute(fontFaceStyle, '');
  style.textContent = fontFaces
    .map(
      ({ family, path, weight, unicodeRange }) => `@font-face {
    font-family: "${family}";
    src: url("${chrome.runtime.getURL(path)}") format("woff2");
    font-style: normal;
    font-weight: ${weight};
    font-display: swap;
    unicode-range: ${unicodeRange};
  }`,
    )
    .join('\n');
  styleParent.append(style);

  // Popup pages can preload the selected face because their document is extension-owned.
  const head = target.head;
  if (head && !head.querySelector(`link[${fontPreload}]`)) {
    const preload = ownerDocument.createElement('link');
    preload.rel = 'preload';
    preload.as = 'font';
    preload.type = 'font/woff2';
    preload.crossOrigin = 'anonymous';
    preload.href = chrome.runtime.getURL(preloadPaths[preferredFont]);
    preload.setAttribute(fontPreload, '');
    head.append(preload);
  }
}

/**
 * Page content policies can block a font URL referenced by CSS injected into a
 * site's DOM. Fetch the extension resource from the isolated content-script
 * world, then register its bytes with the document's font set. The private
 * family names keep these faces separate from similarly named site fonts.
 */
export function loadProductFontForPage(target: Document, preferredFont: CommandBarFontFamily): Promise<void> {
  const familyName = productFontFamilies[preferredFont];
  const faces = fontFaces.filter((face) => face.family === familyName);
  const alreadyLoaded = Array.from(target.fonts).filter(
    (face) => face.family === familyName && face.status === 'loaded',
  );
  if (alreadyLoaded.length >= faces.length) return Promise.resolve();

  let documentLoads = pendingPageFontLoads.get(target);
  if (!documentLoads) {
    documentLoads = new Map();
    pendingPageFontLoads.set(target, documentLoads);
  }
  const pending = documentLoads.get(preferredFont);
  if (pending) return pending;

  const load = Promise.all(
    faces.map(async ({ family, path, weight, unicodeRange }) => {
      const response = await fetch(chrome.runtime.getURL(path));
      if (!response.ok) throw new Error(`Could not fetch font asset: ${path}`);
      const face = new FontFace(family, await response.arrayBuffer(), {
        style: 'normal',
        weight,
        unicodeRange,
      });
      await face.load();
      target.fonts.add(face);
    }),
  ).then(() => undefined);

  documentLoads.set(preferredFont, load);
  void load.catch(() => documentLoads?.delete(preferredFont));
  return load;
}
