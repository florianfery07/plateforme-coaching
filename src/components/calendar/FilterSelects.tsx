// @ts-nocheck
"use client";

import { Select } from "@/components/ui/ui";

export default function FilterSelects({
  categories,
  subcategories,
  filter,
  setFilter,
}) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Select
        value={filter.category}
        onChange={(event) =>
          setFilter({ ...filter, category: event.target.value })
        }
      >
        {categories.map((category) => (
          <option key={category.id}>{category.name}</option>
        ))}
      </Select>

      <Select
        value={filter.subcategory}
        onChange={(event) =>
          setFilter({ ...filter, subcategory: event.target.value })
        }
      >
        {subcategories.map((subcategory) => (
          <option key={subcategory.id}>{subcategory.name}</option>
        ))}
      </Select>
    </div>
  );
}