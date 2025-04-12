// DOM элементы
const cartIcon = document.querySelector('.cart-icon')
const cart = document.querySelector('.cart')
const closeCart = document.querySelector('#close-cart')
const notification = document.getElementById('notification')
const shopContent = document.querySelector('.shop-content')

// Глобальные переменные
let allProducts = []
let filteredProducts = []

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init)
} else {
	init()
}

function init() {
	loadProducts()
	setupEventListeners()
}

// Загрузка товаров с сервера
function loadProducts() {
	fetch('/api/products')
		.then(response => response.json())
		.then(products => {
			allProducts = products
			processProducts()
			applyFilters()
		})
		.catch(error => console.error('Ошибка загрузки товаров:', error))
}

// Обработка товаров (группировка по названию и объединение размеров)
function processProducts() {
	const productsMap = new Map()

	allProducts.forEach(product => {
		const key = product.название
		if (!productsMap.has(key)) {
			productsMap.set(key, {
				...product,
				все_размеры: product.размер ? product.размер.split(',') : ['Не указан'],
				все_id: [product.id],
			})
		} else {
			const existingProduct = productsMap.get(key)
			const newSizes = product.размер
				? product.размер.split(',')
				: ['Не указан']
			existingProduct.все_размеры = [
				...new Set([...existingProduct.все_размеры, ...newSizes]),
			]
			existingProduct.все_id.push(product.id)
		}
	})

	filteredProducts = Array.from(productsMap.values())
}

// Настройка обработчиков событий
function setupEventListeners() {
	// Корзина
	cartIcon.addEventListener('click', () => cart.classList.add('active'))
	closeCart.addEventListener('click', () => cart.classList.remove('active'))

	// Фильтры
	document
		.getElementById('search-input')
		.addEventListener('input', applyFilters)
	document
		.getElementById('sort-select')
		.addEventListener('change', applyFilters)
	document
		.getElementById('size-filter')
		.addEventListener('change', applyFilters)

	// Диапазон цен
	const priceRange = document.getElementById('price-range')
	const priceValue = document.getElementById('price-value')
	priceRange.addEventListener('input', () => {
		priceValue.textContent = `До ₽${parseInt(priceRange.value).toLocaleString(
			'ru-RU'
		)}`
		applyFilters()
	})
}

// Применение фильтров и сортировки
function applyFilters() {
	const searchTerm = document.getElementById('search-input').value.toLowerCase()
	const sortValue = document.getElementById('sort-select').value
	const sizeFilter = document.getElementById('size-filter').value
	const maxPrice = parseInt(document.getElementById('price-range').value)

	let productsToDisplay = [...filteredProducts]

	// Фильтрация
	productsToDisplay = productsToDisplay.filter(product => {
		const matchesSearch =
			product.название.toLowerCase().includes(searchTerm) ||
			(product.описание && product.описание.toLowerCase().includes(searchTerm))
		const matchesSize =
			sizeFilter === 'all' || product.все_размеры.includes(sizeFilter)
		const matchesPrice = product.цена <= maxPrice

		return matchesSearch && matchesSize && matchesPrice
	})

	// Сортировка
	productsToDisplay.sort((a, b) => {
		switch (sortValue) {
			case 'price-asc':
				return a.цена - b.цена
			case 'price-desc':
				return b.цена - a.цена
			case 'name-asc':
				return a.название.localeCompare(b.название)
			case 'name-desc':
				return b.название.localeCompare(a.название)
			default:
				return 0
		}
	})

	renderProducts(productsToDisplay)
}

// Отображение товаров
function renderProducts(products) {
	const shopContent = document.querySelector('.shop-content')
	shopContent.innerHTML = ''

	// Добавляем класс в зависимости от количества товаров
	if (products.length === 1) {
		shopContent.classList.add('single-product')
	} else {
		shopContent.classList.remove('single-product')
	}

	products.forEach(product => {
		const productBox = document.createElement('div')
		productBox.classList.add('product-box')
		productBox.setAttribute('data-id', product.id)

		productBox.innerHTML = `
            <img src="${product.изображение}" alt="${
			product.название
		}" class="product-img">
            <h2 class="product-title">${product.название}</h2>
            <div class="product-sizes">Размеры: ${product.все_размеры.join(
							', '
						)}</div>
            <span class="price">₽${product.цена.toLocaleString('ru-RU')}</span>
            <i class='bx bxs-shopping-bag add-cart'></i>
        `

		shopContent.appendChild(productBox)
	})

	initializeModalEvents(products)
}

