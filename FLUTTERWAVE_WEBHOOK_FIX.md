# Critical Fix for Flutterwave Webhook

You are receiving a `401 Unauthorized` error on your webhook. This is a configuration issue, not a code issue. Your webhook is not set up correctly to communicate with the Supabase function.

Please follow these steps exactly to fix the problem:

### Step 1: Get the Secret Hash from Flutterwave

1.  Log in to your **Flutterwave Dashboard**.
2.  Navigate to **Settings** in the left-hand menu.
3.  Click on the **Webhooks** tab.
4.  Look for the **Secret Hash** field. It's a long string of characters.
5.  **Copy this value carefully.** This is the secret key that Flutterwave uses to sign its webhook requests.

### Step 2: Set the Secret Hash in Supabase

1.  Log in to your **Supabase Dashboard**.
2.  Go to your project: `bswfiynuvjvoaoyfdrso`.
3.  In the left-hand menu, go to **Settings** (the gear icon).
4.  In the side panel, click on **Edge Functions**.
5.  Look for the `flw-webhook` function in the list.
6.  You should see a section for **Environment Variables**.
7.  Find the variable named `FLW_SECRET_HASH`.
8.  **Paste the Secret Hash** you copied from Flutterwave into the value field for `FLW_SECRET_HASH`.
9.  **Make sure there are no extra spaces or characters.** The value must be an exact match.
10. **Save** the environment variables.

### Why this works

The `401 Unauthorized` error happens because the `verif-hash` sent by Flutterwave in the request header does not match the `FLW_SECRET_HASH` you have stored in Supabase. By making sure these two values are identical, you are proving to your Supabase function that the webhook request is legitimate and came from Flutterwave.

After you have completed these steps, please try the payment process again. It should now work correctly.
