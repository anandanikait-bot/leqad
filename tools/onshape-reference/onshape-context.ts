/** Returns only a boolean; the origin and route never leave the active page. */
export function isSupportedOnshapePartStudioLocation(): boolean;
export function isSupportedOnshapePartStudioLocation(
  origin: string,
  pathname: string,
): boolean;
export function isSupportedOnshapePartStudioLocation(
  origin?: string,
  pathname?: string,
): boolean {
  const activeOrigin = origin ?? window.location.origin;
  const activePathname = pathname ?? window.location.pathname;
  if (activeOrigin !== 'https://cad.onshape.com') return false;
  return /^\/documents\/[^/]+\/w\/[^/]+\/e\/[^/]+$/.test(activePathname);
}
