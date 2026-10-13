import type {
  EvidenceRequirement,
  ModelIdentity,
  VerificationDecision,
  VerificationStatus,
} from '@leqad/contracts';

export type LessonStepStatus =
  | 'NOT_STARTED'
  | 'READY'
  | 'AWAITING_ACTION'
  | 'ACTION_OBSERVED'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'NEEDS_CORRECTION'
  | 'UNKNOWN'
  | 'PAUSED';

export interface LessonStepState {
  status: LessonStepStatus;
  hintLevel: number;
  verification: VerificationStatus | null;
  resumeState: LessonStepStatus | null;
}

export interface StoredUiObservation {
  fact: Record<string, unknown>;
  observedAt: string;
  expiresAt: string | null;
  evidenceIds: string[];
}

export interface StoredModelVerification {
  status: VerificationStatus;
  observedAt: string;
  revision: string | null;
  evidenceIds: string[];
}

export interface LessonModelState {
  observedUiStates: Record<string, StoredUiObservation>;
  verifiedModelStates: Record<string, StoredModelVerification>;
  evidenceReferences: string[];
  evidenceFreshness: 'current' | 'stale' | 'unknown';
  uncertaintyReason: string | null;
}

export type LessonStepEvent =
  | { type: 'START' }
  | { type: 'BEGIN_STEP' }
  | { type: 'ACTION_OBSERVED' }
  | { type: 'CHECK_PROGRESS' }
  | { type: 'VERIFY' }
  | {
      type: 'VERIFICATION_RESULT';
      decision: VerificationDecision;
      requiredEvidence: EvidenceRequirement;
      evaluatedAt: string;
    }
  | { type: 'RETRY' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' };

export interface LessonSession {
  lessonId: string;
  lessonVersion: string;
  currentStepId: string;
  modelIdentity: ModelIdentity;
  modelRevision: string | null;
  modelState: LessonModelState;
  updatedAt: string;
  steps: Record<string, LessonStepState>;
}

export interface LessonStepDefinition {
  id: string;
  goal: string;
  action: string;
  explanation: string;
  semanticTarget: string;
  completionSignal: string;
  requiredEvidence: EvidenceRequirement;
  hints: readonly [string, string, string, string, string];
  commonErrors: readonly string[];
  recoveryActions: readonly string[];
}

export interface LessonDefinition {
  id: string;
  version: string;
  title: string;
  description: string;
  objectives: readonly string[];
  prerequisites: readonly string[];
  steps: readonly LessonStepDefinition[];
}
