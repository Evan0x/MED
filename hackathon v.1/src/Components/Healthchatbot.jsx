import { useState, useRef, useEffect } from "react";

const GEMINI_API_KEY = "AIzaSyAwzMjLAyTpVAGElkcinXDZsA1CGhVibbQ"; // Replace with your free Gemini API key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are MedBot, a compassionate and knowledgeable AI health assistant. You help users with:
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
6. Use bullet points for clarity when listing symptoms or recommendations.

You have the following skills:
- 🩺 Symptom Assessment: Analyze symptoms and suggest possible causes
- 💊 Medication Info: Explain medications, dosages, and side effects
- 🥗 Nutrition Advice: Personalized diet and supplement recommendations
- 🧠 Mental Wellness: Stress, anxiety, and mood support
- 🏃 Fitness Guidance: Exercise plans and physical activity advice
- 😴 Sleep Health: Sleep hygiene and insomnia tips`;

const SKILLS = [
  { icon: "🩺", label: "Check Symptoms", prompt: "I have some symptoms I'd like to check." },
  { icon: "💊", label: "Medication Info", prompt: "I need information about a medication." },
  { icon: "🥗", label: "Nutrition Advice", prompt: "Give me personalized nutrition advice." },
  { icon: "🧠", label: "Mental Wellness", prompt: "I need support with stress or mental health." },
  { icon: "🏃", label: "Fitness Tips", prompt: "Help me with exercise and fitness guidance." },
  { icon: "😴", label: "Sleep Health", prompt: "I have trouble sleeping and need advice." },
];

const QUICK_REPLIES = [
  "I have a headache",
  "Help me with anxiety",
  "Best foods for energy",
  "Is this medication safe?",
];

async function callGemini(messages) {
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

export default function HealthChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm **MedBot**, your AI health assistant. 👋\n\nI can help with symptoms, medications, nutrition, mental wellness, fitness, and sleep. How can I assist you today?\n\n⚠️ *I'm not a replacement for professional medical advice.*",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSkill, setActiveSkill] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setActiveSkill(null);

    try {
      const reply = await callGemini(newMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Sorry, I ran into an error: ${e.message}. Please check your API key or try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderContent = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: "28px",
          right: "28px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1a7f5a 0%, #0d5c40 100%)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(26,127,90,0.45)",
          zIndex: 9999,
          transition: "transform 0.2s, box-shadow 0.2s",
          fontSize: "26px",
        }}
        title="Open Health Assistant"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = "0 6px 28px rgba(26,127,90,0.55)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(26,127,90,0.45)";
        }}
      >
        {open ? "✕" : "🩺"}
      </button>

      {/* Chat Window */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "100px",
            right: "28px",
            width: "390px",
            maxHeight: "620px",
            background: "#ffffff",
            borderRadius: "20px",
            boxShadow: "0 8px 48px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9998,
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            overflow: "hidden",
            border: "1px solid rgba(26,127,90,0.12)",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #1a7f5a 0%, #0d5c40 100%)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              🩺
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: "#fff", fontWeight: 600, fontSize: "15px" }}>MedBot</p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "12px" }}>
                AI Health Assistant · Online
              </p>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#7ee8a2" }} />
            </div>
          </div>

          {/* Skills Bar */}
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              background: "#fafdf9",
              scrollbarWidth: "none",
            }}
          >
            {SKILLS.map((skill) => (
              <button
                key={skill.label}
                onClick={() => {
                  setActiveSkill(skill.label);
                  sendMessage(skill.prompt);
                }}
                style={{
                  flexShrink: 0,
                  padding: "5px 10px",
                  borderRadius: "20px",
                  border: `1px solid ${activeSkill === skill.label ? "#1a7f5a" : "#e0e0e0"}`,
                  background: activeSkill === skill.label ? "#e8f5ee" : "#fff",
                  color: activeSkill === skill.label ? "#1a7f5a" : "#555",
                  fontSize: "11.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontWeight: activeSkill === skill.label ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                {skill.icon} {skill.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "#f8fdf9",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: "8px",
                }}
              >
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#1a7f5a,#0d5c40)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      flexShrink: 0,
                    }}
                  >
                    🩺
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: msg.role === "user" ? "linear-gradient(135deg,#1a7f5a,#0d5c40)" : "#fff",
                    color: msg.role === "user" ? "#fff" : "#2d2d2d",
                    fontSize: "13.5px",
                    lineHeight: "1.55",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    border: msg.role === "assistant" ? "1px solid rgba(26,127,90,0.1)" : "none",
                  }}
                  dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                />
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#1a7f5a,#0d5c40)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                  }}
                >
                  🩺
                </div>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid rgba(26,127,90,0.1)",
                    borderRadius: "18px 18px 18px 4px",
                    padding: "12px 16px",
                    display: "flex",
                    gap: "4px",
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((d) => (
                    <div
                      key={d}
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#1a7f5a",
                        animation: "bounce 1.2s infinite",
                        animationDelay: `${d * 0.2}s`,
                        opacity: 0.7,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Replies (only at start) */}
            {messages.length === 1 && !loading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "16px",
                      border: "1px solid #1a7f5a",
                      background: "transparent",
                      color: "#1a7f5a",
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#1a7f5a";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#1a7f5a";
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Disclaimer */}
          <div
            style={{
              padding: "6px 14px",
              background: "#fff8e1",
              borderTop: "1px solid #ffe082",
              fontSize: "10.5px",
              color: "#7a6000",
              textAlign: "center",
            }}
          >
            ⚕️ For emergencies, call 911. MedBot does not replace professional medical advice.
          </div>

          {/* Input */}
          <div
            style={{
              padding: "12px 14px",
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              gap: "8px",
              background: "#fff",
              alignItems: "flex-end",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about symptoms, medications, diet..."
              rows={1}
              style={{
                flex: 1,
                border: "1.5px solid #e0e0e0",
                borderRadius: "12px",
                padding: "9px 12px",
                fontSize: "13.5px",
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                color: "#2d2d2d",
                lineHeight: "1.4",
                maxHeight: "80px",
                overflowY: "auto",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1a7f5a")}
              onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: loading || !input.trim() ? "#e0e0e0" : "linear-gradient(135deg,#1a7f5a,#0d5c40)",
                border: "none",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              ➤
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