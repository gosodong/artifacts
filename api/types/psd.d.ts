declare module 'psd' {
  interface PSDLayer {
    name: string;
    visible: boolean;
    opacity: number;
    width: number;
    height: number;
    left: number;
    top: number;
    export(): Promise<{ saveAsPng(path: string): Promise<void> }>;
  }

  interface PSDTree {
    children(): PSDLayer[];
    export(): Promise<{ saveAsPng(path: string): Promise<void> }>;
  }

  interface PSDImage {
    width: number;
    height: number;
    saveAsPng(path: string): Promise<void>;
  }

  interface PSD {
    tree(): PSDTree;
    image: PSDImage;
  }

  function fromFile(path: string): Promise<PSD>;
  
  export { fromFile };
  export default { fromFile };
}
