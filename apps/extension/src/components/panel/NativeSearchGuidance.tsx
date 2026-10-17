import type { NativeSearchGuidanceDefinition } from '../../services/nativeSearchGuidance';

export type NativeSearchAvailability =
  'EDITABLE' | 'UNKNOWN' | 'READ_ONLY' | 'UNSUPPORTED';

interface NativeSearchGuidanceProps {
  guidance: NativeSearchGuidanceDefinition;
  availability: NativeSearchAvailability;
}

export function NativeSearchGuidance({
  guidance,
  availability,
}: NativeSearchGuidanceProps) {
  return (
    <details className="leqad-native-search">
      <summary>Find using Onshape Search</summary>
      <div className="leqad-native-search__content">
        {availability === 'READ_ONLY' ? (
          <p role="status">
            This view is read-only. Leqad cannot confirm that Onshape will let
            you use {guidance.commandName}. Switch to an authorized editable
            workspace before trying an editing command.
          </p>
        ) : availability === 'UNSUPPORTED' ? (
          <p role="status">
            This page is not a supported Part Studio. Leqad cannot establish
            whether {guidance.commandName} is available here.
          </p>
        ) : (
          <>
            {availability === 'UNKNOWN' && (
              <p role="status">
                Leqad cannot confirm that this is an editable Sketch. Only
                continue if Onshape lets you edit this Sketch and the command is
                available.
              </p>
            )}
            <ol>
              {guidance.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
            <p>{guidance.distinction}</p>
            <p>{guidance.panelOverlap}</p>
            <p>{guidance.verificationBoundary}</p>
          </>
        )}
      </div>
    </details>
  );
}
