"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useIkigai } from "@/components/providers/ikigai-provider";
import type { TimelineAreaDef, TimelineEvent } from "@/lib/types";
import {
  AREA_COLOR_PRESETS,
  applySubsetOrderByIds,
  datePrecision,
  daysInMonth,
  findArea,
  formatDisplayDate,
  formatShortDate,
  monthOptions,
  parseISODate,
  reindexOrders,
  sortTimeline,
  toISODate,
  toMonthDate,
  yearOptions,
} from "@/lib/timeline";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function todayParts() {
  const n = new Date();
  return { year: n.getFullYear(), month: n.getMonth() + 1, day: n.getDate() };
}

const selectClass =
  "flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30";

/** Width of the spine gutter so the vertical arrow and color marks share one center. */
const SPINE_GUTTER = "w-12 sm:w-14";

/**
 * Month + year always when a date is set; day is optional ("—" = month only).
 * Or leave date entirely unset.
 */
function ClearDatePicker({
  value,
  onChange,
  idPrefix = "date",
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  idPrefix?: string;
}) {
  const precision = datePrecision(value);
  const hasDate = precision !== "none";
  const fallback = todayParts();
  const parts = hasDate
    ? parseISODate(precision === "month" ? `${value}-01` : value!)
    : fallback;
  const years = yearOptions();
  const months = monthOptions();
  const dim = daysInMonth(parts.year, parts.month);
  const days = Array.from({ length: dim }, (_, i) => i + 1);
  const dayValue = precision === "day" ? Math.min(parts.day, dim) : "";

  const emit = (year: number, month: number, day: number | null) => {
    if (day == null) onChange(toMonthDate(year, month));
    else onChange(toISODate(year, month, day));
  };

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
        <input
          type="checkbox"
          checked={!hasDate}
          onChange={(e) => {
            if (e.target.checked) onChange(null);
            else emit(fallback.year, fallback.month, null);
          }}
          className="size-4 rounded border-[var(--border)] accent-[var(--accent)]"
        />
        No date
      </label>

      {hasDate ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label
                className="mb-1 block text-xs text-[var(--muted)]"
                htmlFor={`${idPrefix}-day`}
              >
                Day
              </label>
              <select
                id={`${idPrefix}-day`}
                className={selectClass}
                value={dayValue}
                onChange={(e) => {
                  const v = e.target.value;
                  emit(
                    parts.year,
                    parts.month,
                    v === "" ? null : Number(v)
                  );
                }}
              >
                <option value="">—</option>
                {days.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="mb-1 block text-xs text-[var(--muted)]"
                htmlFor={`${idPrefix}-month`}
              >
                Month
              </label>
              <select
                id={`${idPrefix}-month`}
                className={selectClass}
                value={parts.month}
                onChange={(e) =>
                  emit(
                    parts.year,
                    Number(e.target.value),
                    precision === "day" ? parts.day : null
                  )
                }
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="mb-1 block text-xs text-[var(--muted)]"
                htmlFor={`${idPrefix}-year`}
              >
                Year
              </label>
              <select
                id={`${idPrefix}-year`}
                className={selectClass}
                value={parts.year}
                onChange={(e) =>
                  emit(
                    Number(e.target.value),
                    parts.month,
                    precision === "day" ? parts.day : null
                  )
                }
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-sm text-[var(--foreground)]">
            <span className="text-[var(--muted)]">Selected: </span>
            <span className="font-medium">{formatDisplayDate(value)}</span>
          </p>
          {precision === "month" && (
            <p className="text-xs text-[var(--muted)]">
              Day left blank — only month and year are stored.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Drag the event on the arrow to place it without a date.
        </p>
      )}
    </div>
  );
}

function EventRow({
  event,
  areas,
  active,
  editing,
  canUp,
  canDown,
  onSelect,
  onEdit,
  onDelete,
  onPatch,
  onDoneEdit,
  onMoveUp,
  onMoveDown,
}: {
  event: TimelineEvent;
  areas: TimelineAreaDef[];
  active: boolean;
  editing: boolean;
  canUp: boolean;
  canDown: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPatch: (patch: Partial<TimelineEvent>) => void;
  onDoneEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const meta = findArea(areas, event.areaId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id, disabled: editing });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 40 : undefined,
      }}
      className={cn(
        "group relative list-none rounded-md bg-[var(--background)] py-1.5 pr-1",
        active && "bg-[var(--accent-soft)]/40",
        isDragging && "bg-[var(--surface)] shadow-lg ring-1 ring-[var(--border)]"
      )}
    >
      <div className="flex items-start gap-0">
        <div className="flex w-8 shrink-0 justify-center pt-2">
          <button
            type="button"
            className={cn(
              "rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
              editing
                ? "cursor-not-allowed opacity-30"
                : "cursor-grab touch-none active:cursor-grabbing"
            )}
            aria-label="Drag to reorder"
            title="Drag up or down"
            disabled={editing}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        </div>

        {/* Spine gutter: color mark centered on the vertical arrow */}
        <div
          className={cn(
            "relative z-[1] flex shrink-0 items-center justify-center self-stretch",
            SPINE_GUTTER,
            !editing && "cursor-grab touch-none active:cursor-grabbing"
          )}
          {...(editing ? {} : listeners)}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 h-[3px] w-9 -translate-x-1/2 -translate-y-1/2 rounded-full sm:w-11"
            style={{ backgroundColor: meta.color }}
            title={meta.label}
          />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          {editing ? (
            <div className="space-y-2 pb-1">
              <Input
                value={event.title}
                onChange={(e) => onPatch({ title: e.target.value })}
                aria-label="Event title"
                className="h-9"
              />
              <select
                className={selectClass}
                value={event.areaId}
                onChange={(e) => onPatch({ areaId: e.target.value })}
                aria-label="Area"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
              <ClearDatePicker
                value={event.date}
                onChange={(iso) => onPatch({ date: iso })}
                idPrefix={`row-${event.id}`}
              />
              <Textarea
                value={event.note}
                onChange={(e) => onPatch({ note: e.target.value })}
                placeholder="Note…"
                className="min-h-[64px]"
              />
              <Button size="sm" variant="secondary" onClick={onDoneEdit}>
                Done
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSelect}
              className={cn(
                "w-full py-0.5 text-left",
                "cursor-grab touch-none active:cursor-grabbing"
              )}
              {...listeners}
            >
              <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                {event.title}
              </span>
              <span className="text-[10px] text-[var(--muted)]">
                {formatShortDate(event.date)} · {meta.label}
              </span>
            </button>
          )}
        </div>

        <div className="mt-1 flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canUp || editing}
            className="rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25"
            aria-label="Move up"
            title="Move up"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canDown || editing}
            className="rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-25"
            aria-label="Move down"
            title="Move down"
          >
            <ChevronDown className="size-4" />
          </button>
          {!editing ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded p-1.5 text-[var(--muted)] hover:text-[var(--foreground)]"
              aria-label="Edit event"
              title="Edit"
            >
              <Pencil className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onDoneEdit}
              className="rounded p-1.5 text-[var(--muted)] hover:text-[var(--foreground)]"
              aria-label="Close editor"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1.5 text-[var(--muted)] hover:text-red-600"
            aria-label="Delete event"
            title="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

