import { AlertCircle, Inbox, LoaderCircle, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/Button";

type StateKind = "loading" | "empty" | "error" | "forbidden";

const config = {
  loading: { icon: LoaderCircle, title: "Memuat data", description: "Mohon tunggu sebentar.", iconClass: "animate-spin text-brand-600" },
  empty: { icon: Inbox, title: "Belum ada data", description: "Data baru akan tampil di bagian ini.", iconClass: "text-gray-300" },
  error: { icon: AlertCircle, title: "Data gagal dimuat", description: "Periksa koneksi dan coba kembali.", iconClass: "text-red-500" },
  forbidden: { icon: ShieldX, title: "Akses dibatasi", description: "Akun Anda tidak memiliki izin untuk membuka bagian ini.", iconClass: "text-amber-500" },
} satisfies Record<StateKind, { icon: React.ElementType; title: string; description: string; iconClass: string }>;

export function FeedbackState({ kind, title, description, onRetry }: { kind: StateKind; title?: string; description?: string; onRetry?: () => void }) {
  const item = config[kind];
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center" role={kind === "error" ? "alert" : "status"}>
      <item.icon aria-hidden="true" className={`mb-3 h-9 w-9 ${item.iconClass}`} />
      <h2 className="font-semibold text-gray-900">{title ?? item.title}</h2>
      <p className="mt-1 max-w-md text-sm text-gray-500">{description ?? item.description}</p>
      {onRetry && <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>Coba lagi</Button>}
    </div>
  );
}
