import crypto from "crypto";
import fetch from "node-fetch";

export interface InitTransactionParams {
  email: string;
  amount: number; // in kobo (e.g., ₦1000 => 100000)
  currency?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
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
      throw new Error(`Paystack API error: ${res.status} ${errorText}`);
    }

    const json = await res.json();
    return json.data as T;
  }

  async initTransaction(params: InitTransactionParams): Promise<InitTransactionResponse> {
    return this.request<InitTransactionResponse>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async verifyTransaction(reference: string): Promise<VerifyResponse> {
    return this.request<VerifyResponse>(`/transaction/verify/${reference}`);
  }

  static verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");
    return hash === signature;
  }
}
