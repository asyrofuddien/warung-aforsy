interface MidtransSnap {
  pay: (
    token: string,
    options?: {
      onSuccess?: (result: Record<string, unknown>) => void;
      onPending?: (result: Record<string, unknown>) => void;
      onError?: (result: Record<string, unknown>) => void;
      onClose?: () => void;
    }
  ) => void;
  embed: (token: string, options: { embedId: string }) => void;
}

interface Window {
  snap: MidtransSnap;
}

declare module 'midtrans-client' {
  interface SnapOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  interface TransactionParameter {
    transaction_details: {
      order_id: string;
      gross_amount: number;
    };
    enabled_payments?: string[];
    customer_details?: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
    };
    callbacks?: {
      finish?: string;
    };
  }

  class Snap {
    constructor(options: SnapOptions);
    createTransaction(parameter: TransactionParameter): Promise<{ token: string; redirect_url: string }>;
    createTransactionToken(parameter: TransactionParameter): Promise<string>;
    createTransactionRedirectUrl(parameter: TransactionParameter): Promise<string>;
  }
}
