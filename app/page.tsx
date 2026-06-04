import { ThemeToggle } from "@/components/brand/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Pagina di prova della Fase 1: verifica colori, font e dark mode.
// Verra' sostituita nelle fasi successive.

type Swatch = { name: string; hex: string; className: string; text: string };

const lightSwatches: Swatch[] = [
  { name: "Forest", hex: "#2D5A3D", className: "bg-brand-forest", text: "text-white" },
  { name: "Forest-mid", hex: "#3D7A54", className: "bg-brand-forest-mid", text: "text-white" },
  { name: "Ember", hex: "#E8622A", className: "bg-brand-ember", text: "text-white" },
  { name: "Paper", hex: "#FAFAF7", className: "bg-brand-paper", text: "text-brand-ink" },
  { name: "Ink", hex: "#1A1A18", className: "bg-brand-ink", text: "text-white" },
];

const darkSwatches: Swatch[] = [
  { name: "Bg", hex: "#111210", className: "bg-brand-bg", text: "text-brand-snow" },
  { name: "Surface", hex: "#1A1C19", className: "bg-brand-surface", text: "text-brand-snow" },
  { name: "Snow", hex: "#F0EFE8", className: "bg-brand-snow", text: "text-brand-ink" },
  { name: "Teal", hex: "#5DCAA5", className: "bg-brand-teal", text: "text-brand-ink" },
  { name: "Ember", hex: "#E8622A", className: "bg-brand-ember", text: "text-white" },
];

function SwatchGrid({ title, items }: { title: string; items: Swatch[] }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((s) => (
          <div
            key={`${title}-${s.name}`}
            className={`${s.className} ${s.text} flex h-24 flex-col justify-end rounded-lg border border-border p-3`}
          >
            <span className="text-sm font-medium">{s.name}</span>
            <span className="font-mono text-xs opacity-80">{s.hex}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="container max-w-5xl py-10">
        {/* Header */}
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent">
              Fase 1 · scaffold
            </p>
            <h1 className="mt-1 font-heading text-4xl font-semibold sm:text-5xl">
              Huntlist
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Pagina di verifica del brand: colori, tipografia e dark mode. Da
              collezionista a collezionista — la sostituiremo nelle prossime fasi.
            </p>
          </div>
          <ThemeToggle />
        </header>

        {/* Tipografia */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Tipografia</CardTitle>
            <CardDescription>
              Fraunces per i titoli, DM Sans per il corpo (via next/font).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Fraunces · font-heading
              </p>
              <p className="font-heading text-3xl font-semibold">
                La caccia alla carta perfetta
              </p>
            </div>
            <div>
              <p className="mb-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
                DM Sans · font-sans
              </p>
              <p className="max-w-2xl text-base leading-relaxed">
                Pubblica la tua mancalista, ricevi offerte che coprono l&apos;intero
                lotto in una sola spedizione e chiudi l&apos;affare in chat. Niente
                annunci sparsi: dici cosa cerchi, i venditori vengono da te.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bottoni / token semantici */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Componenti & token semantici</CardTitle>
            <CardDescription>
              Questi colori cambiano automaticamente tra light e dark.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="accent">Ember</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Premi il toggle in alto a destra per alternare i temi.
            </p>
          </CardFooter>
        </Card>

        {/* Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Palette brand</CardTitle>
            <CardDescription>
              Hex fissi (sempre uguali nei due temi). I token semantici sopra,
              invece, si adattano.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <SwatchGrid title="Light" items={lightSwatches} />
            <SwatchGrid title="Dark" items={darkSwatches} />
          </CardContent>
        </Card>

        <footer className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          Huntlist · scaffold Fase 1 — Next.js 16 · Tailwind · shadcn/ui · Supabase
        </footer>
      </div>
    </main>
  );
}
