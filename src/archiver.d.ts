// src/archiver.d.ts
declare module 'archiver' {
    import { Writable } from 'stream';
  
    export default function archiver(format: string, options?: any): Writable;
    export interface Archiver extends Writable {
      file(path: string, options?: { name: string }): this;
      finalize(): Promise<void>;
      on(event: string, listener: (...args: any[]) => void): this;
    }
  }