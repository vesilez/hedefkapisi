import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import {
  SUPPORT_TYPES,
  SUPPORT_TYPE_LABELS,
} from "@/constants/support-types";
import type { IdeaFilterValues } from "@/services/idea-filter-service";

export type { IdeaFilterValues } from "@/services/idea-filter-service";

interface IdeaFiltersProps {
  values: IdeaFilterValues;
  onChange: (values: IdeaFilterValues) => void;
  onClear: () => void;
}

export function IdeaFilters({ values, onChange, onClear }: IdeaFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div>
          <label
            htmlFor="idea-search"
            className="text-sm font-semibold text-slate-800"
          >
            Arama
          </label>
          <Input
            id="idea-search"
            type="search"
            className="mt-2"
            placeholder="Başlık veya açıklama ara"
            value={values.search}
            onChange={(event) =>
              onChange({ ...values, search: event.target.value })
            }
          />
        </div>
        <div>
          <label
            htmlFor="idea-category"
            className="text-sm font-semibold text-slate-800"
          >
            Kategori
          </label>
          <Select
            id="idea-category"
            className="mt-2"
            value={values.categoryId}
            onChange={(event) =>
              onChange({ ...values, categoryId: event.target.value })
            }
          >
            <option value="">Tüm kategoriler</option>
            {DEFAULT_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label
            htmlFor="idea-city"
            className="text-sm font-semibold text-slate-800"
          >
            Şehir
          </label>
          <Input
            id="idea-city"
            className="mt-2"
            placeholder="Şehir ara"
            value={values.city}
            onChange={(event) =>
              onChange({ ...values, city: event.target.value })
            }
          />
        </div>
        <div>
          <label
            htmlFor="idea-support-type"
            className="text-sm font-semibold text-slate-800"
          >
            Destek türü
          </label>
          <Select
            id="idea-support-type"
            className="mt-2"
            value={values.supportType}
            onChange={(event) =>
              onChange({
                ...values,
                supportType: event.target.value as IdeaFilterValues["supportType"],
              })
            }
          >
            <option value="">Tüm destek türleri</option>
            {SUPPORT_TYPES.map((supportType) => (
              <option key={supportType} value={supportType}>
                {SUPPORT_TYPE_LABELS[supportType]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label
            htmlFor="idea-sort"
            className="text-sm font-semibold text-slate-800"
          >
            Sıralama
          </label>
          <Select
            id="idea-sort"
            className="mt-2"
            value={values.sort}
            onChange={(event) =>
              onChange({
                ...values,
                sort: event.target.value as IdeaFilterValues["sort"],
              })
            }
          >
            <option value="newest">En yeni</option>
            <option value="oldest">En eski</option>
            <option value="most_liked">En çok beğenilen</option>
            <option value="most_commented">En çok yorumlanan</option>
          </Select>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" variant="ghost" onClick={onClear}>
          Filtreleri Temizle
        </Button>
      </div>
    </div>
  );
}
