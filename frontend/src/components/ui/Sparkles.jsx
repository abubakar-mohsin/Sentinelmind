import React, { useCallback } from 'react';
import { ParticlesProvider, Particles } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

/**
 * Sparkles — floating particle background layer using tsparticles v4.
 * Must be inside a position:relative container. Fills it absolutely.
 */
function Sparkles({
  id = 'sparkles',
  density = 600,
  color = '#3b82f6',
  opacity = 0.4,
  speed = 0.8,
}) {
  // useCallback keeps the init reference stable — ParticlesProvider requires it.
  const init = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <ParticlesProvider init={init}>
      <Particles
        id={id}
        style={{ position: 'absolute', inset: 0 }}
        options={{
          fullScreen: { enable: false },
          background: { color: { value: 'transparent' } },
          particles: {
            number: {
              value: density,
              density: { enable: true, width: 400, height: 400 },
            },
            color: { value: color },
            opacity: { value: opacity },
            size: { value: { min: 0.5, max: 1.5 } },
            move: {
              enable: true,
              speed,
              direction: 'none',
              random: true,
              straight: false,
            },
            shape: { type: 'circle' },
          },
          interactivity: {
            events: {
              onHover: { enable: false },
              onClick: { enable: false },
            },
          },
          detectRetina: true,
        }}
      />
    </ParticlesProvider>
  );
}

export default Sparkles;
