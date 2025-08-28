import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Listen for console events and print them
        page.on("console", lambda msg: print(f"CONSOLE: {msg}"))

        await page.goto("http://127.0.0.1:8080/")

        # Wait for 5 seconds to see if content loads
        await page.wait_for_timeout(5000)

        await page.screenshot(path="jules-scratch/verification/debug_page_with_wait.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
