import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Instances, Instance, Sparkles } from '@react-three/drei';
import { HandData, GestureType } from '../types';

interface MagicalTreeProps {
  handData: HandData;
  setMode: (mode: 'tree' | 'gallery') => void;
  userPhotos: string[];
}

// --- Configuration ---
const ITEM_COUNT = 350;
const PARTICLE_COUNT = 2000;
const OUTER_PARTICLE_COUNT = 1500;
const RIBBON_PARTICLE_COUNT = 1200; 
const RADIUS_TREE_BASE = 2.8;
const HEIGHT_TREE = 9.0;

// --- Global Cache ---
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();

// --- Materials ---
const matGold = new THREE.MeshStandardMaterial({ 
    color: "#FFD700", 
    roughness: 0.1, 
    metalness: 1.0, 
    emissive: "#FFA500", 
    emissiveIntensity: 0.2 
});

const matRed = new THREE.MeshStandardMaterial({
    color: "#B22222", // Firebrick red for a richer look
    roughness: 0.3, 
    metalness: 0.2,
    emissive: "#800000",
    emissiveIntensity: 0.1
});

const matWhite = new THREE.MeshStandardMaterial({
    color: "#F8F8FF", // GhostWhite
    roughness: 0.2,
    metalness: 0.1,
    emissive: "#FFFFFF",
    emissiveIntensity: 0.1
});

// --- Helper Functions ---

const getTreePos = (i: number, count: number) => {
    const tLinear = i / count;
    const t = Math.pow(tLinear, 1.25);
    
    const angle = i * 2.399; 
    const y = (t * HEIGHT_TREE) - (HEIGHT_TREE / 2);
    const r = (1 - t) * RADIUS_TREE_BASE;
    
    const jitter = 0.3;
    const x = Math.cos(angle) * r + (Math.random() - 0.5) * jitter;
    const z = Math.sin(angle) * r + (Math.random() - 0.5) * jitter;
    return new THREE.Vector3(x, y, z);
};

const getHeartPos = (i: number, count: number, offsetTime: number) => {
    const t = ((i / count) * Math.PI * 2 + offsetTime) % (Math.PI * 2);
    const scale = 0.35;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
    return new THREE.Vector3(x * scale, (y * scale) + 1, 0);
};

// --- Procedural Models ---

