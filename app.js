// Aemy Collective - Main Storefront Script (`app.js`)

let allCards = [];
let currentCartId = 'cart1';
// Multi-cart storage object
window.carts = {
    cart1: [],
    cart2: []
};
// Alias for compatibility with existing submission logic
window.cart = window.carts[currentCartId];

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzBBsuQuVcUrWm26hpSAXeRUXF7VqJCaOi3RdrbFLPRw06fq4H65QlBSF74aQYUPmmgDA/exec";

document.addEventListener('DOMContentLoaded', () => {
    loadInventoryAndCards();
    setupEventListeners();
});

// 1. Fetch and Load Inventory from Google Sheets / Apps Script
async function loadInventoryAndCards() {
    const catalogContainer = document.getElementById('card-catalog');
    catalogContainer.innerHTML = `<div class="loading-state">Loading card database from Google Sheets...</div>`;

    try {
        // Fetch inventory data from Google Apps Script (expects a doGet returning JSON array of cards)
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
            allCards = data;
        } else {
            throw new Error("No cards found or invalid format returned.");
        }
    } catch (error) {
        console.warn("Could not fetch live sheet data, falling back to sample catalog:", error);
        // Fallback sample card so your storefront is immediately interactive
        allCards = [
            {
                id: "BP01-01",
                name: "Camellya",
                type: "Character",
                character: "Camellya",
                rarity: "⭐⭐⭐⭐",
                cost: 3,
                stock: 10,
                price: 20.00,
                imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300",
                skill1: "Blossom Slash - Deals 3 damage.",
                skill2: "Crimson Waltz - Empower next attack.",
                skill3: "Flow State - Gain 1 energy."
            }
        ];
    }

    renderCatalog(allCards);
}

// 2. Render Cards into the Catalog Grid
function renderCatalog(cards) {
    const catalogContainer = document.getElementById('card-catalog');
    catalogContainer.innerHTML = '';

    if (cards.length === 0) {
        catalogContainer.innerHTML = `<div class="error-state">No cards match your filter criteria.</div>`;
        return;
    }

    cards.forEach(card => {
        const cardBox = document.createElement('div');
        cardBox.className = 'card-box';
        cardBox.onclick = (e) => {
            // Prevent opening modal if clicking input/button directly
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            openCardModal(card);
        };

        cardBox.innerHTML = `
            <img src="${card.imageUrl || 'https://via.placeholder.com/90x120?text=No+Image'}" alt="${card.name}" />
            <div class="card-info">
                <strong>${card.name} [${card.id}]</strong>
                <span>Type: ${card.type} | ${card.rarity}</span>
                <span style="color: var(--accent-gold); font-weight: 600;">$${Number(card.price).toFixed(2)}</span>
                <span>Stock: ${card.stock}</span>
                <div class="card-controls">
                    <input type="number" id="qty-${card.id}" class="quantity-input" value="1" min="1" max="${card.stock || 99}" />
                    <button class="add-btn" onclick="addToCart('${card.id}')">Add</button>
                </div>
            </div>
        `;
        catalogContainer.appendChild(cardBox);
    });
}

// 3. Filtering Logic
function applyFilters() {
    const charaQuery = document.getElementById('filter-chara').value.toLowerCase();
    const typeQuery = document.getElementById('filter-type').value;

    const filtered = allCards.filter(card => {
        const matchChara = card.name.toLowerCase().includes(charaQuery) || (card.character && card.character.toLowerCase().includes(charaQuery));
        const matchType = typeQuery === "" || card.type === typeQuery;
        return matchChara && matchType;
    });

    renderCatalog(filtered);
}

// 4. Cart & Deck Management
function switchCart(cartId) {
    currentCartId = cartId;
    window.cart = window.carts[currentCartId];
    updateCartUI();
}

function addToCart(cardId) {
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;

    const qtyInput = document.getElementById(`qty-${cardId}`);
    const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

    let cart = window.carts[currentCartId];
    const existingItem = cart.find(item => item.id === cardId);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ ...card, quantity });
    }

    window.cart = cart;
    updateCartUI();
}

