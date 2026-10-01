import requests

# Simulate a mock order payload coming from a frontend user
test_data = {
    "name": "Test User",
    "cards": [{
        "card_id": "BP01-51",
        "card_name": "Vining Ronde",
        "card_rarity": "⭐⭐",
        "card_price": 1.0,
    }],
}

# Send the request to your locally running app.py server
response = requests.post("http://127.0.0.1:5000/submit-order", json=test_data)

print("Server Response:", response.json())