// Инициализация графиков
const salesByCategoryChart = new Chart(
	document.getElementById('salesByCategoryChart').getContext('2d'),
	{
		type: 'bar',
		data: {
			labels: [],
			datasets: [
				{
					label: 'Продажи по категориям',
					data: [],
					backgroundColor: 'rgba(255, 99, 132, 0.6)',
				},
			],
		},
		options: {
			responsive: true,
			scales: {
				y: {
					beginAtZero: true,
					title: { display: true, text: 'Сумма продаж', color: '#fffb00' },
					ticks: { color: '#fffb00' },
				},
				x: {
					title: { display: true, text: 'Категории', color: '#fffb00' },
					ticks: { color: '#fffb00' },
				},
			},
			plugins: {
				title: {
					display: true,
					text: 'Продажи по категориям',
					color: '#fffb00',
					font: { size: 18, family: 'raleway_f', weight: 'bold' },
				},
				legend: { labels: { color: '#fffb00' } },
			},
		},
	}
)

const salesByMonthChart = new Chart(
	document.getElementById('salesByMonthChart').getContext('2d'),
	{
		type: 'line',
		data: {
			labels: [],
			datasets: [
				{
					label: 'Продажи по месяцам',
					data: [],
					borderColor: 'rgba(54, 162, 235, 1)',
					fill: false,
				},
			],
		},
		options: {
			responsive: true,
			scales: {
				y: {
					beginAtZero: true,
					title: { display: true, text: 'Сумма продаж', color: '#fffb00' },
					ticks: { color: '#fffb00' },
				},
				x: {
					title: { display: true, text: 'Месяц', color: '#fffb00' },
					ticks: { color: '#fffb00' },
				},
			},
			plugins: {
				title: {
					display: true,
					text: 'Продажи по месяцам',
					color: '#fffb00',
					font: { size: 18, family: 'raleway_f', weight: 'bold' },
				},
				legend: { labels: { color: '#fffb00' } },
			},
		},
	}
)

// Загрузка категорий в выпадающий список
async function loadCategories() {
	try {
		const response = await fetch('/categories')
		const categories = await response.json()
		const categorySelect = document.getElementById('category')
		categories.forEach(category => {
			const option = document.createElement('option')
			option.value = category.id
			option.textContent = category.название
			categorySelect.appendChild(option)
		})
	} catch (err) {
		console.error('Ошибка загрузки категорий:', err)
	}
}

// Загрузка данных для графиков
async function loadSalesData() {
	const dateFrom = document.getElementById('date-from').value
	const dateTo = document.getElementById('date-to').value
	const category = document.getElementById('category').value
	const gender = document.getElementById('gender').value
	const status = document.getElementById('status').value

	try {
		const response = await fetch('/api/sales-statistics', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ dateFrom, dateTo, category, gender, status }),
		})
		const data = await response.json()

		// Обновление графика по категориям
		salesByCategoryChart.data.labels = data.byCategory.map(
			item => item.название
		)
		salesByCategoryChart.data.datasets[0].data = data.byCategory.map(
			item => item.total
		)
		salesByCategoryChart.update()

		// Обновление графика по месяцам
		salesByMonthChart.data.labels = data.byMonth.map(item => item.month)
		salesByMonthChart.data.datasets[0].data = data.byMonth.map(
			item => item.total
		)
		salesByMonthChart.update()
	} catch (err) {
		console.error('Ошибка загрузки данных:', err)
	}
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
	loadCategories()
	loadSalesData()
})
