"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/rehab", label: "打卡", emoji: "🐾" },
  { href: "/mood", label: "心情", emoji: "💭" },
  { href: "/timeline", label: "时间线", emoji: "📅" },
  { href: "/wall", label: "留言", emoji: "💌" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-cream border-t border-peach flex justify-around py-2 px-2 z-40">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center px-3 py-1 rounded-lg ${
              active ? "text-ragdoll" : "text-cocoa/50"
            }`}
          >
            <span className="text-xl" aria-hidden="true">
              {tab.emoji}
            </span>
            <span className="text-xs">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
