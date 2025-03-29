const ctx = document.getElementById('salesComparisonChart').getContext('2d');
const salesComparisonChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
        datasets: [
            {
                label: '2022',
                data: [3000, 2500, 3200, 2800, 3500, 3700, 4000, 4200, 4500, 4800, 5000, 5300],
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 1,
                tension: 0.4
            },
            {
                label: '2023',
                data: [3500, 2800, 3300, 2900, 3700, 3900, 4200, 4500, 4800, 5100, 5500, 5800],
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                borderWidth: 1,
                tension: 0.4
            },
            {
                label: '2024',
                data: [4000, 3000, 3500, 3100, 3900, 4200, 4500, 4700, 5000, 5300, 5700, 6000],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderWidth: 1,
                tension: 0.4
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Продажи (в тыс.)',
                    color: '#fffb00',
                    font: {
                        size: 16,
                        family: 'raleway_f',
                        weight: 'bold'
                    }
                },
                ticks: {
                    color: '#fffb00',
                    font: {
                        size: 14,
                        family: 'raleway_f',
                    }
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Месяц',
                    color: '#fffb00',
                    font: {
                        size: 16,
                        family: 'raleway_f',
                        weight: 'bold'
                    }
                },
                ticks: {
                    color: '#fffb00',
                    font: {
                        size: 14,
                        family: 'raleway_f',
                    }
                }
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Сравнение продаж по годам',
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
