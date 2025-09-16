import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        email = "loxserviceng@gmail.com"
        password = "11223344"

        try:
            # Log in
            print("Navigating to the login page...")
            await page.goto("http://localhost:8080/login", timeout=60000)
            print("Login page loaded.")

            print("Logging in...")
            await page.locator('input[id="email"]').fill(email)
            await page.locator('input[id="password"]').fill(password)
            await page.get_by_role("button", name="Sign In").click()
            print("Login submitted.")

            # Wait for redirection to the dashboard
            await page.wait_for_url("http://localhost:8080/dashboard", timeout=60000)
            print("Redirected to dashboard.")

            # Navigate to the contest page
            print("Navigating to the contest page...")
            await page.goto("http://localhost:8080/contest")
            print("Contest page loaded.")

            # Click on the "Entries" tab
            print("Clicking on the 'Entries' tab...")
            entries_tab = page.get_by_role("tab", name="Entries")
            await expect(entries_tab).to_be_visible(timeout=60000)
            await entries_tab.click()
            print("Clicked on 'Entries' tab.")

            # Wait for the specific entry to be visible
            print("Waiting for contest entry to be visible...")
            entry_selector = "div.flex.items-center.p-3.rounded-lg.bg-white\\/5"
            await page.wait_for_selector(entry_selector, timeout=60000)
            print("Contest entry is visible.")

            # Take a screenshot of the entries
            screenshot_path = "jules-scratch/verification/contest-entries.png"
            print(f"Taking screenshot: {screenshot_path}")
            await page.screenshot(path=screenshot_path)
            print("Screenshot taken.")

            # Find the first play button and click it
            print("Finding and clicking the play button...")
            play_button = page.locator(entry_selector).first.locator("button:has(svg.lucide-play)")

            if await play_button.count() > 0:
                await expect(play_button).to_be_enabled(timeout=60000)
                await play_button.click()
                print("Play button clicked.")

                await page.wait_for_timeout(2000) # wait for state to update

                # Take a screenshot showing the player in a playing state
                playing_screenshot_path = "jules-scratch/verification/contest-entries-playing.png"
                print(f"Taking playing state screenshot: {playing_screenshot_path}")
                await page.screenshot(path=playing_screenshot_path)
                print("Playing state screenshot taken.")
            else:
                print("No contest entries found to test the play button.")

        except Exception as e:
            print(f"An error occurred: {e}")
            error_screenshot_path = "jules-scratch/verification/error.png"
            await page.screenshot(path=error_screenshot_path)
            print(f"Error screenshot saved to {error_screenshot_path}")
        finally:
            print("Closing browser.")
            await browser.close()
            print("Browser closed.")

if __name__ == "__main__":
    asyncio.run(main())
