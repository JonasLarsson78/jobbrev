#!/usr/bin/env node
/**
 * Släpper en ny version av Jobbrev.
 *
 * Versionen bor på fem ställen (package.json, package-lock.json,
 * tauri.conf.json, Cargo.toml, Cargo.lock) och måste vara samma överallt —
 * annars får .dmg:n ett annat versionsnummer än taggen. Skriptet skriver alla
 * fem, committar och pushar taggen.
 *
 * Bygget och publiceringen gör .github/workflows/release.yml på en
 * macOS-runner, så .dmg:n byggs från exakt det som ligger i repot.
 *
 *   npm run release -- patch          0.1.0 → 0.1.1
 *   npm run release -- minor          0.1.0 → 0.2.0
 *   npm run release -- major          0.1.0 → 1.0.0
 *   npm run release -- 1.4.0          exakt version
 *
 *   -m <text>     rad om vad som hänt; hamnar överst i releasen (kan upprepas)
 *   --dry-run     visa vad som skulle hända, ändra ingenting
 *   --any-branch  tillåt release från en annan gren än main
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const PACKAGE_JSON = "package.json";
const TAURI_CONF = "src-tauri/tauri.conf.json";
const CARGO_TOML = "src-tauri/Cargo.toml";
const CARGO_LOCK = "src-tauri/Cargo.lock";
const WORKFLOW = ".github/workflows/release.yml";

/** Filerna skriptet rör, och som ska kunna återställas om något går snett. */
const VERSION_FILES = [PACKAGE_JSON, "package-lock.json", TAURI_CONF, CARGO_TOML, CARGO_LOCK];

const MAIN_BRANCH = "main";

// ── Hjälpare ────────────────────────────────────────────────────────────────

