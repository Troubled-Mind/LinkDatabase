import csv
import json
import os
import re
import requests
import subprocess
import time
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("ENCORA_API_KEY")
remote = os.getenv("RCLONE_REMOTE", "Musicals")
output_dir = os.getenv("OUTPUT_DIR", "./data")
rclone_config = os.getenv("RCLONE_CONFIG", "./data/rclone.conf")


def fetch_gdrive_links(remote=remote, output_dir=output_dir):
    print(f"🔍 Fetching GDrive folder list from remote: {remote}")
    os.makedirs(output_dir, exist_ok=True)

    collection_path = os.path.join(output_dir, "collection.json")
    with open(collection_path, "r", encoding="utf-8") as f:
        collection = json.load(f)

    result = subprocess.run([
        "rclone", "lsjson", "--config", rclone_config, "--recursive", f"{remote}:"
    ], stdout=subprocess.PIPE, check=True)
    items = json.loads(result.stdout.decode("utf-8"))
    print(f"📦 Total items fetched from rclone: {len(items)}")

    e_pattern = re.compile(r"\\{e-(\\d+)}")
    ne_pattern = re.compile(r"\\{ne}")

    link_map = {}
    ne_entries = []

    for item in items:
        if item.get("IsDir"):
            folder_name = item["Name"]
            folder_id = item["ID"]
            url = f"https://drive.google.com/drive/folders/{folder_id}"

            e_match = e_pattern.search(folder_name)
            ne_match = ne_pattern.search(folder_name)

            if e_match:
                encora_id = int(e_match.group(1))
                link_map[encora_id] = url
            elif ne_match:
                ne_entries.append({
                    "share_link": url,
                    "source_path": item["Path"],
                    "source_folder": folder_name
                })

    print(f"🔗 Matched {len(link_map)} GDrive links")
    print(f"🆕 Found {len(ne_entries)} {{ne}} folders")

    updated = 0
    for item in collection:
        recording_id = item.get("recording", {}).get("id")
        if recording_id in link_map:
            item["share_link"] = link_map[recording_id]
            updated += 1

    print(f"✅ Injected share_link into {updated} recordings")

    for ne_item in ne_entries:
        collection.append({
            "recording": None,
            "share_link": ne_item["share_link"],
            "source_path": ne_item["source_path"],
            "source_folder": ne_item["source_folder"]
        })

    with open(collection_path, "w", encoding="utf-8") as f:
        json.dump(collection, f, indent=2, ensure_ascii=False)

    print(f"💾 Final collection written with {len(collection)} entries total")


def fetch_encora_collection(api_key, per_page=500):
    print("🔑 Fetching Encora collection from API...")
    base_url = "https://encora.it/api/collection"
    headers = {"Authorization": f"Bearer {api_key}"}
    params = {"per_page": per_page}

    results = []
    next_url = base_url
    page = 1

    while next_url:
        print(f"🌐 Requesting page {page}...")
        response = requests.get(next_url, headers=headers, params=params)
        if response.status_code == 429:
            retry_after = int(response.headers.get("RetryAfter", 5))
            print(f"⏳ Rate limit hit. Waiting {retry_after}s...")
            time.sleep(retry_after)
            continue
        elif not response.ok:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            break

        data = response.json()
        batch = data.get("data", [])
        results.extend(batch)

        next_url = data.get("next_page_url")
        if next_url:
            next_url = re.sub(r"per_page=\d+", f"per_page={per_page}", next_url)
        page += 1

    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "collection.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"✅ Encora collection saved to {output_file} ({len(results)} items)")


# Run both fetchers
fetch_encora_collection(api_key)
fetch_gdrive_links()
