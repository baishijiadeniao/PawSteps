import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { hasCustomOwnerCode } from "@/lib/ownerCode";
import { OwnerCodeSettings } from "@/components/OwnerCodeSettings";
import { BottomNav } from "@/components/BottomNav";

/**
 * 设置页（病人侧）：目前只有「访问码」卡片——修改登录小窝用的访问码。
 * 是否已自定义过访问码由服务端查出，交互全在 <OwnerCodeSettings />。
 */
export default async function SettingsPage() {
  const auth = await requireOwner();
  // middleware 只查 cookie 存在性，会话真正失效时这里兜底跳登录页
  if ("redirect" in auth) redirect("/login");

  const custom = await hasCustomOwnerCode();

  return (
    <main className="min-h-screen pb-24 px-4 py-6 max-w-lg mx-auto">
      <header className="mb-6">
        <Link
          href="/rehab"
          className="text-xs opacity-60 underline underline-offset-4"
        >
          ← 回到打卡
        </Link>
        <h1 className="text-2xl font-fun mt-2">设置</h1>
        <p className="text-sm opacity-70 mt-1">
          管理登录小窝用的访问码
        </p>
      </header>

      <OwnerCodeSettings initialCustom={custom} />

      <BottomNav />
    </main>
  );
}
