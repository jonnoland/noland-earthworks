export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  jobberClientId: process.env.JOBBER_CLIENT_ID ?? "",
  jobberClientSecret: process.env.JOBBER_CLIENT_SECRET ?? "",
  // Canonical Jobber OAuth redirect URI — must match exactly what is registered in the Jobber developer app.
  // Defaults to the non-www production URL. Override via JOBBER_REDIRECT_URI secret if needed.
  jobberRedirectUri: process.env.JOBBER_REDIRECT_URI ?? "https://nolandearthworks.com/api/jobber/callback",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
  ownerPhone: process.env.OWNER_PHONE ?? "",
};
