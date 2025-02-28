#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import inquirer from "inquirer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, "..", "gguser.json");

if (!fs.existsSync(CONFIG_PATH) || fs.readFileSync(CONFIG_PATH, "utf8").trim() === "") {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ users: {}, directories: {} }, null, 2));
}

let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
} catch (error) {
  console.error("❌ Error reading config file. Resetting...");
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ users: {}, directories: {} }, null, 2));
  config = { users: {}, directories: {} };
}

if (!config.directories) {
  config.directories = {};
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Usage:
  gguser add <profile> <name> <email> [ssh_key]  Add a new Git profile with optional SSH key
  gguser <profile>                                Switch to a Git profile
  gguser list                                     List available profiles
  gguser select                                   Interactive profile selection
  gguser now                                      Show current Git user
  gguser remove <profile>                         Remove a Git profile
  gguser link <profile> [directory]               Link a profile to the current directory
  gguser unlink [directory]                       Remove an auto-switching rule
`);
  process.exit(1);
}

const command = args[0];
const directory = process.cwd();

if (command === "add") {
  const [profile, name, email, sshKey] = args.slice(1);
  if (!profile || !name || !email) {
    console.error("Usage: gguser add <profile> <name> <email> [ssh_key]");
    process.exit(1);
  }

  config.users[profile] = { name, email, sshKey };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`✅ Added profile: ${profile}`);
} else if (command === "list") {
  const profiles = Object.keys(config.users);
  if (profiles.length === 0) {
    console.log("❌ No profiles found. Add one using: gguser add <profile> <name> <email> [ssh_key]");
  } else {
    console.log("📝 Available Profiles:");
    profiles.forEach((profile) => {
      console.log(`- ${profile}: ${config.users[profile].name} <${config.users[profile].email}>`);
    });
  }
} else if (command === "now") {
  let currentUser, currentEmail;
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
  const user = config.users[command];
  const scope = fs.existsSync(".git") ? "--local" : "--global";
  execSync(`git config ${scope} user.name "${user.name}"`);
  execSync(`git config ${scope} user.email "${user.email}"`);
  if (user.sshKey) {
    if (fs.existsSync(user.sshKey)) {
      execSync(`ssh-add ${user.sshKey}`);
      console.log(`🔑 SSH key ${user.sshKey} added`);
    } else {
      console.error(`❌ SSH key not found: ${user.sshKey}`);
    }
  }
  console.log(`✅ Switched to ${command}`);
} else if (command === "select") {
  const choices = Object.keys(config.users);
  if (choices.length === 0) {
    console.log("❌ No profiles found. Add one using: gguser add <profile> <name> <email> [ssh_key]");
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
      const user = config.users[answers.profile];
      const scope = fs.existsSync(".git") ? "--local" : "--global";
      execSync(`git config ${scope} user.name "${user.name}"`);
      execSync(`git config ${scope} user.email "${user.email}"`);
      if (user.sshKey) {
        if (fs.existsSync(user.sshKey)) {
          execSync(`ssh-add ${user.sshKey}`);
          console.log(`🔑 SSH key ${user.sshKey} added`);
        } else {
          console.error(`❌ SSH key not found: ${user.sshKey}`);
        }
      }
      console.log(`✅ Switched to ${answers.profile}`);
    })
    .catch((error) => console.error("Error selecting profile:", error));
} else {
  console.log(`❌ Profile not found. Add with: gguser add <profile> <name> <email> [ssh_key]`);
}
