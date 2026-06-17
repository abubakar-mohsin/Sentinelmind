import React, { useState, useEffect } from 'react';
import { Shield, Cpu, Database, Wifi, GitBranch, CheckCircle } from 'lucide-react';

/*
 * BootOverlay — Initialization splash screen shown once per dashboard session.
 * Displays a sequential log of system bootstrap steps with Lucide icons.
 * Fades out after all lines appear, then calls onComplete() to unmount itself.
 */

const BOOT_LINES = [
  { text: 'Loading MITRE ATT&CK framework',   delay: 0,    icon: Shield },
  { text: 'Establishing Kafka event bus',       delay: 200,  icon: GitBranch },
  { text: 'Connecting Neo4j knowledge graph',   delay: 380,  icon: Database },
  { text: 'PostgreSQL audit trail ready',       delay: 540,  icon: Database },
  { text: 'WebSocket gateway online',           delay: 680,  icon: Wifi },
  { text: 'Spawning agents: 4 registered',      delay: 820,  icon: Cpu },
  { text: 'Confidence threshold: 0.92',         delay: 940,  icon: Shield },
  { text: 'All systems nominal',               delay: 1100, icon: CheckCircle, done: true },
];

export default function BootOverlay({ onComplete }) {
  const [visible, setVisible] = useState([]);
  const [fading,  setFading]  = useState(false);

  useEffect(() => {
    const timers = BOOT_LINES.map((line, i) =>
      setTimeout(() => setVisible(prev => [...prev, i]), line.delay)
    );
    const fadeTimer = setTimeout(() => setFading(true),  1600);
    const doneTimer = setTimeout(onComplete,              2100);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div className={`boot-overlay ${fading ? 'boot-overlay--fading' : ''}`}>
      <div className="boot-overlay__logo">
        <Shield size={22} color="var(--accent)" strokeWidth={2} />
        <span className="boot-overlay__logo-text">SENTINELMIND</span>
      </div>

      <div className="boot-overlay__lines">
        {BOOT_LINES.map((line, i) => {
          if (!visible.includes(i)) return null;
          const Icon = line.icon;
          return (
            <div
              key={i}
              className={`boot-overlay__line ${line.done ? 'boot-overlay__line--done' : ''}`}
            >
              <Icon size={11} strokeWidth={2} />
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
