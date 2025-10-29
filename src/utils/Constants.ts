export const DIAMOND_POSITIONS = [
  { x: -90, z: -30, height: 145, size: 7 },   // 0: DRIFT (bottom-left area)
  { x: -40, z: -70, height: 142, size: 7 },   // 1: STATIC (bottom-left)
  { x: 45, z: -85, height: 138, size: 7 },    // 2: VOID (bottom-right)
  { x: 0, z: 0, height: 150, size: 9 },       // 3: NEXUS (center - larger)
  { x: 80, z: 40, height: 140, size: 7 },     // 4: FRAGMENT (right)
  { x: 20, z: 100, height: 141, size: 7 },    // 5: PULSE (top)
  { x: -60, z: 70, height: 143, size: 7 }     // 6: ECHO (top-left)
];

export const TRACK_NAMES = [
  'DRIFT', 'STATIC', 'VOID', 'NEXUS', 'FRAGMENT', 'PULSE', 'ECHO'
];

export const KEY_TO_DIAMOND_MAP: { [key: string]: number } = {
  'z': 3, 'x': 0, 'c': 1, 'v': 2, 'b': 4, 'n': 5, 'm': 6
};

export const NUMBER_KEY_TO_DIAMOND_MAP: { [key: string]: number } = {
  '1': 3, '2': 0, '3': 1, '4': 2, '5': 4, '6': 5, '7': 6
};

export const AUDIO_FILES_DESKTOP = [
  '014_1.ogg', '015_1.ogg', '016_1.ogg', '007_1.ogg',
  '020_1.ogg', '018_1.ogg', '019_1.ogg'
];

export const AUDIO_FILES_MOBILE = [
  '014_1.m4a', '015_1.m4a', '016_1.m4a', '007_1.m4a',
  '020_1.m4a', '018_1.m4a', '019_1.m4a'
];

export const CAMERA_CONFIG = {
  fov: 60,
  near: 0.1,
  far: 2000,
  minDistance: 2,
  maxDistance: 1200,
  dampingFactor: 0.05
};

export const OVERVIEW_CAMERA_POSITION = {
  position: { x: -138.64, y: 161.27, z: 41.32 },
  target: { x: 45.28, y: 96.57, z: -25.90 }
};

export const TERRAIN_CONFIG = {
  size: 1600,
  segments: 160,
  innerMountainCount: 24,
  innerMountainRadius: 500,
  middleMountainCount: 20,
  middleMountainRadius: 600,
  outerMountainCount: 16,
  outerMountainRadius: 750,
  gapFillerCount: 20
};

export const PARTICLE_CONFIG = {
  count: 1500,
  starCount: 1000
};

export const LIGHT_DIRECTION = { x: 5, y: 10, z: 5 };
