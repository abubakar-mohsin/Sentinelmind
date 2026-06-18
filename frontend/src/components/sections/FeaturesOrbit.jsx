import RadialOrbitalTimeline from '../ui/RadialOrbitalTimeline';
import { featuresData } from '../../data/featuresData';

export default function FeaturesOrbit() {
  return (
    <div style={{ background: '#0a0e1a', position: 'relative' }}>
      <div style={{ textAlign: 'center', padding: '80px 80px 0' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#3b82f6',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          THE PLATFORM
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#f9fafb',
            letterSpacing: '-2px',
            marginBottom: 12,
          }}
        >
          8 agents. One mind.
        </div>
        <div style={{ fontSize: 16, color: '#4b5563', marginBottom: 0 }}>
          Click any agent to see what it does and how it connects to the others.
        </div>
      </div>
      <RadialOrbitalTimeline timelineData={featuresData} />
    </div>
  );
}
