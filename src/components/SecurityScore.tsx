"use client";

interface Props {
  score: number;
  size?: number;
  fontSize?: number;
}

export default function SecurityScore({ score, size = 90, fontSize = 18 }: Props) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? "#22c55e" :
    score >= 50 ? "#eab308" :
    score >= 25 ? "#f97316" : "#ef4444";

  return (
    <div className="score-ring-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s" }}
        />
      </svg>
      <div className="score-ring-label">
        <span className="score-number" style={{ fontSize, color }}>{score}</span>
        <span className="score-text">score</span>
      </div>
    </div>
  );
}
