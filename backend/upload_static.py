import os
import boto3
import mimetypes
import re
from botocore.config import Config

# Import your existing environment variables
import env

# --- CONFIGURATION ---
# We use the existing credentials from env.py
R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY
R2_ENDPOINT_URL = env.R2_ENDPOINT_URL

# These are specific to the static assets deployment
# You can also add these to backend/env.py if you prefer
R2_STATIC_BUCKET = os.environ.get('R2_STATIC_BUCKET', 'static')
R2_STATIC_DOMAIN = os.environ.get('R2_STATIC_DOMAIN', '').rstrip('/')

# Local path where Vite builds the files (relative to this script in backend/)
BUILD_DIR = os.path.join(os.path.dirname(__file__), "static")

def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_URL,
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )

def upload_files():
    """Recursively uploads all files in BUILD_DIR to R2."""
    s3 = get_s3_client()
    print(f"--- Starting upload to bucket: {R2_STATIC_BUCKET} ---")
    
    if not os.path.exists(BUILD_DIR):
        print(f"Error: Build directory {BUILD_DIR} not found. Did you run 'npm run build'?")
        return

    for root, dirs, files in os.walk(BUILD_DIR):
        for file in files:
            local_path = os.path.join(root, file)
            # The key in R2 should be relative to the BUILD_DIR
            relative_path = os.path.relpath(local_path, BUILD_DIR)
            
            content_type, _ = mimetypes.guess_type(local_path)
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Special case for .js modules
            if file.endswith('.js'):
                content_type = 'application/javascript'

            print(f"Uploading {relative_path} ({content_type})...")
            
            # Set Cache-Control based on file type
            # Hashed assets in /assets can be cached forever
            # index.html and root SVGs should always be revalidated (no-cache)
            if relative_path == "index.html" or not relative_path.startswith("assets/"):
                cache_control = "no-cache, no-store, must-revalidate"
            else:
                # 1 year cache for hashed assets
                cache_control = "public, max-age=31536000, immutable"

            with open(local_path, "rb") as f:
                s3.put_object(
                    Bucket=R2_STATIC_BUCKET,
                    Key=relative_path,
                    Body=f,
                    ContentType=content_type,
                    CacheControl=cache_control
                )

def modify_asset_paths():
    """
    Searches and replaces root-relative paths (/assets/, /vite.svg, etc.)
     with the CDN domain in HTML, JS, and CSS files.
    """
    if not R2_STATIC_DOMAIN:
        print("--- R2_STATIC_DOMAIN not set. Skipping path modification. ---")
        return

    print(f"--- Modifying asset paths to use domain: {R2_STATIC_DOMAIN} ---")
    
    patterns = [
        (re.compile(r'([\'"])/assets/'), rf'\1{R2_STATIC_DOMAIN}/assets/'),
        (re.compile(r'([\'"])/vite\.svg'), rf'\1{R2_STATIC_DOMAIN}/vite.svg'),
        (re.compile(r'([\'"])/test\.svg'), rf'\1{R2_STATIC_DOMAIN}/test.svg'),
        (re.compile(r'src="/'), f'src="{R2_STATIC_DOMAIN}/'),
        (re.compile(r'href="/'), f'href="{R2_STATIC_DOMAIN}/'),
    ]

    for root, dirs, files in os.walk(BUILD_DIR):
        for file in files:
            if file.endswith(('.html', '.js', '.css')):
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for pattern, replacement in patterns:
                    new_content = pattern.sub(replacement, new_content)
                
                if new_content != content:
                    print(f"Updated paths in {file}")
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)

if __name__ == "__main__":
    if not all([R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT_URL]):
        print("Error: R2 credentials missing in backend/env.py")
    else:
        # 1. Modify the local files first
        modify_asset_paths()
        # 2. Upload the modified files
        upload_files()
        print("--- Static deployment complete! ---")
