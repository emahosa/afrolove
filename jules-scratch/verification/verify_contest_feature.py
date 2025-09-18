import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Admin credentials
        ADMIN_EMAIL = "admin@example.com"
        ADMIN_PASSWORD = "password"

        # User credentials
        USER_EMAIL = "testuser@example.com"
        USER_PASSWORD = "password"

        try:
            # --- Assume user is logged in ---
            # --- Create a song ---
            await page.goto("http://localhost:8080/create")
            await page.fill('textarea[id="prompt-input"]', "A song about testing software.")
            await page.click('button[id="genre"]')
            await page.locator('div[role="option"]').first.click()
            await page.click('button:has-text("Create")')
            await expect(page.locator('text=Song generation started!')).to_be_visible()
            await page.screenshot(path="jules-scratch/verification/song_creation.png")

            # Wait for the song to be created
            await page.wait_for_timeout(120000) # 2 minutes

            # --- Submit to a contest ---
            await page.goto("http://localhost:8080/contest")
            # We'll assume the first contest allows social links.
            await page.locator('.contest-card').first.click()
            await page.click('button:has-text("Submit Entry")')
            await page.click('button[role="combobox"]')
            await page.locator('div[role="option"]').first.click()
            await page.fill('input[placeholder="https://soundcloud.com/your-track"]', "https://soundcloud.com/jules-the-engineer")
            await page.click('button:has-text("Submit Entry")')
            await expect(page.locator('text=Entry submitted successfully!')).to_be_visible()
            await page.screenshot(path="jules-scratch/verification/submission.png")

            # --- Verify Entry Display ---
            await page.goto("http://localhost:8080/contest")
            await page.locator('.contest-card').first.click()
            view_button = page.locator('a:has-text("View")')
            await expect(view_button).to_be_visible()
            await expect(view_button).to_have_attribute("href", "https://soundcloud.com/jules-the-engineer")
            await page.screenshot(path="jules-scratch/verification/entry_view.png")

            print("✅ All tests passed!")

        except Exception as e:
            print(f"❌ Test failed: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
