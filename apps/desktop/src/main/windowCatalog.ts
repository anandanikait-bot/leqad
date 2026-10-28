import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type {
  WindowCatalog,
  WindowApplication,
  WindowKind,
} from '@leqad/desktop-contracts';
import { parseWindowCatalog } from '@leqad/desktop-contracts';
import type {
  WindowBinding,
  WindowCatalogProvider,
} from './windowCatalogTypes';

export type NativeWindowMetadata = Readonly<{
  handle: string;
  processId: number;
  threadId: number;
  processStart: string;
  application: WindowApplication;
  kind: WindowKind;
}>;

export type NativeWindowScan = Readonly<{
  windows: readonly NativeWindowMetadata[];
  incomplete: boolean;
}>;

export type WindowCatalogProviderOptions = Readonly<{
  platform?: NodeJS.Platform;
  scanWindows?: () => Promise<NativeWindowScan>;
}>;

export type PowerShellInvoker = (script: string) => Promise<string>;

// Fixed metadata query for visible HWND and process identity; never reads UI contents.
const WINDOWS_ENUMERATION_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$source = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace LeqadWindowCatalog {
  public sealed class WindowRecord {
    public string Handle { get; set; }
    public int ProcessId { get; set; }
    public int ThreadId { get; set; }
    public string ProcessStart { get; set; }
    public string Application { get; set; }
    public string Kind { get; set; }
  }

  public sealed class ScanResult {
    public WindowRecord[] Windows { get; set; }
    public bool Incomplete { get; set; }
  }

  public static class NativeWindowEnumerator {
    private delegate bool EnumWindowsCallback(IntPtr window, IntPtr parameter);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsCallback callback, IntPtr parameter);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr window);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);

    public static ScanResult Scan(int ownerProcessId) {
      var windows = new List<WindowRecord>();
      var incomplete = false;
      EnumWindowsCallback callback = delegate(IntPtr handle, IntPtr parameter) {
        if (!IsWindowVisible(handle)) return true;
        uint processId;
        uint threadId = GetWindowThreadProcessId(handle, out processId);
        if (processId == 0 || threadId == 0) {
          incomplete = true;
          return true;
        }
        if (processId == (uint)ownerProcessId) return true;
        if (windows.Count >= 10000) {
          incomplete = true;
          return false;
        }
        try {
          using (Process process = Process.GetProcessById((int)processId)) {
            string processName = process.ProcessName.ToLowerInvariant();
            // Do not offer Windows desktop chrome as an application window.
            if (processName == "explorer" ||
                processName == "shellexperiencehost" ||
                processName == "startmenuexperiencehost" ||
                processName == "searchhost" ||
                processName == "textinputhost" ||
                processName == "applicationframehost") return true;
            string application = "Other app";
            string kind = "other";
            if (processName == "chrome") {
              application = "Chrome";
              kind = "browser";
            } else if (processName == "msedge") {
              application = "Microsoft Edge";
              kind = "browser";
            } else if (processName == "firefox") {
              application = "Firefox";
              kind = "browser";
            } else if (processName == "sldworks") {
              application = "SOLIDWORKS";
              kind = "native";
            } else if (processName == "fusion360" || processName == "fusion") {
              application = "Autodesk Fusion";
              kind = "native";
            } else if (processName == "freecad" || processName == "freecadcmd") {
              application = "FreeCAD";
              kind = "native";
            }
            windows.Add(new WindowRecord {
              Handle = "0x" + handle.ToInt64().ToString("X"),
              ProcessId = (int)processId,
              ThreadId = (int)threadId,
              ProcessStart = process.StartTime.ToUniversalTime().Ticks.ToString("X"),
              Application = application,
              Kind = kind
            });
          }
        } catch {
          incomplete = true;
        }
        return true;
      };
      if (!EnumWindows(callback, IntPtr.Zero)) incomplete = true;
      return new ScanResult { Windows = windows.ToArray(), Incomplete = incomplete };
    }
  }
}
'@
Add-Type -TypeDefinition $source -Language CSharp
$scan = [LeqadWindowCatalog.NativeWindowEnumerator]::Scan(__OWNER_PROCESS_ID__)
$windows = @($scan.Windows | ForEach-Object {
  [pscustomobject]@{
    handle = $_.Handle
    processId = $_.ProcessId
    threadId = $_.ThreadId
    processStart = $_.ProcessStart
    application = $_.Application
    kind = $_.Kind
  }
})
$result = [pscustomobject]@{ incomplete = [bool]$scan.Incomplete; windows = $windows }
[Console]::Out.WriteLine((ConvertTo-Json -InputObject $result -Compress -Depth 3))
`;

const WINDOW_TOKEN_LIFETIME_MS = 60_000;

function invokePowerShell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const systemRoot = process.env.SystemRoot ?? process.env.WINDIR;
    if (!systemRoot) {
      reject(new Error('Windows metadata provider failed'));
      return;
    }
    const environment: NodeJS.ProcessEnv = {
      SystemRoot: systemRoot,
      WINDIR: systemRoot,
    };
    // Add-Type needs the Windows host/compiler runtime environment. Keep this
    // allowlist explicit so credentials and unrelated application settings never
    // reach the fixed metadata subprocess.
    for (const key of [
      'TEMP',
      'TMP',
      'PATH',
      'PATHEXT',
      'ComSpec',
      'SystemDrive',
      'USERPROFILE',
      'LOCALAPPDATA',
      'APPDATA',
      'ProgramFiles',
      'ProgramFiles(x86)',
      'ProgramW6432',
      'CommonProgramFiles',
      'CommonProgramFiles(x86)',
      'CommonProgramW6432',
      'PSModuleAnalysisCachePath',
    ]) {
      if (process.env[key]) environment[key] = process.env[key];
    }
    environment.PSModulePath = path.join(
      systemRoot,
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'Modules',
    );
    execFile(
      path.join(
        systemRoot,
        'System32',
        'WindowsPowerShell',
        'v1.0',
        'powershell.exe',
      ),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
      {
        env: environment,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 5_000,
        maxBuffer: 1_048_576,
      },
      (error, stdout) => {
        if (error) {
          reject(new Error('Windows metadata provider failed'));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

function parseWindowsScan(stdout: string): NativeWindowScan {
  const raw: unknown = JSON.parse(stdout.replace(/^\uFEFF/, '').trim());
  if (
    raw === null ||
    typeof raw !== 'object' ||
    Array.isArray(raw) ||
    Object.getPrototypeOf(raw) !== Object.prototype
  ) {
    throw new Error('Invalid Windows metadata response');
  }
  const record = raw as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(',') !== 'incomplete,windows' ||
    typeof record.incomplete !== 'boolean' ||
    !Array.isArray(record.windows)
  ) {
    throw new Error('Invalid Windows metadata response');
  }
  const windows: NativeWindowMetadata[] = record.windows.map((item) => {
    if (
      item === null ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      Object.getPrototypeOf(item) !== Object.prototype
    ) {
      throw new Error('Invalid Windows metadata response');
    }
    const row = item as Record<string, unknown>;
    if (
      Object.keys(row).sort().join(',') !==
        'application,handle,kind,processId,processStart,threadId' ||
      typeof row.handle !== 'string' ||
      typeof row.processStart !== 'string' ||
      typeof row.processId !== 'number' ||
      typeof row.threadId !== 'number'
    ) {
      throw new Error('Invalid Windows metadata response');
    }
    const metadata: NativeWindowMetadata = {
      handle: row.handle,
      processId: row.processId,
      threadId: row.threadId,
      processStart: row.processStart,
      application: row.application as WindowApplication,
      kind: row.kind as WindowKind,
    };
    if (!isMetadata(metadata))
      throw new Error('Invalid Windows metadata response');
    return metadata;
  });
  return { windows, incomplete: record.incomplete };
}

export function createWindowsMetadataScanner(
  invoke: PowerShellInvoker = invokePowerShell,
  ownerProcessId: number = process.pid,
): () => Promise<NativeWindowScan> {
  return async () => {
    if (!Number.isSafeInteger(ownerProcessId) || ownerProcessId <= 0) {
      throw new Error('Invalid owner process');
    }
    const script = WINDOWS_ENUMERATION_SCRIPT.replace(
      '__OWNER_PROCESS_ID__',
      String(ownerProcessId),
    );
    return parseWindowsScan(await invoke(script));
  };
}

const unavailable = (
  reason: 'unsupported' | 'provider-failed',
): WindowCatalog =>
  parseWindowCatalog({
    availability: 'unavailable',
    unavailableReason: reason,
    incomplete: false,
    windows: [],
  });

function isMetadata(value: NativeWindowMetadata): boolean {
  const expectedKind =
    value.application === 'Chrome' ||
    value.application === 'Microsoft Edge' ||
    value.application === 'Firefox'
      ? 'browser'
      : value.application === 'SOLIDWORKS' ||
          value.application === 'Autodesk Fusion' ||
          value.application === 'FreeCAD'
        ? 'native'
        : 'other';
  return (
    typeof value.handle === 'string' &&
    value.handle.length > 0 &&
    Number.isSafeInteger(value.processId) &&
    value.processId > 0 &&
    Number.isSafeInteger(value.threadId) &&
    value.threadId > 0 &&
    typeof value.processStart === 'string' &&
    value.processStart.length > 0 &&
    (value.application === 'Chrome' ||
      value.application === 'Microsoft Edge' ||
      value.application === 'Firefox' ||
      value.application === 'SOLIDWORKS' ||
      value.application === 'Autodesk Fusion' ||
      value.application === 'FreeCAD' ||
      value.application === 'Other app') &&
    value.kind === expectedKind
  );
}

function safeMetadata(
  value: NativeWindowMetadata,
): NativeWindowMetadata | null {
  if (value === null || typeof value !== 'object') return null;
  const metadata: NativeWindowMetadata = {
    handle: value.handle,
    processId: value.processId,
    threadId: value.threadId,
    processStart: value.processStart,
    application: value.application,
    kind: value.kind,
  };
  return isMetadata(metadata) ? metadata : null;
}

function sameWindow(
  left: NativeWindowMetadata,
  right: NativeWindowMetadata,
): boolean {
  return (
    left.handle === right.handle &&
    left.processId === right.processId &&
    left.threadId === right.threadId &&
    left.processStart === right.processStart &&
    left.application === right.application &&
    left.kind === right.kind
  );
}

function sameBinding(left: WindowBinding, right: WindowBinding): boolean {
  return (
    left.token === right.token &&
    left.application === right.application &&
    left.ordinal === right.ordinal &&
    left.kind === right.kind
  );
}

function validatedScan(
  scan: NativeWindowScan,
): readonly NativeWindowMetadata[] | null {
  if (scan.incomplete || scan.windows.length > 50) return null;
  const windows: NativeWindowMetadata[] = [];
  const seenHandles = new Set<string>();
  for (const row of scan.windows) {
    const metadata = safeMetadata(row);
    if (!metadata || seenHandles.has(metadata.handle)) return null;
    seenHandles.add(metadata.handle);
    windows.push(metadata);
  }
  return windows;
}

function containsValidatedWindow(
  scan: NativeWindowScan,
  expected: NativeWindowMetadata,
): boolean {
  const windows = validatedScan(scan);
  return windows?.some((current) => sameWindow(expected, current)) ?? false;
}

export function createWindowCatalogProvider(
  options: WindowCatalogProviderOptions = {},
): WindowCatalogProvider {
  const platform = options.platform ?? process.platform;
  if (platform !== 'win32') {
    return {
      async list() {
        return unavailable('unsupported');
      },
      async select() {
        return null;
      },
      async isCurrent() {
        return false;
      },
      dispose() {},
    };
  }

  const scanWindows = options.scanWindows ?? createWindowsMetadataScanner();
  const byToken = new Map<
    string,
    {
      readonly metadata: NativeWindowMetadata;
      readonly binding: WindowBinding;
      readonly expiresAt: number;
    }
  >();
  let disposed = false;
  let listRevision = 0;

  return {
    async list() {
      const revision = ++listRevision;
      byToken.clear();
      if (disposed) return unavailable('provider-failed');
      try {
        const result = await scanWindows();
        if (disposed || revision !== listRevision)
          return unavailable('provider-failed');
        const records = validatedScan(result);
        if (!records) {
          byToken.clear();
          return parseWindowCatalog({
            availability: 'available',
            unavailableReason: null,
            incomplete: true,
            windows: [],
          });
        }
        const windows: WindowCatalog['windows'][number][] = [];
        const ordinalByApplication = new Map<WindowApplication, number>();
        for (const metadata of records) {
          const ordinal =
            (ordinalByApplication.get(metadata.application) ?? 0) + 1;
          ordinalByApplication.set(metadata.application, ordinal);
          const token = randomUUID();
          const choice = Object.freeze({
            application: metadata.application,
            ordinal,
            kind: metadata.kind,
            token,
          });
          const binding = Object.freeze({
            token,
            application: metadata.application,
            ordinal,
            kind: metadata.kind,
          });
          byToken.set(token, {
            metadata,
            binding,
            expiresAt: Date.now() + WINDOW_TOKEN_LIFETIME_MS,
          });
          windows.push(choice);
        }
        return parseWindowCatalog({
          availability: 'available',
          unavailableReason: null,
          incomplete: false,
          windows,
        });
      } catch {
        if (revision === listRevision) byToken.clear();
        return unavailable('provider-failed');
      }
    },
    async select(token) {
      const entry = byToken.get(token);
      if (disposed || !entry) return null;
      if (Date.now() >= entry.expiresAt) {
        byToken.delete(token);
        return null;
      }
      try {
        const result = await scanWindows();
        if (disposed || byToken.get(token) !== entry) return null;
        if (!containsValidatedWindow(result, entry.metadata)) {
          byToken.delete(token);
          return null;
        }
        return entry.binding;
      } catch {
        if (byToken.get(token) === entry) byToken.delete(token);
        return null;
      }
    },
    async isCurrent(binding) {
      const entry = byToken.get(binding.token);
      if (disposed || !entry || !sameBinding(entry.binding, binding)) {
        return false;
      }
      if (Date.now() >= entry.expiresAt) {
        byToken.delete(binding.token);
        return false;
      }
      try {
        const result = await scanWindows();
        if (disposed || byToken.get(binding.token) !== entry) return false;
        const present = containsValidatedWindow(result, entry.metadata);
        if (!present) byToken.delete(binding.token);
        return present;
      } catch {
        if (byToken.get(binding.token) === entry) byToken.delete(binding.token);
        return false;
      }
    },
    dispose() {
      disposed = true;
      listRevision += 1;
      byToken.clear();
    },
  };
}
