// Replace with your deployed Google Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbzBBsuQuVcUrWm26hpSAXeRUXF7VqJCaOi3RdrbFLPRw06fq4H65QlBSF74aQYUPmmgDA/exec';

let cardCatalog = [];
let activeCartId = 'cart1';
let carts = {
    cart1: [],
    cart2: []
};

document.addEventListener('DOMContentLoaded', () => {
    fetchInventory();
});

/**
 * Fetches the live card catalog from your Google Sheet Web App API
 */
function fetchInventory() {
    const catalogContainer = document.getElementById('card-catalog');
    if (catalogContainer) {
        catalogContainer.innerHTML = `<div class="loading-state">Loading card database from Google Sheets...</div>`;
    }

    fetch(API_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            cardCatalog = data.map((card, index) => ({
                ...card,
                unique_key: `${card.card_id}_${card.card_rarity}_${index}`,
                card_price: parseFloat(card.card_price) || 0.0,
                stock: parseInt(card.stock, 10) || 0,
                card_skill1: card.card_skill1 || card.card_skill_1 || card.skill_1 || card.Skill_1 || '',
                card_skill2: card.card_skill2 || card.card_skill_2 || card.skill_2 || card.Skill_2 || '',
                card_skill3: card.card_skill3 || card.card_skill_3 || card.skill_3 || card.Skill_3 || ''
            }));
            renderCatalog(cardCatalog);
        })
        .catch(error => {
            console.error('Error fetching inventory:', error);
            if (catalogContainer) {
                catalogContainer.innerHTML = `<div class="error-state">Failed to load card database. Please check your Web App URL.</div>`;
            }
        });
}

/**
 * Renders the catalog grid (Side-by-side layout: Image left, description right)
 */
function renderCatalog(cards) {
    const container = document.getElementById('card-catalog');
    if (!container) return;

    container.innerHTML = '';

    if (cards.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; text-align: center;">No cards match your filter criteria.</p>`;
        return;
    }

    cards.forEach(card => {
        const cardBox = document.createElement('div');
        cardBox.className = 'card-box';
        
        const isOutOfStock = card.stock <= 0;

        cardBox.innerHTML = `
            <img src="${card.card_image}" alt="${card.card_name}" onerror="this.src='images/placeholder.webp'">
            <div class="card-info">
                <strong style="font-size: 15px;">${card.card_name}</strong>
                <span style="font-size: 11px;">ID: ${card.card_id} | Type: ${card.card_type}</span>
                <span style="font-size: 11px;">Chara: ${card.card_chara} | Rarity: ${card.card_rarity}</span>
                <span style="color: var(--accent-gold); font-weight: 600; font-size: 13px;">$${card.card_price.toFixed(2)}</span>
                <span style="color: ${isOutOfStock ? '#ff4d4d' : '#00ffaa'}; font-size: 11px;">
                    ${isOutOfStock ? 'Out of Stock' : `Stock: ${card.stock}`}
                </span>
                <div class="card-controls" onclick="event.stopPropagation()">
                    <input type="number" class="quantity-input" id="qty-${card.unique_key}" value="1" min="1" max="${card.stock > 0 ? card.stock : 1}" ${isOutOfStock ? 'disabled' : ''}>
                    <button class="add-btn" onclick="addCardToDeck('${card.unique_key}')" ${isOutOfStock ? 'disabled' : ''}>
                        ${isOutOfStock ? 'Sold Out' : 'Add to Deck'}
                    </button>
                </div>
            </div>
        `;

        cardBox.addEventListener('click', () => openCardModal(card.unique_key));
        container.appendChild(cardBox);
    });
}

/**
 * Opens the card detail modal popup
 */
function openCardModal(uniqueKey) {
    const card = cardCatalog.find(c => c.unique_key === uniqueKey);
    if (!card) return;

    document.getElementById('modal-img').src = card.card_image;
    document.getElementById('modal-name').textContent = card.card_name;
    document.getElementById('modal-id').textContent = card.card_id;
    document.getElementById('modal-type').textContent = card.card_type;
    document.getElementById('modal-chara').textContent = card.card_chara;
    document.getElementById('modal-rarity').textContent = card.card_rarity;
    document.getElementById('modal-cost').textContent = card.card_costlevel !== undefined ? card.card_costlevel : '-';
    document.getElementById('modal-stock').textContent = card.stock;
    document.getElementById('modal-price').textContent = `$${card.card_price.toFixed(2)}`;
    
    const setSkillRow = (elementId, containerId, skillText) => {
        const containerEl = document.getElementById(containerId);
        const textEl = document.getElementById(elementId);
        if (skillText && skillText.trim() !== '') {
            textEl.textContent = skillText;
            containerEl.style.display = 'block';
        } else {
            containerEl.style.display = 'none';
        }
    };

    setSkillRow('modal-skill1', 'row-skill1', card.card_skill1);
    setSkillRow('modal-skill2', 'row-skill2', card.card_skill2);
    setSkillRow('modal-skill3', 'row-skill3', card.card_skill3);

    const addBtn = document.getElementById('modal-add-btn');
    if (card.stock <= 0) {
        addBtn.textContent = 'Sold Out';
        addBtn.disabled = true;
        addBtn.style.opacity = '0.5';
    } else {
        addBtn.textContent = 'Add to Active Deck';
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
        addBtn.onclick = () => {
            addCardToDeck(card.unique_key);
            closeCardModal();
        };
    }

    document.getElementById('card-modal').style.display = 'flex';
}

