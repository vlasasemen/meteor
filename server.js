const express = require('express')
const { Pool } = require('pg')
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

app.use(
	session({
		secret: 'your_secret_key',
		resave: false,
		saveUninitialized: true,
	})
)

// Подключение к PostgreSQL
const db = new Pool({
	host: 'localhost',
	user: 'postgres', // Замените на вашего пользователя
	password: '1111', // Замените на ваш пароль
	database: 'интернет_магазин',
	port: 5432,
})

db.connect(err => {
	if (err) throw err
	console.log('Подключено к базе данных PostgreSQL')
})

app.use(express.static(__dirname + '/public'))

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/public/index.html')
})

// Страница регистрации
app.get('/register', (req, res) => {
	const message = req.query.message || ''
	res.sendFile(__dirname + '/public/register.html')
})

app.post('/register', async (req, res) => {
	const { name, surname, email, password } = req.body

	try {
		const result = await db.query(
			'SELECT * FROM пользователи WHERE email = $1',
			[email]
		)
		if (result.rows.length > 0) {
			return res.redirect(
				'/register?message=Пользователь с таким email уже существует.&error=true'
			)
		}

		await db.query(
			'INSERT INTO пользователи (имя, фамилия, email, пароль) VALUES ($1, $2, $3, $4)',
			[name, surname, email, password]
		)
		res.redirect('/register?message=Успешная регистрация!&success=true')
	} catch (err) {
		console.error(err)
		res.redirect('/register?message=Ошибка при регистрации.&error=true')
	}
})

// Страница логина
app.get('/login', (req, res) => {
	const message = req.query.message || ''
	res.sendFile(__dirname + '/public/login.html')
})

app.post('/login', async (req, res) => {
	const { email, password } = req.body

	try {
		const result = await db.query(
			'SELECT * FROM пользователи WHERE email = $1',
			[email]
		)
		if (result.rows.length === 0) {
			return res.redirect('/login?message=Пользователь не найден&error=true')
		}

		const user = result.rows[0]
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
	} catch (err) {
		console.error(err)
		res.redirect('/login?message=Ошибка входа&error=true')
	}
})

// Страница выбора пола
app.get('/gender', (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'покупатель') {
		return res.redirect('/login')
	}
	res.sendFile(__dirname + '/public/gender.html')
})

// Панель руководителя
app.get('/pyk', (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'руководитель') {
		return res.redirect('/login')
	}
	res.sendFile(__dirname + '/public/pyk.html')
})

// Панель администратора
app.get('/admin', (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'администратор') {
		return res.redirect('/login')
	}
	res.sendFile(__dirname + '/public/admin.html')
})

// Получение списка клиентов
app.get('/customers', async (req, res) => {
	try {
		const result = await db.query(
			'SELECT id, имя, фамилия, email, роль FROM пользователи'
		)
		res.json(result.rows)
	} catch (err) {
		console.error(err)
		res
			.status(500)
			.json({ success: false, message: 'Ошибка получения данных.' })
	}
})

// Удаление клиента
app.delete('/customers/:id', async (req, res) => {
	const customerId = req.params.id

	try {
		const result = await db.query('DELETE FROM пользователи WHERE id = $1', [
			customerId,
		])
		if (result.rowCount > 0) {
			res.json({ success: true, message: 'Клиент успешно удален.' })
		} else {
			res.json({ success: false, message: 'Клиент не найден.' })
		}
	} catch (err) {
		console.error(err)
		res
			.status(500)
			.json({
				success: false,
				message:
					'Ошибка удаления пользователя. У пользователя есть активные заказы',
			})
	}
})

// Настройка загрузки файлов
const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, 'uploads/'),
	filename: (req, file, cb) => {
		const originalName = iconv.encode(file.originalname, 'utf-8')
		cb(null, Date.now() + path.extname(file.originalname))
	},
})

const upload = multer({ storage: storage })

// Страница загрузки отчета
app.get('/upload-report', (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'администратор') {
		return res.redirect('/login')
	}
	res.sendFile(__dirname + '/public/upload-report.html')
})

