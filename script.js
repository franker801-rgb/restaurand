const DB_URL = "https://restaurant-807d1-default-rtdb.firebaseio.com/";

const categories = {
    "Fast Food": ["Burgers", "Pizzas", "French Fries", "Sandwiches", "Noodle", "Manchurian", "Momos", "Pasta", "Tikka", "Dhosa"],
    "Traditional Food": ["Daal", "Rice", "Bread", "Palak Paneer", "Mater Paneer", "Mix Veg"],
    "Drinks": ["Water", "Tea", "Coffee", "Coldrink", "Lassi", "Sake"]
};

let menu = [];
let cart = [];
let orders = [];

async function fetchMenu() {
    try {
        const res = await fetch(`${DB_URL}/menu.json`);
        const data = await res.json();
        menu = data ? Object.keys(data).map(key => data[key]) : [];
        renderMenu();
    } catch (err) { console.error("Menu error", err); }
}

async function fetchOrders() {
    try {
        const res = await fetch(`${DB_URL}/orders.json`);
        const data = await res.json();
        orders = data ? Object.keys(data).map(key => data[key]) : [];
        updateDotStatus();
    } catch (err) { console.error("Order error", err); }
}

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
        document.getElementById('welcome-msg').innerHTML = `Hi, ${user.name} <span class="edit-icon" onclick="editProfile()">✏️</span>`;
        fetchMenu(); fetchOrders();
    }
}

function editProfile() {
    const user = JSON.parse(localStorage.getItem('shubhamUser'));
    document.getElementById('cust-name').value = user.name;
    document.getElementById('cust-phone').value = user.phone;
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
}

function renderMenu(itemsToDisplay = menu) {
    const grid = document.getElementById('menu-grid');
    if(!itemsToDisplay || itemsToDisplay.length === 0) {
        grid.innerHTML = "<p style='text-align:center; width:100%;'>No items.</p>";
        return;
    }
    grid.innerHTML = itemsToDisplay.map(item => `
        <div class="food-card ${item.available ? '' : 'unavailable'}">
            <img src="${item.image}">
            <div style="padding:10px; text-align:center;">
                <h5 style="margin:0; font-size:0.9rem;">${item.name}</h5>
                <p style="color:var(--accent); font-weight:bold; margin:5px 0;">₹${item.price}</p>
                <button onclick="addToCart(${item.id})" class="add-btn" ${item.available ? '' : 'disabled'} style="width:100%; padding:6px; border-radius:20px; border:none; background:var(--dark); color:white; cursor:pointer; font-size:0.75rem;">
                    ${item.available ? 'Add' : 'Sold'}
                </button>
            </div>
        </div>
    `).join('');
}

function filterByMainCat(mainCat) {
    const bar = document.getElementById('sub-category-bar');
    bar.innerHTML = categories[mainCat].map(sub => `<button class="sub-btn" onclick="filterBySub('${sub}')">${sub}</button>`).join('');
    renderMenu(menu.filter(item => item.mainCategory === mainCat));
}

function filterBySub(sub) { renderMenu(menu.filter(item => item.subCategory === sub)); }

function addToCart(id) {
    const item = menu.find(m => m.id === id);
    if(item) { cart.push(item); updateCartUI(); }
}

function updateCartUI() {
    const list = document.getElementById('cart-items');
    let total = 0;
    list.innerHTML = cart.map((it, idx) => {
        total += parseInt(it.price);
        return `<div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:5px; border-bottom:1px solid #eee;">
            <span>${it.name}</span>
            <span>₹${it.price} <button onclick="cart.splice(${idx},1); updateCartUI();" style="color:red; border:none; background:none;">×</button></span>
        </div>`;
    }).join('');
    document.getElementById('grand-total').innerText = total;
}

async function placeOrder() {
    if(cart.length === 0) return alert("Select items!");
    const mode = document.querySelector('input[name="orderMode"]:checked').value;
    const user = JSON.parse(localStorage.getItem('shubhamUser'));
    const id = Date.now();
    const order = { id, customer: user.name, phone: user.phone, items: cart.map(i => i.name).join(', '), total: document.getElementById('grand-total').innerText, mode, status: 'Preparing' };
    await fetch(`${DB_URL}/orders/${id}.json`, { method: 'PUT', body: JSON.stringify(order) });
    alert("Ordered!"); cart = []; updateCartUI(); fetchOrders();
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
    document.getElementById('my-orders-list').innerHTML = myOrders.length ? myOrders.map(o => `
        <div style="background:#f9f9f9; padding:10px; margin-bottom:10px; border-radius:10px; border-left:5px solid ${o.status === 'Completed' ? '#27ae60' : '#ff9f43'}">
            <strong>${o.status}</strong><br>${o.items}<br>₹${o.total}
        </div>
    `).reverse().join('') : "<p>No orders.</p>";
}

function updateDotStatus() {
    const user = JSON.parse(localStorage.getItem('shubhamUser'));
    const dot = document.getElementById('status-dot');
    if(!user || !dot) return;
    const myOrders = orders.filter(o => o.customer === user.name && o.phone === user.phone);
    dot.className = "dot " + (myOrders.some(o => o.status === 'Preparing') ? 'preparing' : (myOrders.some(o => o.status === 'Completed') ? 'completed' : ''));
}

function renderAdmin() {
    document.getElementById('admin-menu-list').innerHTML = `<h4>Menu</h4>` + menu.map(m => `
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; padding:5px; border-bottom:1px solid #eee;">
            <span>${m.name}</span>
            <div><button onclick="toggleStatus(${m.id})">${m.available?'Avl':'Unavl'}</button></div>
        </div>
    `).join('');
    document.getElementById('admin-orders').innerHTML = `<h4>Orders</h4>` + orders.map(o => `
        <div style="background:#f9f9f9; padding:5px; margin-bottom:5px; font-size:0.7rem; border-left:3px solid var(--accent);">
            <strong>${o.customer}</strong> (${o.phone})<br>${o.items}<br>₹${o.total}
            ${o.status === 'Preparing' ? `<button class="confirm-btn" onclick="confirmOrder(${o.id})">Done</button>` : ''}
        </div>
    `).reverse().join('');
}

async function updateAdminSubOptions() {
    const main = document.getElementById('main-cat-select').value;
    if(main) document.getElementById('sub-cat-select').innerHTML = categories[main].map(s => `<option value="${s}">${s}</option>`).join('');
}

async function saveNewItem() {
    const name = document.getElementById('food-name').value;
    const price = document.getElementById('food-price').value;
    const mainCat = document.getElementById('main-cat-select').value;
    const subCat = document.getElementById('sub-cat-select').value;
    const imgFile = document.getElementById('food-img').files[0];
    if(name && price && imgFile && mainCat) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const id = Date.now();
            await fetch(`${DB_URL}/menu/${id}.json`, { method: 'PUT', body: JSON.stringify({id, name, price, mainCategory: mainCat, subCategory: subCat, image: e.target.result, available: true}) });
            fetchMenu();
        };
        reader.readAsDataURL(imgFile);
    }
}

async function confirmOrder(id) { await fetch(`${DB_URL}/orders/${id}/status.json`, { method: 'PUT', body: JSON.stringify("Completed") }); fetchOrders(); setTimeout(renderAdmin, 500); }
async function toggleStatus(id) { const item = menu.find(m => m.id === id); await fetch(`${DB_URL}/menu/${id}/available.json`, { method: 'PUT', body: JSON.stringify(!item.available) }); fetchMenu(); setTimeout(renderAdmin, 500); }

checkLogin();