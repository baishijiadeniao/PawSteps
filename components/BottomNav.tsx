"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PawPrint, Smile, CalendarHeart, Trophy } from "lucide-react";

const TABS = [
  { href: "/rehab", label: "打卡", Icon: PawPrint },
  { href: "/mood", label: "心情", Icon: Smile },
  { href: "/timeline", label: "日历", Icon: CalendarHeart },
  { href: "/collection", label: "收集", Icon: Trophy },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center gap-1 bg-white/95 backdrop-blur border border-peach rounded-full px-2 py-1.5 shadow-[0_8px_24px_rgba(201,136,107,0.35)]">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-all ${
                active
                  ? "bg-coral text-cocoa font-bold"
                  : "text-cocoa/50 hover:text-cocoa"
              }`}
            >
              <Icon
                size={18}
                strokeWidth={2.4}
                aria-hidden="true"
                className={active ? "animate-nav-bounce" : ""}
              />
              <span className={active ? "font-fun" : ""}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
