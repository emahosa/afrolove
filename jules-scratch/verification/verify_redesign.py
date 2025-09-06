from playwright.sync_api import sync_playwright, Page, expect
import time

def verify_pages(page: Page):
    # Homepage
    page.goto("http://127.0.0.1:8080/")
    time.sleep(2) # Wait for video to load
    page.screenshot(path="jules-scratch/verification/homepage.png")

    # Login page
    page.goto("http://127.0.0.1:8080/login")
    expect(page.get_by_role("heading", name="Welcome Back")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/loginpage.png")

    # Register page
    page.goto("http://127.0.0.1:8080/register")
    expect(page.get_by_role("heading", name="Create Your Account")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/registerpage.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_pages(page)
        browser.close()

if __name__ == "__main__":
    main()
