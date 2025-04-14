// Проверяем, является ли устройство мобильным
const isMobile =
	/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		navigator.userAgent
	)

if (!isMobile) {
	// Параллакс эффекты только для десктопов
	window.addEventListener('scroll', e => {
		document.body.style.cssText += `--scrollTop: ${window.scrollY}px`
	})

	gsap.registerPlugin(ScrollTrigger, ScrollSmoother)
	ScrollSmoother.create({
		wrapper: '.wrapper',
		content: '.content',
	})
}

$(document).ready(function () {
	$('.layer__header').css('opacity', '0')

	// Анимация появления
	$('.layer__header').animate(
		{
			opacity: 1,
		},
		1500
	)

	// Для мобильных устройств отключаем сложные анимации
	if (isMobile) {
		$(
			'.layer, .layer__header, .main-article__header, .main-article__paragraph'
		).css({
			transform: 'none',
			transition: 'none',
			'will-change': 'auto',
		})
	}
})
