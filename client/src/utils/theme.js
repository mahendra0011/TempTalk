export const THEME_STORAGE_KEY = "temptalk:theme";

const DARK = "dark";
const LIGHT = "light";

function normalizeTheme(value) {
  return value === DARK ? DARK : LIGHT;
}

export function getInitialTheme() {
  if (typeof localStorage === "undefined") {
    return LIGHT;
  }

  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return LIGHT;
  }
}

export function applyTheme(value) {
  const theme = normalizeTheme(value);

  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute("content", theme === DARK ? "#020403" : "#f6fbf7");
  }

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore restricted storage contexts.
    }
  }

  return theme;
}

export function initTheme() {
  return applyTheme(getInitialTheme());
}
