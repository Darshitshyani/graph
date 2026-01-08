#!/usr/bin/env node
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

process.chdir(rootDir);

// Set a dummy DATABASE_URL if not set (just for Prisma schema validation)
if (!process.env.DATABASE_URL) {
  console.log("⚠️  DATABASE_URL not set, using placeholder for Prisma generate...");
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
}

try {
  console.log("📦 Generating Prisma client...");
  execSync("npx prisma generate", {
    stdio: "inherit",
    env: process.env,
  });

  console.log("🏗️  Building React Router app...");
  execSync("npm run build", {
    stdio: "inherit",
    env: process.env,
  });

  console.log("✅ Build completed successfully!");
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}
