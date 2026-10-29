export type Theme = "system" | "light" | "dark";
export const KEY = "jphoto-theme";
export const darkQuery = "(prefers-color-scheme: dark)";

/**
 * Runs in <head> before the page paints, so a saved light theme never flashes dark first.
 * "system" follows the phone or computer setting. Kept apart from lib/theme.ts so the server layout can import it.
 */
export const themeScript = `try{var t=localStorage.getItem("${KEY}")||"system";if(t==="system")t=matchMedia("${darkQuery}").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;
