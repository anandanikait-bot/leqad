declare module '*.css' {
  const stylesheet: string;
  export default stylesheet;
}

declare module '*.css?inline' {
  const stylesheet: string;
  export default stylesheet;
}

declare module '*.svg?url' {
  const assetUrl: string;
  export default assetUrl;
}
