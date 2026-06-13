import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

import { GAMES, type Game } from "@/lib/tcg";

type CardResult = {
  id: string;
  name: string;
  image_url: string | null;
  set_name: string | null;
};

const MIN_QUERY_LENGTH = 2;
const RESULTS_LIMIT = 8;

/** Client Supabase anonimo, senza cookie: i dati di `cards` sono pubblici. */
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variabili Supabase mancanti: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
    );
  }

  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const game = searchParams.get("game");
  const q = searchParams.get("q");

  if (!game || !GAMES.includes(game as Game) || !q || q.trim().length < MIN_QUERY_LENGTH) {
    return Response.json({ results: [] });
  }

  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from("cards")
      .select("id, name, image_url, set_name")
      .eq("game", game)
      .ilike("name", `%${q}%`)
      .limit(RESULTS_LIMIT);

    if (error) {
      console.error("cards/search error:", error);
      return Response.json({ results: [], error: error.message }, { status: 500 });
    }

    return Response.json(
      { results: (data ?? []) as CardResult[] },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    console.error("cards/search error:", err);
    return Response.json({ results: [], error: message }, { status: 500 });
  }
}
