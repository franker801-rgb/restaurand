const DB_URL = "https://restaurant-807d1-default-rtdb.firebaseio.com/";

const categories = {
    "Fast Food": ["Burgers", "Pizzas", "French Fries", "Sandwiches", "Noodle", "Manchurian", "Momos", "Pasta", "Tikka", "Dhosa"],
    "Traditional Food": ["Daal", "Rice", "Bread", "Palak Paneer", "Mater Paneer", "Mix Veg"],
    "Drinks": ["Water", "Tea", "Coffee", "Coldrink", "Lassi", "Sake"]
};

let menu = [];
let cart = [];
let orders = [];

// --- Firebase Sync Functions ---
async function fetchMenu() {
    const res = await fetch(`${DB_URL}/menu.json`);
    const data = await res.json();
    menu = data ? Object.values(data) : [];
    renderMenu();
}

async function fetchOrders() {
    const res = await fetch(`${DB_URL}/orders.json`);
    const data = await res.json();
    orders = data ? Object.values(data) : [];
    updateDotStatus();
}

// --- Login Logic ---
function loginUser() {
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    if(name.trim() !== "" && phone.trim() !== "") {
        localStorage.setItem('shubhamUser', JSON.stringify({name, phone}));
        checkLogin();
    } else { alert("Please enter Name and Phone number"); }
}

function checkLogin() {
    const user = JSON.parse(localStorage.getItem('shubhamUser'));
    if(user) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('welcome-msg').innerHTML = `Namaste, ${user.name} <span class="edit-icon" onclick="editProfile()">✏️</span>`;
        fetchMenu();
        fetchOrders();
    }
}

function editProfile() {
    const user = JSON.parse(localStorage.getItem('shubhamUser'));
    document.getElementById('cust-name').value = user.name;
    document.getElementById('cust-phone').value = user.phone;
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
}

// --- Menu Functions ---
function filterByMainCat(mainCat) {
    const bar = document.getElementById('sub-category-bar');
    bar.innerHTML = categories[mainCat].map(sub => 
        `<button class="sub-btn" onclick="filterBySub('${sub}')">${sub}</button>`
    ).join('');
    const filtered = menu.filter(item => item.mainCategory === mainCat);
    renderMenu(filtered);
}

function filterBySub(sub) {
    const filtered = menu.filter(item => item.subCategory === sub);
    renderMenu(filtered);
}

function renderMenu(itemsToDisplay = menu) {
    if(itemsToDisplay === menu) document.getElementById('sub-category-bar').innerHTML = "";
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = itemsToDisplay.map(item => `
        <div class="food-card ${item.available ? '' : 'unavailable'}">
            <img src="${item.image}">
            <div style="padding:15px; text-align:center;">
                <h4 style="margin:0">${item.name}</h4>
                <p style="color:var(--accent); font-weight:bold;">₹${item.price}</p>
                <button onclick="addToCart(${item.id})" class="add-btn" ${item.available ? '' : 'disabled'} style="width:100%; padding:8px; border-radius:20px; border:none; background:var(--dark); color:white; cursor:pointer;">
                    ${item.available ? 'Add to Cart' : 'Sold Out'}
                </button>
            </div>
        </div>
    `).join('');
}

// --- Admin Functions ---
function updateAdminSubOptions() {
    const main = document.getElementById('main-cat-select').value;
    const subSelect = document.getElementById('sub-cat-select');
    if(main) subSelect.innerHTML = categories[main].map(s => `<option value="${s}">${s}</option>`).join('');
}

async function saveNewItem() {
    const name = document.getElementById('food-name').value;
    const price = document.getElementById('food-price').value;
    const mainCat = document.getElementById('main-cat-select').value;
    const subCat = document.getElementById('sub-cat-select').value;
    const imgFile = document.getElementById('food-img').files[0];

    if(name && price && imgFile && mainCat) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const id = Date.now();
            const newItem = { id, name, price, mainCategory: mainCat, subCategory: subCat, image: e.target.result, available: true };
            await fetch(`${DB_URL}/menu/${id}.json`, { method: 'PUT', body: JSON.stringify(newItem) });
            alert("Item Added!");
            fetchMenu(); renderAdmin();
        };
        reader.readAsDataURL(imgFile);
    } else { alert("All fields are required!"); }
}

// --- Cart & Orders ---
function addToCart(id) {
    const item = menu.find(m => m.id === id);
    cart.push(item);
    updateCartUI();
}

