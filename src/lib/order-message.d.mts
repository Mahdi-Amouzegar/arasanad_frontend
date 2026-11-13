export interface OrderMessageInput {
  serviceName: string;
  pages: number;
  urgent?: boolean;
  total: number;
  deposit: number;
}

export declare function buildOrderMessage(input: OrderMessageInput): string;
