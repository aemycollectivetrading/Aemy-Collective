from tkinter import messagebox, scrolledtext, Tk, ttk
import requests

# Set your admin password matching what you configured in app.py
ADMIN_PASSWORD = "Phobi4_chupi!"
BACKEND_URL = "http://127.0.0.1:5000/api/admin/get-orders"


def fetch_and_display_orders():
  # Clear the receipt text area
  receipt_box.delete("1.0", "end")

  try:
    # Send password to your Flask backend to securely fetch orders
    response = requests.post(BACKEND_URL, json={"password": ADMIN_PASSWORD})
    data = response.json()

    if response.status_code != 200 or data.get("status") != "success":
      messagebox.showerror(
          "Access Denied",
          data.get("message", "Failed to connect or invalid password."),
      )
      return

    orders = data.get("orders", [])
    items = data.get("items", [])

    if not orders:
      receipt_box.insert("end", "No orders found in the database.")
      return

    # Format and build receipt style output for each order
    for order in orders:
      order_id = order.get("order_id")
      timestamp = order.get("timestamp")
      user_name = order.get("user_name")
      total_price = order.get("total_price")
      status = order.get("status")

      receipt_text = f"====================================\n"
      receipt_text += f" ORDER RECEIPT: {order_id}\n"
      receipt_text += f"====================================\n"
      receipt_text += f" Date/Time : {timestamp}\n"
      receipt_text += f" Customer  : {user_name}\n"
      receipt_text += f" Status    : {status}\n"
      receipt_text += f"------------------------------------\n"
      receipt_text += f" ITEMS ORDERED:\n"

      # Filter line items belonging to this specific order_id
      order_specific_items = [
          i for i in items if str(i.get("order_id")) == str(order_id)
      ]

      if not order_specific_items:
        receipt_text += f" (No line items recorded)\n"
      else:
        for item in order_specific_items:
          name = item.get("card_name")
          rarity = item.get("card_rarity")
          price = item.get("price")
          receipt_text += f" • {name} ({rarity}) - ${float(price):.2f}\n"

      receipt_text += f"------------------------------------\n"
      receipt_text += f" TOTAL PRICE: ${float(total_price):.2f}\n"
      receipt_text += f"====================================\n\n\n"

      receipt_box.insert("end", receipt_text)

  except Exception as e:
    messagebox.showerror(
        "Connection Error",
        "Could not reach Flask server. Is app.py running?",
    )


# --- GUI WINDOW SETUP (Dark Cyber Theme to match your web app) ---
root = Tk()
root.title("Aemy Collective - Fulfillment Receipt Viewer")
root.geometry("600x700")
root.configure(bg="#121214")

# Title Header
title_label = ttk.Label(
    root, text="Fulfillment Receipt Viewer", font=("Segoe UI", 16, "bold")
)
title_label.pack(pady=15)

# Refresh Button
refresh_btn = ttk.Button(
    root, text="🔄 Fetch / Refresh Orders", command=fetch_and_display_orders
)
refresh_btn.pack(pady=5)

# Receipt Display Box (Scrolled Text Area styled dark)
receipt_box = scrolledtext.ScrolledText(
    root,
    width=65,
    height=32,
    bg="#1a1a1e",
    fg="#e1e1e6",
    insertbackground="white",
    font=("Consolas", 10),
)
receipt_box.pack(padx=20, pady=15, fill="both", expand=True)

# Run the app window loop
root.mainloop()