function updateCartUI() {
    const list = document.getElementById('cart-items');
    let total = 0;
    list.innerHTML = cart.map((it, idx) => {
        total += parseInt(it.price);
        return `<div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:5px;">
            <span>${it.name}</span>
            <span>₹${it.price} <button onclick="cart.splice(${idx},1); updateCartUI();" style="color:red; border:none; background:none; cursor:pointer">×</button></span>
        </div>`;
    }).join('');
    document.getElementById('grand-total').innerText = total;
}

async function placeOrder() {
    if(cart.length === 0) return alert("Please select items first!");
    const mode = document.querySelector('input[name="orderMode"]:checked').value;
    const user = JSON.parse(localStorage.getItem('shubhamUser'));
    const id = Date.now();
    const order = { id, customer: user.name, phone: user.phone, items: cart.map(i => i.name).join(', '), total: document.getElementById('grand-total').innerText, mode, status: 'Preparing' };
    
    await fetch(`${DB_URL}/orders/${id}.json`, { method: 'PUT', body: JSON.stringify(order) });
    alert("Order Successful!");
    cart = []; updateCartUI(); fetchOrders();
}

async function showSection(s) {
    document.getElementById('home-section').style.display = (s === 'home' ? 'block' : 'none');
    document.getElementById('admin-section').style.display = (s === 'admin' ? 'block' : 'none');
    document.getElementById('user-orders-section').style.display = 'none';
    if(s === 'admin') { await fetchOrders(); renderAdmin(); }
}

async function showMyOrders() {
    await fetchOrders();
    document.getElementById('home-section').style.display = 'none';
    document.getElementById('admin-section').style.display = 'none';
    document.getElementById('user-orders-section').style.display = 'block';
    const user = JSON.parse(localStorage.getItem('shubhamUser'));
    const myOrders = orders.filter(o => o.customer === user.name && o.phone === user.phone);
    const list = document.getElementById('my-orders-list');
    list.innerHTML = myOrders.length ? myOrders.map(o => `
        <div style="background:#f9f9f9; padding:15px; margin-bottom:10px; border-radius:10px; border-left:5px solid ${o.status === 'Completed' ? '#27ae60' : '#ff9f43'}">
            <strong>Status: ${o.status}</strong><br>Items: ${o.items}<br>Total: ₹${o.total}
        </div>
    `).reverse().join('') : "<p>No orders yet.</p>";
}

function updateDotStatus() {
    const user = JSON.parse(localStorage.getItem('shubhamUser'));
    if(!user) return;
    const myOrders = orders.filter(o => o.customer === user.name && o.phone === user.phone);
    const dot = document.getElementById('status-dot');
    const hasPreparing = myOrders.some(o => o.status === 'Preparing');
    const hasCompleted = myOrders.some(o => o.status === 'Completed');
    dot.className = "dot";
    if(hasPreparing) dot.classList.add('preparing');
    else if (hasCompleted) dot.classList.add('completed');
}

function renderAdmin() {
    const list = document.getElementById('admin-menu-list');
    list.innerHTML = `<h4>Current Menu</h4>` + menu.map(m => `
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; padding:8px; border-bottom:1px solid #eee;">
            <span>${m.name}</span>
            <div>
                <button onclick="toggleStatus(${m.id})">${m.available ? 'Avl' : 'Unavl'}</button>
                <button onclick="deleteItem(${m.id})" style="color:red;">Del</button>
            </div>
        </div>
    `).join('');

    const oList = document.getElementById('admin-orders');
    oList.innerHTML = `<h4>Live Orders</h4>` + orders.map(o => `
        <div style="background:#f9f9f9; padding:8px; margin-bottom:5px; font-size:0.75rem; border-left:3px solid var(--accent);">
            <strong>${o.customer} (${o.phone})</strong> - <b>${o.mode}</b><br>
            <span style="color:${o.status==='Completed'?'green':'orange'}">${o.status}</span><br>
            ${o.items}<br>Total: ₹${o.total}
            ${o.status === 'Preparing' ? `<br><button class="confirm-btn" onclick="confirmOrder(${o.id})">Mark Completed</button>` : ''}
        </div>
    `).reverse().join('');
}

async function confirmOrder(id) {
    await fetch(`${DB_URL}/orders/${id}/status.json`, { method: 'PUT', body: JSON.stringify("Completed") });
    fetchOrders(); renderAdmin();
}

async function toggleStatus(id) {
    const item = menu.find(m => m.id === id);
    await fetch(`${DB_URL}/menu/${id}/available.json`, { method: 'PUT', body: JSON.stringify(!item.available) });
    fetchMenu(); renderAdmin();
}

async function deleteItem(id) {
    await fetch(`${DB_URL}/menu/${id}.json`, { method: 'DELETE' });
    fetchMenu(); renderAdmin();
}

checkLogin();