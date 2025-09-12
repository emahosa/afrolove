from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # 1. Arrange: Go to the login page.
    page.goto("http://localhost:8080/login")

    # 2. Act: Fill in the login form and submit.
    page.get_by_label("Email").fill("loxserviceng@gmail.com")
    page.get_by_label("Password").fill("11223344")
    page.get_by_role("button", name="Sign In").click()

    # 3. Assert: Wait for navigation to the dashboard and find the ticker.
    page.wait_for_url("http://localhost:8080/dashboard", timeout=10000) # Increased timeout
    ticker_wrap = page.locator(".ticker-wrap")
    expect(ticker_wrap).to_be_visible()

    # 4. Wait for toast to disappear
    page.wait_for_timeout(5000)

    # 5. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
