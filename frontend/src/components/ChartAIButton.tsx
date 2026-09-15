import { useRouter } from 'next/router';
import { Bot } from 'lucide-react';

export function ChartAIButton({ contextQuery }: { contextQuery: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/ai?q=${encodeURIComponent(contextQuery)}`)}
      style={{
        background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
        border: "none",
        borderRadius: "50%",
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        cursor: "pointer",
        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        transition: "transform 0.2s ease",
        flexShrink: 0
      }}
      title="Analyze with FareCurve AI"
      onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
      onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
    >
      <Bot size={20} />
    </button>
  );
}
