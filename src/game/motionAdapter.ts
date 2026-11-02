import { MotionGestureType, MotionInputEvent, TeamId } from './types';

export type MotionEventListener = (event: MotionInputEvent) => void;

export interface GestureMetadata {
  id: MotionGestureType;
  title: string;
  subtitle: string;
  badgeText: string;
  shortLabel: string;
}

export const GESTURE_CATALOG: GestureMetadata[] = [
  {
    id: 'punch_forward',
    title: 'Pukul / Dorong ke depan',
    subtitle: 'Menembak bubble',
    badgeText: 'Tembak Bubble',
    shortLabel: 'Dorong Depan',
  },
  {
    id: 'slash_side',
    title: 'Pukul ke kiri / kanan',
    subtitle: 'Menghancurkan bubble di sisi tertentu',
    badgeText: 'Tebas Samping',
    shortLabel: 'Kiri / Kanan',
  },
  {
    id: 'raise_both_hands',
    title: 'Angkat kedua tangan',
    subtitle: 'Aktivasi serangan besar (combo)',
    badgeText: 'Serangan Besar (2x Poin)',
    shortLabel: 'Combo 2 Tangan',
  },
  {
    id: 'swipe_up',
    title: 'Gerakkan tangan ke atas',
    subtitle: 'Mengisi tandon air',
    badgeText: '+25% Tandon Air',
    shortLabel: 'Isi Tandon Air',
  },
];

/**
 * Modular Motion Controller Hub designed for PID Screen & Camera Hand-Tracking integration.
 * Supports:
 * 1. Pointer / Touch / Swipe gestures directly on the PID screen
 * 2. Simulated Motion Gesture Pads per team
 * 3. Keyboard shortcuts for multi-player classroom testing
 * 4. Pluggable Camera / MediaPipe / Optical-Flow frame processor
 */
export class MotionControllerHub {
  private listeners: Set<MotionEventListener> = new Set();

  public subscribe(listener: MotionEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emit(event: MotionInputEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Classifies a 2D pointer/touch swipe or hand trajectory vector (dx, dy) into one of the 4 reference gestures.
   */
  public static classifyVectorGesture(dx: number, dy: number): MotionGestureType {
    const dist = Math.hypot(dx, dy);
    if (dist < 18) {
      return 'punch_forward';
    }
    if (Math.abs(dx) > Math.abs(dy) * 1.25) {
      return 'slash_side';
    }
    if (dy < -28) {
      return 'swipe_up';
    }
    return 'punch_forward';
  }
}

export const motionHub = new MotionControllerHub();
