declare module 'mammoth' {
  export interface MammothInput {
    arrayBuffer: ArrayBuffer;
  }

  export interface MammothMessage {
    type: string;
    message: string;
  }

  export interface MammothResult {
    value: string;
    messages: MammothMessage[];
  }

  export function convertToHtml(
    input: MammothInput,
    options?: Record<string, unknown>,
  ): Promise<MammothResult>;

  export function extractRawText(input: MammothInput): Promise<MammothResult>;
}
