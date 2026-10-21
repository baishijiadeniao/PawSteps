import { connection } from "next/server";
import { CareLoginForm } from "@/components/CareLoginForm";
import { StickerImage } from "@/components/StickerImage";
import { getUnlockedNames } from "@/lib/stickerService";
import { pickAnyUnlocked } from "@/lib/stickerPop";

/**
 * 陪伴者登录页（服务端外壳）：
 * 头部原来是真猫照片 peek.png，现在每次打开随机展示一张收集册已解锁贴纸。
 * 本页不读 request 数据，需显式等待真实请求进来（connection()），
 * 避免被静态预渲染成同一张贴纸。
 */
export default async function CareLoginPage() {
  await connection();
  const unlocked = await getUnlockedNames();

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm card-soft bg-white rounded-3xl p-6 pb-8">
        <div className="text-center mb-8">
          {/* 每次打开随机换一张已解锁贴纸 */}
          <div className="flex justify-center mb-3 -mt-2">
            <StickerImage name={pickAnyUnlocked(unlocked)} size={120} />
          </div>
          <h1 className="text-3xl font-fun">陪伴视角</h1>
          <p className="text-sm mt-2 opacity-70">
            输入病人为你生成的邀请码，看看 TA 的康复近况
          </p>
        </div>
        <CareLoginForm />
      </div>
    </main>
  );
}
