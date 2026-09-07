"use client";
import { useState, useEffect } from "react";
import { MessageForm } from "./MessageForm";
import { CatMascot } from "./CatMascot";

interface Message {
  id: string;
  name: string;
  content: string;
  emoji: string | null;
  createdAt: string;
}

export function MessageWall() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/messages");
    const data = await res.json();
    setMessages(data.messages || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <CatMascot mood="COMFORT" size={48} />
        <h1 className="text-xl font-bold mt-2">给十一的鼓励墙</h1>
      </div>

      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="bg-peach rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl" aria-hidden="true">
                {m.emoji}
              </span>
              <span className="font-bold text-sm">{m.name}</span>
              <span className="text-xs opacity-50 ml-auto">
                {new Date(m.createdAt).toLocaleDateString("zh-CN")}
              </span>
            </div>
            <p className="text-sm">{m.content}</p>
          </div>
        ))}
        {loading && (
          <p className="text-center text-sm opacity-50">加载中…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm opacity-50 py-8">
            还没有留言，来留下第一句鼓励吧～
          </p>
        )}
      </div>

      <div className="mt-6">
        <MessageForm onSubmitted={load} />
      </div>
    </div>
  );
}
