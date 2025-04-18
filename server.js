const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');
const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 3000;

const logFilePath = 'logs/visits.log';
const orderLogFilePath = 'logs/orders.log';
const maxLogSize = 10 * 1024 * 1024; // 10 MB

app.use(cookieParser());

function rotateLogFile(filePath) {
	if (fs.existsSync(filePath)) {
		const stats = fs.statSync(filePath);
		if (stats.size > maxLogSize) {
			const archivePath = `${filePath}.${new Date()
				.toISOString()
				.replace(/:/g, '-')}.bak`;
			fs.renameSync(filePath, archivePath);
		}
	}
}

app.use((req, res, next) => {
	// Пропускаем статику и API
	if (
		req.path.startsWith('/css/') ||
		req.path.startsWith('/js/') ||
		req.path.startsWith('/img/') ||
		req.path.startsWith('/api/') ||
		req.path.endsWith('.css') ||
		req.path.endsWith('.js') ||
		req.path.endsWith('.png') ||
		req.path.endsWith('.jpg')
	) {
		return next();
	}

	// Логируем только HTML-страницы
	rotateLogFile(logFilePath);
	const timestamp = new Date().toISOString();
	const ip = req.ip;
	const method = req.method;
	const url = req.originalUrl.split('?')[0]; // Убираем параметры URL
	const userAgent = req.get('User-Agent') || 'Unknown';

	let userId = req.cookies.userId;
	if (!userId) {
		userId = uuidv4();
		res.cookie('userId', userId, {
			maxAge: 365 * 24 * 60 * 60 * 1000, // 1 год
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production', // Для HTTPS
			sameSite: 'lax',
		});
	}

	const logEntry = `${timestamp} | IP: ${ip} | UserID: ${userId} | Method: ${method} | URL: ${url} | User-Agent: ${userAgent}\n`;
	fs.appendFile(logFilePath, logEntry, err => {
		if (err) console.error('Ошибка записи в лог:', err);
	});

	next();
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(
	session({
		secret: 'your_secret_key',
		resave: false,
		saveUninitialized: true,
	})
);

const db = new Pool({
	connectionString: (process.env.DATABASE_URL?.includes('?')
			? process.env.DATABASE_URL + '&sslmode=require'
			: process.env.DATABASE_URL + '?sslmode=require') ||
		'postgresql://postgres:1@localhost:5432/internet',
	ssl: {
		rejectUnauthorized: false,
	},
});

db.connect(err => {
	if (err) {
		console.error('Ошибка подключения к PostgreSQL:', err);
		throw err;
	}
	console.log('Подключено к базе данных PostgreSQL');
});

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/public/index.html');
});

// Страница регистрации
app.get('/register', (req, res) => {
	const message = req.query.message || '';
	res.sendFile(__dirname + '/public/register.html');
});

app.post('/register', async (req, res) => {
	const { name, surname, email, password } = req.body;

	try {
		const result = await db.query(
			'SELECT * FROM users WHERE email = $1',
			[email]
		);
		if (result.rows.length > 0) {
			return res.redirect(
				'/register?message=Пользователь с таким email уже существует.&error=true'
			);
		}

		await db.query(
			'INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4)',
			[name, surname, email, password]
		);
		res.redirect('/register?message=Успешная регистрация!&success=true');
	} catch (err) {
		console.error(err);
		res.redirect('/register?message=Ошибка при регистрации.&error=true');
	}
});

// Страница логина
app.get('/login', (req, res) => {
	const message = req.query.message || '';
	res.sendFile(__dirname + '/public/login.html');
});

app.post('/login', async (req, res) => {
	const { email, password } = req.body;

	try {
		const result = await db.query(
			'SELECT * FROM users WHERE email = $1',
			[email]
		);
		if (result.rows.length === 0) {
			return res.redirect('/login?message=Пользователь не найден&error=true');
		}

		const user = result.rows[0];
		if (user.password !== password) {
			return res.redirect('/login?message=Неверный пароль&error=true');
		}

		req.session.user = user;

		switch (user.role) {
			case 'customer':
				res.redirect('/gender');
				break;
			case 'manager':
				res.redirect('/pyk');
				break;
			case 'administrator':
				res.redirect('/admin');
				break;
			default:
				res.redirect('/');
				break;
		}
	} catch (err) {
		console.error(err);
		res.redirect('/login?message=Ошибка входа&error=true');
	}
});

