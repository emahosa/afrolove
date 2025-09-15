from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 375, 'height': 812},
            is_mobile=True,
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1'
        )
        page = context.new_page()

        # Register admin user
        page.goto("http://localhost:8080/register/admin")
        page.get_by_label("Full Name").fill("Admin User")
        page.get_by_label("Email").fill("admin.melodyverse@gmail.com")
        page.get_by_label("Password").fill("Admin123!")
        page.get_by_label("Admin Code").fill("ADMIN123")
        page.get_by_role("button", name="Create Admin Account").click()

        # Wait for registration to complete and redirect to dashboard
        expect(page).to_have_url("http://localhost:8080/dashboard", timeout=20000)

        # Verify Contest Page
        page.goto("http://localhost:8080/contest")
        page.wait_for_load_state('networkidle')
        page.screenshot(path="jules-scratch/verification/contest_page.png")

        # Verify Library Page
        page.goto("http://localhost:8080/library")
        page.wait_for_load_state('networkidle')
        page.screenshot(path="jules-scratch/verification/library_page.png")

        browser.close()

if __name__ == "__main__":
    run()
