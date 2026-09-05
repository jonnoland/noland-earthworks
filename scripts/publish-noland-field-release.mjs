#!/usr/bin/env node

import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const mobileRoot = join(root, "noland-earthworks-mobile");
const repository = "jonnoland/noland-earthworks";
const args = process.argv.slice(2);

function readOption(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function printUsage() {
  console.log("Usage: pnpm release:field -- --notes 'Release notes'");
  console.log("Optional: --version 0.4.18 and --apk /absolute/path/to/app-release.apk.");
  console.log("Without --apk, the command builds and signs the configured Noland Field Android release before uploading it to GitHub Releases and the in-app storage channel.");
}

if (args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(0);
}

const mobilePackage = JSON.parse(readFileSync(join(mobileRoot, "package.json"), "utf8"));
const version = readOption("--version") ?? mobilePackage.version;
let apkPath = readOption("--apk");
const requestedNotes = readOption("--notes") ?? "Update available. See the in-app release notes for details.";
const notes = requestedNotes.startsWith("Noland Field")
  ? requestedNotes
  : `Noland Field v${version}: ${requestedNotes}`;

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Provide a semantic version, for example --version 0.4.18.");
  process.exit(1);
}
if (version !== mobilePackage.version) {
  console.error(`The requested version ${version} does not match noland-earthworks-mobile/package.json (${mobilePackage.version}). Update the package and Android metadata before publishing.`);
  process.exit(1);
}
function run(command, commandArgs, cwd = root) {
  const result = spawnSync(command, commandArgs, { cwd, encoding: "utf8", stdio: "pipe" });
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return `${result.stdout}${result.stderr}`;
}

function updateMobileRelease(versionToPublish, storagePath, releaseNotes) {
  const releaseFile = join(root, "server/mobileRelease.ts");
  const source = readFileSync(releaseFile, "utf8");
  const historyEntry = `    {\n      version: "${versionToPublish}",\n      title: "Noland Field update",\n      notes: ${JSON.stringify(releaseNotes)},\n    },\n`;
  const next = source
    .replace(/version: "\d+\.\d+\.\d+"/, `version: "${versionToPublish}"`)
    .replace(/downloadUrl: "[^"]+"/, `downloadUrl: "${storagePath}"`)
    .replace(/notes: "[^"]+"/, `notes: ${JSON.stringify(releaseNotes)}`)
    .replace("  history: [\n", `  history: [\n${historyEntry}`);

  if (next === source) throw new Error("Could not update server/mobileRelease.ts. Review the release channel format before publishing.");
  writeFileSync(releaseFile, next);
}

const stagingDirectory = mkdtempSync(join(tmpdir(), "noland-field-release-"));
const assetName = `noland-field_v${version}.apk`;
const tag = `mobile-v${version}-build1`;

try {
  if (!apkPath) {
    run("pnpm", ["run", "build"], mobileRoot);
    run("pnpm", ["exec", "cap", "sync", "android"], mobileRoot);
    run("./gradlew", [":app:assembleRelease"], join(mobileRoot, "android"));
    apkPath = join(mobileRoot, "android/app/build/outputs/apk/release/app-release.apk");
  }
  if (!existsSync(apkPath)) throw new Error("The signed Noland Field APK was not found after the release build.");

  const stagedApk = join(stagingDirectory, `Noland-Field-v${version}.apk`);
  copyFileSync(apkPath, stagedApk);
  const uploadOutput = run("manus-upload-file", ["--webdev", stagedApk]);
  const storagePath = uploadOutput.match(/Storage Path:\s*(\/manus-storage\/\S+\.apk)/)?.[1];
  if (!storagePath) throw new Error("The in-app storage upload did not return a usable APK path.");

  const releaseExists = spawnSync("gh", ["release", "view", tag, "--repo", repository], { cwd: root, stdio: "ignore" }).status === 0;
  if (releaseExists) {
    run("gh", ["release", "upload", tag, `${stagedApk}#${assetName}`, "--repo", repository, "--clobber"]);
    run("gh", ["release", "edit", tag, "--repo", repository, "--title", `Noland Field v${version}`, "--notes", notes]);
  } else {
    run("gh", ["release", "create", tag, `${stagedApk}#${assetName}`, "--repo", repository, "--target", "main", "--title", `Noland Field v${version}`, "--notes", notes]);
  }

  updateMobileRelease(version, storagePath, notes);
  console.log(JSON.stringify({ version, storagePath, githubRelease: `https://github.com/${repository}/releases/tag/${tag}` }, null, 2));
} finally {
  rmSync(stagingDirectory, { recursive: true, force: true });
}
