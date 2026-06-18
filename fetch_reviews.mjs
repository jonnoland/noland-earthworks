import dotenv from "dotenv";
dotenv.config();
const key = process.env.GOOGLE_PLACES_API_KEY;
const placeId = process.env.GOOGLE_PLACE_ID;
const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const fbPageId = process.env.FACEBOOK_PAGE_ID;

console.log("=== GOOGLE ===");
console.log("Key set:", key ? "yes" : "no");
console.log("Place ID:", placeId);
const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&key=${key}`;
const resp = await fetch(url);
const data = await resp.json();
const r = data.result || {};
console.log("Rating:", r.rating);
console.log("Total reviews:", r.user_ratings_total);
const reviews = r.reviews || [];
console.log("Reviews returned:", reviews.length);
reviews.forEach(rv => console.log(`  ${rv.author_name} (${rv.rating}★): ${rv.text?.slice(0,120)}`));

console.log("\n=== FACEBOOK ===");
console.log("Token set:", fbToken ? "yes" : "no");
console.log("Page ID:", fbPageId);
if (fbToken && fbPageId) {
  const fbUrl = `https://graph.facebook.com/v19.0/${fbPageId}/ratings?fields=reviewer,rating,review_text,created_time&access_token=${fbToken}&limit=50`;
  const fbResp = await fetch(fbUrl);
  const fbData = await fbResp.json();
  if (fbData.error) {
    console.log("FB Error:", JSON.stringify(fbData.error));
  } else {
    const fbReviews = fbData.data || [];
    console.log("FB Reviews returned:", fbReviews.length);
    fbReviews.forEach(rv => console.log(`  ${rv.reviewer?.name} (${rv.rating}★): ${rv.review_text?.slice(0,120)}`));
  }
}
