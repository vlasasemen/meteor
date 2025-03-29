const ctx = document.getElementById('visitsPieChart').getContext('2d');
const visitsPieChart = new Chart(ctx, {
    type: 'pie',
    data: {
        labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
        datasets: [{
            label: 'Посещения в 2024 году',
            data: [1200, 1500, 1800, 2000, 2200, 2500, 2700, 3000, 3200, 3400, 3600, 4000],
            backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
                'rgba(255, 159, 64, 0.6)',
                'rgba(199, 199, 199, 0.6)',
                'rgba(83, 102, 255, 0.6)',
                'rgba(175, 159, 64, 0.6)',
                'rgba(54, 162, 145, 0.6)',
                'rgba(153, 80, 255, 0.6)',
                'rgba(100, 255, 132, 0.6)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(199, 199, 199, 1)',
                'rgba(83, 102, 255, 1)',
                'rgba(175, 159, 64, 1)',
                'rgba(54, 162, 145, 1)',
                'rgba(153, 80, 255, 1)',
                'rgba(100, 255, 132, 1)'
            ],
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: 'Посещения сайта по месяцам',
                color: '#fffb00',
                font: {
                    size: 18,
                    family: 'raleway_f',
                    weight: 'bold'
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                titleFont: {
                    size: 14,
                    family: 'raleway_f',
                    weight: 'bold'
                },
                bodyFont: {
                    size: 12,
                    family: 'raleway_f'
                }
            },
            legend: {
                labels: {
                    color: '#fffb00',
                    font: {
                        size: 14,
                        family: 'raleway_f',
                    }
                }
            }
        }
    }
});