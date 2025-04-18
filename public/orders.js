document.addEventListener('DOMContentLoaded', function () {
	const logoutBtn = document.getElementById('logout-btn');
	const notification = document.getElementById('notification');
	const modal = document.getElementById('order-details-modal');
	const closeModal = document.querySelector('.close');
	let allOrders = [];

	loadOrders();

	logoutBtn.addEventListener('click', function (e) {
		e.preventDefault();
		logout();
	});

	closeModal.addEventListener('click', function () {
		modal.style.display = 'none';
	});

	window.addEventListener('click', function (e) {
		if (e.target === modal) {
			modal.style.display = 'none';
		}
	});

	// Обработчики фильтров
	const filters = {
		status: document.getElementById('status-filter'),
		delivery: document.getElementById('delivery-filter'),
		orderId: document.getElementById('order-id-search'),
		dateFrom: document.getElementById('date-from'),
		dateTo: document.getElementById('date-to'),
		sort: document.getElementById('sort-filter'),
	};

	Object.values(filters).forEach(element => {
		element.addEventListener('input', applyFiltersAndSort);
		element.addEventListener('change', applyFiltersAndSort);
	});

	function loadOrders() {
		fetch('/api/user-orders')
			.then(response => {
				if (!response.ok) {
					throw new Error('Ошибка загрузки заказов');
				}
				return response.json();
			})
			.then(orders => {
				allOrders = orders;
				applyFiltersAndSort();
			})
			.catch(error => {
				console.error('Ошибка:', error);
				document.getElementById('orders-list').innerHTML =
					'<div class="error">Не удалось загрузить заказы. Пожалуйста, попробуйте позже.</div>';
			});
	}

	const resetFiltersBtn = document.getElementById('reset-filters');
	resetFiltersBtn.addEventListener('click', function (e) {
		e.preventDefault();

		// Сброс всех значений фильтров
		filters.status.value = '';
		filters.delivery.value = '';
		filters.orderId.value = '';
		filters.dateFrom.value = '';
		filters.dateTo.value = '';
		filters.sort.value = '';

		// Применение сброшенных фильтров
		applyFiltersAndSort();
	});

	function applyFiltersAndSort() {
		let filteredOrders = [...allOrders];

		// Фильтр по номеру заказа
		const orderId = filters.orderId.value.trim();
		if (orderId) {
			filteredOrders = filteredOrders.filter(order =>
				order.id.toString().includes(orderId)
			);
		}

		// Фильтр по статусу
		const status = filters.status.value;
		if (status) {
			filteredOrders = filteredOrders.filter(order => order.status === status);
		}

		// Фильтр по способу доставки
		const delivery = filters.delivery.value;
		if (delivery) {
			filteredOrders = filteredOrders.filter(
				order => order.delivery_method.toLowerCase() === delivery.toLowerCase()
			);
		}

		// Фильтр по датам
		const dateFrom = filters.dateFrom.value
			? new Date(filters.dateFrom.value)
			: null;
		const dateTo = filters.dateTo.value ? new Date(filters.dateTo.value) : null;
		if (dateFrom) {
			filteredOrders = filteredOrders.filter(
				order => new Date(order.order_date) >= dateFrom
			);
		}
		if (dateTo) {
			// Устанавливаем конец дня для dateTo
			dateTo.setHours(23, 59, 59, 999);
			filteredOrders = filteredOrders.filter(
				order => new Date(order.order_date) <= dateTo
			);
		}

		// Сортировка
		const sort = filters.sort.value;
		if (sort) {
			filteredOrders.sort((a, b) => {
				if (sort === 'date-asc') {
					return new Date(a.order_date) - new Date(b.order_date);
				} else if (sort === 'date-desc') {
					return new Date(b.order_date) - new Date(a.order_date);
				} else if (sort === 'amount-asc') {
					return a.total_amount - b.total_amount;
				} else if (sort === 'amount-desc') {
					return b.total_amount - a.total_amount;
				} else if (sort === 'status-asc') {
					return a.status.localeCompare(b.status, 'en');
				} else if (sort === 'status-desc') {
					return b.status.localeCompare(a.status, 'en');
				}
				return 0;
			});
		}

		displayOrders(filteredOrders);
	}

	function displayOrders(orders) {
		const ordersList = document.getElementById('orders-list');

		if (orders.length === 0) {
			ordersList.innerHTML =
				'<div class="no-orders">Нет заказов, соответствующих фильтру</div>';
			return;
		}

		ordersList.innerHTML = '';

		orders.forEach(order => {
			const orderCard = document.createElement('div');
			orderCard.className = 'order-card';

			const orderDate = new Date(order.order_date);
			const formattedDate = orderDate.toLocaleDateString('ru-RU', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});

			let statusClass = 'status-pending';
			if (order.status.toLowerCase().includes('processing')) {
				statusClass = 'status-processing';
			} else if (order.status.toLowerCase().includes('delivered')) {
				statusClass = 'status-completed';
			} else if (order.status.toLowerCase().includes('cancelled')) {
				statusClass = 'status-cancelled';
			} else if (order.status.toLowerCase().includes('pending')) {
				statusClass = 'status-new';
			} else if (order.status.toLowerCase().includes('shipped')) {
				statusClass = 'status-shipped';
			}

			orderCard.innerHTML = `
                <div class="order-header">
                    <span class="order-id">Заказ #${order.id}</span>
                    <span class="order-date">${formattedDate}</span>
                </div>
                <div class="order-status ${statusClass}">${order.status}</div>
                <div class="order-summary">
                    <span class="order-total">${formatPrice(order.total_amount)}</span>
                    <button class="view-details" data-order-id="${
				order.id
			}">Подробнее</button>
                </div>
            `;

			ordersList.appendChild(orderCard);
		});

		document.querySelectorAll('.view-details').forEach(button => {
			button.addEventListener('click', function () {
				const orderId = this.getAttribute('data-order-id');
				showOrderDetails(orderId, allOrders);
			});
		});
	}

	function showOrderDetails(orderId, orders) {
		const order = orders.find(o => o.id == orderId);
		if (!order) return;

		const orderDate = new Date(order.order_date);
		const formattedDate = orderDate.toLocaleDateString('ru-RU', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});

		document.getElementById('order-id').textContent = order.id;
		document.getElementById('order-date').textContent = formattedDate;
		document.getElementById('order-status').textContent = order.status;
		document.getElementById('order-address').textContent = order.delivery_address;
		document.getElementById('order-delivery').textContent =
			translateDeliveryMethod(order.delivery_method);
		document.getElementById('order-total').textContent = formatPrice(
			order.total_amount
		);

		const itemsList = document.getElementById('order-items-list');
		itemsList.innerHTML = '';

		order.items.forEach(item => {
			const itemElement = document.createElement('div');
			itemElement.className = 'order-item';
			itemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="order-item-img">
                <div class="order-item-details">
                    <div class="order-item-title">${item.name}</div>
                    <div class="order-item-price">${formatPrice(item.price)}</div>
                    <div class="order-item-quantity">Количество: ${item.quantity}</div>
                    <div class="order-item-size">Размер: ${item.size || 'Не указан'}</div>
                </div>
            `;
			itemsList.appendChild(itemElement);
		});

		modal.style.display = 'block';
	}

	function translateDeliveryMethod(method) {
		const deliveryMethods = {
			courier: 'Курьер',
			pickup: 'Самовывоз',
			post: 'Почта',
			// Добавьте другие методы доставки, если они есть
		};
		return deliveryMethods[method.toLowerCase()] || method;
	}

	function logout() {
		fetch('/logout', {
			method: 'POST',
		})
			.then(() => {
				window.location.href = '/login';
			})
			.catch(error => {
				console.error('Ошибка:', error);
				showNotification('Ошибка выхода из системы', 'error');
			});
	}

	function showNotification(message, type) {
		notification.textContent = message;
		notification.className = 'notification ' + type;
		notification.style.display = 'block';

		setTimeout(() => {
			notification.style.display = 'none';
		}, 5000);
	}

	function formatPrice(price) {
		return new Intl.NumberFormat('ru-RU', {
			style: 'currency',
			currency: 'RUB',
			minimumFractionDigits: 0,
		}).format(price);
	}
});