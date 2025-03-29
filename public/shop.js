// Выбираем элементы иконки корзины, самой корзины и кнопки закрытия корзины
let cartIcon = document.querySelector('.cart-icon')
let cart = document.querySelector('.cart')
let closeCart = document.querySelector('#close-cart')
let notification = document.getElementById('notification')

// Когда иконка корзины нажата, добавляем класс 'active' к корзине, чтобы показать её
cartIcon.onclick = () => {
	cart.classList.add('active')
}

// Когда кнопка закрытия нажата, удаляем класс 'active' у корзины, чтобы скрыть её
closeCart.onclick = () => {
	cart.classList.remove('active')
}

// Проверяем, загружается ли документ
if (document.readyState == 'loading') {
	// Если да, добавляем слушатель события для выполнения функции 'ready' после полной загрузки контента
	document.addEventListener('DOMContentLoaded', loadProducts)
} else {
	// Если нет, выполняем функцию 'loadProducts' сразу
	loadProducts()
}

function loadProducts() {
	fetch('/api/products')
		.then(response => response.json())
		.then(products => {
			const shopContent = document.querySelector('.shop-content')
			shopContent.innerHTML = '' // Очистка перед добавлением

			products.forEach(product => {
				const productBox = document.createElement('div')
				productBox.classList.add('product-box')
				productBox.setAttribute('data-id', product.id) // Добавляем id товара

				productBox.innerHTML = `
                    <img src="${product.изображение}" alt="${product.название}" class="product-img">
                    <h2 class="product-title">${product.название}</h2>
                    <span class="price">₽${product.цена}</span>
                    <i class='bx bxs-shopping-bag add-cart'></i>
                `

				shopContent.appendChild(productBox)
			})

			initializeModalEvents(products) // Назначаем обработчики событий
		})
		.catch(error => console.error('Ошибка загрузки товаров:', error))
}


// Инициализация событий модального окна
function initializeModalEvents(products) {
	const addToCartButtons = document.querySelectorAll('.add-cart')
	const productModal = document.getElementById('product-modal')
	const closeModal = document.querySelector('.close')
	const modalProductImg = document.getElementById('modal-product-img')
	const modalProductTitle = document.getElementById('modal-product-title')
	const modalProductDescription = document.getElementById('modal-product-description')
	const modalProductPrice = document.getElementById('modal-product-price')
	const sizeSelector = document.getElementById('size')
	const addToCartModalButton = document.getElementById('add-to-cart-modal')

	// Открытие модального окна
	addToCartButtons.forEach((button, index) => {
		button.addEventListener('click', () => {
			const product = products[index] // Используем индекс, чтобы найти продукт

			// Заполняем модальное окно данными
			modalProductImg.src = product.изображение
			modalProductTitle.innerText = product.название
			modalProductDescription.innerText = product.описание || 'Нет описания'
			modalProductPrice.innerText = '₽' + product.цена

			// Динамически создаем варианты размеров в зависимости от данных из базы
			sizeSelector.innerHTML = ''; // Очищаем текущие опции
			const sizes = product.размер ? product.размер.split(',') : ['Не указан'];
			sizes.forEach(size => {
				const option = document.createElement('option');
				option.value = size;
				option.innerText = size;
				sizeSelector.appendChild(option);
			});

			// Показываем модальное окно
			productModal.style.display = 'flex'
		})
	})

	// Закрытие модального окна
	closeModal.addEventListener('click', () => {
		productModal.style.display = 'none'
	})

	// Добавление товара в корзину из модального окна
	addToCartModalButton.addEventListener('click', () => {
		const selectedSize = sizeSelector.value
		const product = products.find(
			p => p.название === modalProductTitle.innerText
		)

		if (!product) {
			alert('Товар не найден!')
			return
		}

		// Проверяем, есть ли уже такой товар в корзине
		const cartItems = Array.from(document.getElementsByClassName('cart-box'))
		const isDuplicate = cartItems.some(cartBox => {
			const cartItemId = cartBox
				.querySelector('.cart-product-title')
				.getAttribute('data-id')
			const cartItemSize = cartBox
				.querySelector('.cart-size')
				.innerText.split(': ')[1]
			return cartItemId == product.id && cartItemSize == selectedSize
		})

		if (isDuplicate) {
			alert('Этот товар уже добавлен в корзину!')
			return
		}

		// Добавление товара
		addProductToCart(
			product.название,
			product.цена,
			product.изображение,
			selectedSize,
			product.id
		)

		// Уведомление об успешном добавлении
		alert(`Товар добавлен в корзину. Размер: ${selectedSize}`)

		// Закрытие модального окна
		productModal.style.display = 'none'
	})


	// Закрытие модального окна при клике вне его
	window.addEventListener('click', e => {
		if (e.target === productModal) {
			productModal.style.display = 'none'
		}
	})
}


