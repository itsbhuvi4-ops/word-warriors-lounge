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
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/20 to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-8 py-6 md:px-16">
        <div className="font-display text-lg tracking-widest text-primary text-glow">
          ⚔ COMBAT TYPEIST
        </div>
        <nav className="hidden gap-10 font-display text-sm tracking-[0.3em] text-foreground/80 md:flex">
          <a href="#" className="hover:text-primary transition">HOME</a>
          <a href="#" className="hover:text-primary transition">LORE</a>
          <Link to="/lobby" className="hover:text-primary transition">TYPE NOW</Link>
        </nav>
      </header>

      <main className="relative z-10 grid min-h-[calc(100vh-100px)] grid-cols-1 items-center gap-12 px-8 py-12 md:grid-cols-2 md:px-16">
        <div className="space-y-8">
          <div className="font-display text-6xl leading-[0.95] tracking-tight text-foreground text-glow md:text-8xl">
            COMBAT<br />TYPEIST
          </div>
          <div className="font-heading text-sm tracking-[0.4em] text-primary">
            • A TYPING BATTLE STORY
          </div>
        </div>

        <div className="space-y-8 text-right md:pl-8">
          <h1 className="font-display text-5xl leading-tight text-foreground text-glow md:text-7xl">
            TYPE TO<br />BATTLE
          </h1>
          <p className="ml-auto max-w-md text-sm leading-relaxed text-foreground/70">
            Every keystroke is a strike. Every mistake, an opening. Enter the arena,
            choose your champion, and let the shadows crown the fastest, truest typist alive.
          </p>
          <div className="flex justify-end">
            <Link to="/lobby" className="btn-fantasy animate-pulse-glow">
              Play Now →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
