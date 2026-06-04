import { runSeoAudit } from "./server/seoAudit";

async function main() {
  const url = "https://nolandearthworks.com";
  console.log(`\nRunning SEO audit on ${url}...\n`);

  const result = await runSeoAudit(url, process.env.GOOGLE_PLACES_API_KEY);

  console.log(`Overall Score: ${result.overallScore}/100 (Grade: ${result.overallGrade})`);
  console.log(`  On-Page:     ${result.onPageScore}/100`);
  console.log(`  Links:       ${result.linksScore}/100`);
  console.log(`  Usability:   ${result.usabilityScore}/100`);
  console.log(`  Performance: ${result.performanceScore}/100`);
  console.log(`  Social:      ${result.socialScore}/100`);

  const failed = result.checks.filter((c) => c.status === "fail");
  const warned = result.checks.filter((c) => c.status === "warn");
  const passed = result.checks.filter((c) => c.status === "pass");

  console.log(`\nResults: ${passed.length} PASS | ${warned.length} WARN | ${failed.length} FAIL`);

  if (failed.length > 0) {
    console.log("\n--- FAILED CHECKS ---");
    for (const c of failed) {
      console.log(`  [FAIL] ${c.name}`);
      if (c.detail) console.log(`         ${c.detail}`);
    }
  }

  if (warned.length > 0) {
    console.log("\n--- WARNINGS ---");
    for (const c of warned) {
      console.log(`  [WARN] ${c.name}`);
      if (c.detail) console.log(`         ${c.detail}`);
    }
  }

  if (passed.length > 0) {
    console.log("\n--- PASSED CHECKS ---");
    for (const c of passed) {
      console.log(`  [PASS] ${c.name}`);
    }
  }

  console.log("\n--- TOP RECOMMENDATIONS ---");
  for (const r of result.recommendations.slice(0, 10)) {
    console.log(`  [${r.priority.toUpperCase()}] ${r.text}`);
  }
}

main().catch(console.error);
