// Moves profiles saved by gguser <= 1.2.0 to ~/.gguser.json during `npm install`.
//
// Those versions stored gguser.json inside the package directory, which npm replaces on
// update. npm keeps the previous version in a renamed sibling folder (e.g. `.gguser-AbC123`)
// until install scripts have run, so the old file can still be copied from there.
//
// Install scripts run without a terminal, so this never prompts. It never overwrites an
// existing ~/.gguser.json and never fails the install.

import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const packageDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const parentDir = path.dirname(packageDir);

// Under `sudo npm install -g`, HOME may be root's; use the invoking user's home instead
const sudoUser = process.getuid?.() === 0 && process.env.SUDO_USER;

const homeDir = () => {
  if (sudoUser && /^[a-z_][a-z0-9_.-]*$/i.test(sudoUser)) {
    const home = execFileSync("sh", ["-c", `echo ~${sudoUser}`]).toString().trim();
    if (path.isAbsolute(home)) return home;
  }
  return os.homedir();
};

const findLegacyConfig = () => {
  const candidates = [
    path.join(packageDir, "gguser.json"),
    ...fs
      .readdirSync(parentDir)
      .filter((name) => name.startsWith(".gguser-"))
      .map((name) => path.join(parentDir, name, "gguser.json")),
  ];

  // Most recently written first, in case npm left more than one old copy behind
  return candidates
    .filter((file) => {
      try {
        const config = JSON.parse(fs.readFileSync(file, "utf8"));
        return Object.keys(config.users || {}).length > 0;
      } catch {
        return false;
      }
    })
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
};

try {
  const target = path.join(homeDir(), ".gguser.json");
  const legacy = !fs.existsSync(target) && findLegacyConfig();

  if (legacy) {
    fs.copyFileSync(legacy, target, fs.constants.COPYFILE_EXCL);
    if (sudoUser && process.env.SUDO_UID && process.env.SUDO_GID) {
      fs.chownSync(target, Number(process.env.SUDO_UID), Number(process.env.SUDO_GID));
    }
    console.log(`📦 gguser: moved your profiles to ${target}`);
  }
} catch {
  // Best effort: the README explains how to copy profiles by hand
}
