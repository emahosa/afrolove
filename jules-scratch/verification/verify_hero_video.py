import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Login as admin
        page.goto("http://127.0.0.1:8080/admin/login")
        page.get_by_label("Email").fill("ellaadahosa@gmail.com")
        page.get_by_label("Password").fill("password")
        page.get_by_role("button", name="Login").click()

        # Wait for navigation to the admin dashboard
        expect(page).to_have_url(re.compile(r"/admin$"))
        print("Admin login successful.")

        # 2. Navigate to Content Management
        page.get_by_role("link", name="Content").click()
        expect(page.get_by_role("heading", name="Content Management"))
        print("Navigated to Content Management.")

        # 3. Upload the hero video
        # The input is hidden, so we need to use set_input_files on the underlying input element
        # The label "Video File (MP4)" is associated with the input.
        video_input = page.locator('label:has-text("Video File (MP4)")').locator('..').locator('input[type="file"]')

        # Set the file to upload
        video_input.set_files("jules-scratch/verification/dummy.mp4")

        # Click the upload button
        page.get_by_role("button", name="Upload Video").click()

        # Wait for the success toast message
        expect(page.get_by_text("Hero video uploaded and setting updated successfully!")).to_be_visible()
        print("Video upload successful.")

        # 4. Navigate to the user dashboard to verify
        page.goto("http://127.0.0.1:8080/")

        # 5. Check for the video element
        # The hero section should now have a video element with a supabase storage URL
        hero_video = page.locator(".relative.w-full.h-\\[60vh\\] video")

        # Wait for the video element to be visible and have a src attribute
        expect(hero_video).to_be_visible(timeout=10000)
        video_src = hero_video.get_attribute("src")

        assert video_src is not None, "Video element should have a src attribute"
        assert "supabase" in video_src, f"Video src should be a supabase URL, but it is {video_src}"
        print(f"Hero video found with src: {video_src}")

        # 6. Take a screenshot
        page.screenshot(path="jules-scratch/verification/hero_section_after_upload.png")
        print("Screenshot taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
