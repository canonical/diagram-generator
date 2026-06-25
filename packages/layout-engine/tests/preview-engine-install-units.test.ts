import { describe, expect, it } from 'vitest';
import {
  installPreviewEngineInstallUnits,
  listPreviewEngineInstallUnits,
  registerPreviewEngineInstallUnit,
  type PreviewEngineInstallUnit,
} from '../src/preview-engine/index.js';

describe('preview-engine install units', () => {
  it('registers builtin preview engines through install units', () => {
    expect(listPreviewEngineInstallUnits().map((entry) => entry.key)).toEqual([
      'v3',
      'elk-layered',
      'elk-force',
      'force',
      'sequence',
    ]);
  });

  it('installs synthetic install units in order and unwinds in reverse order', () => {
    const events: string[] = [];
    const uninstall = installPreviewEngineInstallUnits([
      {
        key: 'alpha',
        install() {
          events.push('install-alpha');
          return () => {
            events.push('uninstall-alpha');
          };
        },
      },
      {
        key: 'beta',
        install() {
          events.push('install-beta');
          return () => {
            events.push('uninstall-beta');
          };
        },
      },
    ] satisfies readonly PreviewEngineInstallUnit[]);

    expect(events).toEqual(['install-alpha', 'install-beta']);
    uninstall();
    expect(events).toEqual([
      'install-alpha',
      'install-beta',
      'uninstall-beta',
      'uninstall-alpha',
    ]);
  });

  it('supports typed install-unit registration without editing builtin runtime sinks', () => {
    const unregister = registerPreviewEngineInstallUnit({
      key: 'test-install-unit',
      install() {
        return undefined;
      },
    });

    try {
      expect(listPreviewEngineInstallUnits().map((entry) => entry.key)).toContain('test-install-unit');
    } finally {
      unregister();
    }

    expect(listPreviewEngineInstallUnits().map((entry) => entry.key)).not.toContain('test-install-unit');
  });

  it('rejects duplicate install-unit keys', () => {
    const unregister = registerPreviewEngineInstallUnit({
      key: 'test-duplicate-install-unit',
      install() {
        return undefined;
      },
    });

    try {
      expect(() =>
        registerPreviewEngineInstallUnit({
          key: 'test-duplicate-install-unit',
          install() {
            return undefined;
          },
        }),
      ).toThrow(/already registered/);
    } finally {
      unregister();
    }
  });
});
