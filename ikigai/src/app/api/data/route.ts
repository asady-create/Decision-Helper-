import { NextResponse } from "next/server";
import type { AppData } from "@/lib/types";
import {
  clearDiskStore,
  getStorePath,
  readDiskStore,
  writeDiskStore,
} from "@/lib/disk-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isEmpty(data: AppData): boolean {
  const m = data.map;
  if (m) {
    if (
      [m.want, m.goodAt, m.need, m.reward, m.offer, m.synthesis].some((s) =>
        s?.trim()
      )
    ) {
      return false;
    }
    if (m.skillsHave.length || m.skillsLack.length || m.values?.length) {
      return false;
    }
  }
  if (data.notes?.length || data.insights?.length || data.timeline?.length)
    return false;
  if ((data.quotes?.length ?? 0) > 0 || Object.keys(data.habits ?? {}).length)
    return false;
  return true;
}

export async function GET() {
  const data = await readDiskStore();
  return NextResponse.json({
    data: data ?? {
      map: null,
      notes: [],
      insights: [],
      timeline: [],
      timelineAreas: [],
      quotes: [],
      habits: {},
    },
    path: getStorePath(),
    exists: data !== null,
  });
}

async function save(req: Request) {
  let body: AppData;
  try {
    body = (await req.json()) as AppData;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming: AppData = {
    map: body.map ?? null,
    notes: body.notes ?? [],
    insights: body.insights ?? [],
    timeline: body.timeline ?? [],
    timelineAreas: body.timelineAreas ?? [],
    quotes: body.quotes ?? [],
    habits: body.habits ?? {},
  };

  // Never let an empty payload wipe a rich disk file
  if (isEmpty(incoming)) {
    const existing = await readDiskStore();
    if (existing && !isEmpty(existing)) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "empty_overwrite_blocked",
        path: getStorePath(),
      });
    }
  }

  await writeDiskStore(incoming);
  return NextResponse.json({ ok: true, path: getStorePath() });
}

export async function PUT(req: Request) {
  return save(req);
}

/** sendBeacon uses POST */
export async function POST(req: Request) {
  return save(req);
}

export async function DELETE() {
  await clearDiskStore();
  return NextResponse.json({ ok: true });
}
