import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate directly to the contest page
        await page.goto("http://127.0.0.1:8080/contest")

        # Wait for the page to load by checking for a known element
        await expect(page.get_by_role("heading", name="Contest")).to_be_visible()

        # Make the page content very long to ensure scrolling is possible
        await page.evaluate("""() => {
            const main = document.querySelector('main');
            if (main) {
                const longContent = document.createElement('div');
                longContent.style.height = '3000px';
                longContent.style.background = 'linear-gradient(to bottom, #ff0000, #0000ff)';
                main.appendChild(longContent);
            }
        }""")

        await page.wait_for_timeout(1000) # wait for content to be rendered

        await page.screenshot(path="jules-scratch/verification/before_scroll.png")

        # Scroll down the main content area
        await page.evaluate("""() => {
            const main = document.querySelector('main');
            if (main) {
                main.scrollTop = main.scrollHeight;
            }
        }""")

        await page.wait_for_timeout(1000) # wait for scroll to happen

        await page.screenshot(path="jules-scratch/verification/after_scroll.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
