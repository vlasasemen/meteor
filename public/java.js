window.addEventListener('scroll', e => {
  document.body.style.cssText += `--scrollTop: ${this.scrollY}px`
})

$(document).ready(function(){
    $('.layer__header').css('opacity', '0'); // Начальная непрозрачность

    // Анимация появления
    $('.layer__header').animate({
        opacity: 1 // Конечная непрозрачность
    }, 1500); // Время анимации в миллисекундах (2 секунды)
});

gsap.registerPlugin(ScrollTrigger,ScrollSmoother)
ScrollSmoother.create({
    wrapper:'.wrapper',
    content:'.content'
})