app.post('/upload-report', upload.single('report'), async (req, res) => {
	if (!req.file) {
		return res.redirect(
			'/upload-report?message=Ошибка загрузки файла&error=true'
		)
	}

	const { originalname, path: filePath } = req.file
	const userId = req.session.user.id
	const encodedFileName = iconv.decode(originalname, 'utf-8')

	try {
		await db.query(
			'INSERT INTO отчёты (название, файл, создан_пользователем) VALUES ($1, $2, $3)',
			[encodedFileName, filePath, userId]
		)
		res.redirect('/upload-report?message=Отчет успешно загружен&success=true')
	} catch (err) {
		console.error(err)
		res.redirect('/upload-report?message=Ошибка при загрузке отчета&error=true')
	}
})

// Страница просмотра отчетов
app.get('/view-reports', async (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'руководитель') {
		return res.redirect('/login')
	}
	try {
		await db.query('SELECT * FROM отчёты')
		res.sendFile(__dirname + '/public/view-reports.html')
	} catch (err) {
		console.error(err)
		res.status(500).send('Ошибка при получении отчетов')
	}
})

// Получение списка отчетов
app.get('/api/reports', async (req, res) => {
	if (
		!req.session.user ||
		!['руководитель', 'администратор'].includes(req.session.user.роль)
	) {
		return res.redirect('/login')
	}

	try {
		const result = await db.query('SELECT * FROM отчёты')
		res.json(result.rows)
	} catch (err) {
		console.error(err)
		res
			.status(500)
			.json({ success: false, message: 'Ошибка получения отчетов' })
	}
})

// Скачивание отчета
app.get('/download-report/:id', async (req, res) => {
	const reportId = req.params.id

	try {
		const result = await db.query('SELECT * FROM отчёты WHERE id = $1', [
			reportId,
		])
		if (result.rows.length === 0) {
			return res.status(404).send('Отчет не найден')
		}

		const report = result.rows[0]
		const decodedFileName = iconv.decode(Buffer.from(report.файл), 'utf-8')
		res.download(decodedFileName)
	} catch (err) {
		console.error(err)
		res.status(500).send('Ошибка при скачивании отчета')
	}
})

// Обновление статуса отчета
app.post('/update-report-status', async (req, res) => {
	const { reportId, status } = req.body

	try {
		await db.query('UPDATE отчёты SET статус = $1 WHERE id = $2', [
			status,
			reportId,
		])
		res.json({ success: true, message: 'Статус отчета обновлен' })
	} catch (err) {
		console.error(err)
		res.status(500).send('Ошибка при обновлении статуса')
	}
})

// Удаление отчета
app.delete('/api/reports/:id', async (req, res) => {
	const reportId = req.params.id

	try {
		const statusResult = await db.query(
			'SELECT статус FROM отчёты WHERE id = $1',
			[reportId]
		)
		if (statusResult.rows.length === 0) {
			return res
				.status(404)
				.json({ success: false, message: 'Отчет не найден.' })
		}

		const reportStatus = statusResult.rows[0].статус
		if (reportStatus === 'Принято') {
			return res
				.status(403)
				.json({ success: false, message: 'Нельзя удалить принятый отчет.' })
		}

		const result = await db.query('DELETE FROM отчёты WHERE id = $1', [
			reportId,
		])
		if (result.rowCount > 0) {
			res.json({ success: true, message: 'Отчет успешно удален.' })
		} else {
			res.json({ success: false, message: 'Отчет не найден.' })
		}
	} catch (err) {
		console.error(err)
		res.status(500).json({ success: false, message: 'Ошибка удаления отчета.' })
	}
})

// Получение списка товаров
app.get('/api/products', async (req, res) => {
	try {
		const result = await db.query(
			'SELECT * FROM товары WHERE is_deleted = FALSE'
		)
		res.json(result.rows)
	} catch (err) {
		console.error(err)
		res
			.status(500)
			.json({ success: false, message: 'Ошибка получения данных товаров.' })
	}
})

// Получение категорий
app.get('/categories', async (req, res) => {
	try {
		const result = await db.query('SELECT * FROM категории')
		res.json(result.rows)
	} catch (err) {
		console.error(err)
		res.status(500).send('Ошибка при получении категорий')
	}
})

