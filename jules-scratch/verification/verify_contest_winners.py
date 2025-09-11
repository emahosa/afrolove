from playwright.sync_api import sync_playwright, Page, expect
import random
import string

def get_random_string(length):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    email = f"testuser_{get_random_string(5)}@example.com"
    password = "password123"
    full_name = "Test User"

    # Register a new user
    page.goto("http://localhost:8080/register")
    page.get_by_placeholder("John Doe").fill(full_name)
    page.get_by_placeholder("you@email.com").fill(email)
    page.locator("#password").fill(password)
    page.locator("#confirmPassword").fill(password)
    page.get_by_role("button", name="Sign Up").click()

    # Wait for a while and take a screenshot
    page.wait_for_timeout(10000)
    page.screenshot(path="jules-scratch/verification/after_register.png")

    # Now, try to go to dashboard directly
    page.goto("http://localhost:8080/")
    expect(page.locator("text=/Enter Now|View Contest/")).to_be_visible(timeout=15000)
    page.screenshot(path="jules-scratch/verification/dashboard.png")

    # Verify contest page
    page.goto("http://localhost:8080/contest")
    expect(page.get_by_text("Music Contests")).to_be_visible(timeout=15000)

    # Verify Past tab
    page.get_by_role("tab", name="Past").click()
    page.wait_for_timeout(2000) # wait for winners to load
    page.screenshot(path="jules-scratch/verification/contest_past_tab.png")

    # Verify Winners tab
    page.get_by_role("tab", name="Winners").click()
    page.wait_for_timeout(2000) # wait for winners to load
    page.screenshot(path="jules-scratch/verification/contest_winners_tab.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
