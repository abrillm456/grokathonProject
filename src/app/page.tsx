"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DuelHero } from "@/components/duel-hero";
import { setCurrentUser } from "@/lib/game";
import { useGame } from "@/components/use-game";

export default function LandingPage() {
  const router = useRouter();
  const { data, apply } = useGame();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-16">
      <p className="kicker">Yale Campus League</p>
      <h1 className="wordmark mt-3 max-w-3xl text-5xl leading-tight sm:text-7xl">
        LIFE<span>//</span>RIVAL
      </h1>
      <p className="mt-4 max-w-xl text-xl text-foreground/90">Your life is the game. Your rival is real.</p>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        A weekly 1v1 for Yale students. Study, train, see people, get outside, and actually rest. Life XP rewards the balance, then one rival decides the week.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          className="btn btn-primary"
          onClick={() => {
            apply(setCurrentUser(data, "jamie"));
            router.push("/dashboard");
          }}
        >
          Enter demo as Yale student
        </button>
        <Link href="/onboarding" className="btn btn-ghost">
          Build my profile
        </Link>
      </div>
      <div className="mt-10">
        <DuelHero />
      </div>
    </div>
  );
}
