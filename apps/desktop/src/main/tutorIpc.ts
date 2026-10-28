import {
  TUTOR_CHANNELS,
  TutorRequestSchema,
  TutorMemoryEditSchema,
  TutorSnapshotSchema,
  TutorReplySchema,
  type TutorBridge,
} from '@leqad/desktop-contracts';
import {
  assertTrustedSender,
  copyPlainData,
  type DesktopIpcDependencies,
} from './ipc';
export type TutorHostService = Omit<TutorBridge, 'cancel'> & {
  cancel(): void;
  dispose(): void;
};
type Dependencies = Pick<
  DesktopIpcDependencies,
  'ipcMain' | 'getWindow' | 'isTrustedRendererUrl'
> & { service: TutorHostService };
export function registerTutorIpc(dependencies: Dependencies) {
  let disposed = false;
  const add = (
    channel: string,
    arity: number,
    handler: (...args: unknown[]) => unknown,
  ) => {
    dependencies.ipcMain.handle(channel, async (event, ...args) => {
      assertTrustedSender(event, dependencies);
      if (disposed || args.length !== arity)
        throw new Error('Invalid tutor request');
      let safe: unknown[];
      try {
        safe = args.map((value) => copyPlainData(value));
      } catch {
        throw new Error('Invalid tutor request');
      }
      try {
        return await handler(...safe);
      } catch (error) {
        throw new Error(
          error instanceof Error && error.message === 'Invalid tutor request'
            ? 'Invalid tutor request'
            : 'Tutor operation unavailable',
        );
      }
    });
  };
  add(TUTOR_CHANNELS.snapshot, 0, async () =>
    TutorSnapshotSchema.parse(await dependencies.service.snapshot()),
  );
  add(TUTOR_CHANNELS.ask, 1, async (raw) => {
    const request = TutorRequestSchema.safeParse(raw);
    if (!request.success) throw new Error('Invalid tutor request');
    return TutorReplySchema.parse(await dependencies.service.ask(request.data));
  });
  add(TUTOR_CHANNELS.cancel, 0, () => dependencies.service.cancel());
  add(TUTOR_CHANNELS.editMemory, 1, async (raw) => {
    const edit = TutorMemoryEditSchema.parse(raw);
    return TutorSnapshotSchema.parse(
      await dependencies.service.editMemory(edit),
    );
  });
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      dependencies.service.dispose();
      for (const channel of Object.values(TUTOR_CHANNELS))
        dependencies.ipcMain.removeHandler(channel);
    },
  };
}