// Инициализация модального окна
function initializeModalEvents(products) {
	const addToCartButtons = document.querySelectorAll('.add-cart')
	const productModal = document.getElementById('product-modal')
	const closeModal = document.querySelector('.close')
	const modalProductImg = document.getElementById('modal-product-img')
	const modalProductTitle = document.getElementById('modal-product-title')
	const modalProductDescription = document.getElementById(
		'modal-product-description'
	)
	const modalProductPrice = document.getElementById('modal-product-price')
	const sizeSelector = document.getElementById('size')
	const addToCartModalButton = document.getElementById('add-to-cart-modal')

	addToCartButtons.forEach((button, index) => {
		button.addEventListener('click', () => {
			const product = products[index]
			modalProductImg.src = product.изображение
			modalProductTitle.innerText = product.название
			modalProductTitle.setAttribute('data-id', product.id)
			modalProductDescription.innerText = product.описание || 'Нет описания'
			modalProductPrice.innerText = `₽${product.цена.toLocaleString('ru-RU')}`

			sizeSelector.innerHTML = ''
			product.все_размеры.forEach(size => {
				const option = document.createElement('option')
				option.value = size
				option.innerText = size
				sizeSelector.appendChild(option)
			})

			productModal.style.display = 'flex'
		})
	})

	closeModal.addEventListener('click', () => {
		productModal.style.display = 'none'
	})

	addToCartModalButton.addEventListener('click', () => {
		const selectedSize = sizeSelector.value
		const productId = modalProductTitle.getAttribute('data-id')
		const product = allProducts.find(p => p.id == productId)

		if (!product) {
			alert('Товар не найден!')
			return
		}

		if (isProductInCart(productId, selectedSize)) {
			alert('Этот товар уже добавлен в корзину!')
			return
		}

		addProductToCart(
			product.название,
			product.цена,
			product.изображение,
			selectedSize,
			productId
		)

		showNotification(`Товар добавлен в корзину. Размер: ${selectedSize}`)
		productModal.style.display = 'none'
	})

	window.addEventListener('click', e => {
		if (e.target === productModal) {
			productModal.style.display = 'none'
		}
	})
}

// Проверка наличия товара в корзине
function isProductInCart(productId, size) {
	const cartItems = Array.from(document.getElementsByClassName('cart-box'))
	return cartItems.some(cartBox => {
		const cartItemId = cartBox
			.querySelector('.cart-product-title')
			.getAttribute('data-id')
		const cartItemSize = cartBox
			.querySelector('.cart-size')
			.innerText.split(': ')[1]
		return cartItemId == productId && cartItemSize == size
	})
}

// Добавление товара в корзину
function addProductToCart(
	title,
	price,
	productImg,
	size = 'Не выбран',
	productId
) {
	const normalizedSize = size.trim()

	if (isProductInCart(productId, normalizedSize)) {
		showNotification('Этот товар уже добавлен в корзину!')
		return false
	}

	const cartContent = document.querySelector('.cart-content')
	const cartBox = document.createElement('div')
	cartBox.className = 'cart-box'
	cartBox.innerHTML = `
        <img src="${productImg}" class="cart-img">
        <div class="detail-box">
            <div class="cart-product-title" data-id="${productId}">${title}</div>
            <div class="cart-price">₽${price.toLocaleString()}</div>
            <div class="cart-size">Размер: ${normalizedSize}</div>
            <input type="number" value="1" class="cart-quantity" min="1">
        </div>
        <i class='bx bxs-trash-alt cart-remove'></i>
    `

	cartContent.appendChild(cartBox)

	// Добавляем обработчики событий
	cartBox
		.querySelector('.cart-remove')
		.addEventListener('click', removeCartItem)
	cartBox
		.querySelector('.cart-quantity')
		.addEventListener('change', quantityChanged)

	// Обновляем корзину (добавляем все необходимые функции)
	updateCartCount(1) // Увеличиваем счётчик на 1
	updateTotal() // Обновляем общую сумму
	animateCartIcon() // Анимация иконки корзины
	showNotification(`"${title}" (${normalizedSize}) добавлен в корзину`) // Уведомление

	return true
}

