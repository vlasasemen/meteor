const express = require('express')
const mysql = require('mysql2')
const bodyParser = require('body-parser')
const session = require('express-session')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const iconv = require('iconv-lite')



const app = express()
const port = 3000


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Конфигурация сессий
app.use(
	session({
		secret: 'your_secret_key',
		resave: false,
		saveUninitialized: true,
	})
)


// Создание подключения к базе данных
const db = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '1111',
	database: 'интернет_магазин',
	port: 3307,
	charset: 'utf8mb4',
})

// Подключение к базе данных
db.connect(err => {
	if (err) throw err
	console.log('Подключено к базе данных')
})
app.use(express.static(__dirname + '/public'))

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/public/index.html') // Путь к файлу главной страницы
})

// Страница регистрации
app.get('/register', (req, res) => {
	const message = req.query.message || ''
	res.sendFile(__dirname + '/public/register.html', { message }) // Путь к файлу регистрации
})

app.post('/register', (req, res) => {
	const { name, surname, email, password } = req.body

	db.query(
		'SELECT * FROM пользователи WHERE email = ?',
		[email],
		(err, results) => {
			if (results.length > 0) {
				return res.redirect(
					'/register?message=Пользователь с таким email уже существует.&error=true'
				)
			}

			db.query(
				'INSERT INTO пользователи (имя, фамилия, email, пароль) VALUES (?, ?, ?, ?)',
				[name, surname, email, password],
				err => {
					if (err) {
						console.error(err)
						return res.redirect(
							'/register?message=Ошибка при регистрации.&error=true'
						)
					}
					res.redirect('/register?message=Успешная регистрация!&success=true')
				}
			)
		}
	)
})

// Страница логина
app.get('/login', (req, res) => {
	const message = req.query.message || ''
	res.sendFile(__dirname + '/public/login.html', { message }) // Путь к файлу логина
})

app.post('/login', (req, res) => {
	const { email, password } = req.body

	db.query(
		'SELECT * FROM пользователи WHERE email = ?',
		[email],
		(err, userResults) => {
			if (err || userResults.length === 0) {
				return res.redirect('/login?message=Пользователь не найден&error=true')
			}

			const user = userResults[0]

			if (user.пароль !== password) {
				return res.redirect('/login?message=Неверный пароль&error=true')
			}

			req.session.user = user

			switch (user.роль) {
				case 'покупатель':
					res.redirect('/gender')
					break
				case 'руководитель':
					res.redirect('/pyk')
					break
				case 'администратор':
					res.redirect('/admin')
					break
				default:
					res.redirect('/')
					break
			}
		}
	)
})

// Страница выбора пола (для покупателя)
app.get('/gender', (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'покупатель') {
		return res.redirect('/login') // Если пользователь не авторизован
	}
	res.sendFile(__dirname + '/public/gender.html') // Путь к файлу выбора пола
})

// Панель управления руководителя
app.get('/pyk', (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'руководитель') {
		return res.redirect('/login') // Если не авторизован
	}
	res.sendFile(__dirname + '/public/pyk.html') // Панель управления руководителя
})

// Панель управления администратора
app.get('/admin', (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'администратор') {
		return res.redirect('/login') // Если не авторизован
	}
	res.sendFile(__dirname + '/public/admin.html') // Панель управления администратора
})

// Получение списка клиентов
app.get('/customers', (req, res) => {
    db.query('SELECT id, имя, фамилия, email, роль FROM пользователи', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Ошибка получения данных.' });
        }
        res.json(results);
    });
});

// Удаление клиента
app.delete('/customers/:id', (req, res) => {
    const customerId = req.params.id;

    db.query('DELETE FROM пользователи WHERE id = ?', [customerId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Ошибка удаления пользователя.У пользователя есть активные заказы' });
        }

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Клиент успешно удален.' });
        } else {
            res.json({ success: false, message: 'Клиент не найден.' });
        }
    });
});

// Настройка хранения файлов для загрузки отчетов
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads/')
	},
	filename: (req, file, cb) => {
		const originalName = iconv.encode(file.originalname, 'utf-8') // Преобразование в нужную кодировку
		cb(null, Date.now() + path.extname(file.originalname))
	},
})


const upload = multer({ storage: storage });

// Страница загрузки отчета
app.get('/upload-report', (req, res) => {
  if (!req.session.user || req.session.user.роль !== 'администратор') {
    return res.redirect('/login');
  }
  res.sendFile(__dirname + '/public/upload-report.html');
});

