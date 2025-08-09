import asyncio
from playwright.async_api import async_playwright, expect
import time

async def main():
    # Give the server some time to start
    time.sleep(5)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # 1. Go to the login page
            await page.goto("http://localhost:8080/login", timeout=60000)

            # 2. Log in
            await page.get_by_label("Email").fill("adahosabex@gmail.com")
            await page.get_by_label("Password").fill("11223344")
            # Corrected button name from "Login" to "Sign In"
            await page.get_by_role("button", name="Sign In").click()

            # Wait for navigation to the dashboard after login
            await expect(page).to_have_url("http://localhost:8080/dashboard", timeout=30000)

            # 3. Navigate to the affiliate page
            await page.goto("http://localhost:8080/affiliate")

            # 4. Click the "Affiliate Dashboard" tab
            dashboard_tab = page.get_by_role("tab", name="Affiliate Dashboard")
            await expect(dashboard_tab).to_be_enabled()
            await dashboard_tab.click()

            # Wait for the dashboard to load
            await expect(page.get_by_text("Affiliate Dashboard")).to_be_visible()

            # 5. Take a screenshot
            await page.screenshot(path="jules-scratch/verification/affiliate_dashboard.png")
            print("Screenshot taken successfully.")

        except Exception as e:
            print(f"An error occurred: {e}")
            # Take a screenshot on error to help debug
            await page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
