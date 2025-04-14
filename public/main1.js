document.addEventListener('DOMContentLoaded', function() {
    var dropdowns = document.querySelectorAll('.dropbtn');
    dropdowns.forEach(function(dropbtn) {
        dropbtn.addEventListener('click', function(event) {
            event.preventDefault();

    
            var dropdownContents = document.querySelectorAll('.dropdown-content');
            dropdownContents.forEach(function(content) {
                content.classList.remove('show');
            });

            
            var dropdownContent = this.nextElementSibling;
            dropdownContent.classList.toggle('show');
        });
    });
});

window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName('dropdown-content');
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
	const notification = document.getElementById('notification')
	const notificationMessage = document.getElementById('notification-message')

	// Функция для показа уведомления
	function showNotification(message, isError = false) {
		notificationMessage.textContent = message
		notification.style.display = 'block'
		if (isError) {
			notification.classList.add('notification-error')
		} else {
			notification.classList.remove('notification-error')
		}

		// Скрыть уведомление через 2 секунд
		setTimeout(() => {
			notification.style.display = 'none'
		}, 2000)
	}

	// Пример использования уведомлений
	const params = new URLSearchParams(window.location.search)
	if (params.has('message')) {
		const message = params.get('message')
		const isError = params.get('error') === 'true'
		showNotification(message, isError)
	}
})


 // Отображаем уведомление о успешной регистрации
        const urlParams = new URLSearchParams(window.location.search);
        const message = urlParams.get('message');
        const success = urlParams.get('success');

        if (message) {
            const notification = document.getElementById('notification');
            const notificationMessage = document.getElementById('notification-message');
            notificationMessage.textContent = message;
            notification.style.display = 'block';

            // Если регистрация успешна, автоматически перенаправляем на страницу логина
            if (success) {
                setTimeout(() => {
                    window.location.href = '/login'; // Переход на страницу логина
                }, 500); // Задержка 3 секунды перед редиректом
            }
        }

document.addEventListener('DOMContentLoaded', function () {
	// Проверка авторизации при загрузке страницы
	checkAuthStatus()

	// Обработчик для ссылки на личный кабинет
	const accountLink = document.getElementById('account-link')
	if (accountLink) {
		accountLink.addEventListener('click', function (e) {
			// Проверяем авторизацию перед переходом
			fetch('/api/user-info')
				.then(response => {
					if (!response.ok) {
						// Если не авторизован, перенаправляем на страницу входа
						e.preventDefault()
						window.location.href = '/login'
						throw new Error('Не авторизован')
					}
					// Если авторизован, переход разрешен
				})
				.catch(error => {
					console.error('Ошибка проверки авторизации:', error)
				})
		})
	}

	// Функция проверки статуса авторизации
	function checkAuthStatus() {
		fetch('/api/user-info')
			.then(response => {
				if (!response.ok) {
					// Пользователь не авторизован
					return
				}
				return response.json()
			})
			.then(user => {
				if (user) {
					// Можно добавить дополнительные действия для авторизованного пользователя
					console.log('Пользователь авторизован:', user)
				}
			})
			.catch(error => {
				console.error('Ошибка проверки авторизации:', error)
			})
	}
})

document.addEventListener('DOMContentLoaded', function () {
	const burger = document.getElementById('burger')
	const navUl = document.querySelector('nav ul')

	burger.addEventListener('click', function () {
		navUl.classList.toggle('active')
	})
})


        

