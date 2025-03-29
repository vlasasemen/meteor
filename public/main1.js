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

        

