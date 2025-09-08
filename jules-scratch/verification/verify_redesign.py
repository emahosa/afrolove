from playwright.sync_api import Page, expect
import traceback

def test_redesign(page: Page):
    try:
        print("Navigating to login page...")
        page.goto("http://localhost:5173/login")
        print("URL:", page.url)

        print("Logging in...")
        page.get_by_label("Email").fill("oby@gmail.com")
        page.get_by_label("Password").fill("123456")
        page.get_by_role("button", name="Login").click()

        print("Waiting for dashboard navigation...")
        page.wait_for_url("http://localhost:5173/dashboard", timeout=10000)
        print("URL:", page.url)

        print("Taking dashboard screenshot...")
        page.screenshot(path="jules-scratch/verification/dashboard.png")
        print("Dashboard screenshot taken.")

        print("Navigating to create page...")
        page.get_by_role("link", name="Create").click()

        print("Waiting for create page navigation...")
        page.wait_for_url("http://localhost:5173/create", timeout=10000)
        print("URL:", page.url)

        print("Taking create page screenshot...")
        page.screenshot(path="jules-scratch/verification/create.png")
        print("Create page screenshot taken.")

        page.pause()

    except Exception as e:
        print(f"An error occurred: {e}")
        traceback.print_exc()
        page.screenshot(path="jules-scratch/verification/error.png")
