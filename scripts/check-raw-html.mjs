import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.RAW_HTML_BASE_URL;

async function readRoute(route) {
  if (baseUrl) {
    const response = await fetch(new URL(route, baseUrl));
    assert.equal(response.status, 200, `${route} returned ${response.status}`);
    return response.text();
  }

  const file = route === "/" ? "index.html" : `${route.slice(1)}.html`;
  return readFile(path.join(process.cwd(), ".next", "server", "app", file), "utf8");
}

const landing = await readRoute("/");
const dashboard = await readRoute("/dashboard");
const robots = await readFile(path.join(process.cwd(), ".next", "server", "app", "robots.txt.body"), "utf8");
const sitemap = await readFile(path.join(process.cwd(), ".next", "server", "app", "sitemap.xml.body"), "utf8");
const llms = await readFile(path.join(process.cwd(), "public", "llms.txt"), "utf8");

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
  "https://github.com/JAYATIAHUJA/pulse112-tactical-cad",
  "evaluation/results",
  "/llms.txt",
]) {
  assert.ok(landing.includes(href), `landing HTML is missing link: ${href}`);
}

assert.ok(
  dashboard.includes("Kwik 112 dispatch console:") &&
    dashboard.includes("JavaScript is required for the live voice call") &&
    dashboard.includes("not an official 112 service"),
  "dashboard HTML is missing its noscript summary",
);

for (const crawler of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"]) {
  assert.ok(robots.includes(`User-Agent: ${crawler}`), `robots.txt is missing: ${crawler}`);
}
assert.ok(robots.includes("Sitemap:"), "robots.txt is missing its sitemap reference");
assert.ok(sitemap.includes("<loc>") && sitemap.includes("/dashboard</loc>"), "sitemap.xml is missing public routes");
assert.ok(llms.includes("# Kwik 112") && llms.includes("9/9") && llms.includes("/dashboard"), "llms.txt is incomplete");

console.log("Raw HTML and discovery files contain the required identity, rubric, evidence, links, and fallback.");
