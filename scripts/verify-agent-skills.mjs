import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const routerPath = join(root, ".agents/skills/skill-router.json");
const router = JSON.parse(await readFile(routerPath, "utf8"));
const failures = [];

for (const [name, description] of Object.entries(router)) {
  const skillPath = join(root, ".agents/skills", name, "SKILL.md");
  try {
    const content = await readFile(skillPath, "utf8");
    if (!content.startsWith("---\n") || !content.includes(`name: ${name}`)) {
      failures.push(`Skill frontmatter is missing or mismatched: ${name}`);
    }
    if (!description.trim()) failures.push(`Skill description is empty: ${name}`);
  } catch {
    failures.push(`Skill file is missing: ${name}`);
  }
}

const expectedAgents = [
  "search-growth-engineer",
  "performance-engineer",
  "mavis-legal-evidence-reviewer",
  "continuity-keeper",
];

for (const name of expectedAgents) {
  const path = join(root, ".github/agents", `${name}.agent.md`);
  try {
    const content = await readFile(path, "utf8");
    if (!content.startsWith("---\n") || !content.includes(`name: ${name}`)) {
      failures.push(`Agent profile frontmatter is missing or mismatched: ${name}`);
    }
    if (!content.includes("description:") || !content.includes("target: github-copilot")) {
      failures.push(`Agent profile metadata is incomplete: ${name}`);
    }
  } catch {
    failures.push(`Agent profile is missing: ${name}`);
  }
}

for (const path of [
  ".agents/skills/vercel-react-best-practices/AGENTS.md",
  ".agents/skills/vercel-react-best-practices/UPSTREAM.md",
  ".agents/skills/vakilsite-search-quality/references/google-search.md",
  "docs/PROJECT-CONTINUITY-2026-11-09.md",
]) {
  try {
    await access(join(root, path));
  } catch {
    failures.push(`Required agent or continuity reference is missing: ${path}`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log(`Agent/skill validation passed: ${Object.keys(router).length} skills, ${expectedAgents.length} specialist agents.`);
