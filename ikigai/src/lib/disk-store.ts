/**
 * Server-side file store — data lives on disk in the project folder.
 * Path: <project>/data/ikigai-store.json
 */

import { promises as fs } from "fs";
import path from "path";
import type { AppData } from "./types";
import { normalizeAppData } from "./storage";

export const DISK_FILENAME = "ikigai-store.json";

export function getDataDir(): string {
  return path.join(process.cwd(), "data");
}

export function getStorePath(): string {
  return path.join(getDataDir(), DISK_FILENAME);
}

export async function readDiskStore(): Promise<AppData | null> {
  try {
    const raw = await fs.readFile(getStorePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return normalizeAppData(parsed);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    console.warn("[ikigai] Failed to read disk store", err);
    return null;
  }
}

export async function writeDiskStore(data: AppData): Promise<void> {
  const dir = getDataDir();
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${getStorePath()}.tmp`;
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(tmp, json, "utf8");
  await fs.rename(tmp, getStorePath());
}

export async function clearDiskStore(): Promise<void> {
  try {
    await fs.unlink(getStorePath());
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }
}