// Функция обновления счётчика товаров
function updateCartCount(change) {
	const cartCount = document.getElementById('cart-count')
	let currentCount = parseInt(cartCount.textContent) || 0
	currentCount += change
	cartCount.textContent = currentCount
	cartCount.style.display = currentCount > 0 ? 'block' : 'none'
}

// Функция анимации иконки корзины
function animateCartIcon() {
	const cartIcon = document.querySelector('.cart-icon')
	cartIcon.classList.add('animate')
	setTimeout(() => cartIcon.classList.remove('animate'), 500)
}

// Функция показа уведомлений
function showNotification(message) {
	const notification = document.getElementById('notification')
	notification.textContent = message
	notification.style.display = 'block'

	// Скрываем уведомление через 3 секунды
	setTimeout(() => {
		notification.style.display = 'none'
	}, 3000)
}

// Удаление товара из корзины
function removeCartItem(event) {
	const buttonClicked = event.target
	const cartBox = buttonClicked.parentElement
	const quantity = parseInt(cartBox.querySelector('.cart-quantity').value)

	cartBox.remove()
	updateCartCount(-quantity)
	updateTotal()
}

// Изменение количества товара
function quantityChanged(event) {
	const input = event.target
	if (isNaN(input.value) || input.value <= 0) {
		input.value = 1
	}

	const productId = input
		.closest('.cart-box')
		.querySelector('.cart-product-title')
		.getAttribute('data-id')
	checkProductAvailability(productId, input)

	updateTotal()
}

// Проверка доступного количества товара
function checkProductAvailability(productId, inputElement) {
	fetch(`/api/products/${productId}`)
		.then(response => response.json())
		.then(product => {
			if (inputElement.value > product.количество) {
				alert(
					`Доступно только ${product.количество} штук товара "${product.название}".`
				)
				inputElement.value = product.количество
			}
		})
		.catch(error => console.error('Ошибка проверки количества товара:', error))
}

// Обновление общей суммы
function updateTotal() {
	const cartContent = document.getElementsByClassName('cart-content')[0]
	const cartBoxes = cartContent.getElementsByClassName('cart-box')
	let total = 0

	for (let i = 0; i < cartBoxes.length; i++) {
		const cartBox = cartBoxes[i]
		const priceElement = cartBox.getElementsByClassName('cart-price')[0]
		const quantityElement = cartBox.getElementsByClassName('cart-quantity')[0]

		const price = parseFloat(
			priceElement.innerText.replace('₽', '').replace(/\s/g, '')
		)
		const quantity = quantityElement.value

		total += price * quantity
	}

	document.getElementsByClassName(
		'total-price'
	)[0].innerText = `₽${total.toLocaleString('ru-RU')}`
}

// Обновление счетчика товаров
function updateCartCount(change) {
	const cartCount = document.getElementById('cart-count')
	const currentCount = parseInt(cartCount.innerText) || 0
	cartCount.innerText = Math.max(0, currentCount + change)
}

// Анимация иконки корзины
function animateCartIcon() {
	cartIcon.classList.add('added')
	setTimeout(() => cartIcon.classList.remove('added'), 600)
}

// Показ уведомления
function showNotification(message) {
	notification.textContent = message
	notification.style.display = 'block'
	setTimeout(() => (notification.style.display = 'none'), 3000)
}

// Оформление заказа
function placeOrder() {
	const cartItems = []
	const cartBoxes = document.querySelectorAll('.cart-box')

	cartBoxes.forEach(box => {
		const productId = box
			.querySelector('.cart-product-title')
			.getAttribute('data-id')
		const title = box.querySelector('.cart-product-title').innerText
		const price = parseFloat(
			box.querySelector('.cart-price').innerText.replace('₽', '')
		)
		const quantity = parseInt(box.querySelector('.cart-quantity').value)
		const size = box.querySelector('.cart-size').innerText.split(': ')[1]

		cartItems.push({ id: productId, title, price, quantity, size })
	})

	localStorage.setItem('cartItems', JSON.stringify(cartItems))
	window.location.href = 'checkout.html'
}
