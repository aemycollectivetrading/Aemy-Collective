import sqlite3
import tkinter as tk
from tkinter import ttk, messagebox
import datetime

# Optional: Import gspread if you want live Google Sheet sync enabled
try:
    import gspread
    from google.oauth2.service_account import Credentials
    GOOGLE_SYNC_ENABLED = True
except ImportError:
    GOOGLE_SYNC_ENABLED = False

class AemyMasterDashboard:
    def __init__(self, root):
        self.root = root
        self.root.title("Aemy Collective | Master Command Dashboard")
        self.root.geometry("1100x700")
        self.root.configure(bg="#09090c")

        # Initialize Local SQLite Database
        self.init_db()

        # UI Styling Configuration
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("Treeview", 
                        background="#121217", 
                        foreground="#f3f3f7", 
                        fieldbackground="#121217", 
                        bordercolor="#db91af", 
                        rowheight=25)
        style.configure("Treeview.Heading", 
                        background="#18181f", 
                        foreground="#d4af37", 
                        font=('Helvetica', 10, 'bold'))
        
        self.create_widgets()
        self.load_orders()
        self.update_analytics()

    def init_db(self):
        """Initializes the local SQLite database for orders and losses."""
        self.conn = sqlite3.connect("aemy_master.db")
        self.cursor = self.conn.cursor()
        
        # Orders Table
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                order_id TEXT PRIMARY KEY,
                collector_name TEXT,
                contact_info TEXT,
                total_price REAL,
                status TEXT,
                date TEXT
            )
        ''')
        
        # Expenses / Losses Table for P&L
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT,
                amount REAL,
                date TEXT
            )
        ''')
        self.conn.commit()

    def create_widgets(self):
        """Builds the dashboard layout tabs and widgets."""
        # Top Header Title
        title_frame = tk.Frame(self.root, bg="#121217", pady=15, padx=20)
        title_frame.pack(fill="x")
        
        title_label = tk.Label(title_frame, text="⚡ AEMY COLLECTIVE: COMMAND DASHBOARD", font=("Helvetica", 16, "bold"), fg="#00e5ff", bg="#121217")
        title_label.pack(side="left")

        # Notebook (Tabs)
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill="both", expand=True, padx=15, pady=10)

        self.tab_orders = tk.Frame(notebook, bg="#09090c")
        self.tab_analytics = tk.Frame(notebook, bg="#09090c")
        self.tab_manual = tk.Frame(notebook, bg="#09090c")

        notebook.add(self.tab_orders, text="📦 Order Receipts & Status")
        notebook.add(self.tab_analytics, text="📊 Revenue & P&L Analytics")
        notebook.add(self.tab_manual, text="➕ Create Manual Order")

        # --- TAB 1: ORDER MANAGEMENT ---
        orders_frame = tk.Frame(self.tab_orders, bg="#09090c", padx=10, pady=10)
        orders_frame.pack(fill="both", expand=True)

        columns = ("Order ID", "Collector", "Contact", "Total ($)", "Status", "Date")
        self.tree = ttk.Treeview(orders_frame, columns=columns, show="headings", height=15)
        
        for col in columns:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=150, anchor="center")
        
        self.tree.pack(side="left", fill="both", expand=True)
        
        scrollbar = ttk.Scrollbar(orders_frame, orient="vertical", command=self.tree.yview)
        scrollbar.pack(side="right", fill="y")
        self.tree.configure(yscrollcommand=scrollbar.set)

        # Status Update Control Panel (Fixed typo from 'paux' to 'padx')
        control_panel = tk.Frame(self.tab_orders, bg="#121217", padx=10, pady=10)
        control_panel.pack(fill="x", padx=10, pady=10)

        tk.Label(control_panel, text="Change Status of Selected Order:", fg="#f3f3f7", bg="#121217", font=("Helvetica", 10, "bold")).pack(side="left", padx=5)
        
        for status_text, color in [("Completed", "#25d366"), ("Pending", "#ff9900"), ("Sold", "#ff4d4d"), ("Cancelled", "#ff4d4d")]:
            btn = tk.Button(control_panel, text=status_text, bg=color, fg="#000", font=("Helvetica", 9, "bold"),
                            command=lambda s=status_text: self.update_order_status(s))
            btn.pack(side="left", padx=5)

        # --- TAB 2: REVENUE & P&L ANALYTICS ---
        analytics_frame = tk.Frame(self.tab_analytics, bg="#09090c", padx=20, pady=20)
        analytics_frame.pack(fill="both", expand=True)

        self.lbl_revenue = tk.Label(analytics_frame, text="Total Revenue (Completed): $0.00", font=("Helvetica", 14, "bold"), fg="#25d366", bg="#09090c")
        self.lbl_revenue.pack(anchor="w", pady=5)

        self.lbl_losses = tk.Label(analytics_frame, text="Total Sourcing Losses / Expenses: $0.00", font=("Helvetica", 14, "bold"), fg="#ff4d4d", bg="#09090c")
        self.lbl_losses.pack(anchor="w", pady=5)

        self.lbl_net = tk.Label(analytics_frame, text="Net Profit / Loss: $0.00", font=("Helvetica", 16, "bold"), fg="#d4af37", bg="#09090c")
        self.lbl_net.pack(anchor="w", pady=15)

        # Expense Entry Sub-section
        exp_box = tk.LabelFrame(analytics_frame, text=" Log Operational / Card Sourcing Loss ", fg="#00e5ff", bg="#121217", font=("Helvetica", 11, "bold"), padx=15, pady=15)
        exp_box.pack(fill="x", pady=10)

        tk.Label(exp_box, text="Description (e.g., Bulk Card Sourcing / Shipping):", fg="#f3f3f7", bg="#121217").pack(anchor="w")
        self.exp_desc_entry = tk.Entry(exp_box, width=40)
        self.exp_desc_entry.pack(anchor="w", pady=5)

        tk.Label(exp_box, text="Amount ($):", fg="#f3f3f7", bg="#121217").pack(anchor="w")
        self.exp_amt_entry = tk.Entry(exp_box, width=20)
        self.exp_amt_entry.pack(anchor="w", pady=5)

        tk.Button(exp_box, text="Record Loss / Expense", bg="#d4af37", fg="#000", font=("Helvetica", 10, "bold"), command=self.add_expense).pack(anchor="w", pady=5)

        # --- TAB 3: MANUAL ORDER CREATION ---
        manual_frame = tk.Frame(self.tab_manual, bg="#09090c", padx=20, pady=20)
        manual_frame.pack(fill="both", expand=True)

        tk.Label(manual_frame, text="Create Manual Order (for direct chat customers)", font=("Helvetica", 12, "bold"), fg="#00e5ff", bg="#09090c").pack(anchor="w", pady=5)

        tk.Label(manual_frame, text="Collector Name:", fg="#f3f3f7", bg="#09090c").pack(anchor="w")
        self.man_name_entry = tk.Entry(manual_frame, width=30)
        self.man_name_entry.pack(anchor="w", pady=5)

        tk.Label(manual_frame, text="Contact (@handle or phone):", fg="#f3f3f7", bg="#09090c").pack(anchor="w")
        self.man_contact_entry = tk.Entry(manual_frame, width=30)
        self.man_contact_entry.pack(anchor="w", pady=5)

        tk.Label(manual_frame, text="Total Price ($):", fg="#f3f3f7", bg="#09090c").pack(anchor="w")
        self.man_price_entry = tk.Entry(manual_frame, width=20)
        self.man_price_entry.pack(anchor="w", pady=5)

        tk.Button(manual_frame, text="Generate Order & Reference ID", bg="#25d366", fg="#000", font=("Helvetica", 10, "bold"), command=self.create_manual_order).pack(anchor="w", pady=15)

    def load_orders(self):
        """Loads orders from SQLite into the GUI table with color tags."""
        for row in self.tree.get_children():
            self.tree.delete(row)

        self.cursor.execute("SELECT order_id, collector_name, contact_info, total_price, status, date FROM orders")
        for row in self.cursor.fetchall():
            order_id, name, contact, price, status, date = row
            tag = status.lower()
            self.tree.insert("", "end", values=(order_id, name, contact, f"${price:.2f}", status, date), tags=(tag,))

        # Configure color tags for statuses
        self.tree.tag_configure("completed", foreground="#25d366")
        self.tree.tag_configure("pending", foreground="#ff9900")
        self.tree.tag_configure("sold", foreground="#ff4d4d")
        self.tree.tag_configure("cancelled", foreground="#ff4d4d")

    def update_order_status(self, new_status):
        """Updates the status of the selected order in SQLite."""
        selected_item = self.tree.selection()
        if not selected_item:
            messagebox.showwarning("Selection Error", "Please select an order from the list first.")
            return

        item_values = self.tree.item(selected_item, "values")
        order_id = item_values[0]

        self.cursor.execute("UPDATE orders SET status = ? WHERE order_id = ?", (new_status, order_id))
        self.conn.commit()
        
        self.load_orders()
        self.update_analytics()
        messagebox.showinfo("Success", f"Order {order_id} status updated to {new_status}!")

    def create_manual_order(self):
        """Creates a manual order with a generated reference ID."""
        import random, string
        name = self.man_name_entry.get().strip()
        contact = self.man_contact_entry.get().strip()
        price_str = self.man_price_entry.get().strip()

        if not name or not contact or not price_str:
            messagebox.showerror("Input Error", "Please fill out all fields.")
            return

        try:
            price = float(price_str)
        except ValueError:
            messagebox.showerror("Input Error", "Price must be a valid number.")
            return

        order_id = "AEMY-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

        self.cursor.execute("INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?)", (order_id, name, contact, price, "Pending", date_str))
        self.conn.commit()

        self.load_orders()
        self.update_analytics()
        messagebox.showinfo("Order Created", f"Generated Reference ID: {order_id}\nShare this with your customer!")
        
        self.man_name_entry.delete(0, tk.END)
        self.man_contact_entry.delete(0, tk.END)
        self.man_price_entry.delete(0, tk.END)

    def add_expense(self):
        """Records a loss/expense item for P&L tracking."""
        desc = self.exp_desc_entry.get().strip()
        amt_str = self.exp_amt_entry.get().strip()

        if not desc or not amt_str:
            messagebox.showerror("Input Error", "Please enter description and amount.")
            return

        try:
            amt = float(amt_str)
        except ValueError:
            messagebox.showerror("Input Error", "Amount must be a valid number.")
            return

        date_str = datetime.datetime.now().strftime("%Y-%m-%d")
        self.cursor.execute("INSERT INTO expenses (description, amount, date) VALUES (?, ?, ?)", (desc, amt, date_str))
        self.conn.commit()

        self.update_analytics()
        messagebox.showinfo("Success", "Loss/Expense recorded successfully!")
        self.exp_desc_entry.delete(0, tk.END)
        self.exp_amt_entry.delete(0, tk.END)

    def update_analytics(self):
        """Calculates revenue from completed sales and deducts recorded losses."""
        self.cursor.execute("SELECT SUM(total_price) FROM orders WHERE status = 'Completed'")
        rev_result = self.cursor.fetchone()[0]
        total_revenue = rev_result if rev_result else 0.0

        self.cursor.execute("SELECT SUM(amount) FROM expenses")
        exp_result = self.cursor.fetchone()[0]
        total_losses = exp_result if exp_result else 0.0

        net_profit = total_revenue - total_losses

        self.lbl_revenue.config(text=f"Total Revenue (Completed): ${total_revenue:.2f}")
        self.lbl_losses.config(text=f"Total Sourcing Losses / Expenses: ${total_losses:.2f}")
        
        if net_profit >= 0:
            self.lbl_net.config(text=f"Net Profit: ${net_profit:.2f}", fg="#25d366")
        else:
            self.lbl_net.config(text=f"Net Loss: ${net_profit:.2f}", fg="#ff4d4d")

if __name__ == "__main__":
    root = tk.Tk()
    app = AemyMasterDashboard(root)
    root.mainloop()