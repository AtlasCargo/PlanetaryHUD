import React from 'react';
import Particles from 'react-tsparticles';
import { loadFull } from 'tsparticles';

const ParticlesBackground = ({ show, opacity }) => {
  // Move particle initialization here
  const particlesInit = async (main) => { 
    await loadFull(main); 
  };

  if (!show) return null;

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        background: { color: { value: '#000000' } },
        fpsLimit: 30,
        interactivity: { detectsOn: 'canvas', events: { resize: true } },
        particles: {
          color: { value: '#ffffff' },
          number: { value: 200, density: { enable: true, area: 800 } },
          opacity: { value: 0.5, random: true, anim: { enable: false } },
          size: { value: 1, random: true },
          move: {
            enable: true,
            speed: 0.1,
            direction: 'none',
            random: false,
            straight: false,
            outModes: { default: 'out' }
          }
        }
      }}
      className="absolute inset-0 z-0"
      style={{ opacity }}
    />
  );
};

export default ParticlesBackground; 