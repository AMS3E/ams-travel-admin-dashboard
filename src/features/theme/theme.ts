/**
 * Light, Dark, or System — which the dashboard is drawn in.
 *
 * The choice is kept in this browser's localStorage, so it survives sessions.
 * An inline script in the root layout's <head> (`THEME_SCRIPT`) reads it and
 * stamps the resolved theme on <html> before anything is painted, so no page
 * ever flashes in the wrong one. While System is chosen, the same script
 * follows the operating system as it changes, and a choice made in one tab
 * reaches the others. The functions below are the React side of that script.
 */

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"];

export const THEME_STORAGE_KEY = "ams-cms-theme";
/** Fired on window whenever the theme on <html> is (re)applied. */
export const THEME_CHANGE_EVENT = "ams-cms-theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** What a stored value means: anything but an explicit Light or Dark is System. */
export function readChoice(stored: string | null | undefined): ThemeChoice {
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  return choice === "system" ? (systemPrefersDark ? "dark" : "light") : choice;
}

/**
 * Runs synchronously in <head>. Plain ES5, no imports: it is a string.
 *
 * `data-theme` is the theme drawn; `data-theme-choice` is what was chosen.
 * `window.__amsTheme(true)` re-applies after a change, without transitions.
 */
export const THEME_SCRIPT = `(function(){var k=${JSON.stringify(THEME_STORAGE_KEY)},e=${JSON.stringify(THEME_CHANGE_EVENT)},d=document.documentElement,q=window.matchMedia?window.matchMedia(${JSON.stringify(DARK_QUERY)}):null;function c(){try{var v=window.localStorage.getItem(k);return v==="light"||v==="dark"?v:"system"}catch(x){return "system"}}function a(s){var v=c(),r=v==="system"?(q&&q.matches?"dark":"light"):v;if(s)d.setAttribute("data-theme-switching","");d.setAttribute("data-theme",r);d.setAttribute("data-theme-choice",v);if(s&&window.requestAnimationFrame){window.requestAnimationFrame(function(){window.requestAnimationFrame(function(){d.removeAttribute("data-theme-switching")})})}else{d.removeAttribute("data-theme-switching")}try{window.dispatchEvent(new Event(e))}catch(x){}}a(false);if(q){var f=function(){if(c()==="system")a(true)};if(q.addEventListener)q.addEventListener("change",f);else if(q.addListener)q.addListener(f)}window.addEventListener("storage",function(x){if(x.key===k)a(true)});window.__amsTheme=a})();`;

type ThemeWindow = Window & { __amsTheme?: (animate: boolean) => void };

/** Saves the choice and applies it now. */
export function chooseTheme(choice: ThemeChoice): void {
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* Storage refused (a private window): the choice lasts for this page only. */
  }
  const apply = (window as ThemeWindow).__amsTheme;
  if (apply) {
    apply(true);
    return;
  }
  const root = document.documentElement;
  const resolved = resolveTheme(choice, window.matchMedia?.(DARK_QUERY).matches ?? false);
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-choice", choice);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function subscribeToTheme(listener: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, listener);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, listener);
}

export function currentChoice(): ThemeChoice {
  return readChoice(document.documentElement.getAttribute("data-theme-choice"));
}

export function currentTheme(): ResolvedTheme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}
