import { beforeEach, describe, expect, it, vi } from 'vitest';
import { capturePageSnapshot } from './capture-page.ts';

describe('independent DOM observer (synthetic DOM only)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('records exact allowlisted labels and safe relationships, not private page data', () => {
    document.body.innerHTML = `
      <main id="private-document-id" class="private-class">
        <div><button aria-label="Rectangle" aria-expanded="false">Rectangle</button></div>
        <button aria-label="Private feature name" value="secret">Private feature name</button>
        <span>private CAD note and account email</span>
      </main>`;

    const snapshot = capturePageSnapshot({
      maxElements: 100,
      maxOutputBytes: 12_000,
    });
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.nodes.some((node) => node.label === 'Rectangle')).toBe(
      true,
    );
    expect(snapshot.nodes.some((node) => node.parentIndex !== null)).toBe(true);
    expect(serialized).not.toContain('private-document-id');
    expect(serialized).not.toContain('private-class');
    expect(serialized).not.toContain('Private feature name');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('private CAD note');
    expect(serialized).not.toContain('account email');
  });

  it('retains allowlisted Rectangle evidence after unrelated controls', () => {
    document.body.innerHTML =
      Array.from(
        { length: 150 },
        () => '<button aria-label="Unrelated action">unrelated</button>',
      ).join('') +
      '<div><button aria-label="Rectangle">Rectangle</button></div>';

    const snapshot = capturePageSnapshot({ maxElements: 500 });
    expect(snapshot.nodes.some((node) => node.label === 'Rectangle')).toBe(
      true,
    );
    expect(snapshot.scan.status).toBe('COMPLETE');
  });

  it('marks bounded traversal as incomplete instead of reporting a missing target', () => {
    document.body.innerHTML =
      Array.from(
        { length: 80 },
        (_, index) => `<button>Unrelated ${index}</button>`,
      ).join('') + '<button>Rectangle</button>';

    const snapshot = capturePageSnapshot({
      maxElements: 24,
      maxOutputBytes: 4_000,
    });
    expect(snapshot.scan.nodeLimitReached).toBe(true);
    expect(snapshot.scan.status).toBe('INCOMPLETE_CAPTURE');
    expect(snapshot.domState).toBe('UNKNOWN');
  });

  it('never returns arbitrary role, ARIA, or attribute values', () => {
    document.body.innerHTML = `
      <div role="private-role" aria-expanded="sometimes" data-document="private-doc">
        <span title="Top">Top</span>
      </div>`;
    const snapshot = capturePageSnapshot();
    const serialized = JSON.stringify(snapshot);
    expect(serialized).toContain('"label":"Top"');
    expect(serialized).not.toContain('private-role');
    expect(serialized).not.toContain('sometimes');
    expect(serialized).not.toContain('private-doc');
  });

  it('classifies a visible Sketch toolbar command from the exact allowlisted label', () => {
    document.body.innerHTML =
      '<button aria-label="Sketch"><span>Sketch</span></button>';
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(10, 20, 80, 24),
    );

    const snapshot = capturePageSnapshot();

    expect(snapshot.domState).toBe('SKETCH_COMMAND_VISIBLE');
    expect(
      snapshot.nodes.some(
        (node) => node.label === 'Sketch' && node.visibility === 'VISIBLE',
      ),
    ).toBe(true);
  });

  it('records the active Sketch control without exporting private dialog text', () => {
    document.body.innerHTML = `
      <div role="dialog" aria-label="Sketch">
        <span>Sketch 17 private geometry name</span>
        <button aria-label="Finish Sketch">Finish Sketch</button>
      </div>`;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(10, 20, 80, 24),
    );

    const snapshot = capturePageSnapshot();
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.domState).toBe('SKETCH_CONTROLS_VISIBLE');
    expect(snapshot.nodes.some((node) => node.label === 'Finish Sketch')).toBe(
      true,
    );
    expect(serialized).not.toContain('Sketch 17');
    expect(serialized).not.toContain('private geometry name');
  });

  it('keeps active Sketch UNKNOWN when its bounded traversal is incomplete', () => {
    document.body.innerHTML =
      '<button aria-label="Finish Sketch">Finish Sketch</button>' +
      Array.from({ length: 40 }, () => '<span>private content</span>').join('');

    const snapshot = capturePageSnapshot({ maxElements: 8 });

    expect(snapshot.scan.status).toBe('INCOMPLETE_CAPTURE');
    expect(snapshot.domState).toBe('UNKNOWN');
  });

  it('keeps useful sanitized structure when no exact Sketch name or role exists', () => {
    document.body.innerHTML = `
      <div id="private-wrapper" class="private-class" role="private-role" aria-label="Private CAD dialog">
        <span>Private geometry name and account details</span>
        <button aria-label="Private toolbar control">Private toolbar control</button>
      </div>`;

    const snapshot = capturePageSnapshot();
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.domState).toBe('UNKNOWN');
    expect(snapshot.nodes.length).toBeGreaterThan(0);
    expect(snapshot.nodes.every((node) => node.label === null)).toBe(true);
    expect(snapshot.scan.recognizedLabelCount).toBe(0);
    expect(snapshot.scan.accessibleNameCount).toBe(2);
    expect(snapshot.scan.roleAttributeCount).toBe(1);
    expect(serialized).not.toContain('private-wrapper');
    expect(serialized).not.toContain('private-class');
    expect(serialized).not.toContain('private-role');
    expect(serialized).not.toContain('Private CAD dialog');
    expect(serialized).not.toContain('Private toolbar control');
    expect(serialized).not.toContain('Private geometry name');
  });

  it('retains generic nonsemantic structure when names and roles are absent', () => {
    document.body.innerHTML = `
      <div class="private-wrapper">
        <div><span>Private sketch title and geometry names</span></div>
      </div>`;

    const snapshot = capturePageSnapshot();
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.domState).toBe('UNKNOWN');
    expect(snapshot.nodes.length).toBeGreaterThan(0);
    expect(snapshot.nodes.some((node) => node.tag === 'DIV')).toBe(true);
    expect(snapshot.nodes.some((node) => node.tag === 'SPAN')).toBe(true);
    expect(snapshot.scan.accessibleNameCount).toBe(0);
    expect(snapshot.scan.roleAttributeCount).toBe(0);
    expect(serialized).not.toContain('private-wrapper');
    expect(serialized).not.toContain('Private sketch title');
    expect(serialized).not.toContain('geometry names');
  });
});
