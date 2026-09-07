import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Youtube } from "lucide-react";

export const metadata: Metadata = {
  title: "Demo video transcript — Kwik 112",
  description:
    "Full transcript of the Kwik 112 demo video: the busy 112 line, the AI call-taker that answers instantly in any language, emotion-aware intake, and the human dispatcher in command.",
};

const VIDEO_URL = "https://youtu.be/JdzAXL08_24";

const beats: [string, string][] = [
  ["0:00 — The moment it matters", "An accident. A bystander dials 112. The line is busy. He dials again — busy again — while the victim is bleeding. Everyone has lived some version of this moment: an emergency at the most crucial time, and the emergency service is not there."],
  ["0:25 — The problem, plainly", "In a country of India's population, emergency services carry more load than any human dispatch room can absorb. Calls queue, and lives are lost in the queue."],
  ["0:40 — The solution: Kwik — Know Who Is In Crisis", "Kwik puts AI on the 112 line. When you call, the AI answers instantly — no busy tone. It detects the caller's emotions through prosody and semantic analysis: the first MVP of emotion-aware emergency intake."],
  ["1:00 — Multilingual by design", "A caller in Bengaluru may speak any of India's languages. Kwik is multilingual — it understands and responds in the caller's own language, so language never delays help."],
  ["1:20 — Human in command", "The AI grades and prepares every call, but a human dispatcher stays in the loop and makes every dispatch decision. People can rely on a person, not just a machine — machines err, humans judge."],
  ["1:40 — Close", "Kwik makes the emergency system more measurable, more scalable, and more reliable. Thank you."],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "KWIK — Know Who's In Krisis",
  description:
    "Demo video for Kwik 112: an AI call-taker on India's 112 line with emotion-aware multilingual intake and a human dispatcher in command.",
  thumbnailUrl: "https://i.ytimg.com/vi/JdzAXL08_24/hqdefault.jpg",
  uploadDate: "2026-08-28",
  embedUrl: VIDEO_URL,
};

export default function TranscriptPage() {
  return (
    <main className="min-h-screen bg-[#f4f5f2] text-[#151817]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="bg-[#171717] py-14 text-white">
        <div className="mx-auto max-w-[820px] px-5 md:px-8">
          <p className="text-xs font-semibold uppercase text-[#78dcff]">Video, as text</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Demo video transcript</h1>
          <a href={VIDEO_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-10 items-center gap-2 rounded-[6px] bg-[#f40000] px-4 text-sm font-bold text-white hover:bg-[#d90000]">
            <Youtube className="h-4 w-4" aria-hidden /> Watch the 2-minute video
          </a>
        </div>
      </section>
      <section className="border-b border-[#ccd1cc] bg-white py-12">
        <div className="mx-auto max-w-[820px] px-5 md:px-8">
          <h2 className="text-xs font-semibold uppercase text-[#c71920]">Transcript with timestamps</h2>
          <div className="mt-6 space-y-7">
            {beats.map(([time, text]) => (
              <div key={time} className="border-l-2 border-[#cfd4cf] pl-5">
                <h3 className="font-mono text-xs font-bold text-[#087b91]">{time}</h3>
                <p className="mt-2 text-sm leading-7 text-[#3d4946]">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-[#cfd4cf] bg-white px-4 text-sm font-semibold hover:bg-[#eef0ed]">Back to overview</Link>
            <Link href="/for-judges" className="inline-flex h-10 items-center gap-2 rounded-[6px] bg-[#087b91] px-4 text-sm font-bold text-white hover:bg-[#06626f]">For judges <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
