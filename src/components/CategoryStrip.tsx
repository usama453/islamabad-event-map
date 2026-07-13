"use client";

import type { Category } from "@/lib/constants";
import { CATEGORY_LABELS } from "@/lib/constants";
import { CategoryIcon, categoryColor } from "@/components/CategoryIcon";

interface CategoryStripProps {
  categories: Category[];
  selected: Category[];
  onChange: (categories: Category[]) => void;
}

export function CategoryStrip({
  categories,
  selected,
  onChange,
}: CategoryStripProps) {
  if (categories.length === 0) return null;

  const active = selected[0] ?? null;

  return (
    <div className="shrink-0 border-b border-line bg-surface">
      <div
        className="flex gap-1.5 overflow-x-auto px-2.5 py-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 sm:px-4 sm:py-2.5 [&::-webkit-scrollbar]:hidden"
        role="listbox"
        aria-label="Categories"
      >
        {categories.map((category) => {
          const isActive = active === category;
          const color = categoryColor(category);
          return (
            <button
              key={category}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => onChange([category])}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs ${
                isActive
                  ? "border-transparent text-white"
                  : "border-line-strong text-ink-muted hover:border-ink-faint hover:text-ink"
              }`}
              style={isActive ? { backgroundColor: color } : undefined}
            >
              <CategoryIcon
                category={category}
                className="h-3 w-3 sm:h-3.5 sm:w-3.5"
              />
              {CATEGORY_LABELS[category]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
