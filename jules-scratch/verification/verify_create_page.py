import time
from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the create page
        page.goto("http://localhost:8080/create", timeout=60000)

        # Wait for the song library to load by checking for the first song item
        expect(page.locator(".space-y-4 > div").first).to_be_visible(timeout=30000)

        # --- Test Search ---
        # Find the search input and type 'a' to filter the list
        search_input = page.get_by_placeholder("Search")
        expect(search_input).to_be_visible()
        search_input.fill("a")

        # Give a moment for the filter to apply
        page.wait_for_timeout(500)

        # --- Test Favorites ---
        # Find the first song in the (potentially filtered) list
        first_song = page.locator(".space-y-4 > div").first

        # Click the favorite button on the first song
        favorite_button = first_song.get_by_role("button", name="♡")
        if favorite_button.is_visible():
             favorite_button.click()
        else:
            # It might already be favorited from a previous run, so find the filled heart
            favorite_button = first_song.locator('button > svg.text-red-500')
            expect(favorite_button).to_be_visible()


        # --- Test Three-Dots Menu ---
        # Click the three-dots menu on the first song
        more_options_button = first_song.get_by_role("button").filter(has=page.locator("svg.lucide-more-horizontal"))
        expect(more_options_button).to_be_visible()
        more_options_button.click()

        # Wait for the dropdown menu to be visible
        expect(page.get_by_role("menuitem", name="Delete")).to_be_visible()

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/create-page-fixes.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)
