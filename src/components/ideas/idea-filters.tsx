import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DEFAULT_CATEGORIES } from "@/constants/default-categories";
import {
  IDEA_STAGES,
  IDEA_STAGE_LABELS,
  type IdeaStage,
} from "@/constants/idea-stages";

export interface IdeaFilterValues {
  search: string;
  categoryId: string;
  stage: IdeaStage | "";
  city: string;
}

interface IdeaFiltersProps {
  values: IdeaFilterValues;
  onChange: (values: IdeaFilterValues) => void;
  onClear: () => void;
}

export function IdeaFilters({ values, onChange, onClear }: IdeaFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            htmlFor="idea-stage"
            className="text-sm font-semibold text-slate-800"
          >
            Fikir aşaması
          </label>
          <Select
            id="idea-stage"
            className="mt-2"
            value={values.stage}
            onChange={(event) =>
              onChange({
                ...values,
                stage: event.target.value as IdeaStage | "",
              })
            }
          >
            <option value="">Tüm aşamalar</option>
            {IDEA_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {IDEA_STAGE_LABELS[stage]}
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
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" variant="ghost" onClick={onClear}>
          Filtreleri Temizle
        </Button>
      </div>
    </div>
  );
}
