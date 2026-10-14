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
    expect(snapshot.scan.candidateLimitReached).toBe(true);
    expect(snapshot.scan.status).toBe('INCOMPLETE_CAPTURE');
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

  it('keeps local Sketch evidence usable while flagging unrelated deep structure globally', () => {
    const deepBranch = Array.from(
      { length: 18 },
      (_, index) => `<div data-depth="${index}">`,
    ).join('');
    const deepClose = '</div>'.repeat(18);
    document.body.innerHTML = `
      <button aria-label="Sketch">Sketch</button>
      ${deepBranch}<span>private deep content</span>${deepClose}`;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(10, 20, 80, 24),
    );

    const snapshot = capturePageSnapshot({ maxDepth: 5 });

    expect(snapshot.scan.depthLimitReached).toBe(true);
    expect(snapshot.scan.status).toBe('INCOMPLETE_CAPTURE');
    expect(snapshot.domState).toBe('SKETCH_COMMAND_VISIBLE');
    expect(
      snapshot.nodes.some(
        (node) => node.label === 'Sketch' && node.visibility === 'VISIBLE',
      ),
    ).toBe(true);
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

  it.each([
    ['aria-label', 'Sketch options'],
    ['title', 'Sketch tools'],
    ['aria-labelledby', 'private-name'],
  ])(
    'keeps Sketch uncertain when an explicit %s name is not allowlisted',
    (attribute, value) => {
      document.body.innerHTML = `<button ${attribute}="${value}">Sketch</button>`;
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(10, 20, 80, 24),
      );

      const snapshot = capturePageSnapshot();

      expect(snapshot.domState).toBe('UNKNOWN');
      expect(snapshot.nodes.find((node) => node.tag === 'BUTTON')?.label).toBe(
        null,
      );
      expect(JSON.stringify(snapshot)).not.toContain(value);
    },
  );

  it('uses the higher-precedence allowlisted aria-label over a private title', () => {
    document.body.innerHTML =
      '<button aria-label="Sketch" title="private toolbar name">fallback text</button>';
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(10, 20, 80, 24),
    );

    const snapshot = capturePageSnapshot();

    expect(snapshot.domState).toBe('SKETCH_COMMAND_VISIBLE');
    expect(snapshot.nodes.find((node) => node.tag === 'BUTTON')?.label).toBe(
      'Sketch',
    );
    expect(JSON.stringify(snapshot)).not.toContain('private toolbar name');
    expect(JSON.stringify(snapshot)).not.toContain('fallback text');
  });

  it('does not recover a Sketch command from text nested under a conflicting named button', () => {
    document.body.innerHTML =
      '<button aria-label="Sketch options"><span>Sketch</span></button>';
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(10, 20, 80, 24),
    );

    const snapshot = capturePageSnapshot();

    expect(snapshot.domState).toBe('UNKNOWN');
    expect(snapshot.nodes.some((node) => node.label === 'Sketch')).toBe(false);
    expect(JSON.stringify(snapshot)).not.toContain('Sketch options');
  });

  it('preserves disabled command state as bounded sanitized facts', () => {
    document.body.innerHTML = `
      <button aria-label="Sketch" aria-disabled="true">Sketch</button>
      <button aria-label="Finish Sketch" disabled="false">Finish Sketch</button>`;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(10, 20, 80, 24),
    );

    const snapshot = capturePageSnapshot();
    const sketch = snapshot.nodes.find((node) => node.label === 'Sketch');
    const finish = snapshot.nodes.find(
      (node) => node.label === 'Finish Sketch',
    );

    expect(sketch?.aria.disabled).toBe('TRUE');
    expect(
      (sketch?.accessibility as Record<string, unknown>)
        .nativeDisabledAttributePresent,
    ).toBe(false);
    expect(finish?.aria.disabled).toBe('UNKNOWN');
    expect(
      (finish?.accessibility as Record<string, unknown>)
        .nativeDisabledAttributePresent,
    ).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain('disabled="false"');
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

  it('retains unlabeled structural evidence when unrelated allowlisted labels exist', () => {
    const unrelatedSections = Array.from(
      { length: 18 },
      (_, index) =>
        `<section><span>private unrelated ${index}</span></section>`,
    ).join('');
    document.body.innerHTML = `
      <section>
        <button title="Top">Top</button>
        <button title="Part Studio">Part Studio</button>
      </section>
      ${unrelatedSections}
      <section>
        <div role="private-control" aria-label="Private Sketch toolbar">hidden diagnostic structure</div>
      </section>`;

    const snapshot = capturePageSnapshot({ maxCandidates: 12 });
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.scan.recognizedLabelCount).toBeGreaterThan(0);
    expect(
      snapshot.nodes.some((node) => node.accessibility.roleAttributePresent),
    ).toBe(true);
    expect(
      snapshot.nodes.some((node) => node.accessibility.nameAttributePresent),
    ).toBe(true);
    expect(serialized).not.toContain('private-control');
    expect(serialized).not.toContain('Private Sketch toolbar');
    expect(serialized).not.toContain('hidden diagnostic structure');
  });

  it('samples late unlabeled controls after 120 competitors without inventing their identity', () => {
    document.body.innerHTML =
      Array.from(
        { length: 120 },
        () => '<button>Private unrelated action</button>',
      ).join('') +
      '<div><button aria-expanded="true" tabindex="0">Private unnamed Sketch control</button></div>';

    const snapshot = capturePageSnapshot({
      maxCandidates: 32,
      maxOutputNodes: 100,
      maxOutputBytes: 9_000,
    });

    expect(
      snapshot.nodes.some(
        (node) =>
          node.tag === 'BUTTON' &&
          node.aria.expanded === 'TRUE' &&
          node.accessibility.tabIndexAttributePresent &&
          node.label === null,
      ),
    ).toBe(true);
    expect(snapshot.domState).toBe('UNKNOWN');
    expect(snapshot.scan.candidateLimitReached).toBe(true);
    expect(snapshot.scan.status).toBe('INCOMPLETE_CAPTURE');
    expect(JSON.stringify(snapshot)).not.toContain(
      'Private unnamed Sketch control',
    );
  });

  it('retains a genuinely deep Sketch target with UNKNOWN ancestry visibility', () => {
    document.body.innerHTML =
      '<div>'.repeat(18) +
      '<button aria-label="Finish Sketch">Finish Sketch</button>' +
      '</div>'.repeat(18);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(10, 20, 80, 24),
    );

    const snapshot = capturePageSnapshot({ maxDepth: 5 });
    const target = snapshot.nodes.find(
      (node) => node.label === 'Finish Sketch',
    );

    expect(target).toMatchObject({
      visibility: 'UNKNOWN',
      clipping: 'UNKNOWN',
    });
    expect(target?.bounds).not.toBeNull();
    expect(snapshot.scan.depthLimitReached).toBe(true);
    expect(snapshot.scan.status).toBe('INCOMPLETE_CAPTURE');
    expect(snapshot.domState).toBe('UNKNOWN');
  });

  it.each(['Sketch', 'Finish Sketch'])(
    'keeps %s state when an unrelated menu is visible',
    (label) => {
      document.body.innerHTML = `<button>${label}</button><div role="menu"><div role="menuitem">Private unrelated menu</div></div>`;
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(10, 20, 80, 24),
      );

      const snapshot = capturePageSnapshot();

      expect(snapshot.domState).toBe(
        label === 'Sketch'
          ? 'SKETCH_COMMAND_VISIBLE'
          : 'SKETCH_CONTROLS_VISIBLE',
      );
      expect(
        snapshot.nodes.some(
          (node) => node.role === 'MENU' && node.visibility === 'VISIBLE',
        ),
      ).toBe(true);
      expect(JSON.stringify(snapshot)).not.toContain('Private unrelated menu');
    },
  );
});