function addProductToCart(
	title,
	price,
	productImg,
	size = 'Не выбран',
	productId
) {
	// Выбираем элемент, содержащий товары в корзине
	var cartItems = document.getElementsByClassName('cart-content')[0]

	// Проверяем, есть ли уже товар с таким же ID и размером в корзине
	var existingCartItem = Array.from(
		cartItems.getElementsByClassName('cart-box')
	).find(cartBox => {
		const cartItemId = cartBox
			.querySelector('.cart-product-title')
			.getAttribute('data-id')
		const cartItemSize = cartBox
			.querySelector('.cart-size')
			.innerText.split(': ')[1]
		return cartItemId == productId && cartItemSize == size
	})

	if (existingCartItem) {
		alert('Этот товар уже добавлен в корзину!')
		return
	}

	// Создаем элемент корзины с деталями товара
	var cartShopBox = document.createElement('div')
	cartShopBox.classList.add('cart-box')

	var cartBoxContent = `
        <img src="${productImg}" alt="" class="cart-img">
        <div class="detail-box">
            <div class="cart-product-title" data-id="${productId}">${title}</div>
            <div class="cart-price">₽${price}</div>
            <div class="cart-size">Размер: ${size}</div>
            <input type="number" value="1" class="cart-quantity">
        </div>
        <i class='bx bxs-trash-alt cart-remove'></i>
    `

	cartShopBox.innerHTML = cartBoxContent
	cartItems.append(cartShopBox)

	// Добавляем слушатели событий для удаления товаров и изменения количества
	cartShopBox
		.getElementsByClassName('cart-remove')[0]
		.addEventListener('click', removeCartItem)
	cartShopBox
		.getElementsByClassName('cart-quantity')[0]
		.addEventListener('change', quantityChanged)

	// Обновляем счетчик товаров в корзине
	var cartCount = document.getElementById('cart-count')
	var currentCount = parseInt(cartCount.innerText)
	cartCount.innerText = currentCount + 1

	// Обновляем общую стоимость
	updatetotal()
}





// Функция для удаления товара из корзины
function removeCartItem(event) {
	var buttonClicked = event.target
	var cartBox = buttonClicked.parentElement
	var quantityElement = cartBox.getElementsByClassName('cart-quantity')[0]
	var quantity = parseInt(quantityElement.value)

	cartBox.remove() // Удаляем товар из корзины

	// Обновляем общую стоимость
	updatetotal()

	// Обновляем счетчик товаров в корзине
	var cartCount = document.getElementById('cart-count')
	var currentCount = parseInt(cartCount.innerText)
	cartCount.innerText = Math.max(0, currentCount - quantity) // Учитываем количество удаляемого товара
}

// Функция для обработки изменений количества товаров в корзине
function quantityChanged(event) {
	var input = event.target
	// Проверяем, является ли введенное значение положительным числом
	if (isNaN(input.value) || input.value <= 0) {
		input.value = 1
	}
	updatetotal()
}

// Функция для обновления общей стоимости товаров в корзине
function updatetotal() {
	var cartContent = document.getElementsByClassName('cart-content')[0]
	var cartBoxes = cartContent.getElementsByClassName('cart-box')
	var total = 0

	// Проходим по каждому товару в корзине, чтобы рассчитать общую стоимость
	for (var i = 0; i < cartBoxes.length; i++) {
		var cartBox = cartBoxes[i]
		var priceElement = cartBox.getElementsByClassName('cart-price')[0]
		var quantityElement = cartBox.getElementsByClassName('cart-quantity')[0]
		var price = parseFloat(
			priceElement.innerText.replace('₽', '').replace(/\s/g, '')
		)
		var quantity = quantityElement.value

		// Добавляем произведение цены и количества товара к общей стоимости
		total += price * quantity
	}

	// Обновляем элемент общей стоимости с рассчитанной суммой
	document.getElementsByClassName('total-price')[0].innerText = '₽' + total
}


// Отправка заказа на сервер
function placeOrder() {
	// Сохраняем содержимое корзины в локальном хранилище перед переходом
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

function quantityChanged(event) {
	var input = event.target
	var cartBox = input.closest('.cart-box')
	var productId = parseInt(
		cartBox.querySelector('.cart-product-title').getAttribute('data-id')
	)

	fetch(`/api/products/${productId}`)
		.then(response => response.json())
		.then(product => {
			if (input.value > product.количество) {
				alert(
					`Доступно только ${product.количество} штук товара "${product.название}".`
				)
				input.value = product.количество
			} else if (input.value <= 0 || isNaN(input.value)) {
				input.value = 1
			}

			updatetotal()
		})
		.catch(error => console.error('Ошибка проверки количества товара:', error))
}








