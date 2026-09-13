/**
 * 心情页顶部的"当前天气"：服务端调 open-meteo（免密钥、免费、无需注册）。
 *
 * 三条降级原则：
 * 1. 任何异常（超时 / 非 2xx / 结构变化）一律返回 null，页面只显示日期，不报错；
 * 2. 成功结果缓存 30 分钟，失败结果缓存 5 分钟，避免每次打开页面都卡一次外网；
 * 3. 缓存未命中时并发请求共享同一个 in-flight promise，不会同时打多次接口。
 */

/** 天气图标 key：服务端只给数据，具体图标由客户端组件映射成 lucide 组件 */
export type WeatherIcon =
  | "sun"
  | "moon"
  | "cloud-sun"
  | "cloud"
  | "rain"
  | "snow"
  | "fog"
  | "storm";

export interface WeatherInfo {
  /** 中文天气描述，如 "晴" / "多云" / "雷阵雨" */
  label: string;
  icon: WeatherIcon;
  /** 摄氏温度，取不到为 null */
  temperature: number | null;
  /** 当地是否白天，决定用太阳还是月亮 */
  isDay: boolean;
}

const SUCCESS_TTL_MS = 30 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 2500;

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * WMO 天气码（open-meteo 用的国际标准）→ 中文描述。
 * 码表：https://open-meteo.com/en/docs 里的 WMO Weather interpretation codes
 */
function labelFor(code: number): string | null {
  if (code <= 1) return "晴";
  if (code === 2) return "多云";
  if (code === 3) return "阴";
  if (code === 45 || code === 48) return "雾";
  if (code >= 51 && code <= 57) return "小雨";
  if (code >= 61 && code <= 65) return "雨";
  if (code === 66 || code === 67) return "雨夹雪";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "雪";
  if (code >= 80 && code <= 82) return "阵雨";
  if (code === 95) return "雷阵雨";
  if (code === 96 || code === 99) return "雷阵雪";
  return null;
}

function iconFor(code: number, isDay: boolean): WeatherIcon {
  if (code === 45 || code === 48) return "fog";
  if (code === 95 || code === 96 || code === 99) return "storm";
  if (code === 66 || code === 67 || (code >= 71 && code <= 86)) return "snow";
  if (code >= 51 && code <= 82) return "rain";
  if (code === 3) return "cloud";
  if (code === 2) return "cloud-sun";
  return isDay ? "sun" : "moon";
}

interface CacheEntry {
  value: WeatherInfo | null;
  expiresAt: number;
}

let cache: CacheEntry | null = null;
let inFlight: Promise<WeatherInfo | null> | null = null;

export async function getWeather(): Promise<WeatherInfo | null> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;
  if (inFlight) return inFlight;

  inFlight = fetchWeather()
    .then((value) => ({ value, ttl: value ? SUCCESS_TTL_MS : FAILURE_TTL_MS }))
    .catch(() => ({ value: null, ttl: FAILURE_TTL_MS }))
    .then(({ value, ttl }) => {
      cache = { value, expiresAt: Date.now() + ttl };
      inFlight = null;
      return value;
    });

  return inFlight;
}

async function fetchWeather(): Promise<WeatherInfo | null> {
  const latitude = envNumber("WEATHER_LATITUDE", 31.2304); // 上海
  const longitude = envNumber("WEATHER_LONGITUDE", 121.4737);
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,weather_code,is_day` +
    `&timezone=${encodeURIComponent("Asia/Shanghai")}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    current?: {
      temperature_2m?: number | null;
      weather_code?: number | null;
      is_day?: number | null;
    };
  };
  const current = data.current;
  const code = current?.weather_code;
  if (typeof code !== "number") return null;

  const isDay = current?.is_day !== 0;
  const label = labelFor(code);
  if (!label) return null;

  const temperature = current?.temperature_2m;
  return {
    label,
    icon: iconFor(code, isDay),
    temperature: typeof temperature === "number" ? temperature : null,
    isDay,
  };
}