// Страница выбора пола
app.get('/gender', (req, res) => {
	if (!req.session.user || req.session.user.role !== 'customer') {
		return res.redirect('/login');
	}
	res.sendFile(__dirname + '/public/gender.html');
});

// Панель manager
app.get('/pyk', (req, res) => {
	if (!req.session.user || req.session.user.role !== 'manager') {
		return res.redirect('/login');
	}
	res.sendFile(__dirname + '/public/pyk.html');
});

// Панель administrator
app.get('/admin', (req, res) => {
	if (!req.session.user || req.session.user.role !== 'administrator') {
		return res.redirect('/login');
	}
	res.sendFile(__dirname + '/public/admin.html');
});

// Получение списка клиентов
app.get('/customers', async (req, res) => {
	try {
		const result = await db.query(
			'SELECT id, first_name, last_name, email, role FROM users'
		);
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({ success: false, message: 'Ошибка получения данных.' });
	}
});

// Удаление клиента
app.delete('/customers/:id', async (req, res) => {
	const customerId = req.params.id;

	try {
		const result = await db.query('DELETE FROM users WHERE id = $1', [
			customerId,
		]);
		if (result.rowCount > 0) {
			res.json({ success: true, message: 'Клиент успешно удален.' });
		} else {
			res.json({ success: false, message: 'Клиент не найден.' });
		}
	} catch (err) {
		console.error(err);
		res.status(500).json({
			success: false,
			message:
				'Ошибка удаления пользователя. У пользователя есть активные заказы',
		});
	}
});

// Настройка загрузки файлов
const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, 'uploads/'),
	filename: (req, file, cb) => {
		const originalName = iconv.encode(file.originalname, 'utf-8');
		cb(null, Date.now() + path.extname(file.originalname));
	},
});

const upload = multer({ storage: storage });

// Страница загрузки отчета
app.get('/upload-report', (req, res) => {
	if (!req.session.user || req.session.user.role !== 'administrator') {
		return res.redirect('/login');
	}
	res.sendFile(__dirname + '/public/upload-report.html');
});

app.post('/upload-report', upload.single('report'), async (req, res) => {
	if (!req.file) {
		return res.redirect(
			'/upload-report?message=Ошибка загрузки файла&error=true'
		);
	}

	const { originalname, path: filePath } = req.file;
	const userId = req.session.user.id;
	const encodedFileName = iconv.decode(originalname, 'utf-8');

	try {
		await db.query(
			'INSERT INTO reports (name, file, created_by) VALUES ($1, $2, $3)',
			[encodedFileName, filePath, userId]
		);
		res.redirect('/upload-report?message=Отчет успешно загружен&success=true');
	} catch (err) {
		console.error(err);
		res.redirect('/upload-report?message=Ошибка при загрузке отчета&error=true');
	}
});

// Страница просмотра отчетов
app.get('/view-reports', async (req, res) => {
	if (!req.session.user || req.session.user.role !== 'manager') {
		return res.redirect('/login');
	}
	try {
		await db.query('SELECT * FROM reports');
		res.sendFile(__dirname + '/public/view-reports.html');
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при получении отчетов');
	}
});

// Получение списка отчетов
app.get('/api/reports', async (req, res) => {
	if (
		!req.session.user ||
		!['manager', 'administrator'].includes(req.session.user.role)
	) {
		return res.redirect('/login');
	}

	try {
		const result = await db.query('SELECT * FROM reports');
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({ success: false, message: 'Ошибка получения отчетов' });
	}
});

// Скачивание отчета
app.get('/download-report/:id', async (req, res) => {
	const reportId = req.params.id;

	try {
		const result = await db.query('SELECT * FROM reports WHERE id = $1', [
			reportId,
		]);
		if (result.rows.length === 0) {
			return res.status(404).send('Отчет не найден');
		}

		const report = result.rows[0];
		const decodedFileName = iconv.decode(Buffer.from(report.file), 'utf-8');
		res.download(decodedFileName);
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при скачивании отчета');
	}
});

