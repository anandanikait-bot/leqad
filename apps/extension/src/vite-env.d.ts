declare module '*.css' {
  const stylesheet: string;
  export default stylesheet;
}

declare module '*.css?inline' {
  const stylesheet: string;
  export default stylesheet;
}

declare module '*.png?inline' {
  const image: string;
  export default image;
}
