document.addEventListener('DOMContentLoaded', function () {
	// Словарь синонимов для поиска
	const synonyms = {
		бейсболка: ['бейсболка', 'кепка', 'бейсболки', 'кепки'],
		футболка: ['футболка', 'футболки', 'т-шорт', 'т-шорты'],
	}

	// Элементы чат-бота
	const chatBotIcon = document.createElement('div')
	chatBotIcon.className = 'chatbot-icon'
	chatBotIcon.innerHTML = `
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="18" fill="#fffb00"/>
            <path d="M12 14C12 12.8954 12.8954 12 14 12H22C23.1046 12 24 12.8954 24 14V18C24 19.1046 23.1046 20 22 20H14C12.8954 20 12 19.1046 12 18V14Z" fill="#1a1a1a"/>
            <circle cx="16" cy="16" r="2" fill="#fffb00"/>
            <circle cx="20" cy="16" r="2" fill="#fffb00"/>
            <path d="M15 22L13 26H23L21 22H15Z" fill="#1a1a1a"/>
        </svg>
    `
	document.body.appendChild(chatBotIcon)

	const chatBotContainer = document.createElement('div')
	chatBotContainer.className = 'chatbot-container'
	chatBotContainer.innerHTML = `
        <div class="chatbot-header">
            <h3>LVShop Assistant</h3>
            <i class="bx bxs-x-circle chatbot-close"></i>
        </div>
        <div class="chatbot-messages" id="chatbot-messages"></div>
        <div class="chatbot-input">
            <input type="text" id="chatbot-input" placeholder="Введите ваш запрос...">
            <button id="chatbot-send">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2L11 13" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
    `
	document.body.appendChild(chatBotContainer)

	// Всплывающее сообщение
	const popupMessage = document.createElement('div')
	popupMessage.className = 'chatbot-popup'
	popupMessage.innerHTML = `
        <p>Добро пожаловать в LVShop! Я ваш помощник. Нажмите, чтобы начать! 😊</p>
    `
	document.body.appendChild(popupMessage)

	const chatMessages = document.getElementById('chatbot-messages')
	const chatInput = document.getElementById('chatbot-input')
	const sendButton = document.getElementById('chatbot-send')
	const closeButton = document.querySelector('.chatbot-close')

	// Состояние чат-бота
	let currentState = 'greeting'
	let selectedProductId = null
	let orderDetails = {}
	let isPopupActive = true

	// Показать всплывающее сообщение и анимацию иконки
	function showPopup() {
		setTimeout(() => {
			if (isPopupActive) {
				popupMessage.classList.add('active')
				chatBotIcon.classList.add('pulse')
				// Автоматически скрыть через 8 секунд
				setTimeout(hidePopup, 8000)
			}
		}, 1000) // Задержка 1 секунда для загрузки страницы
	}

	// Скрыть всплывающее сообщение
	function hidePopup() {
		popupMessage.classList.remove('active')
		chatBotIcon.classList.remove('pulse')
		isPopupActive = false
	}

	// Показать/скрыть чат-бот
	chatBotIcon.addEventListener('click', () => {
		chatBotContainer.classList.toggle('active')
		if (isPopupActive) {
			hidePopup()
		}
		if (
			chatBotContainer.classList.contains('active') &&
			currentState === 'greeting'
		) {
			displayMessage(
				'Здравствуйте! Я ваш помощник по магазину LVShop. Чем могу помочь? 😊',
				'bot'
			)
			displayOptions([
				{ text: 'Найти товар', action: 'search' },
				{ text: 'Оформить заказ', action: 'order' },
				{ text: 'История заказов', action: 'history' },
			])
		}
	})

	closeButton.addEventListener('click', () => {
		chatBotContainer.classList.remove('active')
		resetChat()
	})

	// Обработка отправки сообщения
	sendButton.addEventListener('click', handleUserInput)
	chatInput.addEventListener('keypress', e => {
		if (e.key === 'Enter') handleUserInput()
	})

	// Скрыть всплывающее сообщение при любом вводе
	chatInput.addEventListener('input', () => {
		if (isPopupActive) {
			hidePopup()
		}
	})

	function handleUserInput() {
		const userMessage = chatInput.value.trim()
		if (!userMessage) return

		displayMessage(userMessage, 'user')
		chatInput.value = ''
		processUserInput(userMessage)
	}

	// Отображение сообщения
	function displayMessage(message, sender) {
		const messageElement = document.createElement('div')
		messageElement.className = `chatbot-message ${sender}`
		messageElement.innerHTML = `<p>${message}</p>`
		chatMessages.appendChild(messageElement)
		chatMessages.scrollTop = chatMessages.scrollHeight
	}

	// Отображение опций выбора
	function displayOptions(options) {
		const optionsContainer = document.createElement('div')
		optionsContainer.className = 'chatbot-options'
		options.forEach(option => {
			const button = document.createElement('button')
			button.textContent = option.text
			button.addEventListener('click', () => {
				displayMessage(option.text, 'user')
				processUserInput(option.action)
			})
			optionsContainer.appendChild(button)
		})
		chatMessages.appendChild(optionsContainer)
		chatMessages.scrollTop = chatMessages.scrollHeight
	}

	// Отображение изображения товара
	function displayProductImage(imageUrl) {
		const imageElement = document.createElement('div')
		imageElement.className = 'chatbot-message bot product-image'
		imageElement.innerHTML = `<img src="${imageUrl}" alt="Product Image" style="max-width: 100%; border-radius: 8px;" />`
		chatMessages.appendChild(imageElement)
		chatMessages.scrollTop = chatMessages.scrollHeight
	}

	// Сброс состояния чат-бота
	function resetChat() {
		currentState = 'greeting'
		selectedProductId = null
		orderDetails = {}
		chatMessages.innerHTML = ''
	}

	// Обработка ввода пользователя
	function processUserInput(input) {
		const normalizedInput = input.toLowerCase()

		switch (currentState) {
			case 'greeting':
				handleGreetingState(normalizedInput)
				break
			case 'search':
				handleSearchState(normalizedInput)
				break
			case 'search_results':
				handleSearchResultsState(normalizedInput)
				break
			case 'order':
				handleOrderState(normalizedInput)
				break
			case 'order_quantity':
				handleOrderQuantityState(normalizedInput)
				break
			case 'order_size':
				handleOrderSizeState(normalizedInput)
				break
			case 'order_delivery':
				handleOrderDeliveryState(normalizedInput)
				break
			case 'order_address':
				handleOrderAddressState(normalizedInput)
				break
			case 'order_card_number':
				handleOrderCardNumberState(normalizedInput)
				break
			case 'order_card_expiry':
				handleOrderCardExpiryState(normalizedInput)
				break
			case 'order_card_cvv':
				handleOrderCardCvvState(normalizedInput)
				break
			case 'history':
				handleHistoryState(normalizedInput)
				break
			default:
				displayMessage(
					'Извините, я не понял ваш запрос. Давайте начнем сначала?',
					'bot'
				)
				displayOptions([
					{ text: 'Найти товар', action: 'search' },
					{ text: 'Оформить заказ', action: 'order' },
					{ text: 'История заказов', action: 'history' },
				])
				currentState = 'greeting'
		}
	}

	// Обработка начального состояния
	function handleGreetingState(input) {
		if (
			input.includes('найти') ||
			input.includes('поиск') ||
			input === 'search'
		) {
			currentState = 'search'
			displayMessage(
				'Какой товар вы ищете? Введите название или категорию.',
				'bot'
			)
		} else if (
			input.includes('заказ') ||
			input.includes('оформить') ||
			input === 'order'
		) {
			currentState = 'order'
			displayMessage('Введите артикул товара для заказа.', 'bot')
		} else if (
			input.includes('история') ||
			input.includes('заказы') ||
			input === 'history'
		) {
			currentState = 'history'
			fetchOrderHistory()
		} else {
			displayMessage('Пожалуйста, выберите одну из опций:', 'bot')
			displayOptions([
				{ text: 'Найти товар', action: 'search' },
				{ text: 'Оформить заказ', action: 'order' },
				{ text: 'История заказов', action: 'history' },
			])
		}
	}

	// Обработка поиска товаров
	function handleSearchState(searchTerm) {
		fetch(`/api/products`)
			.then(response => response.json())
			.then(products => {
				const normalizedSearchTerm = searchTerm
					.toLowerCase()
					.replace(/[^а-яa-z0-9\s]/g, '')

				// Находим все возможные синонимы для введенного термина
				let searchTerms = [normalizedSearchTerm]
				for (const [key, value] of Object.entries(synonyms)) {
					if (value.includes(normalizedSearchTerm)) {
						searchTerms = value
						break
					}
				}

				const filteredProducts = products.filter(product => {
					const name = product.название
						.toLowerCase()
						.replace(/[^а-яa-z0-9\s]/g, '')
					const description = product.описание
						? product.описание.toLowerCase().replace(/[^а-яa-z0-9\s]/g, '')
						: ''
					// Проверяем, есть ли совпадение хотя бы с одним из синонимов
					return searchTerms.some(
						term => name.includes(term) || description.includes(term)
					)
				})

				if (filteredProducts.length === 0) {
					displayMessage(
						'К сожалению, ничего не найдено. Попробуйте другой запрос?',
						'bot'
					)
					displayOptions([
						{ text: 'Попробовать снова', action: 'search' },
						{ text: 'Вернуться в меню', action: 'greeting' },
					])
					currentState = 'greeting'
					return
				}

				displayMessage(`Найдено ${filteredProducts.length} товар(ов):`, 'bot')
				filteredProducts.forEach(product => {
					displayMessage(
						`${product.название} - ₽${product.цена.toLocaleString(
							'ru-RU'
						)} (Артикул: ${product.id}, Размеры: ${
							product.размер || 'Не указаны'
						})`,
						'bot'
					)
					if (product.изображение) {
						displayProductImage(product.изображение)
					}
				})

				displayMessage(
					'Введите артикул товара для подробностей или "назад" для возврата.',
					'bot'
				)
				currentState = 'search_results'
			})
			.catch(error => {
				console.error('Ошибка поиска:', error)
				displayMessage(
					'Произошла ошибка при поиске товаров. Попробуйте снова?',
					'bot'
				)
				currentState = 'greeting'
			})
	}

	// Обработка выбора товара из результатов поиска
	function handleSearchResultsState(input) {
		if (input === 'назад' || input === 'back') {
			currentState = 'greeting'
			displayMessage('Чем могу помочь?', 'bot')
			displayOptions([
				{ text: 'Найти товар', action: 'search' },
				{ text: 'Оформить заказ', action: 'order' },
				{ text: 'История заказов', action: 'history' },
			])
			return
		}

		const productId = parseInt(input)
		if (isNaN(productId) || productId <= 0) {
			displayMessage('Пожалуйста, введите корректный артикул товара.', 'bot')
			return
		}

		fetch(`/api/chatbot/product/${productId}`)
			.then(response => {
				if (!response.ok) throw new Error('Товар не найден')
				return response.json()
			})
			.then(product => {
				displayMessage(
					`Товар: ${product.название}\nЦена: ₽${product.цена.toLocaleString(
						'ru-RU'
					)}\nОписание: ${product.описание || 'Нет описания'}\nРазмеры: ${
						product.размер || 'Не указаны'
					}`,
					'bot'
				)
				if (product.изображение) {
					displayProductImage(product.изображение)
				}
				displayOptions([
					{ text: 'Заказать этот товар', action: `order_${product.id}` },
					{ text: 'Продолжить поиск', action: 'search' },
					{ text: 'Вернуться в меню', action: 'greeting' },
				])
				currentState = 'greeting'
			})
			.catch(error => {
				console.error('Ошибка при получении товара:', error)
				displayMessage(
					'Товар с таким артикулом не найден. Попробуйте другой артикул.',
					'bot'
				)
			})
	}

	// Обработка оформления заказа
	function handleOrderState(input) {
		const productId = parseInt(input)
		if (isNaN(productId) || productId <= 0) {
			displayMessage('Пожалуйста, введите корректный артикул товара.', 'bot')
			return
		}

		fetch(`/api/chatbot/product/${productId}`)
			.then(response => {
				if (!response.ok) throw new Error(`HTTP ошибка: ${response.status}`)
				return response.json()
			})
			.then(product => {
				selectedProductId = productId
				orderDetails.product = product
				displayMessage(
					`Вы выбрали: ${
						product.название
					}\nЦена: ₽${product.цена.toLocaleString(
						'ru-RU'
					)}\nВведите количество.`,
					'bot'
				)
				currentState = 'order_quantity'
			})
			.catch(error => {
				console.error('Ошибка при получении товара:', error)
				displayMessage(
					'Товар с таким артикулом не найден. Попробуйте другой артикул.',
					'bot'
				)
			})
	}

	// Обработка количества товара
	function handleOrderQuantityState(input) {
		const quantity = parseInt(input)
		if (isNaN(quantity) || quantity <= 0) {
			displayMessage('Пожалуйста, введите корректное количество.', 'bot')
			return
		}

		fetch(`/api/chatbot/product/${selectedProductId}`)
			.then(response => response.json())
			.then(product => {
				if (quantity > product.количество) {
					displayMessage(
						`Доступно только ${product.количество} шт. Пожалуйста, выберите меньшее количество.`,
						'bot'
					)
					return
				}

				orderDetails.quantity = quantity
				if (product.размер && product.размер.trim() !== '') {
					const sizes = product.размер.includes(',')
						? product.размер.split(',')
						: [product.размер]
					displayMessage(
						`Доступные размеры: ${sizes.join(', ')}\nВыберите размер.`,
						'bot'
					)
					currentState = 'order_size'
				} else {
					orderDetails.size = 'Не указан'
					displayMessage(
						'Выберите способ доставки: Курьер, Самовывоз, Почта.',
						'bot'
					)
					currentState = 'order_delivery'
				}
			})
			.catch(error => {
				console.error('Ошибка проверки количества:', error)
				displayMessage('Ошибка проверки количества. Попробуйте снова.', 'bot')
				currentState = 'order'
			})
	}

	// Обработка выбора размера
	function handleOrderSizeState(input) {
		const product = orderDetails.product
		const sizes =
			product.размер && product.размер.trim() !== ''
				? product.размер.includes(',')
					? product.размер.split(',').map(s => s.trim().toLowerCase())
					: [product.размер.trim().toLowerCase()]
				: ['не указан']

		const normalizedInput = input.trim().toLowerCase()
		if (!sizes.includes(normalizedInput)) {
			displayMessage(
				`Пожалуйста, выберите один из доступных размеров: ${sizes.join(', ')}`,
				'bot'
			)
			return
		}

		orderDetails.size = input.trim()
		displayMessage('Выберите способ доставки: Курьер, Самовывоз, Почта.', 'bot')
		currentState = 'order_delivery'
	}

	// Обработка способа доставки
	function handleOrderDeliveryState(input) {
		const validMethods = ['курьер', 'самовывоз', 'почта']
		if (!validMethods.includes(input.toLowerCase())) {
			displayMessage(
				'Пожалуйста, выберите: Курьер, Самовывоз или Почта.',
				'bot'
			)
			return
		}

		orderDetails.deliveryMethod = input.toLowerCase()
		if (orderDetails.deliveryMethod === 'самовывоз') {
			orderDetails.address = 'г. Москва, ул. Примерная, д. 123'
			displayMessage(`Адрес для самовывоза: ${orderDetails.address}`, 'bot')
			displayMessage(
				'Введите номер карты (16 цифр, например, 1234 5678 9012 3456).',
				'bot'
			)
			currentState = 'order_card_number'
		} else {
			displayMessage('Введите адрес доставки.', 'bot')
			currentState = 'order_address'
		}
	}

	// Обработка адреса доставки
	function handleOrderAddressState(input) {
		if (input.trim().length < 5) {
			displayMessage('Пожалуйста, введите корректный адрес доставки.', 'bot')
			return
		}

		orderDetails.address = input.trim()
		displayMessage(
			'Введите номер карты (16 цифр, например, 1234 5678 9012 3456).',
			'bot'
		)
		currentState = 'order_card_number'
	}

	// Обработка номера карты
	function handleOrderCardNumberState(input) {
		const cardNumber = input.replace(/\s/g, '')
		if (!/^\d{16}$/.test(cardNumber)) {
			displayMessage(
				'Пожалуйста, введите корректный номер карты (16 цифр).',
				'bot'
			)
			return
		}

		orderDetails.cardNumber = cardNumber
		displayMessage(
			'Введите срок действия карты (ММ/ГГ, например, 12/25).',
			'bot'
		)
		currentState = 'order_card_expiry'
	}

	// Обработка срока действия карты
	function handleOrderCardExpiryState(input) {
		const expiry = input.trim()
		if (!/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(expiry)) {
			displayMessage(
				'Пожалуйста, введите корректный срок действия (ММ/ГГ, например, 12/25).',
				'bot'
			)
			return
		}

		const [month, year] = expiry.split('/')
		const currentYear = new Date().getFullYear() % 100
		const currentMonth = new Date().getMonth() + 1
		const inputYear = parseInt(year)
		const inputMonth = parseInt(month)

		if (
			inputYear < currentYear ||
			(inputYear === currentYear && inputMonth < currentMonth)
		) {
			displayMessage('Карта просрочена. Введите действительный срок.', 'bot')
			return
		}

		orderDetails.cardExpiry = expiry
		displayMessage('Введите CVV-код (3 цифры на обороте карты).', 'bot')
		currentState = 'order_card_cvv'
	}

	// Обработка CVV-кода
	function handleOrderCardCvvState(input) {
		const cvv = input.trim()
		if (!/^\d{3}$/.test(cvv)) {
			displayMessage('Пожалуйста, введите корректный CVV-код (3 цифры).', 'bot')
			return
		}

		orderDetails.cardCvv = cvv
		placeOrder()
	}

	// Оформление заказа
	function placeOrder() {
		const cartItems = [
			{
				id: selectedProductId,
				price: orderDetails.product.цена,
				quantity: orderDetails.quantity,
				size: orderDetails.size,
			},
		]

		fetch('/checkout', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				address: orderDetails.address,
				deliveryMethod: orderDetails.deliveryMethod,
				cartItems: cartItems,
				paymentDetails: {
					cardNumber: orderDetails.cardNumber,
					cardExpiry: orderDetails.cardExpiry,
					cardCvv: orderDetails.cardCvv,
				},
			}),
		})
			.then(response => {
				if (!response.ok) throw new Error('Ошибка оформления заказа')
				return response.json()
			})
			.then(data => {
				resetChat()
				displayMessage(
					'Заказ успешно оформлен! Номер заказа: ' + data.orderId,
					'bot'
				)
				displayOptions([
					{ text: 'Новый заказ', action: 'order' },
					{ text: 'Вернуться в меню', action: 'greeting' },
				])
			})
			.catch(error => {
				console.error('Ошибка:', error)
				displayMessage('Ошибка при оформлении заказа. Попробуйте снова.', 'bot')
				currentState = 'order'
			})
	}

	// Получение истории заказов
	function fetchOrderHistory() {
		fetch('/api/user-orders')
			.then(response => {
				if (!response.ok) throw new Error('Ошибка загрузки заказов')
				return response.json()
			})
			.then(orders => {
				if (orders.length === 0) {
					displayMessage('У вас пока нет заказов.', 'bot')
				} else {
					displayMessage('Ваши заказы:', 'bot')
					orders.forEach(order => {
						const formattedDate = new Date(
							order.дата_создания
						).toLocaleDateString('ru-RU')
						displayMessage(
							`Заказ #${
								order.id
							} от ${formattedDate}\nСумма: ₽${order.сумма.toLocaleString(
								'ru-RU'
							)}\nСтатус: ${order.статус}`,
							'bot'
						)
					})
				}
				displayOptions([
					{ text: 'Вернуться в меню', action: 'greeting' },
					{ text: 'Найти товар', action: 'search' },
				])
				currentState = 'greeting'
			})
			.catch(error => {
				console.error('Ошибка:', error)
				displayMessage(
					'Ошибка при загрузке истории заказов. Попробуйте снова?',
					'bot'
				)
				displayOptions([
					{ text: 'Попробовать снова', action: 'history' },
					{ text: 'Вернуться в меню', action: 'greeting' },
				])
			})
	}

	// Запуск всплывающего сообщения при загрузке
	showPopup()
})
