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

export const ExpectedFeatureParameterSchema = FeatureParameterSchema.extend({
  tolerance: z.number().finite().nonnegative().optional(),
})
  .strict()
  .superRefine((parameter, context) => {
    if (
      parameter.tolerance !== undefined &&
      typeof parameter.value !== 'number'
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'A numerical tolerance can only be used with a numerical value.',
        path: ['tolerance'],
      });
    }
  });

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

export const EvidenceRequirementSchema = z.enum([
  'API_CONFIRMED',
  'UI_CONFIRMED',
  'INFERRED',
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
  .strict()
  .superRefine((evidence, context) => {
    const sourceLevel = {
      API: 'API_CONFIRMED',
      UI: 'UI_CONFIRMED',
      MOCK: 'INFERRED',
      INFERRED: 'INFERRED',
    } as const;

    if (
      evidence.level !== 'UNKNOWN' &&
      evidence.level !== sourceLevel[evidence.source]
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The claimed evidence level is not supported by its source.',
        path: ['level'],
      });
    }
  });

export const VerificationStatusSchema = z.enum([
  'PASS',
  'WARNING',
  'FAIL',
  'UNKNOWN',
]);

export const FeatureConditionSchema = z
  .object({
    identity: ModelIdentitySchema,
    featureId: z.string().min(1).nullable(),
    featureType: z.string().min(1),
    requiredEvidence: EvidenceRequirementSchema,
    parameters: z.record(z.string(), ExpectedFeatureParameterSchema),
  })
  .strict();

const verificationDecisionShape = {
  status: VerificationStatusSchema,
  evidenceLevel: EvidenceLevelSchema,
  observedFact: z.record(z.string(), z.unknown()).nullable(),
  identity: ModelIdentitySchema.nullable(),
  observedAt: z.iso.datetime(),
  revision: z.string().min(1).nullable(),
  explanation: z.string().min(1),
  missingRequirements: z.array(z.string().min(1)),
  recoveryAction: z.string().min(1).nullable(),
  evidence: z.array(EvidenceSchema),
};

function validateDecision(
  decision: z.infer<z.ZodObject<typeof verificationDecisionShape>>,
  context: z.RefinementCtx,
): void {
  if (decision.identity && decision.identity.revision !== decision.revision) {
    context.addIssue({
      code: 'custom',
      message: 'The decision revision must match its document identity.',
      path: ['revision'],
    });
  }

  if (decision.status === 'PASS') {
    if (decision.identity === null) {
      context.addIssue({
        code: 'custom',
        message: 'A passing decision requires a document identity.',
        path: ['identity'],
      });
    }
    if (decision.evidenceLevel === 'UNKNOWN') {
      context.addIssue({
        code: 'custom',
        message: 'A passing decision requires a known evidence level.',
        path: ['evidenceLevel'],
      });
    }
    if (decision.observedFact === null) {
      context.addIssue({
        code: 'custom',
        message: 'A passing decision requires an observed fact.',
        path: ['observedFact'],
      });
    }
    if (decision.missingRequirements.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'A passing decision cannot have missing requirements.',
        path: ['missingRequirements'],
      });
    }
    if (decision.evidence.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'A passing decision requires supporting evidence.',
        path: ['evidence'],
      });
    }
  }

  if (
    decision.evidenceLevel !== 'UNKNOWN' &&
    !decision.evidence.some(
      (evidence) => evidence.level === decision.evidenceLevel,
    )
  ) {
    context.addIssue({
      code: 'custom',
      message: 'The decision evidence level requires matching evidence.',
      path: ['evidenceLevel'],
    });
  }

  if (decision.identity) {
    for (const [index, evidence] of decision.evidence.entries()) {
      if (
        evidence.identity.documentId !== decision.identity.documentId ||
        evidence.identity.workspaceId !== decision.identity.workspaceId ||
        evidence.identity.elementId !== decision.identity.elementId ||
        evidence.revision !== decision.revision
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Supporting evidence must match the decision context.',
          path: ['evidence', index],
        });
      }
    }
  } else if (decision.evidence.length > 0) {
    context.addIssue({
      code: 'custom',
      message: 'Evidence cannot be attached without a document identity.',
      path: ['evidence'],
    });
  }
}

export const VerificationDecisionSchema = z
  .object(verificationDecisionShape)
  .strict()
  .superRefine(validateDecision);

export const VerificationResultSchema = z
  .object({
    ...verificationDecisionShape,
    expected: FeatureConditionSchema,
    actual: FeatureParameterSchema.nullable(),
  })
  .strict()
  .superRefine(validateDecision);

export type ModelIdentity = z.infer<typeof ModelIdentitySchema>;
export type SupportedValue = z.infer<typeof SupportedValueSchema>;
export type FeatureParameter = z.infer<typeof FeatureParameterSchema>;
export type ExpectedFeatureParameter = z.infer<
  typeof ExpectedFeatureParameterSchema
>;
export type NormalizedFeature = z.infer<typeof NormalizedFeatureSchema>;
export type ModelSource = z.infer<typeof ModelSourceSchema>;
export type ModelSnapshot = z.infer<typeof ModelSnapshotSchema>;
export type EvidenceLevel = z.infer<typeof EvidenceLevelSchema>;
export type EvidenceRequirement = z.infer<typeof EvidenceRequirementSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
export type FeatureCondition = z.infer<typeof FeatureConditionSchema>;
export type VerificationDecision = z.infer<typeof VerificationDecisionSchema>;
export type VerificationResult = z.infer<typeof VerificationResultSchema>;
