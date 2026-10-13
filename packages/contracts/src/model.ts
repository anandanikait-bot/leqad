import { z } from 'zod';

export const ModelIdentitySchema = z
  .object({
    documentId: z.string().min(1),
    workspaceId: z.string().min(1),
    elementId: z.string().min(1),
    revision: z.string().min(1).nullable(),
  })
  .strict();

export const SupportedValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
]);

export const FeatureParameterSchema = z
  .object({
    value: SupportedValueSchema,
    unit: z.string().min(1).optional(),
  })
  .strict();

export const NormalizedFeatureSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    committed: z.boolean(),
    parameters: z.record(z.string(), FeatureParameterSchema),
  })
  .strict();

export const ModelSourceSchema = z.enum(['API', 'UI', 'MOCK', 'INFERRED']);

export const ModelSnapshotSchema = z
  .object({
    identity: ModelIdentitySchema,
    observedAt: z.iso.datetime(),
    validUntil: z.iso.datetime().nullable(),
    source: ModelSourceSchema,
    features: z.array(NormalizedFeatureSchema),
    warnings: z.array(z.string()),
    capabilities: z
      .object({
        completeFeatureList: z.boolean(),
      })
      .strict(),
  })
  .strict();

export const EvidenceLevelSchema = z.enum([
  'API_CONFIRMED',
  'UI_CONFIRMED',
  'INFERRED',
  'UNKNOWN',
]);

export const EvidenceSchema = z
  .object({
    id: z.string().min(1),
    fact: z.record(z.string(), z.unknown()),
    source: ModelSourceSchema,
    identity: ModelIdentitySchema,
    revision: z.string().min(1).nullable(),
    observedAt: z.iso.datetime(),
    detectorVersion: z.string().min(1),
    expiresAt: z.iso.datetime().nullable(),
    level: EvidenceLevelSchema,
  })
  .strict();

export const VerificationStatusSchema = z.enum([
  'PASS',
  'WARNING',
  'FAIL',
  'UNKNOWN',
]);

export const FeatureConditionSchema = z
  .object({
    identity: ModelIdentitySchema,
    featureType: z.string().min(1),
    parameters: z.record(z.string(), FeatureParameterSchema),
  })
  .strict();

export const VerificationResultSchema = z
  .object({
    status: VerificationStatusSchema,
    expected: FeatureConditionSchema,
    actual: FeatureParameterSchema.nullable(),
    explanation: z.string(),
    recoveryAction: z.string().nullable(),
    evidence: z.array(EvidenceSchema),
  })
  .strict();

export type ModelIdentity = z.infer<typeof ModelIdentitySchema>;
export type SupportedValue = z.infer<typeof SupportedValueSchema>;
export type FeatureParameter = z.infer<typeof FeatureParameterSchema>;
export type NormalizedFeature = z.infer<typeof NormalizedFeatureSchema>;
export type ModelSource = z.infer<typeof ModelSourceSchema>;
export type ModelSnapshot = z.infer<typeof ModelSnapshotSchema>;
export type EvidenceLevel = z.infer<typeof EvidenceLevelSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
export type FeatureCondition = z.infer<typeof FeatureConditionSchema>;
export type VerificationResult = z.infer<typeof VerificationResultSchema>;