// Получение товаров по фильтрам
app.post('/products', async (req, res) => {
	const { category, gender } = req.body

	try {
		const result = await db.query(
			'SELECT * FROM товары WHERE id_категории = $1 AND пол = $2 AND is_deleted = FALSE',
			[category, gender]
		)
		res.json(result.rows)
	} catch (err) {
		console.error(err)
		res.status(500).send('Ошибка при получении товаров')
	}
})

// Редактирование товара
app.post('/edit-product', async (req, res) => {
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

	try {
		await db.query(
			'UPDATE товары SET название = $1, описание = $2, цена = $3, количество = $4, размер = $5, изображение = $6, id_категории = $7, пол = $8 WHERE id = $9',
			[name, description, price, quantity, size, image, category, gender, id]
		)
		res.json({ message: 'Товар успешно обновлен' })
	} catch (err) {
		console.error(err)
		res.status(500).send('Ошибка при обновлении товара')
	}
})

// Добавление товара
app.post('/add-product', async (req, res) => {
	const { name, description, price, quantity, size, image, category, gender } =
		req.body

	try {
		await db.query(
			'INSERT INTO товары (название, описание, цена, количество, размер, изображение, id_категории, пол) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
			[name, description, price, quantity, size, image, category, gender]
		)
		res.json({ message: 'Товар успешно добавлен' })
	} catch (err) {
		console.error(err)
		res.status(500).send('Ошибка при добавлении товара')
	}
})

// Удаление товара
app.post('/delete-product', async (req, res) => {
	const { id } = req.body

	try {
		await db.query('UPDATE товары SET is_deleted = TRUE WHERE id = $1', [id])
		res.json({ message: 'Товар успешно удалён' })
	} catch (err) {
		console.error(err)
		res.status(500).send('Ошибка при удалении товара')
	}
})

// Получение конкретного товара
app.get('/products/:id', async (req, res) => {
	const productId = req.params.id

	try {
		const result = await db.query('SELECT * FROM товары WHERE id = $1', [
			productId,
		])
		if (result.rows.length === 0) {
			return res.status(404).send('Товар не найден')
		}
		res.json(result.rows[0])
	} catch (err) {
		console.error(err)
		res.status(500).send('Ошибка при получении данных товара')
	}
})

