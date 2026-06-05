"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { sendMessage } from "@/app/(app)/offers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { MessageRow } from "@/lib/offers";
import { cn } from "@/lib/utils";

export interface ChatParticipant {
  id: string;
  username: string | null;
  displayName: string;
}

interface ChatThreadProps {
  offerId: string;
  currentUserId: string;
  initialMessages: MessageRow[];
  buyer: ChatParticipant;
  seller: ChatParticipant;
  /** true se l'offerta è pending o accepted (messaggi consentiti). */
  isOpen: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Oggi";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ieri";
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function ChatThread({
  offerId,
  currentUserId,
  initialMessages,
  buyer,
  seller,
  isOpen,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ogni volta che arrivano nuovi messaggi.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Supabase Realtime: subscription INSERT su messages filtrata per offer_id.
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:offer:${offerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `offer_id=eq.${offerId}`,
        },
        (payload) => {
          const msg = payload.new as MessageRow;
          setMessages((prev) => {
            // Deduplicazione: scarta se già presente (echo del mittente).
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [offerId]);

  function getDisplayName(senderId: string): string {
    if (senderId === buyer.id) {
      return buyer.username ? `@${buyer.username}` : buyer.displayName;
    }
    if (senderId === seller.id) {
      return seller.username ? `@${seller.username}` : seller.displayName;
    }
    return "Utente";
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = String(
      new FormData(form).get("body") ?? "",
    ).trim();
    if (!body) return;

    setSendError(null);
    startTransition(async () => {
      const result = await sendMessage(new FormData(form));
      if (result?.error) {
        setSendError(result.error);
      } else {
        formRef.current?.reset();
      }
    });
  }

  // Raggruppa per giorno per il separatore visivo.
  let lastDay = "";

  return (
    <div className="flex h-[480px] flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* ── Lista messaggi ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Nessun messaggio ancora. Inizia la conversazione.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              const day = formatDay(msg.created_at);
              const showDay = day !== lastDay;
              lastDay = day;

              return (
                <li key={msg.id}>
                  {/* Separatore giorno */}
                  {showDay && (
                    <div className="flex items-center gap-2 py-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">
                        {day}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  {/* Bolla messaggio */}
                  <div
                    className={cn(
                      "flex",
                      isMe ? "justify-end" : "justify-start",
                      "mb-1",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3.5 py-2",
                        isMe
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-muted text-foreground",
                      )}
                    >
                      {/* Nome mittente (solo per l'altro) */}
                      {!isMe && (
                        <p className="mb-0.5 text-xs font-semibold opacity-75">
                          {getDisplayName(msg.sender_id)}
                        </p>
                      )}

                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {msg.body}
                      </p>

                      <p
                        className={cn(
                          "mt-0.5 text-right text-xs",
                          isMe
                            ? "opacity-60"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
            {/* Anchor per auto-scroll */}
            <div ref={bottomRef} />
          </ul>
        )}
      </div>

      {/* ── Form di invio ── */}
      <div className="shrink-0 border-t border-border bg-background px-3 py-2.5">
        {isOpen ? (
          <div className="space-y-1.5">
            {sendError && (
              <p
                className="text-xs font-medium text-destructive"
                role="alert"
              >
                {sendError}
              </p>
            )}
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="offer_id" value={offerId} />
              <Input
                name="body"
                placeholder="Scrivi un messaggio…"
                maxLength={2000}
                autoComplete="off"
                disabled={isPending}
                className="flex-1"
                aria-label="Testo del messaggio"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                aria-label="Invia messaggio"
              >
                {isPending ? "…" : "Invia"}
              </Button>
            </form>
          </div>
        ) : (
          <p className="py-1 text-center text-sm text-muted-foreground">
            Conversazione chiusa.
          </p>
        )}
      </div>
    </div>
  );
}
