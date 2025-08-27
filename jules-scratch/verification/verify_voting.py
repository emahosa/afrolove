import re
import time
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Log in
        page.goto("http://127.0.0.1:8081/login")
        page.get_by_label("Email").fill("loxserviceng@gmail.com")
        page.get_by_label("Password").fill("11223344")
        page.get_by_role("button", name="Sign In").click()

        # Wait for navigation to the dashboard
        expect(page).to_have_url(re.compile(".*dashboard.*"))

        # 2. Navigate to the contest page
        page.goto("http://127.0.0.1:8081/contest")

        # Wait for the page to load
        expect(page.get_by_role("heading", name="Music Contests")).to_be_visible()

        # 3. Click on the "Entries" tab
        entries_tab = page.get_by_role("tab", name="Entries")
        expect(entries_tab).to_be_visible()
        entries_tab.click()

        # 4. Click the "Vote" button on the first entry
        vote_button = page.get_by_role("button", name="Vote").first
        # It may be that there are no entries. If so, we can't test voting.
        if not vote_button.is_visible():
            print("No entries found to vote on. Skipping voting test.")
            return

        vote_button.click()

        # 4. The vote dialog should appear. Take a screenshot.
        dialog = page.get_by_role("dialog")
        expect(dialog).to_be_visible()
        expect(dialog).to_contain_text("Vote for")
        page.screenshot(path="jules-scratch/verification/01_vote_dialog.png")

        # 5. Enter a number of votes in the input.
        votes_input = page.get_by_label("Votes")
        expect(votes_input).to_be_visible()
        votes_input.fill("11")

        # 6. Take another screenshot to show the updated cost.
        expect(page.get_by_text("Credit Cost:")).to_contain_text("50 credits")
        page.screenshot(path="jules-scratch/verification/02_vote_dialog_with_cost.png")

        # 7. Click the "Cast Vote" button.
        cast_vote_button = page.get_by_role("button", name=re.compile("Cast 11 Votes"))
        expect(cast_vote_button).to_be_enabled()
        cast_vote_button.click()

        # 8. Wait for the success message.
        expect(page.get_by_text("Vote cast successfully.")).to_be_visible()

        # 9. Take a final screenshot of the page with the updated vote count.
        page.screenshot(path="jules-scratch/verification/03_after_vote.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