function fail(message, hint) {
  console.error(`\n✖ ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

function step(message) {
  console.log(`\n▸ ${message}`);
}

/** Kör ett kommando och visar utskriften. */
function run(command, args) {
  execFileSync(command, args, { cwd: ROOT, stdio: "inherit" });
}

/** Kör ett kommando och returnerar utskriften. */
function capture(command, args) {
  return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
}

/** Som capture, men ett misslyckat kommando ger null i stället för ett kast. */
function tryCapture(command, args) {
  try {
    return capture(command, args);
  } catch {
    return null;
  }
}

function read(file) {
  return readFileSync(join(ROOT, file), "utf8");
}

// ── Argument ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

let target;
let dryRun = false;
let anyBranch = false;
let askedForHelp = false;

/** Varje -m blir ett stycke, precis som git commit -m -m. */
const messages = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];

  if (arg === "-m" || arg === "--message") {
    const value = argv[++i];
    if (value === undefined) {
      fail("-m saknar ett meddelande.", 'Skriv t.ex. -m "Rensa tömmer nu annonsrutan."');
    }
    messages.push(value);
  } else if (arg.startsWith("-m=")) {
    messages.push(arg.slice("-m=".length));
  } else if (arg.startsWith("--message=")) {
    messages.push(arg.slice("--message=".length));
  } else if (arg === "--dry-run") {
    dryRun = true;
  } else if (arg === "--any-branch") {
    anyBranch = true;
  } else if (arg === "--help" || arg === "-h") {
    askedForHelp = true;
  } else if (arg.startsWith("-")) {
    fail(`Okänd flagga: ${arg}`, "Kör med --help för att se vad som finns.");
  } else if (target === undefined) {
    target = arg;
  } else {
    fail(
      `Oväntat argument: ${arg}`,
      'Flera ord i ett meddelande behöver citattecken: -m "två ord".',
    );
  }
}

// Tomma -m "" är lika bra som inget meddelande alls.
const notes = messages.map((message) => message.trim()).filter(Boolean).join("\n\n");

if (askedForHelp || !target) {
  console.log(
    [
      "",
      "  npm run release -- <patch|minor|major|x.y.z> [flaggor]",
      "",
      "  -m <text>     rad om vad som hänt; hamnar överst i releasen (kan upprepas)",
      "  --dry-run     visa vad som skulle hända, ändra ingenting",
      "  --any-branch  tillåt release från en annan gren än main",
      "",
      "  Bygget och publiceringen sker i GitHub Actions när taggen pushas.",
      "  Utan -m står bara de automatiska noterna i releasen.",
      "",
    ].join("\n"),
  );
  // Att glömma versionen är ett misstag; att be om hjälpen är det inte.
  process.exit(askedForHelp ? 0 : 1);
}

// ── Versionsnummer ──────────────────────────────────────────────────────────

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

const currentVersion = JSON.parse(read(PACKAGE_JSON)).version;
if (!SEMVER.test(currentVersion)) {
  fail(`Nuvarande version (${currentVersion}) är inte x.y.z.`);
}

/**
 * macOS bygger CFBundleShortVersionString av den här strängen, så den måste
 * vara rent numerisk — inga suffix som 1.0.0-beta.1.
 */
function nextVersion(current, how) {
  if (SEMVER.test(how)) return how;
  const [major, minor, patch] = current.split(".").map(Number);
  if (how === "major") return `${major + 1}.0.0`;
  if (how === "minor") return `${major}.${minor + 1}.0`;
  if (how === "patch") return `${major}.${minor}.${patch + 1}`;
  return fail(
    `Förstår inte "${how}".`,
    "Ange patch, minor, major eller en version på formen 1.4.0.",
  );
}

const version = nextVersion(currentVersion, target);
const tag = `v${version}`;
const productName = JSON.parse(read(TAURI_CONF)).productName;

/**
 * Taggens första rad är rubriken; resten är det -m gav. Workflowen läser
 * kroppen och lägger den överst i releasen, ovanför de automatiska noterna.
 */
const tagMessage = [`${productName} ${version}`, notes].filter(Boolean).join("\n\n");

// ── Förkontroller ───────────────────────────────────────────────────────────

step(`Kontrollerar att allt är redo för ${tag}`);

if (!tryCapture("git", ["rev-parse", "--is-inside-work-tree"])) {
  fail("Det här är inget git-repo.");
}

if (!existsSync(join(ROOT, WORKFLOW))) {
  fail(
    `Hittar inte ${WORKFLOW}.`,
    "Utan den bygger och publicerar ingenting när taggen pushas.",
  );
}

const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
if (branch !== MAIN_BRANCH && !anyBranch) {
  fail(
    `Du står på grenen ${branch}, inte ${MAIN_BRANCH}.`,
    "Byt gren, eller kör med --any-branch om det är meningen.",
  );
}

if (capture("git", ["status", "--porcelain"])) {
  fail(
    "Arbetsträdet har oincheckade ändringar.",
    "Committa eller stasha dem först — taggen ska peka på exakt det som byggs.",
  );
}

// Utan en fetch vet vi inte vilka taggar som redan finns på origin. Går den
// inte igenom är det värt en varning, men inte värt att stoppa släppet —
// pushen längre ned klagar ändå om vi är ur fas.
if (tryCapture("git", ["fetch", "--tags", "origin"]) === null) {
  console.warn("  ! Kunde inte hämta från origin — fortsätter utan att veta vad som finns där.");
}

const behind = tryCapture("git", ["rev-list", "--count", `HEAD..origin/${branch}`]);
if (behind && Number(behind) > 0) {
  fail(`Grenen ligger ${behind} commit(ar) efter origin/${branch}.`, "Kör git pull först.");
}

if (capture("git", ["tag", "-l", tag])) {
  fail(`Taggen ${tag} finns redan lokalt.`, "Välj en annan version.");
}
if (tryCapture("git", ["ls-remote", "--tags", "origin", tag])) {
  fail(`Taggen ${tag} finns redan på origin.`, "Välj en annan version.");
}

console.log(`  ${currentVersion} → ${version} (gren ${branch})`);
console.log(
  notes
    ? notes
        .split("\n")
        .map((line) => `  | ${line}`)
        .join("\n")
    : '  (inget meddelande — lägg till -m "..." om releasen behöver en rad)',
);

if (dryRun) {
  console.log(
    [
      "",
      "Torrkörning — ingenting ändrades. Det här skulle ha hänt:",
      ...VERSION_FILES.map((file) => `  skriv ${version} i ${file}`),
      "  npm run typecheck",
      `  git commit -m "chore: release ${tag}"`,
      `  git tag -a ${tag} -m "${tagMessage.split("\n")[0]}${notes ? " …" : ""}"`,
      `  git push origin ${branch} && git push origin ${tag}`,
      "  → GitHub Actions bygger .dmg:n och publicerar releasen",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

// ── Skriv versionen ─────────────────────────────────────────────────────────

/** Byter ut första träffen, och klagar om mönstret inte finns alls. */
function replaceOnce(file, pattern, replacement) {
  const before = read(file);
  const after = before.replace(pattern, replacement);
  if (after === before) {
    fail(`Hittade inget versionsfält att byta ut i ${file}.`, "Filen kan ha ändrat format.");
  }
  writeFileSync(join(ROOT, file), after);
}

step(`Skriver ${version} i ${VERSION_FILES.length} filer`);

// npm sköter package.json och package-lock.json i ett svep.
run("npm", ["version", version, "--no-git-tag-version", "--allow-same-version"]);
replaceOnce(TAURI_CONF, /"version":\s*"[^"]*"/, `"version": "${version}"`);
replaceOnce(CARGO_TOML, /^version\s*=\s*"[^"]*"/m, `version = "${version}"`);
replaceOnce(
  CARGO_LOCK,
  /(\[\[package\]\]\nname = "jobbrev"\nversion = ")[^"]*(")/,
  `$1${version}$2`,
);

/** Lägger tillbaka versionsfilerna om något faller — inget halvsläpp. */
function restoreVersions() {
  console.error("\n  Återställer versionsfilerna.");
  try {
    run("git", ["checkout", "--", ...VERSION_FILES]);
  } catch {
    console.error("  ! Gick inte att återställa automatiskt. Kolla: git diff");
  }
}

// ── Typkontroll, commit och tagg ────────────────────────────────────────────

// Bygget sker i CI, men ett typfel ska stoppa oss innan taggen finns — annars
// står en trasig tagg kvar i repot medan Actions rödmarkerar.
try {
  step("Typkontroll");
  run("npm", ["run", "typecheck"]);
} catch (error) {
  restoreVersions();
  fail(`Typkontrollen gick inte igenom: ${error.message}`);
}

try {
  if (capture("git", ["status", "--porcelain"])) {
    step(`Commit och tagg ${tag}`);
    run("git", ["add", ...VERSION_FILES]);
    run("git", ["commit", "-m", `chore: release ${tag}`]);
  } else {
    step(`Versionen var redan skriven — taggar HEAD som ${tag}`);
  }
  run("git", ["tag", "-a", tag, "-m", tagMessage]);
} catch (error) {
  restoreVersions();
  fail(`Kunde inte committa eller tagga: ${error.message}`);
}

// ── Push ────────────────────────────────────────────────────────────────────

step(`Pushar ${branch} och ${tag}`);
try {
  run("git", ["push", "origin", branch]);
  run("git", ["push", "origin", tag]);
} catch (error) {
  fail(
    `Pushen gick inte igenom: ${error.message}`,
    `Commiten och taggen finns lokalt. Fixa och kör: git push origin ${branch} && git push origin ${tag}`,
  );
}

/** github.com/ägare/repo, oavsett om origin är https eller ssh. */
function repoSlug() {
  const url = tryCapture("git", ["remote", "get-url", "origin"]) ?? "";
  const match = url.match(/github\.com[:/](.+?)(?:\.git)?$/);
  return match ? match[1] : null;
}

const slug = repoSlug();

console.log(
  [
    `\n✓ ${tag} är pushad. GitHub Actions bygger .dmg:n och publicerar releasen.`,
    slug ? `\n  Följ bygget:  https://github.com/${slug}/actions` : "",
    slug ? `  Releasen:     https://github.com/${slug}/releases/tag/${tag}` : "",
    "",
  ]
    .filter(Boolean)
    .join("\n"),
);
