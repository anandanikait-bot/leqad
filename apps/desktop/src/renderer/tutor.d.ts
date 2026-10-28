import type { TutorBridge } from '@leqad/desktop-contracts';
declare global {
  interface Window {
    leqadTutor?: TutorBridge;
  }
}
export {};
