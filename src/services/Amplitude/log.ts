import { getInstance } from "./index";

const IS_LOCAL =
  import.meta.env.VITE_ENV === "local" || !import.meta.env.VITE_ENV;

const logCore = (
  name: string,
  rawProperties: { [key: string]: unknown } = {},
) => {
  // strip undefined fields
  const properties = Object.assign({}, rawProperties);
  Object.keys(properties).forEach(
    (key) => properties[key] === undefined && delete properties[key],
  );

  if (IS_LOCAL) {
    // eslint-disable-next-line no-console
    console.debug(`[Amplitude] Event: ${name}, properties:`, properties);
  } else {
    getInstance().track(name, {
      ...properties,
      environment: process.env.REACT_APP_ENV,
    });
  }
};

export const logPageView = (page: string) => {
  if (page) {
    logCore("web_view_page", {
      page,
    });
  }
};

export const logClickMenu = () => {
  logCore("click_menu");
};

export const logClickConnectWallet = () => {
  logCore("click_connect_wallet");
};


export const logConnectWalletSuccess = () => {
  logCore("connect_wallet_success");
};

export const logClickBuildYourLink = () => {
  logCore("log_click_build_your_link");
};