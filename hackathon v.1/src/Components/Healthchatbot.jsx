import { useState, useRef, useEffect } from "react";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const TEAL = "rgb(15, 118, 110)";
const TEAL_DARK = "rgb(10, 90, 84)";
const TEAL_LIGHT = "rgba(15, 118, 110, 0.10)";

const SYSTEM_PROMPT = `You are AvelaAI, a compassionate and knowledgeable AI health assistant. You help users with:
- Symptom checking and general health guidance
- Medication information and reminders
- Nutrition and diet advice
- Mental health support and stress management
- Exercise and fitness recommendations
- Preventive care tips
- Sleep health advice
- Understanding medical terms

IMPORTANT RULES:
1. Always recommend consulting a licensed doctor for diagnosis or serious concerns.
2. Never prescribe medications or replace professional medical advice.
3. Be empathetic, clear, and supportive.
4. If someone describes an emergency (chest pain, difficulty breathing, etc.), immediately tell them to call emergency services (911).
5. Keep responses concise and easy to understand.
6. Use bullet points for clarity when listing symptoms or recommendations.`;

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

// ── Gemini call ────────────────────────────────────────────────────────────────

async function callGemini(messages) {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key is missing.");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || "Gemini API error");
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
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

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

  const renderContent = (text) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");

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
          background: "#fff", borderRadius: "20px",
          boxShadow: "0 8px 48px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
          zIndex: 9998, fontFamily: "'Segoe UI', system-ui, sans-serif",
          overflow: "hidden", border: `1px solid ${TEAL_LIGHT}`,
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
            padding: "10px 12px", borderBottom: "1px solid #f0f0f0",
            display: "flex", gap: "6px", overflowX: "auto",
            background: "#fafefe", scrollbarWidth: "none",
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
                    border: `1px solid ${active ? TEAL : "#e0e0e0"}`,
                    background: active ? TEAL_LIGHT : "#fff",
                    color: active ? TEAL : "#555",
                    fontSize: "11.5px", cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontWeight: active ? 600 : 400,
                    display: "flex", alignItems: "center", gap: "5px",
                    transition: "all 0.15s",
                  }}
                >
                  <skill.Icon size={13} color={active ? TEAL : "#888"} />
                  {skill.label}
                </button>
              );
            })}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px",
            display: "flex", flexDirection: "column", gap: "12px",
            background: "#f8fefe",
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
                      : "#fff",
                    color: msg.role === "user" ? "#fff" : "#2d2d2d",
                    fontSize: "13.5px", lineHeight: "1.6",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    border: msg.role === "assistant" ? `1px solid ${TEAL_LIGHT}` : "none",
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
                  background: "#fff", border: `1px solid ${TEAL_LIGHT}`,
                  borderRadius: "18px 18px 18px 4px", padding: "12px 16px",
                  display: "flex", gap: "4px", alignItems: "center",
                }}>
                  {[0, 1, 2].map((d) => (
                    <div key={d} style={{
                      width: "7px", height: "7px", borderRadius: "50%",
                      background: TEAL, opacity: 0.7,
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
                        border: `1px solid ${TEAL}`,
                        background: "transparent", color: TEAL,
                        fontSize: "12px", cursor: "pointer", lineHeight: 1.4,
                        transition: "all 0.15s", whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = TEAL; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = TEAL; }}
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
            padding: "6px 14px", background: "#fff8e1",
            borderTop: "1px solid #ffe082",
            fontSize: "10.5px", color: "#7a6000",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
          }}>
            <IconAlert size={12} color="#7a6000" />
            For emergencies, call 911. AvelaAI does not replace professional medical advice.
          </div>

          {/* Input */}
          <div style={{
            padding: "12px 14px", borderTop: "1px solid #f0f0f0",
            display: "flex", gap: "8px", background: "#fff", alignItems: "flex-end",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about symptoms, medications, diet..."
              rows={1}
              style={{
                flex: 1, border: "1.5px solid #e0e0e0", borderRadius: "12px",
                padding: "9px 12px", fontSize: "13.5px", resize: "none",
                outline: "none", fontFamily: "inherit", color: "#2d2d2d",
                lineHeight: "1.4", maxHeight: "80px", overflowY: "auto",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = TEAL)}
              onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: "40px", height: "40px", borderRadius: "12px",
                background: loading || !input.trim() ? "#e0e0e0" : `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
                border: "none",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.15s",
              }}
            >
              <IconSend size={16} color={loading || !input.trim() ? "#aaa" : "#fff"} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
