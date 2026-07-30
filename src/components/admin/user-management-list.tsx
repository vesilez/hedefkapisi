"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select } from "@/components/ui/select";
import { AdminPagination, AdminToast } from "./admin-table-tools";
import { exportCsv } from "@/lib/utils/export-csv";
import { USER_ROLES, USER_ROLE_LABELS, type UserRole } from "@/constants/roles";
import { USER_STATUS_LABELS, type UserStatus } from "@/constants/user-statuses";
import { useAuth } from "@/hooks/use-auth";
import {
  getAdminUsers,
  updateUserRoleAsAdmin,
  updateUserStatusAsAdmin,
  type AdminUserListItem,
} from "@/services/user-service";
import { Download, LoaderCircle, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ViewState = "loading" | "ready" | "error";
type ManagedStatus = Extract<UserStatus, "active" | "suspended">;
type ActionType = "role" | "status";

interface ActiveAction {
  userId: string;
  type: ActionType;
}

interface Feedback {
  type: "success" | "error";
  message: string;
}

export function UserManagementList() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<ViewState>("loading");
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ManagedStatus | "all">(
    "all",
  );
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [sort, setSort] = useState<"newest" | "oldest" | "name">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  async function loadUsers(adminId: string) {
    setState("loading");
    setFeedback(null);
    const result = await getAdminUsers(adminId);
    if (result.success) {
      setUsers(result.data);
      setState("ready");
    } else {
      setFeedback({ type: "error", message: result.error.message });
      setState("error");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/giris");
      return;
    }

    let active = true;
    void getAdminUsers(user.id).then((result) => {
      if (!active) return;

      if (result.success) {
        setUsers(result.data);
        setState("ready");
      } else {
        setFeedback({ type: "error", message: result.error.message });
        setState("error");
      }
    });

    return () => {
      active = false;
    };
  }, [authLoading, router, user]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    return users.filter((listedUser) => {
      const fullName = `${listedUser.name} ${listedUser.surname}`
        .trim()
        .toLocaleLowerCase("tr-TR");
      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        listedUser.email.toLocaleLowerCase("tr-TR").includes(query);
      const matchesRole =
        roleFilter === "all" || listedUser.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || listedUser.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    }).sort((first, second) =>
      sort === "name"
        ? `${first.name} ${first.surname}`.localeCompare(`${second.name} ${second.surname}`, "tr-TR")
        : sort === "oldest"
          ? first.createdAt.localeCompare(second.createdAt)
          : second.createdAt.localeCompare(first.createdAt),
    );
  }, [roleFilter, search, sort, statusFilter, users]);
  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredUsers.length / pageSize)));
  const pageUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  const closeToast = useCallback(() => setFeedback(null), []);

  async function changeRole(userId: string, role: UserRole) {
    if (!user || activeAction) return;

    setActiveAction({ userId, type: "role" });
    setFeedback(null);
    const result = await updateUserRoleAsAdmin(user.id, userId, role);

    if (result.success) {
      setUsers((currentUsers) =>
        currentUsers.map((listedUser) =>
          listedUser.id === userId ? { ...listedUser, role } : listedUser,
        ),
      );
      setFeedback({
        type: "success",
        message: "Kullanıcı rolü başarıyla güncellendi.",
      });
    } else {
      setFeedback({ type: "error", message: result.error.message });
    }

    setActiveAction(null);
  }

  async function changeStatus(userId: string, currentStatus: UserStatus) {
    if (!user || activeAction) return;

    const status: ManagedStatus =
      currentStatus === "suspended" ? "active" : "suspended";
    setActiveAction({ userId, type: "status" });
    setFeedback(null);
    const result = await updateUserStatusAsAdmin(user.id, userId, status);

    if (result.success) {
      setUsers((currentUsers) =>
        currentUsers.map((listedUser) =>
          listedUser.id === userId ? { ...listedUser, status } : listedUser,
        ),
      );
      setFeedback({
        type: "success",
        message:
          status === "suspended"
            ? "Kullanıcı hesabı askıya alındı."
            : "Kullanıcı hesabı tekrar aktif edildi.",
      });
    } else {
      setFeedback({ type: "error", message: result.error.message });
    }

    setActiveAction(null);
  }

  if (authLoading || state === "loading") {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-2xl bg-white">
        <LoadingSpinner label="Kullanıcılar yükleniyor..." />
      </div>
    );
  }

  if (!user) return null;

  if (state === "error") {
    return (
      <div
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
        role="alert"
      >
        <p className="font-semibold text-red-800">
          {feedback?.message ?? "Kullanıcılar şu anda yüklenemiyor."}
        </p>
        <Button className="mt-4" onClick={() => void loadUsers(user.id)}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div>
      <AdminToast toast={feedback} onClose={closeToast} />

      <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
        <label className="relative sm:col-span-2">
          <span className="sr-only">İsim veya e-posta ile ara</span>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-3.5 size-4 text-slate-400"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="İsim veya e-posta ile ara"
            className="pl-9"
          />
        </label>
        <label>
          <span className="sr-only">Role göre filtrele</span>
          <Select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as UserRole | "all")
            }
          >
            <option value="all">Tüm roller</option>
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {USER_ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </label>
        <Select aria-label="Kullanıcıları sırala" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
          <option value="newest">En yeni</option>
          <option value="oldest">En eski</option>
          <option value="name">Ada göre</option>
        </Select>
        <Button
          variant="secondary"
          onClick={() => exportCsv("kullanicilar.csv", ["Ad Soyad", "E-posta", "Rol", "Durum", "Kayıt Tarihi"], filteredUsers.map((listedUser) => [`${listedUser.name} ${listedUser.surname}`, listedUser.email, USER_ROLE_LABELS[listedUser.role], USER_STATUS_LABELS[listedUser.status], listedUser.createdAt]))}
        >
          <Download aria-hidden="true" className="size-4" /> CSV Dışa Aktar
        </Button>
        <label>
          <span className="sr-only">Duruma göre filtrele</span>
          <Select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as ManagedStatus | "all")
            }
          >
            <option value="all">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="suspended">Askıya Alındı</option>
          </Select>
        </label>
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState
          title={
            users.length === 0 ? "Henüz kullanıcı yok" : "Sonuç bulunamadı"
          }
          description={
            users.length === 0
              ? "Kayıt olan kullanıcılar burada görüntülenecek."
              : "Arama veya filtre ölçütlerini değiştirmeyi deneyin."
          }
          icon={Users}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <p className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600 md:hidden">
            Tüm sütunları görmek için tabloyu yatay kaydır.
          </p>
          <div
            className="overflow-x-auto overscroll-x-contain pb-2 [scrollbar-gutter:stable]"
            role="region"
            aria-label="Kullanıcı yönetimi tablosu"
            tabIndex={0}
          >
            <table className="w-full min-w-6xl border-collapse text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-4 font-semibold" scope="col">
                    Ad Soyad
                  </th>
                  <th className="px-5 py-4 font-semibold" scope="col">
                    E-posta
                  </th>
                  <th className="px-5 py-4 font-semibold" scope="col">
                    Rol
                  </th>
                  <th className="px-5 py-4 font-semibold" scope="col">
                    Durum
                  </th>
                  <th className="px-5 py-4 font-semibold" scope="col">
                    Kayıt Tarihi
                  </th>
                  <th className="px-5 py-4 font-semibold" scope="col">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pageUsers.map((listedUser) => {
                  const isSelf = listedUser.id === user.id;
                  const isBusy = activeAction?.userId === listedUser.id;

                  return (
                    <tr key={listedUser.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-950">
                        {listedUser.name} {listedUser.surname}
                        {isSelf && (
                          <span className="ml-2 text-xs font-medium text-blue-700">
                            (Sen)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {listedUser.email}
                      </td>
                      <td className="min-w-48 px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Select
                            className="min-h-9 py-1 text-sm"
                            value={listedUser.role}
                            disabled={isSelf || isBusy}
                            aria-label={`${listedUser.name} ${listedUser.surname} rolü`}
                            onChange={(event) =>
                              void changeRole(
                                listedUser.id,
                                event.target.value as UserRole,
                              )
                            }
                          >
                            {USER_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {USER_ROLE_LABELS[role]}
                              </option>
                            ))}
                          </Select>
                          {isBusy && activeAction.type === "role" && (
                            <LoaderCircle
                              aria-hidden="true"
                              className="size-4 shrink-0 animate-spin text-blue-700"
                            />
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <UserStatusBadge status={listedUser.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {new Intl.DateTimeFormat("tr-TR", {
                          dateStyle: "medium",
                        }).format(new Date(listedUser.createdAt))}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <Button
                          variant="secondary"
                          className={
                            listedUser.status === "suspended"
                              ? "min-h-9 px-3 py-1.5 text-xs"
                              : "min-h-9 border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                          }
                          disabled={isSelf || isBusy}
                          onClick={() =>
                            void changeStatus(listedUser.id, listedUser.status)
                          }
                        >
                          {isBusy && activeAction.type === "status" && (
                            <LoaderCircle
                              aria-hidden="true"
                              className="mr-1.5 size-4 animate-spin"
                            />
                          )}
                          {listedUser.status === "suspended"
                            ? "Aktif Et"
                            : "Askıya Al"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination page={safePage} pageSize={pageSize} total={filteredUsers.length} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

const STATUS_BADGE_CLASSES = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-800",
  suspended: "bg-red-100 text-red-800",
} as const satisfies Record<UserStatus, string>;

function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge className={STATUS_BADGE_CLASSES[status]}>
      {USER_STATUS_LABELS[status]}
    </Badge>
  );
}