// Обработка загрузки отчета
app.post('/upload-report', upload.single('report'), (req, res) => {
	if (!req.file) {
		return res.redirect(
			'/upload-report?message=Ошибка загрузки файла&error=true'
		)
	}

	const { originalname, path: filePath } = req.file
	const userId = req.session.user.id

	// Кодировка имени файла в базу данных
	const encodedFileName = iconv.decode(originalname, 'utf-8')

	db.query(
		'INSERT INTO отчёты (название, файл, создан_пользователем) VALUES (?, ?, ?)',
		[encodedFileName, filePath, userId],
		err => {
			if (err) {
				console.error(err)
				return res.redirect(
					'/upload-report?message=Ошибка при загрузке отчета&error=true'
				)
			}
			res.redirect('/upload-report?message=Отчет успешно загружен&success=true')
		}
	)
})

// Страница просмотра отчетов для руководителя
app.get('/view-reports', (req, res) => {
  if (!req.session.user || req.session.user.роль !== 'руководитель') {
    return res.redirect('/login');
  }

  db.query('SELECT * FROM отчёты', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Ошибка при получении отчетов');
    }

    res.sendFile(__dirname + '/public/view-reports.html');
  });
});

// Получить список отчетов для руководителя и администратора
app.get('/api/reports', (req, res) => {
  if (!req.session.user || !['руководитель', 'администратор'].includes(req.session.user.роль)) {
    return res.redirect('/login');
  }

  db.query('SELECT * FROM отчёты', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Ошибка получения отчетов' });
    }
    res.json(results);
  });
});

// Скачать отчет
app.get('/download-report/:id', (req, res) => {
	const reportId = req.params.id

	db.query('SELECT * FROM отчёты WHERE id = ?', [reportId], (err, results) => {
		if (err) {
			console.error(err)
			return res.status(500).send('Ошибка при скачивании отчета')
		}

		const report = results[0]
		if (!report) {
			return res.status(404).send('Отчет не найден')
		}

		// Убедитесь, что имя файла с русскими символами в правильной кодировке
		const decodedFileName = iconv.decode(Buffer.from(report.файл), 'utf-8')
		res.download(decodedFileName)
	})
})

// Обновление статуса отчета
app.post('/update-report-status', (req, res) => {
  const { reportId, status } = req.body;

  db.query(
    'UPDATE отчёты SET статус = ? WHERE id = ?',
    [status, reportId],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Ошибка при обновлении статуса');
      }
      res.json({ success: true, message: 'Статус отчета обновлен' });
    }
  );
});

app.delete('/api/reports/:id', (req, res) => {
	const reportId = req.params.id

	// Проверяем статус отчета
	db.query(
		'SELECT статус FROM отчёты WHERE id = ?',
		[reportId],
		(err, results) => {
			if (err) {
				console.error(err)
				return res
					.status(500)
					.json({ success: false, message: 'Ошибка проверки статуса отчета.' })
			}

			if (results.length === 0) {
				return res
					.status(404)
					.json({ success: false, message: 'Отчет не найден.' })
			}

			const reportStatus = results[0].статус

			if (reportStatus === 'Принято') {
				return res
					.status(403)
					.json({ success: false, message: 'Нельзя удалить принятый отчет.' })
			}

			// Удаление отчета
			db.query('DELETE FROM отчёты WHERE id = ?', [reportId], (err, result) => {
				if (err) {
					console.error(err)
					return res
						.status(500)
						.json({ success: false, message: 'Ошибка удаления отчета.' })
				}

				if (result.affectedRows > 0) {
					res.json({ success: true, message: 'Отчет успешно удален.' })
				} else {
					res.json({ success: false, message: 'Отчет не найден.' })
				}
			})
		}
	)
})


// Получение списка товаров
app.get('/api/products', (req, res) => {
	db.query('SELECT * FROM товары WHERE is_deleted = FALSE', (err, results) => {
		if (err) {
			console.error(err)
			return res
				.status(500)
				.json({ success: false, message: 'Ошибка получения данных товаров.' })
		}
		res.json(results)
	})
})


// Получение всех категорий
app.get('/categories', (req, res) => {
    db.query('SELECT * FROM категории', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Ошибка при получении категорий');
        }
        res.json(results);
    });
});

// Получение товаров по фильтрам категории и пола
app.post('/products', (req, res) => {
    const { category, gender } = req.body;
    let query =
			'SELECT * FROM товары WHERE id_категории = ? AND пол = ? AND is_deleted = FALSE'
		db.query(query, [category, gender], (err, results) => {
			if (err) {
				console.error(err)
				return res.status(500).send('Ошибка при получении товаров')
			}
			res.json(results)
		})
});

