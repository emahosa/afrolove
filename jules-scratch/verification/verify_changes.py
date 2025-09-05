from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    page.goto("http://localhost:8080/register")

    page.get_by_label("Full Name").fill("Test User")
    page.get_by_label("Email").fill("test@example.com")
    page.get_by_label("Password").first.fill("password123")
    page.get_by_label("Confirm Password").fill("password123")

    page.get_by_role("button", name="Sign Up").click()

    # Wait for navigation to the dashboard
    page.wait_for_url("**/dashboard")

    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
