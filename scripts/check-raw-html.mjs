import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.RAW_HTML_BASE_URL;

async function readArtifact(route, localFile) {
  if (baseUrl) {
    const response = await fetch(new URL(route, baseUrl));
    assert.equal(response.status, 200, `${route} returned ${response.status}`);
    return response.text();
  }

  return readFile(path.join(process.cwd(), localFile), "utf8");
}

const landing = await readArtifact("/", ".next/server/app/index.html");
const dashboard = await readArtifact("/dashboard", ".next/server/app/dashboard.html");
const robots = await readArtifact("/robots.txt", ".next/server/app/robots.txt.body");
const sitemap = await readArtifact("/sitemap.xml", ".next/server/app/sitemap.xml.body");
const llms = await readArtifact("/llms.txt", "public/llms.txt");
const readme = await readFile(path.join(process.cwd(), "README.md"), "utf8");
const videoPackage = await readFile(path.join(process.cwd(), "docs", "kwik-112-round2-video.md"), "utf8");
const narration = (await readFile(path.join(process.cwd(), "docs", "kwik-112-round2-narration.txt"), "utf8")).trim();
const captions = await readFile(path.join(process.cwd(), "public", "kwik-112-round2.vtt"), "utf8");

const requiredLandingText = [
  "Kwik 112",
  "Kwik 112 puts an AI voice call-taker inside India&#x27;s 112 emergency calls",
  "Working Build",
  "End-to-End Thinking",
  "Innovation",
  "Impact",
  "Technical Depth",
  "Presentation",
  "100%",
  "9/9",
  "60%",
  "23.3%",
  "16.7%",
  "An independent browser-based build",
  "An official 112, ERSS, government, or C-DAC service",
];

for (const text of requiredLandingText) {
  assert.ok(landing.includes(text), `landing HTML is missing: ${text}`);
}

for (const href of [
  "/dashboard",
  "/dashboard?startCall=1#voice-station",
  "https://github.com/JAYATIAHUJA/pulse112-tactical-cad",
  "evaluation/results",
  "/llms.txt",
]) {
  assert.ok(landing.includes(href), `landing HTML is missing link: ${href}`);
}

const noscript = dashboard.match(/<noscript>([\s\S]*?)<\/noscript>/i)?.[1] ?? "";
assert.ok(
  noscript.includes("Kwik 112 dispatch console:") &&
    noscript.includes("JavaScript is required for the live voice call") &&
    noscript.includes("not an official 112 service"),
  "dashboard HTML is missing its noscript summary",
);

for (const crawler of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"]) {
  assert.ok(robots.includes(`User-Agent: ${crawler}`), `robots.txt is missing: ${crawler}`);
}
assert.ok(robots.includes("Sitemap:"), "robots.txt is missing its sitemap reference");
assert.ok(sitemap.includes("<loc>") && sitemap.includes("/dashboard</loc>"), "sitemap.xml is missing public routes");
assert.ok(llms.includes("# Kwik 112") && llms.includes("9/9") && llms.includes("/dashboard"), "llms.txt is incomplete");
assert.ok(llms.includes("/dashboard?startCall=1#voice-station"), "llms.txt has a stale call-launch URL");
assert.ok(readme.includes("http://localhost:3000/dashboard?startCall=1#voice-station"), "README is missing the local call-launch URL");
assert.ok(!readme.includes("](/dashboard"), "README contains an unlabeled relative app link");
assert.ok(!readme.includes("?voice=1") && !llms.includes("?voice=1"), "a stale voice=1 launch URL remains");

const normalize = (value) => value.replace(/\s+/g, " ").trim();
const captionNarration = captions
  .split(/\r?\n/)
  .filter((line) => line && line !== "WEBVTT" && !line.includes("-->"))
  .join(" ");
assert.ok(readme.includes(narration), "README transcript does not include the canonical narration verbatim");
assert.ok(videoPackage.includes(narration), "video package does not include the canonical narration verbatim");
assert.equal(normalize(captionNarration), normalize(narration), "VTT narration differs from the canonical narration");
assert.ok(captions.includes("01:46.000 --> 01:55.000"), "VTT runtime must end at or before 1:55");

console.log("Raw HTML and discovery files contain the required identity, rubric, evidence, links, and fallback.");
