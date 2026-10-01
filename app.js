// Aemy Collective - Main Storefront Script (`app.js`)

let allCards = [];
let currentCartId = 'cart1';
window.carts = {
    cart1: [],
    cart2: []
};
window.cart = window.carts[currentCartId];

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzBBsuQuVcUrWm26hpSAXeRUXF7VqJCaOi3RdrbFLPRw06fq4H65QlBSF74aQYUPmmgDA/exec";

document.addEventListener('DOMContentLoaded', () => {
    loadInventoryAndCards();
    setupEventListeners();
});

async function loadInventoryAndCards() {
    const catalogContainer = document.getElementById('card-catalog');
    catalogContainer.innerHTML = `<div class="loading-state">Loading card database from Google Sheets...</div>`;

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
            allCards = data;
        } else {
            throw new Error("No cards found or invalid format returned.");
        }
    } catch (error) {
        console.warn("Could not fetch live sheet data, falling back to sample catalog:", error);
        allCards = [
            {
                id: "BP01-01",
                name: "Camellya",
                type: "Character",
                character: "Camellya",
                rarity: "⭐⭐⭐⭐⭐",
                cost: 3,
                stock: 5,
                price: 2000.00,
                imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300",
                skill1: "Blossom Slash - Deals 3 damage.",
                skill2: "Crimson Waltz - Empower next attack.",
                skill3: "Flow State - Gain 1 energy."
            },
            {
                id: "BP01-01",
                name: "Camellya",
                type: "Character",
                character: "Camellya",
                rarity: "⭐⭐⭐⭐",
                cost: 3,
                stock: 5,
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

function renderCatalog(cards) {
    const catalogContainer = document.getElementById('card-catalog');
    catalogContainer.innerHTML = '';

    if (cards.length === 0) {
        catalogContainer.innerHTML = `<div class="error-state">No cards match your filter criteria.</div>`;
        return;
    }

    cards.forEach((card, index) => {
        const cardBox = document.createElement('div');
        cardBox.className = 'card-box';
        
        const isOutOfStock = !card.stock || Number(card.stock) <= 0;
        const uniqueKey = `${card.id}_${card.rarity}`.replace(/\s+/g, '_');

        cardBox.onclick = (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            openCardModal(card);
        };

        cardBox.innerHTML = `
            <img src="${card.imageUrl || 'https://via.placeholder.com/90x120?text=No+Image'}" alt="${card.name}" />
            <div class="card-info">
                <strong>${card.name} [${card.id}]</strong>
                <span>Type: ${card.type} | ${card.rarity}</span>
                <span style="color: var(--accent-gold); font-weight: 600;">$${Number(card.price).toFixed(2)}</span>
                <span style="color: ${isOutOfStock ? '#ff4d4d' : 'inherit'}; font-weight: ${isOutOfStock ? '700' : 'normal'};">
                    Stock: ${isOutOfStock ? 'Out of Stock' : card.stock}
                </span>
                <div class="card-controls">
                    <input type="number" id="qty-${uniqueKey}" class="quantity-input" value="${isOutOfStock ? 0 : 1}" min="1" max="${card.stock || 99}" ${isOutOfStock ? 'disabled' : ''} />
                    <button class="add-btn" onclick="addToCart('${card.id}', '${card.rarity}')" ${isOutOfStock ? 'disabled' : ''}>${isOutOfStock ? 'Sold Out' : 'Add'}</button>
                </div>
            </div>
        `;
        catalogContainer.appendChild(cardBox);
    });
}

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

function switchCart(cartId) {
    currentCartId = cartId;
    window.cart = window.carts[currentCartId];
    updateCartUI();
}

function addToCart(cardId, rarity) {
    const card = allCards.find(c => c.id === cardId && c.rarity === rarity);
    if (!card || !card.stock || Number(card.stock) <= 0) return;

    const uniqueKey = `${card.id}_${card.rarity}`;
    const qtyInput = document.getElementById(`qty-${uniqueKey.replace(/\s+/g, '_')}`);
    const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

    let cart = window.carts[currentCartId];
    const existingItem = cart.find(item => item.id === cardId && item.rarity === rarity);

    const currentQtyInCart = existingItem ? existingItem.quantity : 0;
    const maxStock = Number(card.stock) || 99;

    if (currentQtyInCart + quantity > maxStock) {
        alert(`Cannot add more. Only ${maxStock} left in stock for this rarity!`);
        return;
    }

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ ...card, uniqueKey, quantity });
    }

    window.cart = cart;
    updateCartUI();
}

