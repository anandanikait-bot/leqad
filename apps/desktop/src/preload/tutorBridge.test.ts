import { expect, it, vi } from 'vitest';
import { createTutorBridge } from './tutorBridge';
it('exposes only validated tutor operations and never generic IPC', async () => {
  const invoke = vi.fn(async () => ({ ok: false, code: 'unavailable' }));
  const bridge = createTutorBridge({ invoke });
  expect(Object.keys(bridge).sort()).toEqual([
    'ask',
    'cancel',
    'editMemory',
    'snapshot',
  ]);
  expect(Object.isFrozen(bridge)).toBe(true);
  await bridge.ask({ id: 'q1', text: 'How do I dimension?', stepIndex: 5 });
  expect(invoke).toHaveBeenCalledWith('tutor:ask', {
    id: 'q1',
    text: 'How do I dimension?',
    stepIndex: 5,
  });
  invoke.mockClear();
  await expect(
    bridge.ask({ id: 'q1', text: 'x'.repeat(2001), stepIndex: 5 }),
  ).rejects.toThrow();
  expect(invoke).not.toHaveBeenCalled();
});
it('rejects malformed or unlabelled host responses', async () => {
  const invoke = vi.fn(async () => ({ ok: true, text: 'Scripted answer' }));
  await expect(
    createTutorBridge({ invoke }).ask({ id: 'q1', text: 'Hi', stepIndex: 0 }),
  ).rejects.toThrow();
});
