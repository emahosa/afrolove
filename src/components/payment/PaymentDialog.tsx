import React, { useEffect, useState } from "react";
import { usePaymentGatewaySettings } from "@/hooks/usePaymentGatewaySettings";

export default function PaymentDialog() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const s = await usePaymentGatewaySettings();
      setSettings(s);
    })();
  }, []);

  if (!settings) {
    return <div>Loading payment settings...</div>;
  }

  if (!settings.enabled) {
    return (
      <div className="text-red-600 font-medium">
        ⚠️ Payment processing is currently disabled.
      </div>
    );
  }

  return (
    <div>
      Active Gateway:{" "}
      <span className="font-bold">{settings.activeGateway}</span>
      <br />
      Mode: <span className="font-bold">{settings.mode}</span>
    </div>
  );
}
