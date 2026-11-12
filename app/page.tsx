"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STARTER_QUESTIONS } from "@/lib/suggestions";

type Msg = { role: "user" | "bot"; text: string; related?: string[] };
type AvatarState = "idle" | "listening" | "thinking" | "speaking";

const STARTER_CHIPS = STARTER_QUESTIONS;

const LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "fr-CA", label: "Français" },
  { code: "es-ES", label: "Español" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "zh-CN", label: "中文" },
  { code: "tl-PH", label: "Tagalog" },
  { code: "ar-SA", label: "العربية" },
];

const QUICK_EXIT_URL = "https://www.google.com";

// Minimal typing for the Web Speech API (not in lib.dom for all browsers).
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};

function getRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<AvatarState>("idle");
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState("en-US");
  const [avatarOk, setAvatarOk] = useState(true);
  const recRef = useRef<Recognition | null>(null);
  const voiceTurn = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickExit = useCallback(() => {
    recRef.current?.stop();
    window.speechSynthesis?.cancel();
    setMessages([]);
    window.location.replace(QUICK_EXIT_URL);
  }, []);

  // Pressing Esc triggers quick exit.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && quickExit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quickExit]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, state]);

  const speak = (text: string) => {
    if (!window.speechSynthesis) return setState("idle");
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    setState("speaking");
    window.speechSynthesis.speak(u);
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || state === "thinking") return;
    const fromVoice = voiceTurn.current;
    voiceTurn.current = false;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setState("thinking");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages((m) => [...m, { role: "bot", text: data.answer, related: data.related }]);
      if (fromVoice) speak(data.answer);
      else setState("idle");
    } catch {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Sorry, something went wrong. Please try again. In an emergency, call 911 immediately." },
      ]);
      setState("idle");
    }
  };

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = getRecognition();
    if (!rec) {
      alert("Voice input is not supported in this browser. Please type your message.");
      return;
    }
    window.speechSynthesis?.cancel();
    rec.lang = lang;
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      voiceTurn.current = true;
      send(transcript);
    };
    rec.onend = () => {
      setListening(false);
      setState((s) => (s === "listening" ? "idle" : s));
    };
    rec.onerror = rec.onend;
    recRef.current = rec;
    rec.start();
    setListening(true);
    setState("listening");
  };

  const statusLabel = { idle: "IDLE", listening: "LISTENING", thinking: "THINKING", speaking: "SPEAKING" }[state];
  const lastBot = [...messages].reverse().find((m) => m.role === "bot");

  return (
    <>
      <button className="quick-exit" onClick={quickExit} aria-label="Quick exit: leave this site now (Esc)">
        <XIcon /> QUICK EXIT
      </button>

      <main className="page">
        <div className="grid">
          {/* Left column */}
          <div className="left">
            <section className="card profile">
              <Logo />
              <h1>Hi, I&apos;m Aster 💙</h1>
              <p className="tag">Your AI companion for support.</p>
              <p className="sub">I&apos;m here to listen and help you.</p>

              <div className="avatar-wrap" data-state={state}>
                {avatarOk ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="avatar" src="/aster.jpg" alt="Aster, your AI companion" onError={() => setAvatarOk(false)} />
                ) : (
                  <div className="avatar avatar-fallback" aria-label="Aster">A</div>
                )}
                <span className="status-pill" aria-live="polite">
                  <span className={`dot ${state === "idle" ? "" : state === "thinking" ? "busy" : "on"}`} />
                  {statusLabel}
                </span>
              </div>

              <div className="mic-bar">
                <span className="mic-label">
                  <span className={`dot ${listening ? "on" : ""}`} />
                  {listening ? "SECURE MIC ON" : "SECURE MIC OFF"}
                </span>
                <div className={`wave ${listening ? "live" : ""}`} aria-hidden>
                  {Array.from({ length: 15 }, (_, i) => (
                    <i key={i} style={{ animationDelay: `${(i % 5) * 0.12}s` }} />
                  ))}
                </div>
                <button
                  className={`mic-btn ${listening ? "active" : ""}`}
                  onClick={toggleMic}
                  aria-label={listening ? "Stop microphone" : "Start microphone"}
                  aria-pressed={listening}
                >
                  <MicIcon />
                </button>
              </div>
            </section>

            <section className="card safe">
              <div>
                <h2><ShieldIcon /> You are safe here</h2>
                <p>This is a judgment-free zone. Your privacy and safety are our top priority.</p>
                <p>Your privacy matters to us. Your conversations are not saved, stored, or shared.</p>
              </div>
              <div className="safe-ico" aria-hidden><PersonIcon /></div>
            </section>
          </div>

          {/* Chat column */}
          <section className="card chat" aria-label="Conversation with Aster">
            <header className="chat-head">
              <div className="title">
                <span className="dot on" style={{ width: 11, height: 11 }} />
                <div>
                  <h2>Secure Live Conversation</h2>
                  <small>End-to-end encrypted transcript in transit</small>
                </div>
              </div>
              <label className="lang">
                <GlobeIcon /> Language:
                <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Conversation language">
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </label>
            </header>

            <div className="messages" ref={scrollRef} aria-live="polite">
              {messages.length === 0 ? (
                <div className="empty">
                  <div className="heart"><HeartIcon /></div>
                  <h3>Conversing with Aster</h3>
                  <p className="quote">
                    &ldquo;I care about your safety. Type a message below, select a suggestion chip or toggle the
                    secure microphone to start talking.&rdquo;
                  </p>
                  <div className="chips">
                    {STARTER_CHIPS.map((c) => (
                      <button key={c} className="chip" onClick={() => send(c)}>{c}</button>
                    ))}
                  </div>
                  <p className="disclaimer">
                    Disclaimer: This is only a guide with suggestions for your safety during the events in Vancouver,
                    2026. In case of an emergency, call 911 immediately.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((m, i) => (
                    <div key={i} className={`msg ${m.role}`}>{m.text}</div>
                  ))}
                  {state === "thinking" && (
                    <div className="msg bot" aria-label="Aster is typing">
                      <span className="typing"><i /><i /><i /></span>
                    </div>
                  )}
                  {state !== "thinking" && lastBot?.related && lastBot.related.length > 0 && (
                    <div className="chips inline">
                      {lastBot.related.map((c) => (
                        <button key={c} className="chip" onClick={() => send(c)}>{c}</button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="composer">
              <form onSubmit={(e) => { e.preventDefault(); send(input); }}>
                <div className="input">
                  <button type="button" className="icon-btn" disabled title="Attachments coming soon" aria-label="Attach file (coming soon)">
                    <ClipIcon />
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    aria-label="Message"
                    maxLength={1000}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className={`icon-btn brand ${listening ? "active" : ""}`}
                    onClick={toggleMic}
                    aria-label={listening ? "Stop microphone" : "Start microphone"}
                  >
                    <MicIcon />
                  </button>
                </div>
                <button type="submit" className="send" disabled={!input.trim() || state === "thinking"} aria-label="Send message">
                  <SendIcon />
                </button>
              </form>
              <div className="foot">
                <span>🔒 Your conversations are private and secure.</span>
                <span>Powered By EWM4Y</span>
              </div>
            </div>
          </section>
        </div>

        <footer className="site-foot">
          <div><strong>© 2026 ewm4yapp.com. All rights reserved.</strong></div>
          <div>
            <strong>Disclaimer:</strong> EWM4Y is an early alpha research app for immigrant women and youth. It is for
            testing and feedback only. Features may change and it is not a substitute for professional, legal, medical,
            or emergency services.
          </div>
        </footer>
      </main>
    </>
  );
}

/* ---------- Brand + icons ---------- */

function Logo() {
  return (
    <div className="logo" aria-label="Enhancing Wellness M4Y">
      <svg width="88" height="88" viewBox="0 0 100 100" fill="none" stroke="#0d4d78" aria-hidden>
        {[46, 40, 34, 28, 22].map((r, i) => (
          <circle key={r} cx="50" cy="50" r={r} strokeWidth={i === 4 ? 5 : 1.6} />
        ))}
        <circle cx="50" cy="50" r="12" strokeWidth="5" />
      </svg>
      <div className="logo-text">
        <div className="l1">ENHANCING</div>
        <div className="l1">WELLNESS</div>
        <div className="l2">M4Y</div>
      </div>
    </div>
  );
}

const svg = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
const XIcon = () => <svg {...svg}><path d="M18 6 6 18M6 6l12 12" /></svg>;
const MicIcon = () => <svg {...svg}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>;
const SendIcon = () => <svg {...svg}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;
const ClipIcon = () => <svg {...svg}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>;
const GlobeIcon = () => <svg {...svg} width={14} height={14} stroke="#3b82f6"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>;
const HeartIcon = () => <svg {...svg} width={30} height={30}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>;
const ShieldIcon = () => <svg {...svg} width={20} height={20}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>;
const PersonIcon = () => <svg {...svg} width={24} height={24}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
