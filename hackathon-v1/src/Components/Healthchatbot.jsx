import { useState, useRef, useEffect } from "react";
import { useSystemDarkMode } from "../useSystemDarkMode";
import { apiPost } from "../api";

const TEAL = "rgb(15, 118, 110)";
const TEAL_DARK = "rgb(10, 90, 84)";
const TEAL_LIGHT = "rgba(15, 118, 110, 0.10)";
const INPUT_MAX_H = 132; // composer stops growing here and starts scrolling

// Colours that change with the system theme (dark values match the profile page)
const LIGHT = {
  surface: "#fff", bar: "#fafefe", canvas: "#f8fefe", divider: "#f0f0f0",
  text: "#2d2d2d", bubble: "#fff", bubbleBorder: TEAL_LIGHT,
  chip: "#fff", chipBorder: "#e0e0e0", chipText: "#555", chipIcon: "#888",
  accent: TEAL, accentBg: TEAL_LIGHT, onAccent: "#fff",
  inputBg: "#fff", inputBorder: "#e0e0e0", placeholder: "#9ca3af",
  disabled: "#e0e0e0", disabledIcon: "#aaa",
  noteBg: "#fff8e1", noteBorder: "#ffe082", noteText: "#7a6000",
  shadow: "0 8px 48px rgba(0,0,0,0.18)",
};
const DARK = {
  surface: "#0f172a", bar: "#111c2e", canvas: "#0b1220", divider: "#243041",
  text: "#e2e8f0", bubble: "#1e293b", bubbleBorder: "#243041",
  chip: "#1e293b", chipBorder: "#334155", chipText: "#cbd5e1", chipIcon: "#94a3b8",
  accent: "#2dd4bf", accentBg: "rgba(45,212,191,0.12)", onAccent: "#042f2e",
  inputBg: "#1e293b", inputBorder: "#334155", placeholder: "#64748b",
  disabled: "#334155", disabledIcon: "#64748b",
  noteBg: "#2a2210", noteBorder: "#5c4a12", noteText: "#fcd34d",
  shadow: "0 8px 48px rgba(0,0,0,0.55)",
};

// ── SVG Icons ──────────────────────────────────────────────────────────────────

const IconStethoscope = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {/* ear tubes */}
    <path d="M6 3 C6 3 5 3 5 4 L5 9" />
    <path d="M12 3 C12 3 13 3 13 4 L13 9" />
    {/* chest piece arc */}
    <path d="M5 9 C5 14 13 14 13 9" />
    {/* tube down and loop */}
    <path d="M9 14 L9 18 C9 20.5 12 20.5 12 18 L12 17" />
    {/* diaphragm circle */}
    <circle cx="12" cy="16" r="1.5" fill={color} stroke="none" />
  </svg>
);

const IconPill = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
    <circle cx="18" cy="18" r="4" />
    <path d="m15.5 15.5 5 5" />
  </svg>
);

const IconSalad = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 21h10" />
    <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
    <path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-3.19 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.5" />
    <path d="m13 12 4-4" />
  </svg>
);

const IconBrain = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
    <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
    <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
    <path d="M6 18a4 4 0 0 1-1.967-.516" />
    <path d="M19.967 17.484A4 4 0 0 1 18 18" />
  </svg>
);

const IconRun = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13" cy="4" r="1" />
    <path d="M6 20v-6l2.5-3.5 3.5 3 3-3 2 3" />
    <path d="m6 20 2-4" />
    <path d="m18 14-1-4-5.5 1-3-2.5" />
  </svg>
);

const IconMoon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const IconSend = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

const IconClose = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ display: "block" }}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const IconAvelaAI = ({ size = 20 }) => (
  <img
    src="/avela-ai-logo.png"
    alt="Avela AI"
    width={size}
    height={size}
    style={{
      width: size,
      height: size,
      objectFit: "contain",
      display: "block",
    }}
  />
);

