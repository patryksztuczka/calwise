const productionOrigin = "https://calwise.lastlab.win";
const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** Browsers allowed to call the api with credentials: the deployed web app and local dev/preview servers. */
export const isAllowedOrigin = (origin: string): boolean =>
  origin === productionOrigin || localOrigin.test(origin);