export function TimelinePage() {
  const {
    ready,
    timeline,
    timelineAreas,
    setTimeline,
    setTimelineAreas,
  } = useIkigai();

  const [date, setDate] = useState<string | null>(() =>
    toMonthDate(todayParts().year, todayParts().month)
  );
  const [title, setTitle] = useState("");
  const [areaId, setAreaId] = useState("offer");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<string | "all">("all");
  const [savedFlash, setSavedFlash] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Local order while rendering; kept in sync with filtered timeline. */
  const [orderIds, setOrderIds] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a small movement so clicks still open/edit
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [showAreas, setShowAreas] = useState(false);
  const [newAreaLabel, setNewAreaLabel] = useState("");
  const [newAreaColor, setNewAreaColor] = useState(AREA_COLOR_PRESETS[0]);
  const [editAreaId, setEditAreaId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    if (!timelineAreas.some((a) => a.id === areaId) && timelineAreas[0]) {
      setAreaId(timelineAreas[0].id);
    }
  }, [timelineAreas, areaId]);

  const sorted = useMemo(() => sortTimeline(timeline), [timeline]);

  const filtered = useMemo(
    () =>
      filter === "all" ? sorted : sorted.filter((e) => e.areaId === filter),
    [sorted, filter]
  );

  const filteredIds = useMemo(() => filtered.map((e) => e.id), [filtered]);

  // Sync list order from saved timeline whenever the filtered set changes.
  useEffect(() => {
    setOrderIds(filteredIds);
  }, [filteredIds]);

  const eventsById = useMemo(() => {
    const map = new Map<string, TimelineEvent>();
    for (const e of timeline) map.set(e.id, e);
    return map;
  }, [timeline]);

  const flash = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1000);
  };

  const persistEvents = (next: TimelineEvent[]) => {
    // `next` must already be in the desired top→bottom order.
    const ordered = reindexOrders(next);
    setOrderIds(
      filter === "all"
        ? ordered.map((e) => e.id)
        : ordered.filter((e) => e.areaId === filter).map((e) => e.id)
    );
    setTimeline(ordered);
    flash();
  };

  const persistAreas = (next: TimelineAreaDef[]) => {
    setTimelineAreas(next);
    flash();
  };

  const addEvent = () => {
    const t = title.trim();
    if (!t) return;
    const base = sortTimeline(timeline);
    const event: TimelineEvent = {
      id: nanoid(10),
      date,
      title: t,
      areaId,
      note: note.trim(),
      createdAt: new Date().toISOString(),
      order: base.length,
    };
    persistEvents([...base, event]);
    setTitle("");
    setNote("");
    setDate(toMonthDate(todayParts().year, todayParts().month));
    setSelectedId(event.id);
    setEditingId(null);
  };

  const removeEvent = (id: string) => {
    persistEvents(sortTimeline(timeline).filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
  };

  const patchEvent = (id: string, patch: Partial<TimelineEvent>) => {
    persistEvents(
      sortTimeline(timeline).map((e) =>
        e.id === id ? { ...e, ...patch } : e
      )
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderIds.indexOf(String(active.id));
    const newIndex = orderIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    const nextIds = arrayMove(orderIds, oldIndex, newIndex);
    setOrderIds(nextIds);
    persistEvents(applySubsetOrderByIds(timeline, nextIds));
  };

  const moveEvent = (id: string, direction: -1 | 1) => {
    const index = orderIds.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= orderIds.length) return;
    const nextIds = arrayMove(orderIds, index, target);
    setOrderIds(nextIds);
    persistEvents(applySubsetOrderByIds(timeline, nextIds));
  };

  const addArea = () => {
    const label = newAreaLabel.trim();
    if (!label) return;
    const area: TimelineAreaDef = {
      id: nanoid(8),
      label,
      color: newAreaColor,
    };
    persistAreas([...timelineAreas, area]);
    setNewAreaLabel("");
    setAreaId(area.id);
  };

  const startEditArea = (a: TimelineAreaDef) => {
    setEditAreaId(a.id);
    setEditLabel(a.label);
    setEditColor(a.color);
  };

  const saveEditArea = () => {
    if (!editAreaId) return;
    const label = editLabel.trim();
    if (!label) return;
    persistAreas(
      timelineAreas.map((a) =>
        a.id === editAreaId ? { ...a, label, color: editColor } : a
      )
    );
    setEditAreaId(null);
  };

  const removeArea = (id: string) => {
    if (timelineAreas.length <= 1) return;
    persistAreas(timelineAreas.filter((a) => a.id !== id));
    if (filter === id) setFilter("all");
    if (areaId === id && timelineAreas[0]) {
      const next = timelineAreas.find((a) => a.id !== id);
      if (next) setAreaId(next.id);
    }
  };

  const selected =
    editingId == null
      ? (sorted.find((e) => e.id === selectedId) ?? null)
      : null;

  if (!ready) {
    return (
      <div className="animate-pulse space-y-4 py-8">
        <div className="h-8 w-40 rounded bg-[var(--surface-2)]" />
        <div className="h-64 rounded-xl bg-[var(--surface-2)]" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
            Timeline
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Chronology
          </h1>
          <p className="mt-2 max-w-lg text-sm text-[var(--muted)]">
            “Most people overestimate what they can do in a year and
            underestimate what they can do in a decade.” — Bill Gates
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs transition-opacity",
            savedFlash
              ? "text-[var(--accent)] opacity-100"
              : "text-[var(--muted)] opacity-40"
          )}
        >
          <Check className="size-3.5" />
          Saved
        </span>
      </header>

      {/* Areas: filter + manage */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition",
                filter === "all"
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                  : "border-[var(--border)] text-[var(--muted)]"
              )}
            >
              All
            </button>
            {timelineAreas.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() =>
                  setFilter((prev) => (prev === a.id ? "all" : a.id))
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition",
                  filter === a.id
                    ? "border-transparent text-white"
                    : "border-[var(--border)] bg-[var(--surface)]"
                )}
                style={
                  filter === a.id
                    ? { backgroundColor: a.color }
                    : { color: a.color }
                }
              >
                <span
                  className="inline-block h-0.5 w-4 rounded-full"
                  style={{ backgroundColor: a.color }}
                />
                {a.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowAreas((v) => !v)}
          >
            <Pencil className="size-3.5" />
            {showAreas ? "Hide areas" : "Edit areas"}
          </Button>
        </div>

        <AnimatePresence>
          {showAreas && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Areas
                </h2>
                <ul className="mt-3 space-y-2">
                  {timelineAreas.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                    >
                      {editAreaId === a.id ? (
                        <>
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="h-8 w-10 cursor-pointer rounded border border-[var(--border)] bg-transparent"
                            aria-label="Color"
                          />
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="h-8 flex-1"
                            aria-label="Area name"
                          />
                          <Button size="sm" variant="accent" onClick={saveEditArea}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditAreaId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <span
                            className="inline-block h-[3px] w-8 rounded-full"
                            style={{ backgroundColor: a.color }}
                          />
                          <span className="min-w-0 flex-1 text-sm font-medium text-[var(--foreground)]">
                            {a.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditArea(a)}
                            className="rounded p-1.5 text-[var(--muted)] hover:text-[var(--foreground)]"
                            aria-label={`Edit ${a.label}`}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeArea(a.id)}
                            disabled={timelineAreas.length <= 1}
                            className="rounded p-1.5 text-[var(--muted)] hover:text-red-600 disabled:opacity-30"
                            aria-label={`Remove ${a.label}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs text-[var(--muted)]">
                      New area
                    </label>
                    <Input
                      value={newAreaLabel}
                      onChange={(e) => setNewAreaLabel(e.target.value)}
                      placeholder="e.g. Health, Family…"
                      maxLength={40}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[var(--muted)]">
                      Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newAreaColor}
                        onChange={(e) => setNewAreaColor(e.target.value)}
                        className="h-10 w-12 cursor-pointer rounded border border-[var(--border)] bg-transparent"
                      />
                      <div className="flex flex-wrap gap-1">
                        {AREA_COLOR_PRESETS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewAreaColor(c)}
                            className={cn(
                              "size-5 rounded-full border",
                              newAreaColor === c
                                ? "border-[var(--foreground)]"
                                : "border-transparent"
                            )}
                            style={{ backgroundColor: c }}
                            aria-label={`Pick ${c}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={addArea}
                    disabled={!newAreaLabel.trim()}
                  >
                    <Plus />
                    Add area
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Add event */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="font-display text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          Add event
        </h2>
        <div className="mt-3">
          <p className="mb-1 text-xs text-[var(--muted)]">
            Date — day optional (leave as — for month &amp; year only)
          </p>
          <ClearDatePicker value={date} onChange={setDate} idPrefix="add" />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="tl-area">
            Area
          </label>
          <select
            id="tl-area"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className={selectClass}
          >
            {timelineAreas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="tl-title">
            Event
          </label>
          <Input
            id="tl-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short label for the change…"
            maxLength={120}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                addEvent();
              }
            }}
          />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="tl-note">
            Note (optional)
          </label>
          <Textarea
            id="tl-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What shifted?"
            className="min-h-[72px]"
          />
        </div>
        <Button
          className="mt-3"
          variant="accent"
          onClick={addEvent}
          disabled={!title.trim()}
        >
          <Plus />
          Add to timeline
        </Button>
      </section>

      {/* Vertical arrow — marks centered on spine; drag to reorder */}
      <section className="relative">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          <span>January 2025</span>
          <ArrowDown className="size-3.5 text-[var(--accent)]" />
          <span>now</span>
        </div>

        <div className="relative">
          {/* Spine centered in the gutter: grip w-8 + half of gutter (w-12 / w-14) */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-6 left-[calc(2rem+1.5rem)] w-px -translate-x-1/2 bg-[var(--border)] sm:left-[calc(2rem+1.75rem)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-[calc(2rem+1.5rem)] -translate-x-1/2 text-[var(--accent)] sm:left-[calc(2rem+1.75rem)]"
          >
            <ArrowDown className="size-4" strokeWidth={2.25} />
          </div>

          {orderIds.length === 0 ? (
            <p className="py-8 pl-16 text-sm text-[var(--muted)]">
              No events yet. Add one above — day is optional. Drag the grip to
              reorder.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderIds}
                strategy={verticalListSortingStrategy}
              >
                <ul className="relative z-[1] space-y-0.5 pb-10">
                  {orderIds.map((id, index) => {
                    const event = eventsById.get(id);
                    if (!event) return null;
                    return (
                      <EventRow
                        key={event.id}
                        event={event}
                        areas={timelineAreas}
                        active={
                          selectedId === event.id || editingId === event.id
                        }
                        editing={editingId === event.id}
                        canUp={index > 0}
                        canDown={index < orderIds.length - 1}
                        onSelect={() => {
                          setSelectedId((cur) =>
                            cur === event.id ? null : event.id
                          );
                          setEditingId(null);
                        }}
                        onEdit={() => {
                          setEditingId(event.id);
                          setSelectedId(event.id);
                        }}
                        onDelete={() => removeEvent(event.id)}
                        onPatch={(patch) => patchEvent(event.id, patch)}
                        onDoneEdit={() => setEditingId(null)}
                        onMoveUp={() => moveEvent(event.id, -1)}
                        onMoveDown={() => moveEvent(event.id, 1)}
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </section>

      {/* Read-only detail when selected but not inline-editing */}
      <AnimatePresence>
        {selected && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-[3px] w-10 rounded-full"
                    style={{
                      backgroundColor: findArea(
                        timelineAreas,
                        selected.areaId
                      ).color,
                    }}
                  />
                  <p
                    className="text-xs font-medium"
                    style={{
                      color: findArea(timelineAreas, selected.areaId).color,
                    }}
                  >
                    {findArea(timelineAreas, selected.areaId).label}
                  </p>
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold text-[var(--foreground)]">
                  {selected.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {formatDisplayDate(selected.date)}
                </p>
                {selected.note ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                    {selected.note}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted)]">No note.</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(selected.id)}
                  className="rounded p-1.5 text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  aria-label="Edit event"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeEvent(selected.id)}
                  className="rounded p-1.5 text-[var(--muted)] transition hover:text-red-600"
                  aria-label="Delete event"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
