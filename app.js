// Aemy Collective - Main Storefront Script (`app.js`)

document.addEventListener('DOMContentLoaded', () => {
    // Initialize storefront state
    loadInventoryAndCards();
    setupEventListeners();
});

// Mock or dynamic data loaders for catalog and card database
function loadInventoryAndCards() {
    // Add your initialization logic for rendering cards from the "Card Database" folder here
    console.log("Aemy Collective storefront initialized successfully.");
}

function setupEventListeners() {
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', processOrderSubmission);
    }
}

// Main order processing and submission handler
function processOrderSubmission() {
    // Gather cart items, customer details, and build summary
    let customerNameInput = document.getElementById('customer-name');
    let customerName = customerNameInput ? customerNameInput.value || "Valued Customer" : "Valued Customer";
    
    let orderSummary = `Hello Jun! My name is ${customerName}. I would like to place an order from Aemy Collective:\n`;
    
    // Example items loop (replace or hook into your existing cart array logic)
    let cartItems = window.cart || [
        { name: "Camellya [BP01-01]", rarity: "⭐⭐⭐⭐", quantity: 1, price: 20.00 }
    ];
    
    let grandTotal = 0;
    cartItems.forEach(item => {
        let itemTotal = item.quantity * item.price;
        grandTotal += itemTotal;
        orderSummary += `\n - ${item.name} (${item.rarity}) x${item.quantity} ($${item.price.toFixed(2)})`;
    });
    
    orderSummary += `\n\nEstimated Grand Total: $${grandTotal.toFixed(2)}`;
    
    console.log(orderSummary);

    // 1. Send order data to your Google Sheets backend Web App URL
    // Replace with your actual deployed Google Apps Script Web App URL
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzBBsuQuVcUrWm26hpSAXeRUXF7VqJCaOi3RdrbFLPRw06fq4H65QlBSF74aQYUPmmgDA/exec"; 
    
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderDetails: orderSummary })
    }).catch(err => console.error("Sheets update error:", err));

    // 2. Check the chat option / tickbox and handle redirection
    // Ensure the ID matches the checkbox element in your index.html
    const chatCheckbox = document.getElementById('whatsapp-toggle') || document.getElementById('chat-toggle'); 
    const useWhatsApp = chatCheckbox ? chatCheckbox.checked : true; 

    if (useWhatsApp) {
        // Replace with your business phone number including country code (e.g., 65XXXXXXXX)
        const phoneNumber = "6580230844"; 
        const encodedMessage = encodeURIComponent(orderSummary);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
    } else {
        alert("Order summary generated successfully!");
    }
}