function closeCardModal() {
    document.getElementById('card-modal').style.display = 'none';
}

window.addEventListener('click', (e) => {
    const modal = document.getElementById('card-modal');
    if (e.target === modal) {
        closeCardModal();
    }
});

/**
 * Filters the card catalog
 */
function applyFilters() {
    const charaQuery = document.getElementById('filter-chara').value.toLowerCase().trim();
    const typeQuery = document.getElementById('filter-type').value;

    const filteredCards = cardCatalog.filter(card => {
        const matchesChara = !charaQuery || (card.card_chara && card.card_chara.toLowerCase().includes(charaQuery));
        const matchesType = !typeQuery || (card.card_type && card.card_type === typeQuery);
        return matchesChara && matchesType;
    });

    renderCatalog(filteredCards);
}

function switchCart(cartId) {
    activeCartId = cartId;
    updateCartUI();
}

/**
 * Adds or increases card quantity in the active deck
 */
function addCardToDeck(uniqueKey) {
    const card = cardCatalog.find(c => c.unique_key === uniqueKey);
    if (!card) return;

    const qtyInput = document.getElementById(`qty-${uniqueKey}`);
    const quantityToAdd = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;

    const currentCart = carts[activeCartId];
    const existingItem = currentCart.find(item => item.unique_key === uniqueKey);

    const currentQtyInCart = existingItem ? existingItem.quantity : 0;
    if (currentQtyInCart + quantityToAdd > card.stock) {
        alert("Cannot add more than available stock limit.");
        return;
    }

    if (existingItem) {
        existingItem.quantity += quantityToAdd;
    } else {
        currentCart.push({ ...card, quantity: quantityToAdd });
    }

    updateCartUI();
}

/**
 * Changes quantity by +1 or -1 directly inside the cart
 */
function updateCartItemQuantity(uniqueKey, change) {
    const currentCart = carts[activeCartId];
    const existingItem = currentCart.find(item => item.unique_key === uniqueKey);
    if (!existingItem) return;

    const card = cardCatalog.find(c => c.unique_key === uniqueKey);
    const newQty = existingItem.quantity + change;

    if (newQty > card.stock) {
        alert("Cannot exceed available stock limit.");
        return;
    }

    if (newQty <= 0) {
        // Remove item entirely if quantity drops to 0 or below
        carts[activeCartId] = currentCart.filter(item => item.unique_key !== uniqueKey);
    } else {
        existingItem.quantity = newQty;
    }

    updateCartUI();
}

/**
 * Updates the UI list and total price with + and - controls
 */
function updateCartUI() {
    const deckListEl = document.getElementById('deck-list');
    const deckTotalEl = document.getElementById('deck-total');
    
    if (!deckListEl) return;

    deckListEl.innerHTML = '';
    const currentCart = carts[activeCartId];

    if (currentCart.length === 0) {
        deckListEl.innerHTML = `<li>Your deck is currently empty.</li>`;
        if (deckTotalEl) deckTotalEl.textContent = '0.00';
        return;
    }

    let total = 0;

    currentCart.forEach(item => {
        const itemTotal = item.card_price * item.quantity;
        total += itemTotal;

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="deck-item-left">
                <img src="${item.card_image}" class="deck-item-thumb" onerror="this.src='images/placeholder.webp'">
                <div>
                    <strong>${item.card_name}</strong> <span style="color: var(--accent-gold); font-size: 10px;">(${item.card_rarity})</span><br>
                    <span style="color: var(--text-muted);">${item.card_id}</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: var(--accent-gold); margin-right: 4px; font-size: 12px;">$${itemTotal.toFixed(2)}</span>
                <button onclick="updateCartItemQuantity('${item.unique_key}', -1)" style="background: var(--bg-base); color: var(--text-main); border: 1px solid var(--border-accent); border-radius: 3px; width: 20px; height: 20px; cursor: pointer; font-weight: bold;">-</button>
                <span style="font-size: 12px; width: 14px; text-align: center;">${item.quantity}</span>
                <button onclick="updateCartItemQuantity('${item.unique_key}', 1)" style="background: var(--bg-base); color: var(--text-main); border: 1px solid var(--border-accent); border-radius: 3px; width: 20px; height: 20px; cursor: pointer; font-weight: bold;">+</button>
            </div>
        `;
        deckListEl.appendChild(li);
    });

    if (deckTotalEl) {
        deckTotalEl.textContent = total.toFixed(2);
    }
}

/**
 * Handles the direct order submission flow via chat
 */
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'checkout-btn') {
        submitUserOrder();
    }
});

function submitUserOrder() {
    const currentCart = carts[activeCartId];
    if (currentCart.length === 0) {
        alert("Your deck/cart is empty!");
        return;
    }

    const customerName = document.getElementById('customer-name').value.trim();
    if (!customerName) {
        alert("Please enter your Collector Name before submitting your order.");
        return;
    }

    let orderSummary = `Hello Jun! My name is ${customerName}. I would like to place an order from Aemy Collective (${activeCartId}):\n\n`;
    let grandTotal = 0;

    currentCart.forEach(item => {
        const itemTotal = item.card_price * item.quantity;
        grandTotal += itemTotal;
        orderSummary += `- ${item.card_name} [${item.card_id}] (${item.card_rarity}) x${item.quantity} ($${itemTotal.toFixed(2)})\n`;
    });

    orderSummary += `\nEstimated Grand Total: $${grandTotal.toFixed(2)}`;

    console.log(orderSummary);
    alert("Order summary generated! Check console or connect your chat handler redirect.");
}