import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/api";
import { Send, Bot, User, Loader2, Info } from "lucide-react";

export default function AIPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: "assistant", content: "Hello! I am FareCurve AI, your specialized aviation pricing and data analyst. I'm trained to help the Government of India (DGCA, NSO, RBI) understand inflation metrics, dynamic pricing, and ATF impacts. How can I assist you with the Airfare Price Index today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState("Auto");
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (router.isReady && router.query.q && !initialized.current) {
      initialized.current = true;
      const initialQuery = router.query.q as string;
      handleSend(initialQuery);
    }
  }, [router.isReady, router.query.q]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (overrideInput?: string) => {
    const messageContent = overrideInput || input.trim();
    if (!messageContent || loading) return;
    
    let fullPrompt = messageContent;
    if (format !== "Auto") {
      fullPrompt += `\n\n(Please format your response as: ${format})`;
    }

    const userMsg = { role: "user", content: fullPrompt };
    // For display, we might want to just show the user's text, but backend needs the full prompt.
    // Let's store display string vs actual prompt in a way, or just show the full prompt.
    // Showing the full prompt is fine for now, or we can just send the format context.
    const displayMsg = { role: "user", content: messageContent };
    
    const newMessages = [...messages, displayMsg];
    setMessages(newMessages);
    if (!overrideInput) setInput("");
    setLoading(true);

    try {
      const apiMessages = [...messages, userMsg];
      const res = await api.chat(apiMessages);
      if (res && res.content) {
        setMessages([...newMessages, { role: "assistant", content: res.content }]);
      } else {
        throw new Error("No response");
      }
    } catch (e) {
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I encountered an error communicating with the Groq API. Please check the logs or API key." }]);
    } finally {
      setLoading(false);
    }
  };

  const formatText = (text: string) => {
    return text.split("\n").map((line, i) => (
      <span key={i}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", padding: "8px", borderRadius: "12px", color: "#fff" }}>
          <Bot size={30} />
        </div>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, lineHeight: 1 }}>FareCurve AI <Info size={16} style={{ display: "inline", color: "#94a3b8", marginLeft: "8px", verticalAlign: "middle" }} /></h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "4px" }}>Powered by Groq LLaMA 3 — AI responses should be verified for official reports.</p>
        </div>
      </div>

      <div className="glass-card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
        
        {/* Chat History */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", gap: "1rem", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
              <div style={{ 
                width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                background: msg.role === "user" ? "#e2e8f0" : "linear-gradient(135deg, #3b82f6, #06b6d4)",
                display: "flex", alignItems: "center", justifyContent: "center", color: msg.role === "user" ? "#64748b" : "#fff"
              }}>
                {msg.role === "user" ? <User size={18} /> : <Bot size={22} />}
              </div>
              <div style={{
                background: msg.role === "user" ? "#f1f5f9" : "rgba(59, 130, 246, 0.08)",
                padding: "1rem", borderRadius: "12px", maxWidth: "80%",
                color: "#1e293b", fontSize: "0.95rem", lineHeight: 1.6,
                border: msg.role === "user" ? "1px solid #e2e8f0" : "1px solid rgba(59, 130, 246, 0.2)"
              }}>
                {formatText(msg.content)}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ 
                width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff"
              }}>
                <Bot size={22} />
              </div>
              <div style={{ padding: "1rem", color: "#64748b", display: "flex", alignItems: "center", gap: "8px" }}>
                <Loader2 size={16} className="animate-spin" /> Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: "1.5rem", borderTop: "1px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.5)" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", background: "#fff", padding: "0.5rem", borderRadius: "999px", border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about airfares, OTAs, or inflation trends..."
              style={{ flex: 1, border: "none", outline: "none", padding: "0.5rem 1rem", fontSize: "0.95rem", background: "transparent" }}
              disabled={loading}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                width: "40px", height: "40px", borderRadius: "50%", border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                background: input.trim() && !loading ? "linear-gradient(135deg, #3b82f6, #06b6d4)" : "#e2e8f0",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s"
              }}
            >
              <Send size={18} style={{ marginLeft: "2px" }} />
            </button>
          </div>
          
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Format:</span>
            {["Auto", "Bullet Points", "Summary"].map(fmt => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: format === fmt ? "none" : "1px solid #cbd5e1",
                  background: format === fmt ? "linear-gradient(135deg, #3b82f6, #06b6d4)" : "#fff",
                  color: format === fmt ? "#fff" : "#475569",
                  transition: "all 0.2s"
                }}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
