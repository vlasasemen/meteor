// Загружаем категории при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
	// Загрузка категорий
	fetch('/categories')
		.then(response => response.json())
		.then(categories => {
			const categorySelects = document.querySelectorAll(
				'select[name="category"]'
			)
			categorySelects.forEach(select => {
				categories.forEach(category => {
					const option = document.createElement('option')
					option.value = category.id
					option.textContent = category.название
					select.appendChild(option)
				})
			})
		})

	// Загрузка товаров по фильтрам
	document
		.getElementById('filter-form')
		.addEventListener('submit', function (e) {
			e.preventDefault()
			const category = document.getElementById('category').value
			const gender = document.getElementById('gender').value

			fetch('/products', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ category, gender }),
			})
				.then(response => response.json())
				.then(products => {
					const productList = document.getElementById('product-list')
					productList.innerHTML = ''
					products.forEach(product => {
						const row = document.createElement('tr')
						row.innerHTML = `
                    <td>${product.id}</td>
                    <td>${product.название}</td>
                    <td>${product.цена}</td>
                    <td>${product.размер}</td>
                    <td>${product.количество}</td>
                    <td>${product.пол}</td>
                    <td>
                        <button class="edit-btn" data-id="${product.id}">Редактировать</button>
                        <button class="delete-btn" data-id="${product.id}">Удалить</button>
                    </td>
                `
						productList.appendChild(row)
					})
				})
		})

	// Редактирование товара
	document
		.getElementById('product-list')
		.addEventListener('click', function (e) {
			if (e.target.classList.contains('edit-btn')) {
				const productId = e.target.dataset.id

				// Загрузка данных товара
				fetch(`/products/${productId}`)
					.then(response => response.json())
					.then(product => {
						// Заполнение формы редактирования
						document.getElementById('edit-product-id').value = product.id
						document.getElementById('edit-product-name').value =
							product.название
						document.getElementById('edit-product-description').value =
							product.описание
						document.getElementById('edit-product-price').value = product.цена
						document.getElementById('edit-product-quantity').value =
							product.количество
						document.getElementById('edit-product-size').value = product.размер
						document.getElementById('edit-product-image').value =
							product.изображение
						document.getElementById('edit-product-category').value =
							product.id_категории
						document.getElementById('edit-product-gender').value = product.пол

						// Отображение формы редактирования
						document.getElementById('edit-product-container').style.display =
							'block'
					})
			}
		})

	// Закрытие формы редактирования
	document.getElementById('cancel-edit').addEventListener('click', function () {
		document.getElementById('edit-product-container').style.display = 'none'
	})


	// Отправка формы редактирования
	document
		.getElementById('edit-product-form')
		.addEventListener('submit', function (e) {
			e.preventDefault()

			const formData = new FormData(this)
			const data = {}
			formData.forEach((value, key) => {
				data[key] = value
			})

			// Добавляем ID товара в данные
			const productId = document.getElementById('edit-product-id').value
			data.id = productId

			fetch('/edit-product', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			})
				.then(response => response.json())
				.then(result => {
					alert(result.message)
					location.reload() // Перезагрузка страницы для обновления списка
				})
				.catch(error => {
					console.error('Ошибка при редактировании товара:', error)
					alert('Ошибка при редактировании товара')
				})
		})


	// Удаление товара
	document
		.getElementById('product-list')
		.addEventListener('click', function (e) {
			if (e.target.classList.contains('delete-btn')) {
				const productId = e.target.dataset.id

				fetch('/delete-product', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ id: productId }),
				})
					.then(response => response.json())
					.then(result => {
						alert(result.message)
						location.reload() // Перезагрузка страницы для обновления списка
					})
			}
		})

	// Добавление товара
	document
		.getElementById('add-product-form')
		.addEventListener('submit', function (e) {
			e.preventDefault()

			const formData = new FormData(this)
			const data = {}
			formData.forEach((value, key) => {
				data[key] = value
			})

			fetch('/add-product', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			})
				.then(response => response.json())
				.then(result => {
					alert(result.message)
					location.reload() // Перезагрузка страницы для обновления списка
				})
		})
})
