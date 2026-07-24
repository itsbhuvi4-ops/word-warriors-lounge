import { createFileRoute, Link } from "@tanstack/react-router";
import heroBg from "@/assets/hero-bg.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Combat Typeist — Type to Battle" },
      { name: "description", content: "A dark fantasy typing fighting game. Choose your champion, choose the arena, type to strike." },
      { property: "og:title", content: "Combat Typeist — Type to Battle" },
      { property: "og:description", content: "A dark fantasy typing fighting game. Choose your champion, choose the arena, type to strike." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-70"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-black/90" />

      <header className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2 font-display text-xs tracking-[0.25em] text-foreground">
            <span className="text-primary text-glow">⚔</span>
            <span className="leading-tight">
              COMBAT<br />TYPEIST
            </span>
          </div>
          <nav className="hidden gap-8 font-display text-sm tracking-[0.35em] text-foreground/90 md:flex">
            <a href="#" className="hover:text-primary transition">HOME</a>
            <a href="#" className="hover:text-primary transition">MEDIA</a>
            <Link to="/lobby" className="hover:text-primary transition">TYPE NOW</Link>
          </nav>
        </div>
        <div className="hidden items-center gap-4 font-display text-xs tracking-[0.3em] text-foreground/70 md:flex">
          <span>FOLLOW US</span>
          <div className="flex gap-3 text-foreground/80">
            <a href="#" aria-label="Facebook" className="hover:text-primary transition">f</a>
            <a href="#" aria-label="Twitter" className="hover:text-primary transition">𝕏</a>
            <a href="#" aria-label="Instagram" className="hover:text-primary transition">◉</a>
            <a href="#" aria-label="YouTube" className="hover:text-primary transition">▶</a>
          </div>
        </div>
      </header>

      <main className="relative z-10 grid min-h-[calc(100vh-140px)] grid-cols-1 items-center gap-12 px-6 py-8 md:grid-cols-2 md:px-16 md:py-12">
        <div className="space-y-4">
          <div className="font-display text-6xl leading-[0.9] tracking-tight text-foreground text-glow md:text-8xl">
            COMBAT<br />TYPEIST
          </div>
          <div className="font-heading text-xs tracking-[0.35em] text-foreground/80 md:text-sm">
            • A <span className="text-primary">LEAGUE</span> OF <span className="text-primary">LEGENDS</span> STORY
          </div>
        </div>

        <div className="space-y-8 md:pl-8">
          <h1 className="font-display text-5xl leading-tight text-foreground text-glow md:text-7xl">
            TYPE TO BATTLE
          </h1>
          <div>
            <Link to="/lobby" className="btn-fantasy animate-pulse-glow">
              Play Now
            </Link>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-foreground/60 md:text-sm">
            Every keystroke is a strike. Every mistake, an opening. Enter the arena,
            choose your champion, and let the shadows crown the fastest, truest typist alive.
          </p>
        </div>
      </main>
    </div>
  );
}
