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
  // Google Places API — for fetching Google Business reviews (no approval required)
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
  googlePlaceId: process.env.GOOGLE_PLACE_ID ?? "",
  // Facebook Graph API — for fetching Facebook Page ratings
  facebookPageId: process.env.FACEBOOK_PAGE_ID ?? "",
  facebookPageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "",
  // Facebook App credentials — for webhook management and disconnect
  facebookAppId: process.env.FACEBOOK_APP_ID ?? "",
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET ?? "",
  // Google OAuth — for Google Business Profile integration
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  // Canonical Google OAuth redirect URI — must match what is registered in Google Cloud Console.
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "https://nolandearthworks.com/api/google/callback",
  // Noland Field mobile app PIN — protects field quote endpoints from unauthorized access.
  // Set via FIELD_APP_PIN secret. If unset, defaults to "0000" in dev; blocks access in production.
  fieldAppPin: process.env.FIELD_APP_PIN ?? "",
  // Instagram API (new Instagram Login API) — for direct Instagram content publishing
  instagramAppId: process.env.INSTAGRAM_APP_ID ?? "2397741357399827",
  instagramAppSecret: process.env.INSTAGRAM_APP_SECRET ?? "",
  instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN ?? "",
  instagramUserId: process.env.INSTAGRAM_USER_ID ?? "27187698034196564",
  // X (Twitter) OAuth 2.0 credentials (kept for reference, no longer used for posting)
  twitterClientId: process.env.TWITTER_CLIENT_ID ?? "",
  twitterClientSecret: process.env.TWITTER_CLIENT_SECRET ?? "",
  // Canonical X OAuth redirect URI — kept for reference
  twitterRedirectUri: process.env.TWITTER_REDIRECT_URI ?? "https://nolandearthworks.com/api/x/callback",
  // X (Twitter) OAuth 1.0a static credentials — used for all tweet posting (no browser flow needed)
  twitterApiKey: process.env.TWITTER_API_KEY ?? "",
  twitterApiSecret: process.env.TWITTER_API_SECRET ?? "",
  twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN ?? "",
  twitterAccessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET ?? "",
  // Stripe payment processing
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
  // Manus API key — for creating one-off prospecting tasks on demand via task.create
  manusApiKey: process.env.MANUS_API_KEY ?? "",
  // Google Ads API — for pulling real campaign spend data
  googleAdsDeveloperToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
  googleAdsCustomerId: process.env.GOOGLE_ADS_CUSTOMER_ID ?? "",
  googleAdsRefreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "",
};
