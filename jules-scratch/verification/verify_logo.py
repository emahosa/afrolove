from playwright.sync_api import sync_playwright, TimeoutError
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    for i in range(3): # Retry up to 3 times
        try:
            page.goto("http://localhost:5173/login", wait_until="networkidle")
            break # If successful, exit the loop
        except TimeoutError:
            print(f"Attempt {i+1} failed. Retrying in 5 seconds...")
            time.sleep(5)
    else:
        print("Failed to connect to the server after multiple attempts.")
        browser.close()
        return

    # Take a screenshot of the header
    header = page.locator("header")
    header.screenshot(path="jules-scratch/verification/navbar_logo.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
