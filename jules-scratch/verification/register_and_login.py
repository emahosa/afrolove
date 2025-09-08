from playwright.sync_api import Page, expect
import traceback
import random
import string

def random_string(length=10):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def test_register_and_login(page: Page):
    try:
        email = f"testuser_{random_string()}@example.com"
        password = "password123"
        name = "Test User"

        # Register
        print("Navigating to register page...")
        page.goto("http://localhost:5173/register")
        print("URL:", page.url)

        print("Registering new user...")
        page.get_by_label("Full Name").fill(name)
        page.get_by_label("Email").fill(email)
        page.get_by_label("Password").fill(password)
        page.get_by_label("Confirm Password").fill(password)
        page.get_by_role("button", name="Sign Up").click()

        print("Waiting for dashboard navigation after register...")
        page.wait_for_url("http://localhost:5173/dashboard", timeout=60000)
        print("URL:", page.url)

        print("Taking dashboard screenshot...")
        page.screenshot(path="jules-scratch/verification/dashboard.png")
        print("Dashboard screenshot taken.")

        print("Navigating to create page...")
        page.get_by_role("button", name="Create").click()

        print("Waiting for create page navigation...")
        page.wait_for_url("http://localhost:5173/create", timeout=60000)
        print("URL:", page.url)

        print("Taking create page screenshot...")
        page.screenshot(path="jules-scratch/verification/create.png")
        print("Create page screenshot taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
        traceback.print_exc()
        page.screenshot(path="jules-scratch/verification/error.png")
