const ctx = document.getElementById('productCategoriesChart').getContext('2d');
const productCategoriesChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Кепки', 'Ремни', 'Сумки'],
        datasets: [{
            label: 'Популярные категории товаров',
            data: [5000, 3000, 7000], // Example data, adjust as needed
            backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)'
            ],
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Количество продаж',
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
                        family: 'raleway_f'
                    }
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Категории',
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
                        family: 'raleway_f'
                    }
                }
            }
        },
        plugins: {
            title: {
                display: true,
                text: 'Популярные категории товаров',
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
                        family: 'raleway_f'
                    }
                }
            }
        }
    }
});
