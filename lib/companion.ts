/**
 * 陪伴者邀请码的纯函数工具（不依赖数据库，方便单测）。
 *
 * 邀请码格式：8 位大写字母数字，字母表刻意排除易混淆字符 0/O/1/I，
 * 方便家人通过电话、手抄等低带宽渠道传递。
 */

import { randomInt } from "crypto";

/** 邀请码字母表（排除 0/O/1/I） */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 邀请码长度 */
export const CODE_LENGTH = 8;

/** 生成一个随机邀请码（crypto 随机源） */
export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/** 规范化用户输入：去空白、转大写、剔除字母数字以外的字符 */
export function normalizeInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
}

/** 校验规范化后的字符串是否符合邀请码格式 */
export function isValidInviteCodeFormat(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  for (const ch of code) {
    if (!CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}
