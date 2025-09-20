from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={'width': 375, 'height': 812},
        is_mobile=True,
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1'
    )
    page = context.new_page()

    # Log in
    page.goto("http://localhost:8080/login")
    page.wait_for_timeout(2000)
    page.locator('input[name="email"]').fill("loxserviceng@gmail.com")
    page.locator('input[name="password"]').fill("11223344")
    page.get_by_role("button", name="Sign In").click()
    page.wait_for_timeout(5000)  # Wait for login to complete

    # Navigate to the Create page
    page.goto("http://localhost:8080/create")
    page.wait_for_timeout(2000)
    page.screenshot(path="jules-scratch/verification/create_page.png")

    # Navigate to the Library page
    page.goto("http://localhost:8080/library")
    page.wait_for_timeout(2000)
    page.screenshot(path="jules-scratch/verification/library_page.png")

    # Navigate to the Contest page
    page.goto("http://localhost:8080/contest")
    page.wait_for_timeout(2000)
    page.screenshot(path="jules-scratch/verification/contest_page.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
