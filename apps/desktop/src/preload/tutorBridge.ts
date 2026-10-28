import {
  TUTOR_CHANNELS,
  TutorRequestSchema,
  TutorMemoryEditSchema,
  TutorSnapshotSchema,
  TutorReplySchema,
  type TutorBridge,
} from '@leqad/desktop-contracts';
import type { IpcRendererPort } from './bridge';
export function createTutorBridge(
  ipc: Pick<IpcRendererPort, 'invoke'>,
): TutorBridge {
  return Object.freeze({
    async snapshot() {
      return TutorSnapshotSchema.parse(
        await ipc.invoke(TUTOR_CHANNELS.snapshot),
      );
    },
    async ask(request) {
      return TutorReplySchema.parse(
        await ipc.invoke(TUTOR_CHANNELS.ask, TutorRequestSchema.parse(request)),
      );
    },
    async cancel() {
      await ipc.invoke(TUTOR_CHANNELS.cancel);
    },
    async editMemory(edit) {
      return TutorSnapshotSchema.parse(
        await ipc.invoke(
          TUTOR_CHANNELS.editMemory,
          TutorMemoryEditSchema.parse(edit),
        ),
      );
    },
  } satisfies TutorBridge);
}
