import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Stars, Sparkles, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import MagicalTree from './MagicalTree';
import { HandData } from '../types';

interface ExperienceProps {
  handData: HandData;
  setMode: (mode: 'tree' | 'gallery') => void;
  bgImage: string | null;
  userPhotos: string[];
}

const Background = ({ bgImage }: { bgImage: string | null }) => {
    const { viewport } = useThree();
    const texture = useMemo(() => bgImage ? new THREE.TextureLoader().load(bgImage) : null, [bgImage]);
    
    if (!texture) return null;

    return (
        <mesh position={[0, 0, -30]} scale={[viewport.width * 3, viewport.height * 3, 1]}>
            <planeGeometry />
            {/* Reduced opacity to 0.4 and added dark gray color to dim brightness */}
            <meshBasicMaterial map={texture} color="#666" toneMapped={false} transparent opacity={0.4} />
        </mesh>
    )
}

const Snow = () => {
  const count = 2500; // Increased snow count
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 });
    }
    return temp;
  }, [count]);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    
    particles.forEach((particle, i) => {
      let { t, factor, speed, xFactor, yFactor, zFactor } = particle;
      t = particle.t += speed / 2;
      const a = Math.cos(t) + Math.sin(t * 1) / 10;
      const b = Math.sin(t) + Math.cos(t * 2) / 10;
      const s = Math.cos(t);
      
      // Falling down logic
      particle.yFactor -= delta * 5; 
      if (particle.yFactor < -30) particle.yFactor = 30;

      dummy.position.set(
        (particle.mx / 10) * a + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
        (particle.my / 10) * b + particle.yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
        (particle.my / 10) * b + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
      );
      dummy.scale.setScalar(Math.max(0.05, s * 0.15)); // Random sizes
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[0.2, 0]} />
      <meshBasicMaterial color="white" transparent opacity={0.8} />
    </instancedMesh>
  );
};

const Experience: React.FC<ExperienceProps> = ({ handData, setMode, bgImage, userPhotos }) => {
  return (
    <div className="w-full h-full bg-[#050510] relative">
      <Canvas 
        camera={{ position: [0, 0, 18], fov: 35 }} 
        shadows 
        dpr={[1, 1.5]} 
        gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.0 }}
      >
        <color attach="background" args={['#020205']} />
        
        <Environment preset="night" blur={0.6} />

        <Background bgImage={bgImage} />

        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
        
        <Snow />

        {/* Extra glowing particles */}
        <Sparkles count={800} scale={15} size={3} speed={0.4} opacity={0.6} color="#FFD700" noise={2} />
        
        <ambientLight intensity={0.2} color="#FFF5E0" />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#FFD700" distance={30} />
        <pointLight position={[-5, 2, 5]} intensity={0.8} color="#FF4500" distance={30} />
        <spotLight position={[0, 15, 0]} angle={0.4} penumbra={1} intensity={3} castShadow color="#FFFACD" />
        
        <Suspense fallback={null}>
            <MagicalTree handData={handData} setMode={setMode} userPhotos={userPhotos} />
        </Suspense>

        <EffectComposer enableNormalPass={false}>
          {/* Increased threshold to 1.0 to ensure standard photos (intensity <= 1) do not bloom */}
          <Bloom luminanceThreshold={1.0} mipmapBlur intensity={1.5} radius={0.5} color="#FFD700" />
          <Vignette eskil={false} offset={0.1} darkness={1.0} />
          <Noise opacity={0.05} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default Experience;