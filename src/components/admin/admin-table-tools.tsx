"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  return (
    <nav
      className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Tablo sayfalama"
    >
      <p className="text-sm text-slate-600">
        {total} kayıttan {(page - 1) * pageSize + 1}–
        {Math.min(page * pageSize, total)} arası
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          className="min-h-10 px-3"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Önceki
        </Button>
        <span className="min-w-20 text-center text-sm font-semibold text-slate-700">
          {page} / {pageCount}
        </span>
        <Button
          variant="secondary"
          className="min-h-10 px-3"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Sonraki
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  );
}

export interface AdminToastData {
  type: "success" | "error";
  message: string;
}

export function AdminToast({
  toast,
  onClose,
}: {
  toast: AdminToastData | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timeout);
  }, [onClose, toast]);

  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border px-4 py-3 shadow-xl ${
        toast.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900"
      }`}
      role={toast.type === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <p className="text-sm font-semibold">{toast.message}</p>
      <button
        type="button"
        className="rounded p-1 hover:bg-black/5"
        aria-label="Bildirimi kapat"
        onClick={onClose}
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
      >
        <h2 id="admin-confirm-title" className="text-xl font-bold text-slate-950">
          {title}
        </h2>
        <p id="admin-confirm-description" className="mt-2 text-sm leading-6 text-slate-600">
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>Vazgeç</Button>
          <Button
            className={destructive ? "bg-red-700 hover:bg-red-800" : undefined}
            autoFocus
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
