from playwright.sync_api import sync_playwright, Page, expect
import time

def verify_profile_page(page: Page, email: str, password: str):
    # Login
    page.goto("http://127.0.0.1:8080/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign In").click()

    # Wait for navigation to dashboard
    expect(page).to_have_url("http://127.0.0.1:8080/dashboard", timeout=10000)

    # Go to profile page
    page.goto("http://127.0.0.1:8080/profile")
    expect(page.get_by_role("heading", name="User Profile")).to_be_visible()

    # Take screenshot
    page.screenshot(path="jules-scratch/verification/profile_page.png")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Use a unique email for each run
        email = f"testuser_{int(time.time())}@example.com"
        password = "password123"

        # Register user first
        page.goto("http://127.0.0.1:8080/register")
        page.get_by_label("Full Name").fill("Test User")
        page.get_by_label("Email").fill(email)
        page.locator("#password").fill(password)
        page.locator("#confirmPassword").fill(password)
        page.get_by_role("button", name="Create Account").click()

        # Add a small delay to allow for the registration to process
        time.sleep(2)

        expect(page).to_have_url("http://127.0.0.1:8080/dashboard", timeout=10000)

        # Logout
        # This will fail as there is no logout button. I will add it later.
        # For now, I will just go to the login page directly.

        verify_profile_page(page, email, password)
        browser.close()

if __name__ == "__main__":
    main()
