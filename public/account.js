document.addEventListener('DOMContentLoaded', function () {
	// Элементы интерфейса
	const menuItems = document.querySelectorAll('.account-menu li')
	const tabContents = document.querySelectorAll('.tab-content')
	const profileForm = document.getElementById('profile-form')
	const passwordForm = document.getElementById('password-form')
	const logoutBtn = document.getElementById('logout-btn')
	const notification = document.getElementById('notification')
	const modal = document.getElementById('order-details-modal')
	const closeModal = document.querySelector('.close')

	// Загрузка данных пользователя
	loadUserData()

	// Загрузка заказов
	loadOrders()

	// Переключение между вкладками
	menuItems.forEach(item => {
		item.addEventListener('click', function () {
			// Удаляем активный класс у всех элементов меню
			menuItems.forEach(i => i.classList.remove('active'))
			// Добавляем активный класс текущему элементу
			this.classList.add('active')

			// Скрываем все вкладки
			tabContents.forEach(content => content.classList.remove('active'))
			// Показываем выбранную вкладку
			const tabId = this.getAttribute('data-tab') + '-tab'
			document.getElementById(tabId).classList.add('active')
		})
	})

	// Обработка формы профиля
	profileForm.addEventListener('submit', function (e) {
		e.preventDefault()

		const formData = {
			name: document.getElementById('name').value,
			surname: document.getElementById('surname').value,
			email: document.getElementById('email').value,
		}

		updateProfile(formData)
	})

	// Обработка формы смены пароля
	passwordForm.addEventListener('submit', function (e) {
		e.preventDefault()

		const currentPassword = document.getElementById('current-password').value
		const newPassword = document.getElementById('new-password').value
		const confirmPassword = document.getElementById('confirm-password').value

		if (newPassword !== confirmPassword) {
			showNotification('Новый пароль и подтверждение не совпадают', 'error')
			return
		}

		changePassword(currentPassword, newPassword)
	})

	// Выход из аккаунта
	logoutBtn.addEventListener('click', function (e) {
		e.preventDefault()
		logout()
	})

	// Закрытие модального окна
	closeModal.addEventListener('click', function () {
		modal.style.display = 'none'
	})

	window.addEventListener('click', function (e) {
		if (e.target === modal) {
			modal.style.display = 'none'
		}
	})

	// Функция загрузки данных пользователя
	function loadUserData() {
		fetch('/api/user-info')
			.then(response => {
				if (!response.ok) {
					throw new Error('Ошибка загрузки данных')
				}
				return response.json()
			})
			.then(data => {
				document.getElementById(
					'user-name'
				).textContent = `${data.имя} ${data.фамилия}`
				document.getElementById('user-email').textContent = data.email

				// Заполняем форму профиля
				document.getElementById('name').value = data.имя
				document.getElementById('surname').value = data.фамилия
				document.getElementById('email').value = data.email
			})
			.catch(error => {
				console.error('Ошибка:', error)
				showNotification('Не удалось загрузить данные профиля', 'error')
			})
	}

	// Функция загрузки заказов
	function loadOrders() {
		fetch('/api/user-orders')
			.then(response => {
				if (!response.ok) {
					throw new Error('Ошибка загрузки заказов')
				}
				return response.json()
			})
			.then(orders => {
				const ordersList = document.getElementById('orders-list')

				if (orders.length === 0) {
					ordersList.innerHTML =
						'<div class="no-orders">У вас пока нет заказов</div>'
					return
				}

				ordersList.innerHTML = ''

				orders.forEach(order => {
					const orderCard = document.createElement('div')
					orderCard.className = 'order-card'

					// Форматирование даты
					const orderDate = new Date(order.дата_создания)
					const formattedDate = orderDate.toLocaleDateString('ru-RU', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
						hour: '2-digit',
						minute: '2-digit',
					})

					// Определение класса статуса
					let statusClass = 'status-pending'
					if (order.статус.includes('обработ'))
						statusClass = 'status-processing'
					else if (order.статус.includes('заверш'))
						statusClass = 'status-completed'
					else if (order.статус.includes('отмен'))
						statusClass = 'status-cancelled'

					orderCard.innerHTML = `
                        <div class="order-header">
                            <span class="order-id">Заказ #${order.id}</span>
                            <span class="order-date">${formattedDate}</span>
                        </div>
                        <div class="order-status ${statusClass}">${
						order.статус
					}</div>
                        <div class="order-summary">
                            <span class="order-total">${formatPrice(
															order.сумма
														)}</span>
                            <button class="view-details" data-order-id="${
															order.id
														}">Подробнее</button>
                        </div>
                    `

					ordersList.appendChild(orderCard)
				})

				// Добавляем обработчики для кнопок "Подробнее"
				document.querySelectorAll('.view-details').forEach(button => {
					button.addEventListener('click', function () {
						const orderId = this.getAttribute('data-order-id')
						showOrderDetails(orderId, orders)
					})
				})
			})
			.catch(error => {
				console.error('Ошибка:', error)
				document.getElementById('orders-list').innerHTML =
					'<div class="error">Не удалось загрузить заказы. Пожалуйста, попробуйте позже.</div>'
			})
	}

	// Функция отображения деталей заказа
	function showOrderDetails(orderId, orders) {
		const order = orders.find(o => o.id == orderId)
		if (!order) return

		// Форматирование даты
		const orderDate = new Date(order.дата_создания)
		const formattedDate = orderDate.toLocaleDateString('ru-RU', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})

		document.getElementById('order-id').textContent = order.id
		document.getElementById('order-date').textContent = formattedDate
		document.getElementById('order-status').textContent = order.статус
		document.getElementById('order-address').textContent = order.адрес_доставки
		document.getElementById('order-delivery').textContent =
			order.способ_доставки
		document.getElementById('order-total').textContent = formatPrice(
			order.сумма
		)

		const itemsList = document.getElementById('order-items-list')
		itemsList.innerHTML = ''

		order.items.forEach(item => {
			const itemElement = document.createElement('div')
			itemElement.className = 'order-item'
			itemElement.innerHTML = `
                <img src="${item.изображение}" alt="${
				item.название
			}" class="order-item-img">
                <div class="order-item-details">
                    <div class="order-item-title">${item.название}</div>
                    <div class="order-item-price">${formatPrice(
											item.цена
										)}</div>
                    <div class="order-item-quantity">Количество: ${
											item.количество
										}</div>
                </div>
            `
			itemsList.appendChild(itemElement)
		})

		modal.style.display = 'block'
	}

	// Функция обновления профиля
	function updateProfile(data) {
		fetch('/api/update-user', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		})
			.then(response => {
				if (!response.ok) {
					return response.json().then(err => {
						throw err
					})
				}
				return response.json()
			})
			.then(data => {
				showNotification('Профиль успешно обновлен', 'success')
				// Обновляем имя в сайдбаре
				document.getElementById(
					'user-name'
				).textContent = `${data.имя} ${data.фамилия}`
				document.getElementById('user-email').textContent = data.email
			})
			.catch(error => {
				console.error('Ошибка:', error)
				showNotification(error.message || 'Ошибка обновления профиля', 'error')
			})
	}

	// Функция смены пароля
	function changePassword(currentPassword, newPassword) {
		fetch('/api/change-password', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ currentPassword, newPassword }),
		})
			.then(response => {
				if (!response.ok) {
					return response.json().then(err => {
						throw err
					})
				}
				return response.json()
			})
			.then(() => {
				showNotification('Пароль успешно изменен', 'success')
				passwordForm.reset()
			})
			.catch(error => {
				console.error('Ошибка:', error)
				showNotification(error.message || 'Ошибка смены пароля', 'error')
			})
	}

	// Функция выхода
	function logout() {
		fetch('/logout', {
			method: 'POST',
		})
			.then(() => {
				window.location.href = '/login'
			})
			.catch(error => {
				console.error('Ошибка:', error)
				showNotification('Ошибка выхода из системы', 'error')
			})
	}

	// Функция отображения уведомлений
	function showNotification(message, type) {
		notification.textContent = message
		notification.className = 'notification ' + type
		notification.style.display = 'block'

		setTimeout(() => {
			notification.style.display = 'none'
		}, 5000)
	}

	// Функция форматирования цены
	function formatPrice(price) {
		return new Intl.NumberFormat('ru-RU', {
			style: 'currency',
			currency: 'RUB',
			minimumFractionDigits: 0,
		}).format(price)
	}
})

