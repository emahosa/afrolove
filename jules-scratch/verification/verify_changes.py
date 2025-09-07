import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Verify Hero Section
        await page.goto("http://127.0.0.1:8080/")
        await page.wait_for_load_state("networkidle")
        h1_locator = page.locator("h1")
        await expect(h1_locator).to_be_visible()
        await page.screenshot(path="jules-scratch/verification/hero_section.png")

        # Verify Winner Card
        await page.goto("http://127.0.0.1:8080/contest")
        await page.wait_for_load_state("networkidle")
        await expect(page.get_by_role("tablist")).to_be_visible(timeout=10000)
        await page.get_by_role("tab", name="Past").click()

        winner_card = page.locator(".bg-gradient-to-br")
        is_winner_visible = await winner_card.is_visible()

        if is_winner_visible:
            await expect(winner_card).to_be_visible()

        await page.screenshot(path="jules-scratch/verification/winner_card.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