const SpiralRibbon = ({ visible }: { visible: boolean }) => {
  const curve = useMemo(() => {
    const points = [];
    const turns = 5;
    const segments = 120;
    for (let i = 0; i <= segments; i++) {
      const tLinear = i / segments;
      const t = Math.pow(tLinear, 1.15);
      
      const angle = tLinear * Math.PI * 2 * turns;
      const y = (t * HEIGHT_TREE) - (HEIGHT_TREE / 2);
      const r = ((1 - t) * RADIUS_TREE_BASE) + 0.3; 
      points.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  return (
    <group>
        {visible && <RibbonParticles curve={curve} />}
    </group>
  );
};

const RibbonParticles = ({ curve }: { curve: THREE.CatmullRomCurve3 }) => {
    const particles = useMemo(() => {
        const p = [];
        for(let i=0; i<RIBBON_PARTICLE_COUNT; i++) {
            p.push({ 
                t: Math.random(), 
                speed: 0.0003 + Math.random() * 0.0008,
                offset: new THREE.Vector3((Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3),
                scale: Math.random()
            });
        }
        return p;
    }, []);
    
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const ref = useRef<THREE.InstancedMesh>(null);

    useFrame((state) => {
        if (!ref.current) return;
        particles.forEach((p, i) => {
            p.t += p.speed;
            if (p.t > 1) p.t = 0;
            
            const pos = curve.getPointAt(p.t);
            pos.add(p.offset); 

            dummy.position.copy(pos);
            
            const pulse = Math.sin(state.clock.elapsedTime * 3 + i) * 0.5 + 0.5;
            const s = (0.02 + p.scale * 0.04) * (0.8 + 0.4 * pulse);
            dummy.scale.setScalar(s);
            
            dummy.updateMatrix();
            ref.current!.setMatrixAt(i, dummy.matrix);
        });
        ref.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={ref} args={[undefined, undefined, RIBBON_PARTICLE_COUNT]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshBasicMaterial 
                color="#FFD700" 
                transparent 
                opacity={0.8}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
            />
        </instancedMesh>
    )
}

const OuterGhostTree = ({ visible }: { visible: boolean }) => {
    const ref = useRef<THREE.Points>(null);
    const particles = useMemo(() => {
        const positions = new Float32Array(OUTER_PARTICLE_COUNT * 3);
        const sizes = new Float32Array(OUTER_PARTICLE_COUNT);
        for (let i = 0; i < OUTER_PARTICLE_COUNT; i++) {
            const tLinear = Math.random(); 
            const t = Math.pow(tLinear, 1.2);
            
            const y = (t * HEIGHT_TREE * 1.2) - (HEIGHT_TREE * 1.2 / 2); 
            const rBase = (1 - t) * (RADIUS_TREE_BASE * 1.6); 
            const angle = Math.random() * Math.PI * 2;
            const r = rBase + (Math.random() * 0.5);
            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = Math.sin(angle) * r;
            sizes[i] = Math.random();
        }
        return { positions, sizes };
    }, []);

    useFrame((state, delta) => {
        if (ref.current) {
             const targetScale = visible ? 1 : 0;
             ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta);
             ref.current.rotation.y -= delta * 0.05;
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={particles.positions.length / 3} array={particles.positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.08} color="#FFD700" transparent opacity={0.3} sizeAttenuation={true} blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
    );
};

const CandyCane = () => (
    <group scale={0.4} rotation={[0, 0, Math.PI / 8]}>
        <mesh material={matWhite} position={[0,0,0]}><cylinderGeometry args={[0.2, 0.2, 2]} /></mesh>
        <mesh material={matRed} position={[0,0.5,0]} rotation={[0,0,0.2]}><torusGeometry args={[0.5, 0.21, 8, 12, Math.PI]} /></mesh>
    </group>
);

const ChristmasBell = () => (
    <group scale={0.4}>
        <mesh material={matGold} position={[0,0,0]}><cylinderGeometry args={[0.1, 0.5, 1]} /></mesh>
        <mesh material={matGold} position={[0,-0.5,0]}><sphereGeometry args={[0.55, 16, 16, 0, Math.PI * 2, 0, Math.PI/2]} /></mesh>
    </group>
)

const Sock = () => (
    <group scale={0.4} rotation={[0, 0, -Math.PI / 6]}>
        <mesh material={matRed}><capsuleGeometry args={[0.3, 0.8, 4, 8]} /></mesh>
        <mesh material={matWhite} position={[0, 0.5, 0]}><cylinderGeometry args={[0.35, 0.35, 0.3]} /></mesh>
    </group>
)

const SantaHat = () => (
    <group scale={0.4} rotation={[0.2, 0, 0]}>
        <mesh material={matWhite} position={[0, -0.4, 0]}><torusGeometry args={[0.4, 0.15, 8, 16]} /></mesh>
        <mesh material={matRed} position={[0, 0.1, 0]}><coneGeometry args={[0.38, 1, 16]} /></mesh>
        <mesh material={matWhite} position={[0, 0.6, 0.1]}><sphereGeometry args={[0.15, 16, 16]} /></mesh>
    </group>
);

const Candy = () => (
    <group scale={0.35}>
         <mesh material={matRed}><sphereGeometry args={[0.4, 16, 16]} /></mesh>
         <group position={[0.4, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
             <mesh material={matWhite}><coneGeometry args={[0.3, 0.5, 16]} /></mesh>
         </group>
         <group position={[-0.4, 0, 0]} rotation={[0, 0, Math.PI/2]}>
             <mesh material={matWhite}><coneGeometry args={[0.3, 0.5, 16]} /></mesh>
         </group>
    </group>
);

const GiftBox = () => (
  <group scale={0.5}>
    <mesh material={matRed} castShadow><boxGeometry args={[1, 1, 1]} /></mesh>
    <mesh material={matGold} scale={[1.02, 1.02, 0.2]}><boxGeometry args={[1, 1, 1]} /></mesh>
  </group>
);

const Orb = ({ flash }: { flash?: boolean }) => {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if(flash && ref.current) {
             const t = state.clock.elapsedTime * 5;
             const scale = 1 + (Math.sin(t) > 0.5 ? 0.3 : 0);
             ref.current.scale.setScalar(scale * 0.25);
        }
    });
    return <mesh ref={ref} material={matGold} scale={0.25}><sphereGeometry args={[1, 16, 16]} /></mesh>
}

const Star = () => <mesh material={matWhite} scale={0.15} rotation={[0,0,Math.PI/4]}><octahedronGeometry args={[1, 0]} /></mesh>

// --- Shared State ---
type SharedState = { closestId: number | null; };

// --- Main Component ---
const MagicalTree: React.FC<MagicalTreeProps> = ({ handData, setMode, userPhotos }) => {
  const [targetMode, setTargetMode] = useState<'tree' | 'gallery'>('tree');
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  
  const groupRef = useRef<THREE.Group>(null);
  const particleGroupRef = useRef<THREE.Group>(null);
  const gestureTimer = useRef<number>(0);
  const { camera } = useThree();
  const sharedState = useRef<SharedState>({ closestId: null });

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // --- Mode Switching ---
    if (handData.gesture === GestureType.Closed_Fist) {
        gestureTimer.current += delta;
        if(gestureTimer.current > 0.6 && targetMode !== 'tree') {
            setTargetMode('tree');
            setMode('tree');
            gestureTimer.current = 0;
        }
    } else if (handData.gesture === GestureType.Open_Palm) {
        gestureTimer.current += delta;
        if(gestureTimer.current > 0.6 && targetMode !== 'gallery') {
            setTargetMode('gallery');
            setMode('gallery');
            gestureTimer.current = 0;
        }
    } else {
        gestureTimer.current = 0;
    }

    // --- Global Rotation Logic ---
    if (targetMode === 'tree') {
        const rotSpeed = 0.15;
        groupRef.current.rotation.y += delta * rotSpeed;
        if (particleGroupRef.current) {
            particleGroupRef.current.scale.lerp(new THREE.Vector3(1,1,1), delta * 2);
        }
    } else {
        // Face Front in Gallery Mode
        const currentRot = groupRef.current.rotation.y;
        const targetRot = Math.round(currentRot / (Math.PI * 2)) * Math.PI * 2;
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot, delta * 2);
        
        if (particleGroupRef.current) {
            particleGroupRef.current.scale.lerp(new THREE.Vector3(0.01, 0.01, 0.01), delta * 2);
        }
    }

    // --- Interaction (Pinch/Selection) ---
    if (!handData.isPinching) {
        let minD = Infinity;
        let cId = -1;
        
        if (handData.isTracked) {
                const handVec = new THREE.Vector3((handData.x * 2) - 1, -(handData.y * 2) + 1, 0);
                
                for(let i=0; i<items.length; i++) {
                    const item = items[i];
                    if (item.type !== 'photo') continue;

                    const time = state.clock.elapsedTime;
                    const pos = targetMode === 'tree' 
                        ? getTreePos(item.id, ITEM_COUNT) 
                        : getHeartPos(item.id, ITEM_COUNT, time * 0.05);
                    
                    pos.applyEuler(groupRef.current!.rotation);
                    pos.add(groupRef.current!.position);
                    pos.project(camera);
                    
                    const screenPos = new THREE.Vector3(pos.x, pos.y, 0);
                    const d = screenPos.distanceTo(handVec);
                    
                    if (d < minD) {
                        minD = d;
                        cId = item.id;
                    }
                }
        }
        sharedState.current.closestId = minD < 0.2 ? cId : null;
    }
  });

  const items = useMemo(() => {
    const types: string[] = [];
    const photoCount = userPhotos.length;
    
    // 1. Add Photo Types
    for(let i=0; i < photoCount && i < ITEM_COUNT; i++) {
        types.push('photo');
    }
    
    // 2. Add Ornament Types
    const ornamentTypes = ['gift', 'orb', 'star', 'cane', 'bell', 'sock', 'hat', 'candy'];
    while(types.length < ITEM_COUNT) {
        types.push(ornamentTypes[Math.floor(Math.random() * ornamentTypes.length)]);
    }
    
    // 3. Shuffle
    for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
    }

    let photoIndex = 0;

    return types.map((type, i) => {
        let url = '';
        if (type === 'photo') {
            url = userPhotos[photoIndex % userPhotos.length];
            photoIndex++;
        }
        return {
            id: i,
            type,
            seed: Math.random(),
            url
        };
    });

  }, [userPhotos]);

  // Effect: Randomly highlight one photo when photos are uploaded/changed
  useEffect(() => {
    if (userPhotos.length === 0) return;

    // Find valid photo items
    const photoItems = items.filter(i => i.type === 'photo');
    if (photoItems.length > 0) {
        // Pick random photo
        const randomIndex = Math.floor(Math.random() * photoItems.length);
        const targetId = photoItems[randomIndex].id;
        
        setHighlightedId(targetId);

        // Reset after 1s
        const timer = setTimeout(() => {
            setHighlightedId(null);
        }, 1000);

        return () => clearTimeout(timer);
    }
  }, [items]); // Dependencies: items updates when userPhotos updates

  return (
    <group>
      <group ref={groupRef}>
        <SpiralRibbon visible={targetMode === 'tree'} />
        <OuterGhostTree visible={targetMode === 'tree'} />
        {items.map((data) => (
            <TreeItem 
            key={data.id} 
            data={data}
            total={ITEM_COUNT}
            targetMode={targetMode}
            handData={handData}
            sharedState={sharedState}
            groupRotationRef={groupRef}
            highlightedId={highlightedId}
            />
        ))}
      </group>

      <group ref={particleGroupRef}>
         <TreeParticles count={PARTICLE_COUNT} />
      </group>

      <TreeTopper targetMode={targetMode} />
    </group>
  );
};

// --- Sub-components ---

const TreeParticles = ({ count }: { count: number }) => {
    const particles = useMemo(() => {
        const data = [];
        for(let i=0; i<count; i++) {
            const t = Math.random();
            const angle = Math.random() * Math.PI * 2;
            const r = (1 - t) * RADIUS_TREE_BASE * 1.5; 
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            const y = (t * HEIGHT_TREE) - (HEIGHT_TREE / 2);
            data.push({ position: [x,y,z], scale: Math.random() * 0.3 + 0.05, speed: Math.random() });
        }
        return data;
    }, [count]);

    return (
        <Instances range={count}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshBasicMaterial color="#FFD700" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
            {particles.map((data, i) => (
                 <Firefly key={i} data={data} />
            ))}
        </Instances>
    )
}

const Firefly = ({ data }: { data: any }) => {
    const ref = useRef<any>(null);
    useFrame((state) => {
        if (ref.current) {
            const t = state.clock.elapsedTime * (1 + data.speed);
            const s = data.scale * (0.5 + Math.sin(t * 8) * 0.5); 
            ref.current.scale.setScalar(s);
            ref.current.position.y += Math.sin(t) * 0.005;
        }
    })
    return <Instance ref={ref} position={data.position} />
}

const TreeItem: React.FC<{ 
    data: { id: number, type: string, url: string, seed: number };
    total: number;
    targetMode: 'tree' | 'gallery'; 
    handData: HandData; 
    sharedState: React.MutableRefObject<SharedState>;
    groupRotationRef: React.RefObject<THREE.Group>;
    highlightedId: number | null;
}> = ({ data, total, targetMode, handData, sharedState, groupRotationRef, highlightedId }) => {
  const group = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(1);
  const { camera } = useThree();
  const targetPos = new THREE.Vector3();
  const seed = data.id * 13.52;
  
  // Refs for materials to update them imperatively for performance
  const frameMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const photoMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (data.type !== 'photo') return;
    
    if (textureCache.has(data.url)) {
        const tex = textureCache.get(data.url)!;
        if (tex.image && (tex.image as any).width && (tex.image as any).height) {
            setAspect((tex.image as any).width / (tex.image as any).height);
        }
        setTexture(tex);
    } else {
        textureLoader.load(
            data.url, 
            (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.generateMipmaps = true; 
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                
                textureCache.set(data.url, tex);
                
                if (tex.image && (tex.image as any).width && (tex.image as any).height) {
                    setAspect((tex.image as any).width / (tex.image as any).height);
                }
                setTexture(tex);
            },
            undefined,
            (err) => { /* Ignore errors */ }
        );
    }
  }, [data.url, data.type]);

  useFrame((state, delta) => {
    if (!group.current) return;

    // --- Position Calculation ---
    if (targetMode === 'tree') {
        targetPos.copy(getTreePos(data.id, total));
    } else {
        targetPos.copy(getHeartPos(data.id, total, state.clock.elapsedTime * 0.05));
    }

    const isHovered = sharedState.current.closestId === data.id;
    const isHighlighted = highlightedId === data.id;
    // Treat highlighted (random pop) similar to zoom but maybe without moving to camera if we want just a scale pop
    // But moving to camera is cool. Let's stick to simple large scale for "Enlarge".
    // Moving to camera is "Focus". "Enlarge" is scaling.
    // Let's do large scale in place for highlight to differentiate from manual pinch-zoom.
    const isZoomed = isHovered && handData.isPinching && data.type === 'photo';

    // --- Visual Effects Logic ---
    if (data.type === 'photo') {
        const time = state.clock.elapsedTime;
        
        // 1. Photo Brightness
        if (photoMatRef.current) {
            let targetEmissive = 0.4; 
            
            if (isZoomed || isHighlighted) {
                targetEmissive = 1.0; 
            } else {
                const breath = Math.sin(time * 2 + data.id * 0.1) * 0.05;
                targetEmissive = 0.4 + breath; 
            }
            
            photoMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(
                photoMatRef.current.emissiveIntensity, 
                targetEmissive, 
                delta * 4
            );
        }

        // 2. Frame Glow
        if (frameMatRef.current) {
             const zoomedGlow = (isZoomed || isHighlighted) ? 1.5 : 0.0;
             const flow = Math.sin(time * 2 + data.id * 0.5) * 0.3 + 0.7;
             const targetIntensity = zoomedGlow > 0 ? zoomedGlow : 0.5 * flow;

             frameMatRef.current.emissiveIntensity = THREE.MathUtils.lerp(
                 frameMatRef.current.emissiveIntensity, 
                 targetIntensity, 
                 delta * 3
             );
        }
    }

    if (isZoomed) {
        // --- MANUAL PINCH ZOOM (Move to Front) ---
        const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const zoomTargetWorld = camera.position.clone().add(camDir.multiplyScalar(5.0)); 
        
        if (groupRotationRef.current) {
             const inverseParent = groupRotationRef.current.matrixWorld.clone().invert();
             targetPos.copy(zoomTargetWorld.applyMatrix4(inverseParent));
        }

        group.current.position.lerp(targetPos, delta * 8); 
        
        const MAX_DIM = 2.0;
        let scaleX = MAX_DIM;
        let scaleY = MAX_DIM;
        
        if (aspect > 1) {
            scaleY = MAX_DIM / aspect;
        } else {
            scaleX = MAX_DIM * aspect;
        }
        
        group.current.scale.lerp(new THREE.Vector3(scaleX, scaleY, 0.1), delta * 8);
        
        group.current.quaternion.copy(camera.quaternion);
        if (groupRotationRef.current) {
            const parentQuatInv = groupRotationRef.current.quaternion.clone().invert();
            group.current.quaternion.premultiply(parentQuatInv);
        }
        
    } else {
        // --- IDLE / RESTORE / HIGHLIGHT ---
        const photoScale = targetMode === 'gallery' ? 1.15 : 0.75;
        const baseScale = data.type === 'photo' ? photoScale : 0.8;
        
        let scaleX = baseScale;
        let scaleY = baseScale;
        
        if (data.type === 'photo') {
             if (aspect > 1) scaleY = baseScale / aspect;
             else scaleX = baseScale * aspect;
             
             if (isHovered) {
                 scaleX *= 1.3;
                 scaleY *= 1.3;
             }
             
             if (isHighlighted) {
                 scaleX *= 2.5; // Big pop for uploaded highlight
                 scaleY *= 2.5;
             }
             
             // Min thickness
             group.current.scale.lerp(new THREE.Vector3(scaleX, scaleY, 0.05), delta * 4);
        } else {
             // Ornaments
             const s = isHovered ? baseScale * 1.3 : baseScale;
             group.current.scale.lerp(new THREE.Vector3(s, s, s), delta * 4);
        }
        
        // Push highlighted item slightly towards camera in its local space logic to avoid clipping if possible
        // But since tree rotates, pushing along normal (0,0,1) in item space works if item looks at something.
        // For now, simpler: just lerp position. 2.5x scale usually pops out enough visually.
        
        group.current.position.lerp(targetPos, delta * 3);
        
        if (targetMode === 'gallery') {
            // In gallery mode, everything faces camera (flat icon look)
            group.current.quaternion.copy(camera.quaternion);
            if (groupRotationRef.current) {
                const parentQuatInv = groupRotationRef.current.quaternion.clone().invert();
                group.current.quaternion.premultiply(parentQuatInv);
            }
        } else {
            // Tree Mode
            if (data.type === 'photo') {
                group.current.quaternion.copy(camera.quaternion);
                if (groupRotationRef.current) {
                    const parentQuatInv = groupRotationRef.current.quaternion.clone().invert();
                    group.current.quaternion.premultiply(parentQuatInv);
                }
            } else {
                group.current.lookAt(group.current.position.x * 2, group.current.position.y, group.current.position.z * 2);
            }
        }
        
        group.current.position.y += Math.sin(state.clock.elapsedTime * 2 + seed) * 0.03;
    }
  });

  const renderItem = () => {
      const shouldFlash = data.seed > 0.7; 

      switch (data.type) {
        case 'photo':
            return (
             <group>
                {/* 1. Enhanced Frame Background Box (Thinner border: 1.015) */}
                <mesh position={[0,0,-0.02]}>
                     <boxGeometry args={[1.015, 1.015, 0.05]} /> 
                     <meshStandardMaterial 
                        ref={frameMatRef}
                        color="#FFD700"
                        roughness={0.2}
                        metalness={1.0}
                        emissive="#FFA500"
                     />
                </mesh>

                {/* 2. Photo Plane - Use emissiveMap for rich colors */}
                <mesh position={[0,0,0.016]}>
                    <planeGeometry args={[1, 1]} /> 
                    {texture ? (
                        <meshStandardMaterial 
                            ref={photoMatRef}
                            map={texture} 
                            emissiveMap={texture} 
                            color="#000000" // Black base for screen-like effect
                            emissive="#FFFFFF"
                            emissiveIntensity={0.5} // Start lower to avoid boom
                            roughness={0.5} 
                            metalness={0.0}
                            toneMapped={false} // CRITICAL: Disable tone mapping to preserve colors and prevent white-out
                            side={THREE.DoubleSide}
                            transparent={false}
                        />
                    ) : (
                        <meshStandardMaterial color="#222" />
                    )}
                </mesh>
             </group>
            );
        case 'gift': return <GiftBox />;
        case 'orb': return <Orb flash={shouldFlash} />;
        case 'star': return <Star />;
        case 'cane': return <CandyCane />;
        case 'bell': return <ChristmasBell />;
        case 'sock': return <Sock />;
        case 'hat': return <SantaHat />;
        case 'candy': return <Candy />;
        default: return <Orb />;
      }
  }

  return (
    <group ref={group}>
        {renderItem()}
        {/* Interaction Sparkles */}
        {(sharedState.current.closestId === data.id && handData.isPinching) || highlightedId === data.id ? (
             <group>
                <pointLight distance={4} intensity={0.1} color="#FFD700" position={[0,0,5]} />
                <Sparkles count={30} scale={2} size={6} speed={1.5} opacity={1} color="#FFF" />
             </group>
        ) : null}
        {/* Gallery Mode Ambient Sparkles - Subtle */}
        {targetMode === 'gallery' && data.type === 'photo' && (
            <group>
                <Sparkles count={2} scale={1.2} size={2} speed={0.5} opacity={0.3} color="#FFD700" />
            </group>
        )}
    </group>
  );
};

const TreeTopper = ({ targetMode }: { targetMode: 'tree' | 'gallery' }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(ref.current) {
            const targetY = targetMode === 'tree' ? HEIGHT_TREE / 2 + 0.3 : 15;
            ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetY, 0.05);
            ref.current.rotation.y -= 0.02;
            const s = targetMode === 'tree' ? 1.0 : 0; 
            ref.current.scale.lerp(new THREE.Vector3(s,s,s), 0.1);
        }
    });

    return (
        <group ref={ref}>
            <mesh>
                <octahedronGeometry args={[0.45, 0]} /> 
                <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={2} />
            </mesh>
            <pointLight distance={10} intensity={5} color="#FFD700" />
            <Sparkles count={20} scale={2} size={2} speed={0.4} opacity={1} color="#FFF" />
        </group>
    );
}

export default MagicalTree;