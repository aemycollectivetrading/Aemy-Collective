import json
import re
import gspread
from google.oauth2.service_account import Credentials

def clean_jsonc(filepath):
    """Reads a JSONC file, strips out comments, and parses it into Python dictionaries."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove multi-line comments /* ... */
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    # Remove single-line comments // ...
    content = re.sub(r'^\s*//.*$', '', content, flags=re.MULTILINE)
    
    return json.loads(content)

def import_cards_to_sheet():
    print("Connecting to Google Sheets...")
    
    # Setup authentication using your existing service account
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = Credentials.from_service_account_file("credentials.json", scopes=scope)
    client = gspread.authorize(creds)
    
    try:
        # Open your master spreadsheet and select the Inventory tab
        # (Make sure "Aemy Collective Master Sheet" matches your exact Google Sheet name)
        spreadsheet = client.open("Aemy Collective Database")
        sheet = spreadsheet.worksheet("Inventory")
    except Exception as e:
        print(f"Error opening sheet: {e}")
        print("Tip: Make sure the sheet name is correct and shared with your service account email!")
        return

    print("Parsing cards.jsonc...")
    try:
        cards = clean_jsonc("cards.jsonc")
    except Exception as e:
        print(f"Error parsing cards.jsonc syntax: {e}")
        return

    if not cards:
        print("No cards found in cards.jsonc.")
        return

    # Extract column headers dynamically from the first card object keys
    headers = list(cards[0].keys())
    rows = [headers]  # First row is the header row
    
    # Populate data rows
    for card in cards:
        row = [card.get(header, "") for header in headers]
        rows.append(row)

    print(f"Uploading {len(cards)} cards to the 'Inventory' sheet...")
    
    # Clear old data and write the new catalog matrix
    sheet.clear()
    sheet.update(rows)
    
    print("✅ Successfully imported your entire card database into Google Sheets!")

if __name__ == "__main__":
    import_cards_to_sheet()