// Оформление заказа
app.post('/checkout', async (req, res) => {
	const { address, deliveryMethod, cartItems } = req.body

	if (!req.session.user) {
		return res
			.status(401)
			.json({ success: false, message: 'Пользователь не авторизован.' })
	}

	if (!Array.isArray(cartItems) || cartItems.length === 0) {
		return res
			.status(400)
			.json({
				success: false,
				message: 'Корзина пуста или имеет неверный формат.',
			})
	}

	const userId = req.session.user.id
	let totalAmount = 0

	cartItems.forEach(item => {
		if (!item.price || !item.quantity) {
			return res
				.status(400)
				.json({ success: false, message: 'Некорректные данные корзины.' })
		}
		totalAmount += item.price * item.quantity
	})

	try {
		const orderResult = await db.query(
			'INSERT INTO заказы (id_пользователя, сумма, адрес_доставки, способ_доставки) VALUES ($1, $2, $3, $4) RETURNING id',
			[userId, totalAmount, address, deliveryMethod]
		)
		const orderId = orderResult.rows[0].id

		const orderDetails = cartItems.map(item => [
			orderId,
			item.id,
			item.quantity,
			item.price,
		])
		await db.query(
			'INSERT INTO детали_заказа (id_заказа, id_товара, количество, цена) VALUES ' +
				orderDetails
					.map(
						(_, i) =>
							`($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
					)
					.join(', '),
			orderDetails.flat()
		)

		res.json({ success: true, message: 'Заказ успешно создан.' })
	} catch (err) {
		console.error(err)
		res.status(500).json({ success: false, message: 'Ошибка создания заказа.' })
	}
})

// Получение товара по ID для корзины
app.get('/api/products/:id', async (req, res) => {
	const productId = parseInt(req.params.id)

	try {
		const result = await db.query(
			'SELECT id, название, количество FROM товары WHERE id = $1',
			[productId]
		)
		if (result.rows.length === 0) {
			return res
				.status(404)
				.json({ success: false, message: 'Товар не найден.' })
		}
		res.json(result.rows[0])
	} catch (err) {
		console.error(err)
		res.status(404).json({ success: false, message: 'Товар не найден.' })
	}
})

// Личный кабинет пользователя
app.get('/account', async (req, res) => {
    if (!req.session.user || req.session.user.роль !== 'покупатель') {
        return res.redirect('/login');
    }
    res.sendFile(__dirname + '/public/account.html');
});

// Получение информации о пользователе
app.get('/api/user-info', async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ success: false, message: 'Не авторизован' })
	}

	try {
		const result = await db.query(
			'SELECT id, имя, фамилия, email, телефон, дата_регистрации FROM пользователи WHERE id = $1',
			[req.session.user.id]
		)
		if (result.rows.length === 0) {
			return res
				.status(404)
				.json({ success: false, message: 'Пользователь не найден' })
		}
		res.json(result.rows[0])
	} catch (err) {
		console.error(err)
		res.status(500).json({ success: false, message: 'Ошибка сервера' })
	}
})

// Получение заказов пользователя
app.get('/api/user-orders', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Не авторизован' });
    }

    try {
        const ordersResult = await db.query(
            `SELECT з.id, з.дата_заказа as "дата_создания", з.сумма, з.адрес_доставки, 
             з.способ_доставки, з.статус 
             FROM заказы з 
             WHERE з.id_пользователя = $1 
             ORDER BY з.дата_заказа DESC`,
            [req.session.user.id]
        );

        const ordersWithDetails = await Promise.all(
            ordersResult.rows.map(async order => {
                const detailsResult = await db.query(
                    `SELECT д.количество, д.цена, т.название, т.изображение, т.размер 
                     FROM детали_заказа д 
                     JOIN товары т ON д.id_товара = т.id 
                     WHERE д.id_заказа = $1`,
                    [order.id]
                );
                return {
                    ...order,
                    items: detailsResult.rows,
                };
            })
        );

        res.json(ordersWithDetails);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Обновление информации пользователя
app.post('/api/update-user', async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ success: false, message: 'Не авторизован' })
	}

	const { name, surname, email, phone } = req.body

	try {
		const emailCheck = await db.query(
			'SELECT id FROM пользователи WHERE email = $1 AND id != $2',
			[email, req.session.user.id]
		)

		if (emailCheck.rows.length > 0) {
			return res.status(400).json({
				success: false,
				message: 'Этот email уже используется другим пользователем',
			})
		}

		await db.query(
			'UPDATE пользователи SET имя = $1, фамилия = $2, email = $3, телефон = $4 WHERE id = $5',
			[name, surname, email, phone, req.session.user.id]
		)

		req.session.user.имя = name
		req.session.user.фамилия = surname
		req.session.user.email = email
		req.session.user.телефон = phone

		res.json({
			success: true,
			message: 'Данные успешно обновлены',
			имя: name,
			фамилия: surname,
			email,
			телефон: phone,
		})
	} catch (err) {
		console.error(err)
		res
			.status(500)
			.json({ success: false, message: 'Ошибка обновления данных' })
	}
})

// Смена пароля
app.post('/api/change-password', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Не авторизован' });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    try {
        // Проверяем текущий пароль
        const userCheck = await db.query(
            'SELECT id FROM пользователи WHERE id = $1 AND пароль = $2',
            [req.session.user.id, currentPassword]
        );
        
        if (userCheck.rows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Текущий пароль неверен' 
            });
        }
        
        // Обновляем пароль
        await db.query(
            'UPDATE пользователи SET пароль = $1 WHERE id = $2',
            [newPassword, req.session.user.id]
        );
        
        res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Ошибка смены пароля' });
    }
});

// Выход из системы
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Ошибка выхода' });
        }
        res.json({ success: true, message: 'Успешный выход' });
    });
});

app.listen(port, () => {
	console.log(`Сервер запущен на http://localhost:${port}`)
})
