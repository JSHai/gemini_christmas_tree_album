import * as THREE from 'three';

export enum GestureType {
  None = 'None',
  Closed_Fist = 'Closed_Fist',
  Open_Palm = 'Open_Palm',
  Pointing_Up = 'Pointing_Up',
  Victory = 'Victory', // Often detected for Pinch-like interaction
}

export interface HandData {
  gesture: string;
  x: number; // Normalized 0-1 (inverted x for mirror effect)
  y: number; // Normalized 0-1
  isPinching: boolean;
}

export interface PhotoData {
  id: number;
  url: string;
  texture?: THREE.Texture;
}

export type AppState = 'loading' | 'tree' | 'gallery' | 'viewing';

// Used for the particle system
export interface ParticleProps {
  position: THREE.Vector3;
  targetPosition: THREE.Vector3; // Current target (tree or gallery)
  treePosition: THREE.Vector3;
  galleryPosition: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  speed: number;
  imageUrl: string;
  type: 'photo' | 'gift' | 'ornament';
  color?: string;
}
