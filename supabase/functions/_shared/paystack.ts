
import { createHash, createHmac } from "node:crypto";

export interface PaystackTransaction {
  reference: string;
  amount: number;
  status: string;
  gateway_response: string;
  paid_at: string;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string;
  metadata?: any;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    customer_code: string;
    phone: string;
    metadata?: any;
    risk_action: string;
  };
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
  };
  plan?: any;
}

export interface PaystackWebhookEvent {
  event: string;
  data: PaystackTransaction;
}

export class PaystackService {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const hash = createHmac('sha512', this.secretKey)
      .update(body)
      .digest('hex');
    
    return hash === signature;
  }

  async verifyTransaction(reference: string): Promise<PaystackTransaction | null> {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.status && result.data) {
        return result.data as PaystackTransaction;
      }
      
      return null;
    } catch (error) {
      console.error('Error verifying Paystack transaction:', error);
      return null;
    }
  }

  async initializeTransaction(data: {
    email: string;
    amount: number;
    reference?: string;
    callback_url?: string;
    metadata?: any;
  }): Promise<{ authorization_url: string; access_code: string; reference: string } | null> {
    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          amount: data.amount * 100, // Convert to kobo
        }),
      });

      const result = await response.json();
      
      if (result.status && result.data) {
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error initializing Paystack transaction:', error);
      return null;
    }
  }
}
