export interface InitTransactionParams {
  email: string;
  amount?: number; // in kobo (e.g., ₦1000 => 100000)
  currency?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
  plan?: string;
}

export interface InitTransactionResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface VerifyResponse {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  customer: { email: string };
  [key: string]: any;
}

export class PaystackClient {
  private secret: string;
  private baseUrl = "https://api.paystack.co";

  constructor(secret: string) {
    if (!secret) throw new Error("Paystack secret key is required");
    this.secret = secret;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      // Try to parse the error for a more descriptive message
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          throw new Error(`Paystack API error: ${errorJson.message}`);
        }
      } catch (e) {
        // Ignore parsing error and use the raw text
      }
      throw new Error(`Paystack API error: ${res.status} ${errorText}`);
    }

    const json = await res.json();
    return json.data as T;
  }

  async initTransaction(params: InitTransactionParams): Promise<InitTransactionResponse> {
    const body: any = {
      email: params.email,
      currency: params.currency ?? "NGN",
      callback_url: params.callback_url,
      metadata: params.metadata,
    };

    if (params.plan) {
      body.plan = params.plan;
    } else if (params.amount) {
      body.amount = params.amount;
    } else {
      throw new Error("Either amount or plan must be provided to initialize a transaction.");
    }

    return this.request<InitTransactionResponse>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async verifyTransaction(reference: string): Promise<VerifyResponse> {
    return this.request<VerifyResponse>(`/transaction/verify/${reference}`);
  }
}
