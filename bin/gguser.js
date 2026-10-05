#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import inquirer from "inquirer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Stored in the home directory so it survives `npm update`, which replaces the package directory
const CONFIG_PATH = path.join(os.homedir(), ".gguser.json");
const LEGACY_CONFIG_PATH = path.join(__dirname, "..", "gguser.json");

// Migrate the config from the package directory used by versions <= 1.2.0
if (
  !fs.existsSync(CONFIG_PATH) &&
  fs.existsSync(LEGACY_CONFIG_PATH) &&
  fs.readFileSync(LEGACY_CONFIG_PATH, "utf8").trim() !== ""
) {
  fs.copyFileSync(LEGACY_CONFIG_PATH, CONFIG_PATH);
  console.log(`📦 Migrated profiles to ${CONFIG_PATH}`);
}

if (!fs.existsSync(CONFIG_PATH) || fs.readFileSync(CONFIG_PATH, "utf8").trim() === "") {
  fs.writeFileSync(
    CONFIG_PATH,
    JSON.stringify(
      {
        users: {},
        directories: {},
      },
      null,
      2
    )
  );
}

let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
} catch (error) {
  console.error("❌ Error reading config file. Resetting...");
  fs.writeFileSync(
    CONFIG_PATH,
    JSON.stringify(
      {
        users: {},
        directories: {},
      },
      null,
      2
    )
  );
  config = {
    users: {},
    directories: {},
  };
}

if (!config.directories) {
  config.directories = {};
}

const args = process.argv.slice(2);
const directory = process.cwd();

if (args.length === 0) {
  console.log(`
Usage:
  gguser add <profile> <name> <email> [ssh_key] [signing_key]   Add a new Git profile with optional SSH key and GPG signing key
  gguser <profile>                                              Switch to a Git profile
  gguser list                                                   List available profiles
  gguser select                                                 Interactive profile selection
  gguser now                                                    Show current Git user
  gguser remove <profile>                                       Remove a Git profile
  gguser link <profile>                                         Link a profile to the current directory
  gguser unlink                                                 Remove an auto-switching rule
`);
  process.exit(1);
}

const switchProfile = (profile) => {
  const user = config.users[profile];
  const scope = fs.existsSync(".git") ? "--local" : "--global";
  execSync(`git config ${scope} user.name "${user.name}"`);
  execSync(`git config ${scope} user.email "${user.email}"`);
  if (user.signingKey) {
    execSync(`git config ${scope} user.signingkey "${user.signingKey}"`);
    console.log(`🔏 Signing key ${user.signingKey} set`);
  } else {
    // Clear a signing key left over from another profile, but keep one the user set manually
    let currentKey;
    try {
      currentKey = execSync(`git config ${scope} --get user.signingkey`, { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {}
    const profileKeys = Object.values(config.users).map((u) => u.signingKey);
    if (currentKey && profileKeys.includes(currentKey)) {
      execSync(`git config ${scope} --unset user.signingkey`);
    }
  }
  if (user.sshKey) {
    if (fs.existsSync(user.sshKey)) {
      execSync(`ssh-add ${user.sshKey}`);
      console.log(`🔑 SSH key ${user.sshKey} added`);
    } else {
      console.error(`❌ SSH key not found: ${user.sshKey}`);
    }
  }
  console.log(`✅ Switched to ${profile}`);
};

const command = args[0];

if (command === "add") {
  const [profile, name, email, sshKey, signingKey] = args.slice(1);
  if (!profile || !name || !email) {
    console.error("Usage: gguser add <profile> <name> <email> [ssh_key] [signing_key]");
    process.exit(1);
  }

  config.users[profile] = {
    name,
    email,
    sshKey: sshKey || undefined,
    signingKey: signingKey || undefined,
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`✅ Added profile: ${profile}`);
} else if (command === "list") {
  const profiles = Object.keys(config.users);
  if (profiles.length === 0) {
    console.log("❌ No profiles found. Add one using: gguser add <profile> <name> <email> [ssh_key] [signing_key]");
  } else {
    console.log("📝 Available Profiles:");
    profiles.forEach((profile) => {
      const user = config.users[profile];
      const signing = user.signingKey ? ` [signing key: ${user.signingKey}]` : "";
      console.log(`- ${profile}: ${user.name} <${user.email}>${signing}`);
    });
  }
} else if (command === "link") {
  const profile = args[1];

  if (!profile || !config.users[profile]) {
    console.log("❌ Profile not found. Use `gguser list` to see available profiles.");

    process.exit(1);
  }

  config.directories[directory] = profile;

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  console.log(`🔗 Linked profile '${profile}' to directory '${directory}'`);
} else if (command === "unlink") {
  if (!config.directories[directory]) {
    console.log("❌ No profile linked to this directory.");

    process.exit(1);
  }

  delete config.directories[directory];

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  console.log(`🚫 Unlinked profile from directory '${directory}'`);
} else if (command === "now") {
  let currentUser, currentEmail;
  if (config.directories[directory]) {
    const linkedProfile = config.directories[directory];

    const user = config.users[linkedProfile];

    console.log(`📂 Directory Linked Profile: ${linkedProfile}`);

    console.log(`👤 Current Git User: ${user.name} <${user.email}>`);

    process.exit(0);
  }
  try {
    currentUser = execSync("git config --local user.name").toString().trim();
    currentEmail = execSync("git config --local user.email").toString().trim();
  } catch {
    try {
      currentUser = execSync("git config --global user.name").toString().trim();
      currentEmail = execSync("git config --global user.email").toString().trim();
    } catch {
      console.log("⚠️ No Git user configured in this scope.");
      process.exit(1);
    }
  }
  console.log(`👤 Current Git User: ${currentUser} <${currentEmail}>`);
} else if (command === "remove") {
  const profileToRemove = args[1];

  if (!profileToRemove || !config.users[profileToRemove]) {
    console.log("❌ Profile not found. Use `gguser list` to see available profiles.");
    process.exit(1);
  }

  delete config.users[profileToRemove];
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`🗑️ Removed profile: ${profileToRemove}`);
} else if (Object.keys(config.users).includes(command)) {
  switchProfile(command);
} else if (command === "select") {
  const choices = Object.keys(config.users);
  if (choices.length === 0) {
    console.log("❌ No profiles found. Add one using: gguser add <profile> <name> <email> [ssh_key] [signing_key]");
    process.exit(1);
  }

  inquirer
    .prompt([
      {
        type: "list",
        name: "profile",
        message: "Select a Git profile:",
        choices,
      },
    ])
    .then((answers) => {
      switchProfile(answers.profile);
    })
    .catch((error) => console.error("Error selecting profile:", error));
} else {
  console.log(`❌ Profile not found. Add with: gguser add <profile> <name> <email> [ssh_key] [signing_key]`);
}