function removeFromCart(cardId) {
    let cart = window.carts[currentCartId];
    window.carts[currentCartId] = cart.filter(item => item.id !== cardId);
    window.cart = window.carts[currentCartId];
    updateCartUI();
}

function updateCartUI() {
    const deckList = document.getElementById('deck-list');
    const deckTotalEl = document.getElementById('deck-total');
    let cart = window.carts[currentCartId];

    deckList.innerHTML = '';
    if (cart.length === 0) {
        deckList.innerHTML = `<li>Your deck is currently empty.</li>`;
        deckTotalEl.textContent = "0.00";
        return;
    }

    let grandTotal = 0;
    cart.forEach(item => {
        let itemTotal = item.price * item.quantity;
        grandTotal += itemTotal;

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="deck-item-left">
                <img src="${item.imageUrl || ''}" class="deck-item-thumb" />
                <span>${item.name} x${item.quantity}</span>
            </div>
            <div>
                <span style="color: var(--accent-gold); margin-right: 8px;">$${itemTotal.toFixed(2)}</span>
                <button class="remove-card-btn" onclick="removeFromCart('${item.id}')">X</button>
            </div>
        `;
        deckList.appendChild(li);
    });

    deckTotalEl.textContent = grandTotal.toFixed(2);
}

// 5. Modal Management
function openCardModal(card) {
    document.getElementById('modal-img').src = card.imageUrl || '';
    document.getElementById('modal-name').textContent = card.name;
    document.getElementById('modal-id').textContent = card.id;
    document.getElementById('modal-type').textContent = card.type;
    document.getElementById('modal-chara').textContent = card.character || card.name;
    document.getElementById('modal-rarity').textContent = card.rarity;
    document.getElementById('modal-cost').textContent = card.cost || 'N/A';
    document.getElementById('modal-stock').textContent = card.stock;
    document.getElementById('modal-price').textContent = `$${Number(card.price).toFixed(2)}`;

    document.getElementById('modal-skill1').textContent = card.skill1 || 'None';
    document.getElementById('modal-skill2').textContent = card.skill2 || 'None';
    document.getElementById('modal-skill3').textContent = card.skill3 || 'None';

    const modalAddBtn = document.getElementById('modal-add-btn');
    modalAddBtn.onclick = () => {
        addToCart(card.id);
        closeCardModal();
    };

    document.getElementById('card-modal').style.display = 'flex';
}

function closeCardModal() {
    document.getElementById('card-modal').style.display = 'none';
}

// 6. Event Listeners & Order Submission
function setupEventListeners() {
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', processOrderSubmission);
    }
}

function processOrderSubmission() {
    let customerNameInput = document.getElementById('customer-name');
    let customerName = customerNameInput ? customerNameInput.value.trim() || "Valued Collector" : "Valued Collector";
    
    let cart = window.carts[currentCartId];
    if (!cart || cart.length === 0) {
        alert("Your active deck/cart is empty! Add some cards before checking out.");
        return;
    }

    let orderSummary = `Hello Jun! My name is ${customerName}. I would like to place an order from Aemy Collective (${currentCartId}):\n`;
    
    let grandTotal = 0;
    cart.forEach(item => {
        let itemTotal = item.quantity * item.price;
        grandTotal += itemTotal;
        orderSummary += `\n - ${item.name} [${item.id}] (${item.rarity}) x${item.quantity} ($${item.price.toFixed(2)})`;
    });
    
    orderSummary += `\n\nEstimated Grand Total: $${grandTotal.toFixed(2)}`;
    
    // Send order data to Google Sheets backend
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderDetails: orderSummary, customer: customerName, cartId: currentCartId })
    }).catch(err => console.error("Sheets update error:", err));

    // Handle WhatsApp Redirection
    const chatCheckbox = document.getElementById('whatsapp-toggle') || document.querySelector('input[value="whatsapp"]'); 
    const useWhatsApp = chatCheckbox ? chatCheckbox.checked : true; 

    if (useWhatsApp) {
        const phoneNumber = "6580230844"; 
        const encodedMessage = encodeURIComponent(orderSummary);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    } else {
        alert("Order summary generated successfully!");
    }
}