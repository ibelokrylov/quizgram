import {
  backButton,
  init,
  themeParams,
  viewport,
} from "@telegram-apps/sdk-react";

export async function initTelegramSdk() {
  init({ acceptCustomStyles: true });
  backButton.mount();
  themeParams.isMounted();

  if (viewport.bindCssVars.isAvailable()) {
    themeParams.bindCssVars();
  }
}
