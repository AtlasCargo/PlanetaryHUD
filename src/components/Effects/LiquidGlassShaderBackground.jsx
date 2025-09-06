import React from 'react';
import { MeshGradient } from '@paper-design/shaders-react';

export default function LiquidGlassShaderBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* Primary mesh gradient layer */}
      <MeshGradient
        className="absolute inset-0 w-full h-full"
        colors={["#000000", "#8b5cf6", "#ffffff", "#1e1b4b", "#4c1d95"]}
        speed={0.3}
        backgroundColor="#000000"
      />
      {/* Wireframe overlay for subtle motion */}
      <MeshGradient
        className="absolute inset-0 w-full h-full opacity-60"
        colors={["#000000", "#ffffff", "#8b5cf6", "#000000"]}
        speed={0.2}
        wireframe={true}
        backgroundColor="transparent"
      />
    </div>
  );
}
