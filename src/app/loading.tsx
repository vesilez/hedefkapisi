import { LoadingSpinner } from "@/components/ui/loading-spinner";
export default function Loading() {
  return (
    <div className="flex min-h-72 items-center justify-center">
      <LoadingSpinner label="Sayfa hazırlanıyor" />
    </div>
  );
}
