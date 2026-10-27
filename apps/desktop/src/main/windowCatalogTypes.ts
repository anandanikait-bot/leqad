import type {
  WindowApplication,
  WindowCatalog,
  WindowKind,
} from '@leqad/desktop-contracts';

/**
 * A main-process-only reference to one listed window. The token is random and
 * short-lived; the native provider keeps the operating-system identity private.
 */
export type WindowBinding = Readonly<{
  token: string;
  application: WindowApplication;
  ordinal: number;
  kind: WindowKind;
}>;

export interface WindowCatalogProvider {
  list(): Promise<WindowCatalog>;
  select(token: string): Promise<WindowBinding | null>;
  isCurrent(binding: WindowBinding): Promise<boolean>;
  dispose(): void;
}