// Обновление статуса отчета
app.post('/update-report-status', async (req, res) => {
	const { reportId, status } = req.body;

	try {
		await db.query('UPDATE reports SET status = $1 WHERE id = $2', [
			status,
			reportId,
		]);
		res.json({ success: true, message: 'Статус отчета обновлен' });
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при обновлении статуса');
	}
});

// Удаление отчета
app.delete('/api/reports/:id', async (req, res) => {
	const reportId = req.params.id;

	try {
		const statusResult = await db.query(
			'SELECT status FROM reports WHERE id = $1',
			[reportId]
		);
		if (statusResult.rows.length === 0) {
			return res
				.status(404)
				.json({ success: false, message: 'Отчет не найден.' });
		}

		const reportStatus = statusResult.rows[0].status;
		if (reportStatus === 'Approved') {
			return res
				.status(403)
				.json({ success: false, message: 'Нельзя удалить принятый отчет.' });
		}

		const result = await db.query('DELETE FROM reports WHERE id = $1', [
			reportId,
		]);
		if (result.rowCount > 0) {
			res.json({ success: true, message: 'Отчет успешно удален.' });
		} else {
			res.json({ success: false, message: 'Отчет не найден.' });
		}
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка удаления отчета.' });
	}
});

// Получение списка товаров
app.get('/api/products', async (req, res) => {
	try {
		const result = await db.query(
			'SELECT * FROM products WHERE is_deleted = FALSE'
		);
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({ success: false, message: 'Ошибка получения данных товаров.' });
	}
});

// Получение категорий
app.get('/categories', async (req, res) => {
	try {
		const result = await db.query('SELECT * FROM categories');
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при получении категорий');
	}
});

// Получение товаров по фильтрам
app.post('/products', async (req, res) => {
	const { category, gender } = req.body;

	try {
		const result = await db.query(
			'SELECT * FROM products WHERE category_id = $1 AND gender = $2 AND is_deleted = FALSE',
			[category, gender]
		);
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при получении товаров');
	}
});

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
	} = req.body;

	try {
		await db.query(
			'UPDATE products SET name = $1, description = $2, price = $3, quantity = $4, size = $5, image = $6, category_id = $7, gender = $8 WHERE id = $9',
			[name, description, price, quantity, size, image, category, gender, id]
		);
		res.json({ message: 'Товар успешно обновлен' });
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при обновлении товара');
	}
});

// Добавление товара
app.post('/add-product', async (req, res) => {
	const { name, description, price, quantity, size, image, category, gender } =
		req.body;

	try {
		await db.query(
			'INSERT INTO products (name, description, price, quantity, size, image, category_id, gender) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
			[name, description, price, quantity, size, image, category, gender]
		);
		res.json({ message: 'Товар успешно добавлен' });
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при добавлении товара');
	}
});

// Удаление товара
app.post('/delete-product', async (req, res) => {
	const { id } = req.body;

	try {
		await db.query('UPDATE products SET is_deleted = TRUE WHERE id = $1', [id]);
		res.json({ message: 'Товар успешно удалён' });
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при удалении товара');
	}
});

