import { FavoriteIdeas } from "@/components/ideas";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favorilerim",
  description: "Favorilerine eklediğin hayalleri görüntüle.",
};

export default function FavoritesPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Favorilerim
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Daha sonra tekrar incelemek için kaydettiğin hayaller.
        </p>
      </div>
      <FavoriteIdeas />
    </section>
  );
}
