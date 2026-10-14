export interface BoundaryCheckResult {
  valid: boolean;
  violations: Array<{ file: string; specifier: string }>;
}

const IMPORT_PATTERNS = [
  /\bimport\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+(?:[^'";]*?\s+from\s+)['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function isHarnessFile(file: string): boolean {
  return (
    file.startsWith('tools/onshape-reference/') ||
    file.startsWith('validation/onshape-reference/')
  );
}

function violatesHarnessBoundary(file: string, specifier: string): boolean {
  const normalized = specifier.replaceAll('\\', '/');
  if (isHarnessFile(file)) {
    return (
      /(^|\/|\.\.\/)apps\//.test(normalized) ||
      /(?:semanticTargets|semanticTargetDom|referencePlanes|guidanceRegistry|guidanceRunner|sketchGuidance|rectangleDropdownCapture|AssistantPanel|onshapePage)(?:\.|\/|$)/i.test(
        normalized,
      )
    );
  }
  if (file.startsWith('apps/extension/')) {
    return /(?:^|\/|\.\.\/)(?:tools\/onshape-reference|validation\/onshape-reference)(?:\/|$)/.test(
      normalized,
    );
  }
  return false;
}

export function checkImportBoundaries(
  sources: Record<string, string>,
): BoundaryCheckResult {
  const violations: BoundaryCheckResult['violations'] = [];
  for (const [file, source] of Object.entries(sources)) {
    for (const pattern of IMPORT_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source))) {
        const specifier = match[1];
        if (specifier && violatesHarnessBoundary(file, specifier))
          violations.push({ file, specifier });
      }
    }
  }
  return { valid: violations.length === 0, violations };
}
