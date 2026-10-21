import { LoginForm } from "@/components/LoginForm";
import { StickerImage } from "@/components/StickerImage";
import { getUnlockedNames } from "@/lib/stickerService";
import { pickAnyUnlocked } from "@/lib/stickerPop";

/**
 * 主人登录页（服务端外壳）：
 * 头部原来是真猫照片 peek.png，现在每次打开随机展示一张收集册已解锁贴纸。
 * 读取页面的 searchParams 会让本页按请求动态渲染（Next 官方推荐用法），
 * 因此无需额外声明动态渲染，随机挑选在服务端完成，不存在水合不一致。
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const from =
    typeof params.from === "string" && params.from ? params.from : "/rehab";
  const unlocked = await getUnlockedNames();

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm card-soft bg-white rounded-3xl p-6 pb-8">
        <div className="text-center mb-8">
          {/* 每次打开随机换一张已解锁贴纸 */}
          <div className="flex justify-center mb-3 -mt-2">
            <StickerImage name={pickAnyUnlocked(unlocked)} size={120} />
          </div>
          <h1 className="text-3xl font-fun">十一的康复小窝</h1>
          <p className="text-sm mt-2 opacity-70">请输入访问码</p>
        </div>
        <LoginForm from={from} />
      </div>
    </main>
  );
}
