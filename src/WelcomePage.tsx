import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";

const principles = [
  { number: "01", title: "Make room", detail: "A quieter place for everything on your mind." },
  { number: "02", title: "Find your focus", detail: "Turn the important things into meaningful progress." },
  { number: "03", title: "Move with intention", detail: "Build a rhythm that feels like your own." },
];

type WelcomePageProps = {
  onOpenDashboard: () => void;
};

export function WelcomePage({ onOpenDashboard }: WelcomePageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-space text-space-foreground">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-7 sm:px-10 lg:px-16">
        <button className="flex items-center gap-3" onClick={onOpenDashboard} type="button">
          <span className="brand-mark"><Sparkles size={17} strokeWidth={1.8} /></span>
          <span className="font-display text-sm font-bold tracking-[0.2em]">MINDSPACE</span>
        </button>
        <span className="hidden text-xs tracking-[0.16em] text-space-muted sm:block">
          YOUR PERSONAL SPACE TO GROW
        </span>
        <span className="status-pill"><span /> A little more clarity, every day</span>
      </header>

      <section id="home" className="relative z-10 mx-auto grid min-h-[calc(100vh-96px)] w-full max-w-[1440px] items-center gap-14 px-6 pb-20 pt-10 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-16 lg:pb-24 lg:pt-0">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <div className="eyebrow"><span className="eyebrow-line" /> A NEW WAY TO BE PRODUCTIVE</div>
          <h1 className="mt-8 font-display text-[clamp(3.5rem,8vw,7.3rem)] font-medium leading-[0.99] tracking-[-0.075em]">
            Less noise.
            <br />
            <span className="gradient-text">More you.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-space-muted sm:text-lg sm:leading-8">
            Your thoughts deserve more than another list. Make space for what matters, find your
            rhythm, and move toward a life that feels like yours.
          </p>
          <button className="explore-link mt-10" onClick={onOpenDashboard} type="button">
            <span className="explore-icon"><ArrowRight size={16} /></span>
            <span>OPEN YOUR DASHBOARD</span>
          </button>
          <a className="explore-link mt-5" href="#philosophy">
            <span className="explore-icon"><ArrowDown size={16} /></span>
            <span>EXPLORE THE MINDSPACE APPROACH</span>
          </a>
          <p className="mt-14 font-display text-sm tracking-wide text-white/50">
            Clear Your Mind. Own Your Time. Build Your Future.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="visual-stage"
          aria-label="Abstract violet light sculpture"
          role="img"
        >
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="orb-core">
            <div className="orb-highlight" />
            <div className="orb-glint" />
          </div>
          <div className="orbit-dot dot-one" />
          <div className="orbit-dot dot-two" />
          <div className="orbit-dot dot-three" />
          <div className="visual-caption">
            <span className="caption-spark"><Sparkles size={14} /></span>
            <span>CLARITY STARTS WITH SPACE</span>
          </div>
        </motion.div>
      </section>

      <section id="philosophy" className="relative z-10 border-t border-white/[0.07] px-6 py-20 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-[1312px]">
          <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow"><span className="eyebrow-line" /> THE MINDSPACE PHILOSOPHY</p>
              <h2 className="mt-5 font-display text-3xl font-medium tracking-[-0.05em] sm:text-4xl">
                Productivity, with a little more humanity.
              </h2>
            </div>
            <ArrowUpRight className="hidden text-space-violet sm:block" size={22} strokeWidth={1.5} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {principles.map((principle) => (
              <article className="principle-card" key={principle.number}>
                <span className="font-display text-xs tracking-[0.18em] text-space-violet">
                  {principle.number}
                </span>
                <h3 className="mt-8 font-display text-xl font-semibold">{principle.title}</h3>
                <p className="mt-2 text-sm leading-6 text-space-muted">{principle.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 flex flex-col gap-3 border-t border-white/[0.07] px-6 py-6 text-xs text-space-muted sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-16">
        <span className="font-display font-semibold tracking-[0.16em] text-white/70">MINDSPACE</span>
        <span>Clear Your Mind. Own Your Time. Build Your Future.</span>
      </footer>
    </main>
  );
}
