// @ts-nocheck
"use client";

import { Field, Select } from "@/components/ui/ui";

export default function FilterSelects({
  categories,
  subcategories,
  filter,
  setFilter,
}) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Discipline">
        <Select
          value={filter.category}
          onChange={(event) =>
            setFilter({ ...filter, category: event.target.value })
          }
        >
          <option value="">Toutes les disciplines</option>

          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Thème">
        <Select
          value={filter.subcategory}
          onChange={(event) =>
            setFilter({ ...filter, subcategory: event.target.value })
          }
        >
          <option value="">Tous les thèmes</option>

          {subcategories.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.name}>
              {subcategory.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
