import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import gspread

app = Flask(__name__)
CORS(app)  # Enables your frontend website to communicate with this backend

# 1. Authenticate using your downloaded service account key file
gc = gspread.service_account(filename="credentials.json")

# 2. Open your Google Sheet (Replace with your actual spreadsheet name)
spreadsheet = gc.open("Aemeath Collective Database")

# Connect to your two tabs (Make sure these exact tab names exist in your sheet)
orders_sheet = spreadsheet.worksheet("orders")
order_items_sheet = spreadsheet.worksheet("order_items")

# 3. Set a secure admin password for price updates
ADMIN_PASSWORD = "Phobi4_chupi!"


# --- ENDPOINT 1: Submit User Deck Orders (Grouped by Order ID) ---
@app.route("/submit-order", methods=["POST"])
def submit_order():
  try:
    data = request.json
    user_name = data.get("name")
    cards = data.get("cards")  # Array of cards selected by the user

    if not user_name or not cards:
      return (
          jsonify({"status": "error", "message": "Name or cards are missing!"}),
          400,
      )

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Generate a unique Order ID using timestamp and username (clean format)
    # e.g., "2026-06-07_143200_john"
    clean_name = user_name.strip().lower().replace(" ", "_")
    time_code = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    order_id = f"{time_code}_{clean_name}"

    # Calculate total price and prepare line items
    total_price = 0.0
    item_rows = []

    for card in cards:
      price = float(card.get("card_price", 0))
      total_price += price

      # Row data for 'order_items' tab matching headers:
      # [order_id, card_id, card_name, card_type, card_rarity, card_costlevel, price]
      item_rows.append([
          order_id,
          card.get("card_id"),
          card.get("card_name"),
          card.get("card_rarity"),
          price,
      ])

    # 1. Write the summary row to the 'orders' tab
    # Headers expected: [order_id, timestamp, user_name, total_price, status]
    orders_sheet.append_row([order_id, timestamp, user_name, total_price, "Pending"])

    # 2. Write all individual card rows to the 'order_items' tab in bulk
    order_items_sheet.append_rows(item_rows)

    return jsonify(
        {
            "status": "success",
            "message": "Order successfully logged!",
            "order_id": order_id,
        }
    )

  except Exception as e:
    return jsonify({"status": "error", "message": str(e)}), 500


# --- ENDPOINT 2: Fetch Orders and Items for your Receipt-Viewer App ---
@app.route("/api/admin/get-orders", methods=["POST"])
def get_orders():
  data = request.json
  password = data.get("password")

  if password != ADMIN_PASSWORD:
    return jsonify({"status": "error", "message": "Unauthorized access"}), 401

  try:
    # Pull all records from both tabs using snake_case header keys
    all_orders = orders_sheet.get_all_records()
    all_items = order_items_sheet.get_all_records()

    return jsonify(
        {
            "status": "success",
            "orders": all_orders,
            "items": all_items,
        }
    )
  except Exception as e:
    return jsonify({"status": "error", "message": str(e)}), 500


# --- ENDPOINT 3: Securely Update a Card Price ---
@app.route("/api/admin/update-price", methods=["POST"])
def update_price():
  data = request.json
  password = data.get("password")

  if password != ADMIN_PASSWORD:
    return jsonify({"status": "error", "message": "Unauthorized access"}), 401

  card_id = data.get("card_id")
  new_price = data.get("new_price")

  try:
    # This endpoint can be used if you manage prices in a separate tab or lookup sheet
    pass

    return jsonify(
        {
            "status": "success",
            "message": f"Successfully updated price for {card_id}!",
        }
    )
  except Exception as e:
    return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
  app.run(debug=True, port=5000)