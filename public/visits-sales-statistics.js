// Загрузка статистики
async function loadStatistics() {
	try {
		// Загрузка статистики посещений
		const visitsResponse = await fetch('/api/visits-statistics')
		const visitsData = await visitsResponse.json()

		// Загрузка статистики продаж
		const salesResponse = await fetch('/api/visits-sales-statistics')
		const salesData = await salesResponse.json()

		// Загрузка данных о посещениях страниц
		const pageVisitsResponse = await fetch('/api/page-visits')
		const pageVisitsData = await pageVisitsResponse.json()

		// Загрузка данных о продажах товаров
		const productSalesResponse = await fetch('/api/product-sales')
		const productSalesData = await productSalesResponse.json()

		// Обновление статистики посещений
		document.getElementById('total-visits').textContent = visitsData.totalVisits
		document.getElementById('unique-visitors').textContent =
			visitsData.uniqueVisitors

		// Обновление списка посещений страниц (с фильтрацией API и очисткой URL)
		const pageVisitsList = document.getElementById('page-visits-list')
		pageVisitsList.innerHTML = '' // Очищаем список перед добавлением новых данных

		pageVisitsData
			.filter(visit => !visit.page.startsWith('/api/')) // Исключаем API
			.forEach(visit => {
				const cleanUrl = visit.page.split('?')[0] // Удаляем параметры из URL
				const li = document.createElement('li')
				li.textContent = `${cleanUrl} - Кол-во посещений: ${visit.count}`
				pageVisitsList.appendChild(li)
			})

		// Обновление статистики продаж
		document.getElementById('total-orders').textContent = salesData.totalOrders
		document.getElementById('total-sales').textContent =
			salesData.totalSales.toFixed(2)

		// Обновление списка продаж товаров
		const productSalesList = document.getElementById('product-sales-list')
		productSalesList.innerHTML = '' // Очищаем список
		productSalesData.forEach(sale => {
			const li = document.createElement('li')
			li.textContent = `Товар ID ${sale.product_id} - Количество продаж: ${sale.count}`
			productSalesList.appendChild(li)
		})
	} catch (err) {
		console.error('Ошибка загрузки статистики:', err)
	}
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
	loadStatistics()
})
