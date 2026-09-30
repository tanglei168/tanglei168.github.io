import type { OrganId } from "../anatomy-data";

// Shared coordinate frame of the MakeHuman hm08 envelope (height = 11).
// +X is the subject's left, +Z anterior. Landmarks are measured from the
// source mesh, after the same normalization used by human-body.glb.
export const bodyLandmarks = {
  leftEye: [0.203, 4.703, 0.822],
  rightEye: [-0.203, 4.703, 0.822],
  clavicle: [0, 3.321, 0.458],
  upperThoracicSpine: [0, 2.751, -0.047],
  lowerThoracicSpine: [0, 1.74, 0.171],
  pelvis: [0, 0.373, 0.095],
} as const;

export type BodyPlacement = {
  id: OrganId;
  position: [number, number, number];
  size: number;
  rotation?: [number, number, number];
  /** Paired organs share the original geometry at separately measured anchors. */
  pairedPosition?: [number, number, number];
  /** Globe center and gaze in the library's FIT_SIZE coordinate frame. */
  center?: [number, number, number];
  forward?: [number, number, number];
};

// Calibrated against front AND sagittal projections of the actual envelope.
// Sizes remain uniform: no organ geometry is stretched to force a fit.
// Independent source models are not a medical image registration.
export const bodyPlacements: BodyPlacement[] = [
  { id: "brain", position: [0, 4.98, 0.35], size: .9, rotation: [0, 0, 0] },
  { id: "eyeball", position: [...bodyLandmarks.leftEye], pairedPosition: [...bodyLandmarks.rightEye], size: .2, center: [-.473, -.02, .176], forward: [-.571, .053, .821] },
  { id: "lungs", position: [0, 2.72, .39], size: 1.68, rotation: [0, 0, 0] },
  { id: "heart", position: [.18, 2.32, .61], size: .78, rotation: [0, -.15, -.13] },
  { id: "liver", position: [-.17, 1.58, .48], size: 1.22, rotation: [0, 0, 0] },
  { id: "kidneys", position: [0, 1.43, .21], size: 1.1, rotation: [0, 0, 0] },
  { id: "pancreas", position: [.08, 1.46, .38], size: .91, rotation: [0, 0, 0] },
  { id: "intestine", position: [0, .77, .4], size: 1.3, rotation: [0, 0, 0] },
];
export const bodyModelIds = bodyPlacements.map((p) => p.id);
