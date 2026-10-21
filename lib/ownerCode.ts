import { createHash, timingSafeEqual } from "crypto";
import { prismaClient } from "./prisma";

/**
 * 主人访问码存储：默认用环境变量 OWNER_CODE；
 * 用户在设置页改过码之后，以 AppSetting(key="owner_code") 里的 sha256 哈希为准，
 * 环境变量码被覆盖（防止知道旧码的人仍可登录）。
 */

const SETTING_KEY = "owner_code";

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

async function getCustomCodeHash(): Promise<string | null> {
  const row = await prismaClient.appSetting.findUnique({
    where: { key: SETTING_KEY },
  });
  return row?.value ?? null;
}

/** 是否已设置过自定义访问码（设置页展示用，不返回码本身） */
export async function hasCustomOwnerCode(): Promise<boolean> {
  return (await getCustomCodeHash()) !== null;
}

/** 当前是否至少存在一种可用访问码（自定义码或环境变量码） */
export async function isOwnerCodeConfigured(): Promise<boolean> {
  return (
    (await getCustomCodeHash()) !== null ||
    Boolean(process.env.OWNER_CODE)
  );
}

/** 设置自定义访问码（只落 sha256 哈希，不存明文） */
export async function setCustomOwnerCode(code: string): Promise<void> {
  const value = sha256(code);
  await prismaClient.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value },
    create: { key: SETTING_KEY, value },
  });
}

/** 清除自定义码，恢复使用环境变量 OWNER_CODE（未设置过时静默成功） */
export async function clearCustomOwnerCode(): Promise<void> {
  await prismaClient.appSetting.deleteMany({
    where: { key: SETTING_KEY },
  });
}

/** 校验输入的访问码是否与当前生效的码一致（自定义优先，回落环境变量） */
export async function verifyOwnerCode(input: string): Promise<boolean> {
  const hash = await getCustomCodeHash();
  if (hash) return safeEqualHex(hash, sha256(input));
  const envCode = process.env.OWNER_CODE;
  if (!envCode) return false;
  return safeEqualHex(sha256(envCode), sha256(input));
}
