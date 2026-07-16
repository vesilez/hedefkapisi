import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageContainer } from "./page-container";

export function PlaceholderPage({
  title,
  description,
  admin = false,
}: {
  title: string;
  description: string;
  admin?: boolean;
}) {
  const content = (
    <>
      <Badge>Yakında</Badge>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
        {description}
      </p>
      <Card className="mt-8 flex max-w-3xl items-start gap-4">
        <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
          <ArrowRight aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold text-slate-950">
            Bu modül hazırlanıyor
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            İlgili işlevler sonraki geliştirme adımlarında güvenli ve
            sürdürülebilir biçimde eklenecek.
          </p>
        </div>
      </Card>
    </>
  );
  return admin ? (
    <section>{content}</section>
  ) : (
    <PageContainer className="py-14 sm:py-20">{content}</PageContainer>
  );
}
