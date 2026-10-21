/**
 * "新来信"事件总线：
 * 病人侧 EncouragementInbox 轮询发现新未读留言时派发，
 * 全局挂载的 <DesktopPet /> 听到后表演"送信"冒泡。
 * （沿用项目里 stickerPop.ts 的 window CustomEvent 模式）
 */

export const NEW_LETTER_EVENT = "app:new-letter";

/** 事件负载：送信者的称呼与留言开头 */
export interface NewLetterDetail {
  nickname: string;
  snippet: string;
}

/** 派发"新来信"事件；非浏览器环境下静默跳过 */
export function announceNewLetter(detail: NewLetterDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NEW_LETTER_EVENT, { detail }));
}
