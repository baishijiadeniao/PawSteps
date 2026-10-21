import { DesktopPet } from "@/components/DesktopPet";
import { StickerPopup } from "@/components/StickerPopup";

/**
 * 病人（主人）侧布局：全局挂桌宠与贴纸弹层。
 * 陪伴者侧（(companion) 路由组）不用这套互动装饰。
 */
export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <StickerPopup />
      <DesktopPet />
    </>
  );
}