function updateItemQuantity(uniqueKey, change) {
    let cart = window.carts[currentCartId];
    const item = cart.find(i => i.uniqueKey === uniqueKey);
    
    if (!item) return;

    const card = allCards.find(c => c.id === item.id && c.rarity === item.rarity);
    const maxStock = card ? Number(card.stock) || 99 : 99;

    let newQty = item.quantity + change;

    if (newQty <= 0) {
        removeFromCart(uniqueKey);
        return;
    }

    if (newQty > maxStock) {
        alert(`Reached maximum available stock (${maxStock}) for this item.`);
        return;
    }

    item.quantity = newQty;
    window.cart = cart;
    updateCartUI();
}

function removeFromCart(uniqueKey) {
    let cart = window.carts[currentCartId];
    window.carts[currentCartId] = cart.filter(item => item.uniqueKey !== uniqueKey);
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
        let itemPrice = Number(item.price) || 0;
        let itemTotal = itemPrice * item.quantity;
        grandTotal += itemTotal;

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="deck-item-left">
                <img src="${item.imageUrl || ''}" class="deck-item-thumb" />
                <span>${item.name} [${item.rarity}]</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <button onclick="updateItemQuantity('${item.uniqueKey}', -1)" style="padding: 2px 6px; background: #273043; color: #fff; border: none; cursor: pointer; border-radius: 4px;">-</button>
                <span style="font-weight: bold; min-width: 20px; text-align: center;">${item.quantity}</span>
                <button onclick="updateItemQuantity('${item.uniqueKey}', 1)" style="padding: 2px 6px; background: #273043; color: #fff; border: none; cursor: pointer; border-radius: 4px;">+</button>
                <span style="color: var(--accent-gold); margin-left: 6px; margin-right: 6px;">$${itemTotal.toFixed(2)}</span>
                <button class="remove-card-btn" onclick="removeFromCart('${item.uniqueKey}')" title="Remove item">X</button>
            </div>
        `;
        deckList.appendChild(li);
    });

    deckTotalEl.textContent = grandTotal.toFixed(2);
}

function openCardModal(card) {
    const isOutOfStock = !card.stock || Number(card.stock) <= 0;

    document.getElementById('modal-img').src = card.imageUrl || '';
    document.getElementById('modal-name').textContent = card.name;
    document.getElementById('modal-id').textContent = card.id;
    document.getElementById('modal-type').textContent = card.type;
    document.getElementById('modal-chara').textContent = card.character || card.name;
    document.getElementById('modal-rarity').textContent = card.rarity;
    document.getElementById('modal-cost').textContent = card.cost || 'N/A';
    
    const stockEl = document.getElementById('modal-stock');
    stockEl.textContent = isOutOfStock ? 'Out of Stock' : card.stock;
    stockEl.style.color = isOutOfStock ? '#ff4d4d' : 'var(--text-main)';

    document.getElementById('modal-price').textContent = `$${Number(card.price).toFixed(2)}`;

    document.getElementById('modal-skill1').textContent = card.skill1 || 'None';
    document.getElementById('modal-skill2').textContent = card.skill2 || 'None';
    document.getElementById('modal-skill3').textContent = card.skill3 || 'None';

    const modalAddBtn = document.getElementById('modal-add-btn');
    if (isOutOfStock) {
        modalAddBtn.textContent = 'Sold Out';
        modalAddBtn.disabled = true;
        modalAddBtn.style.background = '#273043';
        modalAddBtn.style.color = 'var(--text-muted)';
        modalAddBtn.style.cursor = 'not-allowed';
    } else {
        modalAddBtn.textContent = 'Add to Active Deck';
        modalAddBtn.disabled = false;
        modalAddBtn.style.background = '';
        modalAddBtn.style.color = '';
        modalAddBtn.style.cursor = 'pointer';
        modalAddBtn.onclick = () => {
            addToCart(card.id, card.rarity);
            closeCardModal();
        };
    }

    document.getElementById('card-modal').style.display = 'flex';
}

function closeCardModal() {
    document.getElementById('card-modal').style.display = 'none';
}

function setupEventListeners() {
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', processOrderSubmission);
    }
}

function processOrderSubmission() {
    try {
        let customerNameInput = document.getElementById('customer-name');
        let customerName = customerNameInput ? customerNameInput.value.trim() || "Valued Collector" : "Valued Collector";
        
        let cart = window.carts[currentCartId];
        if (!cart || cart.length === 0) {
            alert("Your active deck/cart is empty! Add some cards before checking out.");
            return;
        }

        const checkedChannels = Array.from(document.querySelectorAll('input[name="contact_pref"]:checked')).map(el => el.value);

        if (checkedChannels.length === 0) {
            alert("Please select at least one preferred communication channel (Telegram, WhatsApp, or Carousell).");
            return;
        }

        if (checkedChannels.length > 1) {
            alert("Please select only ONE preferred communication channel to checkout smoothly.");
            return;
        }

        const selectedChannel = checkedChannels[0];

        let orderSummary = `Hello Jun! My name is ${customerName}. I would like to place an order from Aemy Collective (${currentCartId}):\n`;
        let grandTotal = 0;
        
        cart.forEach(item => {
            let itemPrice = Number(item.price) || 0;
            let itemTotal = itemPrice * item.quantity;
            grandTotal += itemTotal;
            orderSummary += `\n - ${item.name} [${item.id}] (${item.rarity}) x${item.quantity} ($${itemPrice.toFixed(2)})`;
        });
        
        orderSummary += `\n\nEstimated Grand Total: $${grandTotal.toFixed(2)}`;

        // Send structured order payload to Google Sheets backend using text/plain to bypass no-cors restrictions
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ 
                customer: customerName, 
                cartId: currentCartId, 
                channel: selectedChannel,
                cartItems: cart 
            })
        }).catch(err => console.error("Sheets update error:", err));

        alert("Order successful! Redirecting to your chat channel...");

        const encodedMessage = encodeURIComponent(orderSummary);

        if (selectedChannel === 'telegram') {
            const telegramUsername = "JunHoliday"; 
            window.open(`https://t.me/${telegramUsername}?text=${encodedMessage}`, '_blank');
        } else if (selectedChannel === 'whatsapp') {
            const phoneNumber = "6580230844"; 
            window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
        } else if (selectedChannel === 'carousell') {
            navigator.clipboard.writeText(orderSummary).then(() => {
                alert("Order summary copied to clipboard! Paste it into our Carousell chat.");
            }).catch(err => console.error("Failed to copy text: ", err));
            
            window.open("https://www.carousell.sg/p/wuthering-waves-duel-tcg-singles-or-deck-making-services-1463207064/", '_blank');
        }
    } catch (error) {
        console.error("Critical error in processOrderSubmission:", error);
        alert("An error occurred: " + error.message);
    }
}

function submitGeneralRequest() {
    const contactInput = document.getElementById('req-name-contact').value.trim();
    const contentInput = document.getElementById('req-content').value.trim();

    if (!contentInput) {
        alert("Please enter your request or feedback before submitting.");
        return;
    }

    const requestPayload = {
        type: "feedback",
        nameContact: contactInput || "Anonymous Rover",
        feedback: contentInput
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(requestPayload)
    }).catch(err => console.error("Feedback sheets update error:", err));

    alert("Feedback sent!");
    
    document.getElementById('req-name-contact').value = '';
    document.getElementById('req-content').value = '';
}