const IconAlert = ({ size = 14, color = "#7a6000" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

// ── Skill definitions ──────────────────────────────────────────────────────────

const SKILLS = [
  { Icon: IconStethoscope, label: "Check Symptoms", prompt: "I have some symptoms I'd like to check." },
  { Icon: IconPill,        label: "Medication Info", prompt: "I need information about a medication." },
  { Icon: IconSalad,       label: "Nutrition",       prompt: "Give me personalized nutrition advice." },
  { Icon: IconBrain,       label: "Mental Wellness", prompt: "I need support with stress or mental health." },
  { Icon: IconRun,         label: "Fitness Tips",    prompt: "Help me with exercise and fitness guidance." },
  { Icon: IconMoon,        label: "Sleep Health",    prompt: "I have trouble sleeping and need advice." },
];

const QUICK_REPLIES = [
  "I have a headache",
  "Help with anxiety",
  "Foods for energy",
  "Is this med safe?",
];

// ── Chat call (Gemini runs server-side in /api/chat) ──────────────────────────

async function callGemini(messages) {
  const { reply } = await apiPost("chat", {
    messages: messages.map(({ role, content }) => ({ role, content })),
  });
  return reply;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function HealthChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm **AvelaAI**, your AI health assistant.\n\nI can help with symptoms, medications, nutrition, mental wellness, fitness, and sleep. How can I assist you today?\n\n*I'm not a replacement for professional medical advice.*",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSkill, setActiveSkill] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const C = useSystemDarkMode() ? DARK : LIGHT;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize the composer: grow with the text, then scroll past INPUT_MAX_H
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_H)}px`;
  }, [input, open]);

  const sendMessage = async (text, fromSkill = false) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    // Only clear the active skill pill when the user types freely — not when clicking a pill
    if (!fromSkill) setActiveSkill(null);
    try {
      const reply = await callGemini(newMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I ran into an error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Inline markdown (**bold**, *italic*) on an HTML-escaped line
  const renderInline = (line) =>
    line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Build real blocks (<p> / <ul>) with tight margins instead of stacked <br/>,
  // which is what created the big empty lines between the intro and the bullets.
  const renderContent = (text) => {
    const lines = text.split("\n").map((l) => l.trim());
    const blocks = [];

    for (const line of lines) {
      if (!line) continue; // blank lines carry no spacing — block margins do
      const bullet = line.match(/^[•\-*+]\s+(.*)$/);
      if (bullet) {
        const last = blocks[blocks.length - 1];
        if (last?.type === "list") last.items.push(bullet[1]);
        else blocks.push({ type: "list", items: [bullet[1]] });
      } else {
        blocks.push({ type: "p", text: line });
      }
    }

    return blocks
      .map((block, i) => {
        const isLast = i === blocks.length - 1;
        const gap = isLast ? 0 : 4; // space between blocks, not a full empty line
        if (block.type === "list") {
          const items = block.items
            .map((item) => `<li style="margin:0;padding:0;line-height:1.45">${renderInline(item)}</li>`)
            .join("");
          return `<ul style="margin:1px 0 ${gap}px;padding-left:16px;list-style-position:outside">${items}</ul>`;
        }
        return `<p style="margin:0 0 ${gap}px;line-height:1.45">${renderInline(block.text)}</p>`;
      })
      .join("");
  };

  const isStart = messages.length === 1 && !loading;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Open Health Assistant"
        style={{
          position: "fixed", bottom: "28px", right: "28px",
          width: "60px", height: "60px", borderRadius: "50%",
          background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(15,118,110,0.45)",
          zIndex: 9999, transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(15,118,110,0.55)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(15,118,110,0.45)"; }}
      >
        {open ? <IconClose size={20} color="#fff" /> : <IconAvelaAI size={36} />}
      </button>

      {/* Chat Window */}
      {open && (
        <div style={{
          position: "fixed", bottom: "100px", right: "28px",
          width: "390px", maxHeight: "640px",
          background: C.surface, borderRadius: "20px",
          boxShadow: C.shadow,
          display: "flex", flexDirection: "column",
          zIndex: 9998, fontFamily: "'Segoe UI', system-ui, sans-serif",
          overflow: "hidden", border: `1px solid ${C.bubbleBorder}`,
        }}>

          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_DARK} 100%)`,
            padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px",
          }}>
            <div style={{
              width: "42px", height: "42px", borderRadius: "50%",
              background: "#fff", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
            }}>
              <IconAvelaAI size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                margin: 0, color: "#fff", fontWeight: 700, fontSize: "16px",
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                letterSpacing: "-0.01em",
              }}>AvelaAI</p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "12px" }}>AI Health Assistant · Online</p>
            </div>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#7ee8a2" }} />
          </div>

          {/* Skills Bar */}
          <div style={{
            padding: "10px 12px", borderBottom: `1px solid ${C.divider}`,
            display: "flex", gap: "6px", overflowX: "auto",
            background: C.bar, scrollbarWidth: "none",
          }}>
            {SKILLS.map((skill) => {
              const active = activeSkill === skill.label;
              return (
                <button
                  key={skill.label}
                  onClick={() => { setActiveSkill(skill.label); sendMessage(skill.prompt, true); }}
                  style={{
                    flexShrink: 0,
                    padding: "5px 10px",
                    borderRadius: "20px",
                    border: `1px solid ${active ? C.accent : C.chipBorder}`,
                    background: active ? C.accentBg : C.chip,
                    color: active ? C.accent : C.chipText,
                    fontSize: "11.5px", cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontWeight: active ? 600 : 400,
                    display: "flex", alignItems: "center", gap: "5px",
                    transition: "all 0.15s",
                  }}
                >
                  <skill.Icon size={13} color={active ? C.accent : C.chipIcon} />
                  {skill.label}
                </button>
              );
            })}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px",
            display: "flex", flexDirection: "column", gap: "12px",
            background: C.canvas,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-end", gap: "8px",
              }}>
                {msg.role === "assistant" && (
                  <IconAvelaAI size={28} />
                )}
                <div
                  style={{
                    maxWidth: "82%", padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: msg.role === "user"
                      ? `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`
                      : C.bubble,
                    color: msg.role === "user" ? "#fff" : C.text,
                    fontSize: "13.5px", lineHeight: "1.6",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    border: msg.role === "assistant" ? `1px solid ${C.bubbleBorder}` : "none",
                    wordBreak: "break-word",
                  }}
                  dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                />
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                <IconAvelaAI size={28} />
                <div style={{
                  background: C.bubble, border: `1px solid ${C.bubbleBorder}`,
                  borderRadius: "18px 18px 18px 4px", padding: "12px 16px",
                  display: "flex", gap: "4px", alignItems: "center",
                }}>
                  {[0, 1, 2].map((d) => (
                    <div key={d} style={{
                      width: "7px", height: "7px", borderRadius: "50%",
                      background: C.accent, opacity: 0.7,
                      animation: "bounce 1.2s infinite",
                      animationDelay: `${d * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick replies placeholder — always reserves space to prevent layout jump */}
            <div style={{ minHeight: "36px", alignSelf: "flex-start" }}>
              {isStart && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      style={{
                        padding: "6px 12px", borderRadius: "16px",
                        border: `1px solid ${C.accent}`,
                        background: "transparent", color: C.accent,
                        fontSize: "12px", cursor: "pointer", lineHeight: 1.4,
                        transition: "all 0.15s", whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = C.onAccent; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.accent; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div ref={bottomRef} />
          </div>

          {/* Disclaimer */}
          <div style={{
            padding: "6px 14px", background: C.noteBg,
            borderTop: `1px solid ${C.noteBorder}`,
            fontSize: "10.5px", color: C.noteText,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
          }}>
            <IconAlert size={12} color={C.noteText} />
            For emergencies, call 911. AvelaAI does not replace professional medical advice.
          </div>

          {/* Input */}
          <div style={{
            padding: "12px 14px", borderTop: `1px solid ${C.divider}`,
            display: "flex", gap: "10px", background: C.surface, alignItems: "flex-end",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              className="avela-chat-input"
              placeholder="Ask about symptoms, medications, diet..."
              rows={1}
              style={{
                flex: 1, border: `1.5px solid ${C.inputBorder}`, background: C.inputBg, borderRadius: "14px",
                padding: "12px 16px", fontSize: "13.5px", resize: "none",
                outline: "none", fontFamily: "inherit", color: C.text,
                lineHeight: "1.5", maxHeight: `${INPUT_MAX_H}px`, overflowY: "auto",
                boxSizing: "border-box", display: "block",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = C.accent)}
              onBlur={(e) => (e.target.style.borderColor = C.inputBorder)}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: "44px", height: "44px", borderRadius: "14px",
                background: loading || !input.trim() ? C.disabled : `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
                border: "none",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.15s",
              }}
            >
              <IconSend size={16} color={loading || !input.trim() ? C.disabledIcon : "#fff"} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .avela-chat-input::placeholder { color: ${C.placeholder}; }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