// Редактирование товара
app.post('/edit-product', (req, res) => {
	const {
		id,
		name,
		description,
		price,
		quantity,
		size,
		image,
		category,
		gender,
	} = req.body
	const query = `
        UPDATE товары 
        SET название = ?, описание = ?, цена = ?, количество = ?, размер = ?, изображение = ?, id_категории = ?, пол = ? 
        WHERE id = ?
    `

	db.query(
		query,
		[name, description, price, quantity, size, image, category, gender, id],
		(err, results) => {
			if (err) {
				console.error(err)
				return res.status(500).send('Ошибка при обновлении товара')
			}
			res.json({ message: 'Товар успешно обновлен' })
		}
	)
})


// Добавление нового товара
app.post('/add-product', (req, res) => {
    const { name, description, price, quantity, size, image, category, gender } = req.body;
    const query = 'INSERT INTO товары (название, описание, цена, количество, размер, изображение, id_категории, пол) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    db.query(query, [name, description, price, quantity, size, image, category, gender], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Ошибка при добавлении товара');
        }
        res.json({ message: 'Товар успешно добавлен' });
    });
});

// Удаление товара
app.post('/delete-product', (req, res) => {
	const { id } = req.body
	const query = 'UPDATE товары SET is_deleted = TRUE WHERE id = ?'

	db.query(query, [id], (err, results) => {
		if (err) {
			console.error(err)
			return res.status(500).send('Ошибка при удалении товара')
		}
		res.json({ message: 'Товар успешно удалён' })
	})
})


app.get('/products/:id', (req, res) => {
	const productId = req.params.id
	const query = 'SELECT * FROM товары WHERE id = ?'

	db.query(query, [productId], (err, results) => {
		if (err) {
			console.error(err)
			return res.status(500).send('Ошибка при получении данных товара')
		}
		if (results.length === 0) {
			return res.status(404).send('Товар не найден')
		}
		res.json(results[0])
	})
})



// Получение списка товаров
app.get('/api/products', (req, res) => {
    db.query('SELECT * FROM товары', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Ошибка получения данных товаров.' });
        }
        res.json(results.map(product => ({
            id: product.id,
            название: product.название,
            описание: product.описание,
            цена: product.цена,
            количество: product.количество,
            размер: product.размер,
            изображение: product.изображение,
            id_категории: product.id_категории,
            пол: product.пол,
        })));
    });
});

// Обработка формы оформления заказа
app.post('/checkout', (req, res) => {
    const { address, deliveryMethod, cartItems } = req.body;

    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Пользователь не авторизован.' });
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ success: false, message: 'Корзина пуста или имеет неверный формат.' });
    }

    const userId = req.session.user.id;
    let totalAmount = 0;

    // Рассчитываем общую сумму заказа
    cartItems.forEach(item => {
        if (!item.price || !item.quantity) {
            return res.status(400).json({ success: false, message: 'Некорректные данные корзины.' });
        }
        totalAmount += item.price * item.quantity;
    });

    // Создаем заказ в таблице "заказы"
    db.query(
        'INSERT INTO заказы (id_пользователя, сумма, адрес_доставки, способ_доставки) VALUES (?, ?, ?, ?)',
        [userId, totalAmount, address, deliveryMethod],
        (err, orderResult) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Ошибка создания заказа.' });
            }

            const orderId = orderResult.insertId;

            // Добавляем детали заказа
            const orderDetails = cartItems.map(item => [orderId, item.id, item.quantity, item.price]);

            db.query(
                'INSERT INTO детали_заказа (id_заказа, id_товара, количество, цена) VALUES ?',
                [orderDetails],
                err => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({
                            success: false,
                            message: 'Ошибка добавления товаров заказа.',
                        });
                    }

                    // Успешное оформление заказа
                    res.json({ success: true, message: 'Заказ успешно создан.' });
                }
            );
        }
    );
});


app.get('/api/products/:id', (req, res) => {
	const productId = parseInt(req.params.id)
	db.query(
		'SELECT id, название, количество FROM товары WHERE id = ?',
		[productId],
		(err, results) => {
			if (err || results.length === 0) {
				console.error(err || 'Товар не найден')
				return res
					.status(404)
					.json({ success: false, message: 'Товар не найден.' })
			}
			res.json(results[0])
		}
	)
})



// Запуск сервера
app.listen(port, () => {
	console.log(`Сервер запущен на http://localhost:${port}`)
})