// Получение конкретного товара
app.get('/products/:id', async (req, res) => {
	const productId = req.params.id;

	try {
		const result = await db.query('SELECT * FROM products WHERE id = $1', [
			productId,
		]);
		if (result.rows.length === 0) {
			return res.status(404).send('Товар не найден');
		}
		res.json(result.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при получении данных товара');
	}
});

// Оформление заказа
app.post('/checkout', async (req, res) => {
	const { address, deliveryMethod, cartItems } = req.body;

	if (!req.session.user) {
		return res
			.status(401)
			.json({ success: false, message: 'Пользователь не авторизован.' });
	}

	if (!Array.isArray(cartItems) || cartItems.length === 0) {
		return res.status(400).json({
			success: false,
			message: 'Корзина пуста или имеет неверный формат.',
		});
	}

	const userId = req.session.user.id;
	const sessionId = req.cookies.userId || uuidv4();
	let totalAmount = 0;

	cartItems.forEach(item => {
		if (!item.price || !item.quantity) {
			return res
				.status(400)
				.json({ success: false, message: 'Некорректные данные корзины.' });
		}
		totalAmount += item.price * item.quantity;
	});

	try {
		const orderResult = await db.query(
			'INSERT INTO orders (user_id, total_amount, delivery_address, delivery_method, session_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
			[userId, totalAmount, address, deliveryMethod, sessionId]
		);
		const orderId = orderResult.rows[0].id;

		const orderDetails = cartItems.map(item => [
			orderId,
			item.id,
			item.quantity,
			item.price,
		]);
		await db.query(
			'INSERT INTO order_details (order_id, product_id, quantity, price) VALUES ' +
			orderDetails
				.map(
					(_, i) =>
						`($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
				)
				.join(', '),
			orderDetails.flat()
		);

		const timestamp = new Date().toISOString();
		const logEntry = `${timestamp} | OrderID: ${orderId} | UserID: ${userId} | SessionID: ${sessionId} | Total: ${totalAmount} | Items: ${JSON.stringify(
			cartItems
		)}\n`;
		fs.appendFile('logs/orders.log', logEntry, err => {
			if (err) console.error('Ошибка записи в лог заказов:', err);
		});

		res.json({
			success: true,
			message: `Заказ успешно создан. Номер заказа: ${orderId}`,
			orderId: orderId,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка создания заказа.' });
	}
});

// Получение товара по ID для корзины
app.get('/api/products/:id', async (req, res) => {
	const productId = parseInt(req.params.id);
	if (isNaN(productId) || productId <= 0) {
		return res
			.status(400)
			.json({ success: false, message: 'Некорректный ID товара.' });
	}
	try {
		const result = await db.query(
			'SELECT id, name, quantity FROM products WHERE id = $1',
			[productId]
		);
		if (result.rows.length === 0) {
			return res
				.status(404)
				.json({ success: false, message: 'Товар не найден.' });
		}
		res.json(result.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка сервера.' });
	}
});

app.get('/api/chatbot/product/:id', async (req, res) => {
	const productId = parseInt(req.params.id);
	if (isNaN(productId) || productId <= 0) {
		return res
			.status(400)
			.json({ success: false, message: 'Некорректный ID товара.' });
	}
	try {
		const result = await db.query(
			'SELECT id, name, description, price, quantity, size, image, gender FROM products WHERE id = $1 AND is_deleted = FALSE',
			[productId]
		);
		if (result.rows.length === 0) {
			return res
				.status(404)
				.json({ success: false, message: 'Товар не найден.' });
		}
		res.json(result.rows[0]);
	} catch (err) {
		console.error('Ошибка в /api/chatbot/product/:id:', err);
		res.status(500).json({ success: false, message: 'Ошибка сервера.' });
	}
});

// Личный кабинет пользователя
app.get('/account', async (req, res) => {
	if (!req.session.user || req.session.user.role !== 'customer') {
		return res.redirect('/login');
	}
	res.sendFile(__dirname + '/public/account.html');
});

// Получение информации о пользователе
app.get('/api/user-info', async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ success: false, message: 'Не авторизован' });
	}

	try {
		const result = await db.query(
			'SELECT id, first_name, last_name, email, phone, registration_date FROM users WHERE id = $1',
			[req.session.user.id]
		);
		if (result.rows.length === 0) {
			return res
				.status(404)
				.json({ success: false, message: 'Пользователь не найден' });
		}
		res.json(result.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка сервера' });
	}
});

// Получение заказов пользователя
app.get('/api/user-orders', async (req, res) => {
	const limit = parseInt(req.query.limit) || 10;
	const offset = parseInt(req.query.offset) || 0;
	if (!req.session.user) {
		return res.status(401).json({ success: false, message: 'Не авторизован' });
	}
	try {
		const ordersResult = await db.query(
			`SELECT o.id, o.order_date as "order_date", o.total_amount, o.delivery_address, 
             o.delivery_method, o.status 
             FROM orders o 
             WHERE o.user_id = $1 
             ORDER BY o.order_date DESC
             LIMIT $2 OFFSET $3`,
			[req.session.user.id, limit, offset]
		);

		const ordersWithDetails = await Promise.all(
			ordersResult.rows.map(async order => {
				const detailsResult = await db.query(
					`SELECT od.quantity, od.price, p.name, p.image, p.size 
                     FROM order_details od 
                     JOIN products p ON od.product_id = p.id 
                     WHERE od.order_id = $1`,
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
		return res.status(401).json({ success: false, message: 'Не авторизован' });
	}

	const { name, surname, email, phone } = req.body;

	try {
		const emailCheck = await db.query(
			'SELECT id FROM users WHERE email = $1 AND id != $2',
			[email, req.session.user.id]
		);

		if (emailCheck.rows.length > 0) {
			return res.status(400).json({
				success: false,
				message: 'Этот email уже используется другим пользователем',
			});
		}

		await db.query(
			'UPDATE users SET first_name = $1, last_name = $2, email = $3, phone = $4 WHERE id = $5',
			[name, surname, email, phone, req.session.user.id]
		);

		req.session.user.first_name = name;
		req.session.user.last_name = surname;
		req.session.user.email = email;
		req.session.user.phone = phone;

		res.json({
			success: true,
			message: 'Данные успешно обновлены',
			first_name: name,
			last_name: surname,
			email,
			phone: phone,
		});
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({ success: false, message: 'Ошибка обновления данных' });
	}
});

// Смена пароля
app.post('/api/change-password', async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ success: false, message: 'Не авторизован' });
	}

	const { currentPassword, newPassword } = req.body;

	try {
		const userCheck = await db.query(
			'SELECT id FROM users WHERE id = $1 AND password = $2',
			[req.session.user.id, currentPassword]
		);

		if (userCheck.rows.length === 0) {
			return res.status(400).json({
				success: false,
				message: 'Текущий пароль неверен',
			});
		}

		await db.query('UPDATE users SET password = $1 WHERE id = $2', [
			newPassword,
			req.session.user.id,
		]);

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

app.get('/orders', async (req, res) => {
	if (!req.session.user || req.session.user.role !== 'customer') {
		return res.redirect('/login');
	}
	res.sendFile(__dirname + '/public/orders.html');
});

// Получение статистики продаж
app.post('/api/sales-statistics', async (req, res) => {
	if (!req.session.user || req.session.user.role !== 'manager') {
		return res.status(403).json({ success: false, message: 'Доступ запрещен' });
	}

	const { dateFrom, dateTo, category, gender, status } = req.body;

	try {
		let queryByCategory = `
            SELECT c.name, SUM(od.quantity * od.price) as total
            FROM order_details od
            JOIN orders o ON od.order_id = o.id
            JOIN products p ON od.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
		let queryByMonth = `
            SELECT TO_CHAR(o.order_date, 'YYYY-MM') as month, SUM(od.quantity * od.price) as total
            FROM order_details od
            JOIN orders o ON od.order_id = o.id
            JOIN products p ON od.product_id = p.id
            WHERE 1=1
        `;
		const paramsByCategory = [];
		const paramsByMonth = [];

		if (dateFrom) {
			queryByCategory += ` AND o.order_date >= $${paramsByCategory.length + 1}`;
			queryByMonth += ` AND o.order_date >= $${paramsByMonth.length + 1}`;
			paramsByCategory.push(dateFrom);
			paramsByMonth.push(dateFrom);
		}
		if (dateTo) {
			queryByCategory += ` AND o.order_date <= $${paramsByCategory.length + 1}`;
			queryByMonth += ` AND o.order_date <= $${paramsByMonth.length + 1}`;
			paramsByCategory.push(dateTo);
			paramsByMonth.push(dateTo);
		}
		if (category) {
			queryByCategory += ` AND p.category_id = $${paramsByCategory.length + 1}`;
			queryByMonth += ` AND p.category_id = $${paramsByMonth.length + 1}`;
			paramsByCategory.push(category);
			paramsByMonth.push(category);
		}
		if (gender) {
			queryByCategory += ` AND p.gender = $${paramsByCategory.length + 1}`;
			queryByMonth += ` AND p.gender = $${paramsByMonth.length + 1}`;
			paramsByCategory.push(gender);
			paramsByMonth.push(gender);
		}
		if (status) {
			queryByCategory += ` AND o.status = $${paramsByCategory.length + 1}`;
			queryByMonth += ` AND o.status = $${paramsByMonth.length + 1}`;
			paramsByCategory.push(status);
			paramsByMonth.push(status);
		}

		queryByCategory += ` GROUP BY c.name`;
		queryByMonth += ` GROUP BY TO_CHAR(o.order_date, 'YYYY-MM') ORDER BY month`;

		const resultByCategory = await db.query(queryByCategory, paramsByCategory);
		const resultByMonth = await db.query(queryByMonth, paramsByMonth);

		res.json({
			byCategory: resultByCategory.rows,
			byMonth: resultByMonth.rows,
		});
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({ success: false, message: 'Ошибка получения статистики' });
	}
});

app.get('/api/visits-statistics', async (req, res) => {
	try {
		const logs = fs
			.readFileSync(logFilePath, 'utf-8')
			.split('\n')
			.filter(line => line.trim());

		const uniqueUsers = new Set();
		let totalVisits = 0;

		logs.forEach(log => {
			const userMatch = log.match(/UserID: (\S+)/);
			if (userMatch) {
				uniqueUsers.add(userMatch[1]);
				totalVisits++;
			}
		});

		res.json({
			totalVisits,
			uniqueVisitors: uniqueUsers.size,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Ошибка чтения логов' });
	}
});

app.get('/api/visits-sales-statistics', async (req, res) => {
	if (!req.session.user || req.session.user.role !== 'manager') {
		return res.status(403).json({ success: false, message: 'Доступ запрещен' });
	}

	try {
		const salesByCategory = await db.query(`
            SELECT c.name, SUM(od.quantity * od.price) as total
            FROM order_details od
            JOIN orders o ON od.order_id = o.id
            JOIN products p ON od.product_id = p.id
            JOIN categories c ON p.category_id = c.id
            GROUP BY c.name
        `);

		const totalOrdersResult = await db.query(
			'SELECT COUNT(*) as count FROM orders'
		);
		const totalOrders = totalOrdersResult.rows[0].count;

		const totalSalesResult = await db.query(
			'SELECT SUM(total_amount) as total FROM orders'
		);
		const totalSales = parseFloat(totalSalesResult.rows[0].total) || 0;

		res.json({
			totalOrders,
			totalSales,
			byCategory: salesByCategory.rows,
		});
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({ success: false, message: 'Ошибка получения статистики продаж' });
	}
});

// Получение статистики посещений страниц
app.get('/api/page-visits', async (req, res) => {
	if (!req.session.user || req.session.user.role !== 'manager') {
		return res.status(403).json({ success: false, message: 'Доступ запрещен' });
	}

	try {
		const logs = fs
			.readFileSync('logs/visits.log', 'utf-8')
			.split('\n')
			.filter(line => line);
		const pageVisits = {};

		logs.forEach(log => {
			const urlMatch = log.match(/URL: (\S+)/);
			if (urlMatch) {
				const url = urlMatch[1];
				if (url.endsWith('.html') || !url.includes('.') || url === '/') {
					pageVisits[url] = (pageVisits[url] || 0) + 1;
				}
			}
		});

		const result = Object.entries(pageVisits).map(([page, count]) => ({
			page,
			count,
		}));
		res.json(result);
	} catch (err) {
		console.error(err);
		res.status(500).json({
			success: false,
			message: 'Ошибка получения статистики посещений страниц',
		});
	}
});

// Получение статистики продаж товаров
app.get('/api/product-sales', async (req, res) => {
	if (!req.session.user || req.session.user.role !== 'manager') {
		return res.status(403).json({ success: false, message: 'Доступ запрещен' });
	}

	try {
		const result = await db.query(`
            SELECT product_id, SUM(quantity) as count 
            FROM order_details 
            GROUP BY product_id
            ORDER BY count DESC
        `);
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({
				success: false,
				message: 'Ошибка получения статистики продаж товаров',
			});
	}
});

app.listen(port, () => {
	console.log(`Сервер запущен на http://localhost:${port}`);
});