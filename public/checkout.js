document.addEventListener('DOMContentLoaded', () => {
	const cartItems = JSON.parse(localStorage.getItem('cartItems')) || []

	if (cartItems.length === 0) {
		alert('Корзина пуста. Вернитесь в магазин, чтобы добавить товары.')
		window.location.href = 'shop.html'
		return
	}

	const confirmOrderButton = document.getElementById('confirm-order')
	confirmOrderButton.addEventListener('click', event => {
		event.preventDefault() // Отключаем стандартное поведение формы

		const address = document.getElementById('address').value
		const deliveryMethod = document.getElementById('delivery-method').value

		// Проверяем, заполнены ли все поля формы
		if (!address || !deliveryMethod) {
			alert('Пожалуйста, заполните все данные для доставки.')
			return
		}

		const orderData = {
			cartItems, // массив товаров
			address,
			deliveryMethod,
		}

		fetch('/checkout', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(orderData),
		})
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					alert('Заказ успешно оформлен!')
					localStorage.removeItem('cartItems') // Очищаем корзину
					window.location.href = 'shop.html'
				} else {
					alert('Ошибка оформления заказа: ' + data.message)
				}
			})
			.catch(error => {
				console.error('Ошибка:', error)
				alert('Ошибка оформления заказа. Пожалуйста, попробуйте позже.')
			})
	})
})
