// Загрузка данных о клиентах
async function loadCustomers() {
	const response = await fetch('/customers')
	const customers = await response.json()

	const customerList = document.getElementById('customer-list')
	customerList.innerHTML = '' // Очистка таблицы

	customers.forEach(customer => {
		const row = document.createElement('tr')
		row.setAttribute('data-id', customer.id)

		row.innerHTML = `
                    <td>${customer.id}</td>
                    <td class="customer-first-name">${customer.имя}</td>
                    <td class="customer-last-name">${customer.фамилия}</td>
                    <td class="customer-email">${customer.email}</td>
                    <td>${customer.роль}</td>
                    <td>
                        <button onclick="deleteCustomer(${customer.id})">Удалить</button>
                    </td>
                `
		customerList.appendChild(row)
	})
}

// Удаление клиента
async function deleteCustomer(customerId) {
	const confirmation = confirm(
		'Вы уверены, что хотите удалить этого покупателя?'
	)
	if (confirmation) {
		try {
			const response = await fetch(`/customers/${customerId}`, {
				method: 'DELETE',
			})
			const result = await response.json()

			if (result.success) {
				document.querySelector(`tr[data-id="${customerId}"]`).remove()
				showNotification('Покупатель успешно удален.')
			} else {
				showNotification('Ошибка при удалении клиента. У покупателя есть активные заказы')
			}
		} catch (error) {
			console.error(error)
			showNotification('Произошла ошибка.')
		}
	}
}



// Показ уведомления
function showNotification(message) {
	const notification = document.getElementById('notification')
	notification.textContent = message
	notification.classList.remove('hidden')

	setTimeout(() => {
		notification.classList.add('hidden')
	}, 3000)
}

// Загрузка данных при загрузке страницы
document.addEventListener('DOMContentLoaded', loadCustomers)
