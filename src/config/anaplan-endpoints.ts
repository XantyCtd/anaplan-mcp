/**
 * Centralized Anaplan endpoint configuration.
 *
 * REST API and authentication endpoints are intentionally kept separate.
 * The September 2026 deprecation notice concerns legacy regional REST API
 * endpoints, not the authentication services.
 */
export const ANAPLAN_REST_API_BASE_URL = "https://api.anaplan.com/2/0";
export const ANAPLAN_AUTH_BASE_URL = "https://auth.anaplan.com";
export const ANAPLAN_OAUTH_BASE_URL = "https://us1a.app.anaplan.com";

export const ANAPLAN_AUTHENTICATE_URL =
  `${ANAPLAN_AUTH_BASE_URL}/token/authenticate`;
export const ANAPLAN_REFRESH_URL =
  `${ANAPLAN_AUTH_BASE_URL}/token/refresh`;
export const ANAPLAN_OAUTH_DEVICE_CODE_URL =
  `${ANAPLAN_OAUTH_BASE_URL}/oauth/device/code`;
export const ANAPLAN_OAUTH_TOKEN_URL =
  `${ANAPLAN_OAUTH_BASE_URL}/oauth/token`;
