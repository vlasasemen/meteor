window.addEventListener('scroll', e => {
	document.body.style.cssText += `--scrollTop: ${window.scrollY}px`
})

gsap.registerPlugin(ScrollTrigger, ScrollSmoother)
ScrollSmoother.create({
	wrapper: '.wrapper',
	content: '.content',
})

$(document).ready(function () {
	$('.layer__header').css('opacity', '0')

	// Анимация появления
	$('.layer__header').animate(
		{
			opacity: 1,
		},
		1500
	)
})
