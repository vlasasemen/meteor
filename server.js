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
const PgSession = require('connect-pg-simple')(session);

const app = express();
const port = process.env.PORT || 3000; // Use Koyeb's PORT or fallback to 3000

// Ensure logs and uploads directories exist (temporary, as Koyeb's FS is ephemeral)
const logDir = path.join(__dirname, 'logs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const logFilePath = path.join(logDir, 'visits.log');
const orderLogFilePath = path.join(logDir, 'orders.log');
const maxLogSize = 10 * 1024 * 1024; // 10 MB

app.use(cookieParser());

// Log rotation (warning: logs are ephemeral on Koyeb)
function rotateLogFile(filePath) {
	if (fs.existsSync(filePath)) {
		const stats = fs.statSync(filePath);
		if (stats.size > maxLogSize) {
			const archivePath = `${filePath}.${new Date().toISOString().replace(/:/g, '-')}.bak`;
			fs.renameSync(filePath, archivePath);
		}
	}
}

// Middleware for logging visits (logs to console instead of file for Koyeb)
app.use((req, res, next) => {
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

	const timestamp = new Date().toISOString();
	const ip = req.ip;
	const method = req.method;
	const url = req.originalUrl.split('?')[0];
	const userAgent = req.get('User-Agent') || 'Unknown';

	let userId = req.cookies.userId;
	if (!userId) {
		userId = uuidv4();
		res.cookie('userId', userId, {
			maxAge: 365 * 24 * 60 * 60 * 1000,
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
		});
	}

	const logEntry = `${timestamp} | IP: ${ip} | UserID: ${userId} | Method: ${method} | URL: ${url} | User-Agent: ${userAgent}`;
	console.log(logEntry); // Log to console (file logging is ephemeral)
	// Optionally store logs in database (example below)
	// db.query('INSERT INTO logs (entry) VALUES ($1)', [logEntry]).catch(err => console.error('Log DB error:', err));

	next();
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Session configuration with PostgreSQL store
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

app.use(
	session({
		store: new PgSession({
			pool,
			tableName: 'session',
		}),
		secret: process.env.SESSION_SECRET || 'your_secret_key',
		resave: false,
		saveUninitialized: true,
		cookie: {
			secure: process.env.NODE_ENV === 'production',
			maxAge: 24 * 60 * 60 * 1000, // 1 day
		},
	})
);

// Database connection
pool.connect((err) => {
	if (err) {
		console.error('Database connection error:', err);
		process.exit(1); // Exit on DB failure
	}
	console.log('Connected to PostgreSQL database');
});

app.use(express.static(path.join(__dirname, 'public')));

// Routes (same as original, with minor adjustments)
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Registration
app.get('/register', (req, res) => {
	const message = req.query.message || '';
	res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', async (req, res) => {
	const { name, surname, email, password } = req.body;

	try {
		const result = await pool.query('SELECT * FROM пользователи WHERE email = $1', [email]);
		if (result.rows.length > 0) {
			return res.redirect('/register?message=Пользователь с таким email уже существует.&error=true');
		}

		await pool.query(
			'INSERT INTO пользователи (имя, фамилия, email, пароль) VALUES ($1, $2, $3, $4)',
			[name, surname, email, password]
		);
		res.redirect('/register?message=Успешная регистрация!&success=true');
	} catch (err) {
		console.error(err);
		res.redirect('/register?message=Ошибка при регистрации.&error=true');
	}
});

// Login
app.get('/login', (req, res) => {
	const message = req.query.message || '';
	res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
	const { email, password } = req.body;

	try {
		const result = await pool.query('SELECT * FROM пользователи WHERE email = $1', [email]);
		if (result.rows.length === 0) {
			return res.redirect('/login?message=Пользователь не найден&error=true');
		}

		const user = result.rows[0];
		if (user.пароль !== password) {
			return res.redirect('/login?message=Неверный пароль&error=true');
		}

		req.session.user = user;

		switch (user.роль) {
			case 'покупатель':
				res.redirect('/gender');
				break;
			case 'руководитель':
				res.redirect('/pyk');
				break;
			case 'администратор':
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

// Gender selection
app.get('/gender', (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'покупатель') {
		return res.redirect('/login');
	}
	res.sendFile(path.join(__dirname, 'public', 'gender.html'));
});

// Manager panel
app.get('/pyk', (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'руководитель') {
		return res.redirect('/login');
	}
	res.sendFile(path.join(__dirname, 'public', 'pyk.html'));
});

// Admin panel
app.get('/admin', (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'администратор') {
		return res.redirect('/login');
	}
	res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Customers
app.get('/customers', async (req, res) => {
	try {
		const result = await pool.query('SELECT id, имя, фамилия, email, роль FROM пользователи');
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка получения данных.' });
	}
});

app.delete('/customers/:id', async (req, res) => {
	const customerId = req.params.id;

	try {
		const result = await pool.query('DELETE FROM пользователи WHERE id = $1', [customerId]);
		if (result.rowCount > 0) {
			res.json({ success: true, message: 'Клиент успешно удален.' });
		} else {
			res.json({ success: false, message: 'Клиент не найден.' });
		}
	} catch (err) {
		console.error(err);
		res.status(500).json({
			success: false,
			message: 'Ошибка удаления пользователя. У пользователя есть активные заказы',
		});
	}
});

// File uploads (warning: ephemeral storage)
const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, uploadDir),
	filename: (req, file, cb) => {
		const originalName = iconv.encode(file.originalname, 'utf-8');
		cb(null, Date.now() + path.extname(file.originalname));
	},
});

const upload = multer({ storage });

// Report upload
app.get('/upload-report', (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'администратор') {
		return res.redirect('/login');
	}
	res.sendFile(path.join(__dirname, 'public', 'upload-report.html'));
});

app.post('/upload-report', upload.single('report'), async (req, res) => {
	if (!req.file) {
		return res.redirect('/upload-report?message=Ошибка загрузки файла&error=true');
	}

	const { originalname, path: filePath } = req.file;
	const userId = req.session.user.id;
	const encodedFileName = iconv.decode(originalname, 'utf-8');

	try {
		await pool.query(
			'INSERT INTO отчёты (название, файл, создан_пользователем) VALUES ($1, $2, $3)',
			[encodedFileName, filePath, userId]
		);
		res.redirect('/upload-report?message=Отчет успешно загружен&success=true');
	} catch (err) {
		console.error(err);
		res.redirect('/upload-report?message=Ошибка при загрузке отчета&error=true');
	}
});

// View reports
app.get('/view-reports', async (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'руководитель') {
		return res.redirect('/login');
	}
	try {
		await pool.query('SELECT * FROM отчёты');
		res.sendFile(path.join(__dirname, 'public', 'view-reports.html'));
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при получении отчетов');
	}
});

// API routes (reports, products, checkout, etc.) remain largely unchanged
// Example: Reports API
app.get('/api/reports', async (req, res) => {
	if (!req.session.user || !['руководитель', 'администратор'].includes(req.session.user.роль)) {
		return res.redirect('/login');
	}

	try {
		const result = await pool.query('SELECT * FROM отчёты');
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка получения отчетов' });
	}
});

// Download report
app.get('/download-report/:id', async (req, res) => {
	const reportId = req.params.id;

	try {
		const result = await pool.query('SELECT * FROM отчёты WHERE id = $1', [reportId]);
		if (result.rows.length === 0) {
			return res.status(404).send('Отчет не найден');
		}

		const report = result.rows[0];
		const decodedFileName = iconv.decode(Buffer.from(report.файл), 'utf-8');
		res.download(decodedFileName);
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при скачивании отчета');
	}
});

// Update report status
app.post('/update-report-status', async (req, res) => {
	const { reportId, status } = req.body;

	try {
		await pool.query('UPDATE отчёты SET статус = $1 WHERE id = $2', [status, reportId]);
		res.json({ success: true, message: 'Статус отчета обновлен' });
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при обновлении статуса');
	}
});

// Delete report
app.delete('/api/reports/:id', async (req, res) => {
	const reportId = req.params.id;

	try {
		const statusResult = await pool.query('SELECT статус FROM отчёты WHERE id = $1', [reportId]);
		if (statusResult.rows.length === 0) {
			return res.status(404).json({ success: false, message: 'Отчет не найден.' });
		}

		const reportStatus = statusResult.rows[0].статус;
		if (reportStatus === 'Принято') {
			return res.status(403).json({ success: false, message: 'Нельзя удалить принятый отчет.' });
		}

		const result = await pool.query('DELETE FROM отчёты WHERE id = $1', [reportId]);
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

// Products
app.get('/api/products', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM товары WHERE is_deleted = FALSE');
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка получения данных товаров.' });
	}
});

// Categories
app.get('/categories', async (req, res) => {
	try {
		const result = await pool.query('SELECT * FROM категории');
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при получении категорий');
	}
});

// Filtered products
app.post('/products', async (req, res) => {
	const { category, gender } = req.body;

	try {
		const result = await pool.query(
			'SELECT * FROM товары WHERE id_категории = $1 AND пол = $2 AND is_deleted = FALSE',
			[category, gender]
		);
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при получении товаров');
	}
});

// Edit product
app.post('/edit-product', async (req, res) => {
	const { id, name, description, price, quantity, size, image, category, gender } = req.body;

	try {
		await pool.query(
			'UPDATE товары SET название = $1, описание = $2, цена = $3, количество = $4, размер = $5, изображение = $6, id_категории = $7, пол = $8 WHERE id = $9',
			[name, description, price, quantity, size, image, category, gender, id]
		);
		res.json({ message: 'Товар успешно обновлен' });
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при обновлении товара');
	}
});

// Add product
app.post('/add-product', async (req, res) => {
	const { name, description, price, quantity, size, image, category, gender } = req.body;

	try {
		await pool.query(
			'INSERT INTO товары (название, описание, цена, количество, размер, изображение, id_категории, пол) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
			[name, description, price, quantity, size, image, category, gender]
		);
		res.json({ message: 'Товар успешно добавлен' });
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при добавлении товара');
	}
});

// Delete product
app.post('/delete-product', async (req, res) => {
	const { id } = req.body;

	try {
		await pool.query('UPDATE товары SET is_deleted = TRUE WHERE id = $1', [id]);
		res.json({ message: 'Товар успешно удалён' });
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при удалении товара');
	}
});

// Get product by ID
app.get('/products/:id', async (req, res) => {
	const productId = req.params.id;

	try {
		const result = await pool.query('SELECT * FROM товары WHERE id = $1', [productId]);
		if (result.rows.length === 0) {
			return res.status(404).send('Товар не найден');
		}
		res.json(result.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).send('Ошибка при получении данных товара');
	}
});

// Checkout
app.post('/checkout', async (req, res) => {
	const { address, deliveryMethod, cartItems } = req.body;

	if (!req.session.user) {
		return res.status(401).json({ success: false, message: 'Пользователь не авторизован.' });
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

	for (const item of cartItems) {
		if (!item.price || !item.quantity) {
			return res.status(400).json({ success: false, message: 'Некорректные данные корзины.' });
		}
		totalAmount += item.price * item.quantity;
	}

	try {
		const orderResult = await pool.query(
			'INSERT INTO заказы (id_пользователя, сумма, адрес_доставки, способ_доставки, session_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
			[userId, totalAmount, address, deliveryMethod, sessionId]
		);
		const orderId = orderResult.rows[0].id;

		const orderDetails = cartItems.map(item => [orderId, item.id, item.quantity, item.price]);
		await pool.query(
			'INSERT INTO детали_заказа (id_заказа, id_товара, количество, цена) VALUES ' +
			orderDetails.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', '),
			orderDetails.flat()
		);

		const timestamp = new Date().toISOString();
		const logEntry = `${timestamp} | OrderID: ${orderId} | UserID: ${userId} | SessionID: ${sessionId} | Total: ${totalAmount} | Items: ${JSON.stringify(cartItems)}`;
		console.log(logEntry); // Log to console
		// Optionally store in database
		// await pool.query('INSERT INTO order_logs (entry) VALUES ($1)', [logEntry]);

		res.json({
			success: true,
			message: `Заказ успешно создан. Номер заказа: ${orderId}`,
			orderId,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка создания заказа.' });
	}
});

// Get product by ID for cart
app.get('/api/products/:id', async (req, res) => {
	const productId = parseInt(req.params.id);
	if (isNaN(productId) || productId <= 0) {
		return res.status(400).json({ success: false, message: 'Некорректный ID товара.' });
	}
	try {
		const result = await pool.query('SELECT id, название, количество FROM товары WHERE id = $1', [productId]);
		if (result.rows.length === 0) {
			return res.status(404).json({ success: false, message: 'Товар не найден.' });
		}
		res.json(result.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка сервера.' });
	}
});

// Chatbot product API
app.get('/api/chatbot/product/:id', async (req, res) => {
	const productId = parseInt(req.params.id);
	if (isNaN(productId) || productId <= 0) {
		return res.status(400).json({ success: false, message: 'Некорректный ID товара.' });
	}
	try {
		const result = await pool.query(
			'SELECT id, название, описание, цена, количество, размер, изображение, пол FROM товары WHERE id = $1 AND is_deleted = FALSE',
			[productId]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ success: false, message: 'Товар не найден.' });
		}
		res.json(result.rows[0]);
	} catch (err) {
		console.error('Ошибка в /api/chatbot/product/:id:', err);
		res.status(500).json({ success: false, message: 'Ошибка сервера.' });
	}
});

// User account
app.get('/account', async (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'покупатель') {
		return res.redirect('/login');
	}
	res.sendFile(path.join(__dirname, 'public', 'account.html'));
});

// User info
app.get('/api/user-info', async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ success: false, message: 'Не авторизован' });
	}

	try {
		const result = await pool.query(
			'SELECT id, имя, фамилия, email, телефон, дата_регистрации FROM пользователи WHERE id = $1',
			[req.session.user.id]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ success: false, message: 'Пользователь не найден' });
		}
		res.json(result.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка сервера' });
	}
});

// User orders
app.get('/api/user-orders', async (req, res) => {
	const limit = parseInt(req.query.limit) || 10;
	const offset = parseInt(req.query.offset) || 0;
	if (!req.session.user) {
		return res.status(401).json({ success: false, message: 'Не авторизован' });
	}
	try {
		const ordersResult = await pool.query(
			`SELECT з.id, з.дата_заказа as "дата_создания", з.сумма, з.адрес_доставки, 
             з.способ_доставки, з.статус 
             FROM заказы з 
             WHERE з.id_пользователя = $1 
             ORDER BY з.дата_заказа DESC
             LIMIT $2 OFFSET $3`,
			[req.session.user.id, limit, offset]
		);

		const ordersWithDetails = await Promise.all(
			ordersResult.rows.map(async (order) => {
				const detailsResult = await pool.query(
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

// Update user
app.post('/api/update-user', async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ success: false, message: 'Не авторизован' });
	}

	const { name, surname, email, phone } = req.body;

	try {
		const emailCheck = await pool.query(
			'SELECT id FROM пользователи WHERE email = $1 AND id != $2',
			[email, req.session.user.id]
		);

		if (emailCheck.rows.length > 0) {
			return res.status(400).json({
				success: false,
				message: 'Этот email уже используется другим пользователем',
			});
		}

		await pool.query(
			'UPDATE пользователи SET имя = $1, фамилия = $2, email = $3, телефон = $4 WHERE id = $5',
			[name, surname, email, phone, req.session.user.id]
		);

		req.session.user.имя = name;
		req.session.user.фамилия = surname;
		req.session.user.email = email;
		req.session.user.телефон = phone;

		res.json({
			success: true,
			message: 'Данные успешно обновлены',
			имя: name,
			фамилия: surname,
			email,
			телефон: phone,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка обновления данных' });
	}
});

// Change password
app.post('/api/change-password', async (req, res) => {
	if (!req.session.user) {
		return res.status(401).json({ success: false, message: 'Не авторизован' });
	}

	const { currentPassword, newPassword } = req.body;

	try {
		const userCheck = await pool.query(
			'SELECT id FROM пользователи WHERE id = $1 AND пароль = $2',
			[req.session.user.id, currentPassword]
		);

		if (userCheck.rows.length === 0) {
			return res.status(400).json({
				success: false,
				message: 'Текущий пароль неверен',
			});
		}

		await pool.query('UPDATE пользователи SET пароль = $1 WHERE id = $2', [
			newPassword,
			req.session.user.id,
		]);

		res.json({ success: true, message: 'Пароль успешно изменен' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка смены пароля' });
	}
});

// Logout
app.post('/logout', (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			console.error(err);
			return res.status(500).json({ success: false, message: 'Ошибка выхода' });
		}
		res.json({ success: true, message: 'Успешный выход' });
	});
});

// Orders page
app.get('/orders', async (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'покупатель') {
		return res.redirect('/login');
	}
	res.sendFile(path.join(__dirname, 'public', 'orders.html'));
});

// Sales statistics
app.post('/api/sales-statistics', async (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'руководитель') {
		return res.status(403).json({ success: false, message: 'Доступ запрещен' });
	}

	const { dateFrom, dateTo, category, gender, status } = req.body;

	try {
		let queryByCategory = `
            SELECT c.название, SUM(d.количество * d.цена) as total
            FROM детали_заказа d
            JOIN заказы o ON d.id_заказа = o.id
            JOIN товары t ON d.id_товара = т.id
            JOIN категории c ON t.id_категории = c.id
            WHERE 1=1
        `;
		let queryByMonth = `
            SELECT TO_CHAR(o.дата_заказа, 'YYYY-MM') as month, SUM(d.количество * d.цена) as total
            FROM детали_заказа d
            JOIN заказы o ON d.id_заказа = o.id
            JOIN товары t ON д.id_товара = т.id
            WHERE 1=1
        `;
		const paramsByCategory = [];
		const paramsByMonth = [];

		if (dateFrom) {
			queryByCategory += ` AND o.дата_заказа >= $${paramsByCategory.length + 1}`;
			queryByMonth += ` AND o.дата_заказа >= $${paramsByMonth.length + 1}`;
			paramsByCategory.push(dateFrom);
			paramsByMonth.push(dateFrom);
		}
		if (dateTo) {
			queryByCategory += ` AND o.дата_заказа <= $${paramsByCategory.length + 1}`;
			queryByMonth += ` AND o.дата_заказа <= $${paramsByMonth.length + 1}`;
			paramsByCategory.push(dateTo);
			paramsByMonth.push(dateTo);
		}
		if (category) {
			queryByCategory += ` AND t.id_категории = $${paramsByCategory.length + 1}`;
			queryByMonth += ` AND t.id_категории = $${paramsByMonth.length + 1}`;
			paramsByCategory.push(category);
			paramsByMonth.push(category);
		}
		if (gender) {
			queryByCategory += ` AND t.пол = $${paramsByCategory.length + 1}`;
			queryByMonth += ` AND t.пол = $${paramsByMonth.length + 1}`;
			paramsByCategory.push(gender);
			paramsByMonth.push(gender);
		}
		if (status) {
			queryByCategory += ` AND o.статус = $${paramsByCategory.length + 1}`;
			queryByMonth += ` AND o.статус = $${paramsByMonth.length + 1}`;
			paramsByCategory.push(status);
			paramsByMonth.push(status);
		}

		queryByCategory += ` GROUP BY c.название`;
		queryByMonth += ` GROUP BY TO_CHAR(o.дата_заказа, 'YYYY-MM') ORDER BY month`;

		const resultByCategory = await pool.query(queryByCategory, paramsByCategory);
		const resultByMonth = await pool.query(queryByMonth, paramsByMonth);

		res.json({
			byCategory: resultByCategory.rows,
			byMonth: resultByMonth.rows,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка получения статистики' });
	}
});

// Visits statistics
app.get('/api/visits-statistics', async (req, res) => {
	try {
		// Simulate log reading (replace with DB or external logging service)
		const logs = []; // Placeholder: Implement DB query or external log retrieval
		const uniqueUsers = new Set();
		let totalVisits = 0;

		logs.forEach((log) => {
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
		res.status(500).json({ error: 'Ошибка получения статистики посещений' });
	}
});

// Visits and sales statistics
app.get('/api/visits-sales-statistics', async (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'руководитель') {
		return res.status(403).json({ success: false, message: 'Доступ запрещен' });
	}

	try {
		const salesByCategory = await pool.query(`
            SELECT c.название, SUM(d.количество * d.цена) as total
            FROM детали_заказа d
            JOIN заказы o ON d.id_заказа = o.id
            JOIN товары t ON д.id_товара = т.id
            JOIN категории c ON t.id_категории = c.id
            GROUP BY c.название
        `);

		const totalOrdersResult = await pool.query('SELECT COUNT(*) as count FROM заказы');
		const totalOrders = totalOrdersResult.rows[0].count;

		const totalSalesResult = await pool.query('SELECT SUM(сумма) as total FROM заказы');
		const totalSales = parseFloat(totalSalesResult.rows[0].total) || 0;

		res.json({
			totalOrders,
			totalSales,
			byCategory: salesByCategory.rows,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ success: false, message: 'Ошибка получения статистики продаж' });
	}
});

// Page visits
app.get('/api/page-visits', async (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'руководитель') {
		return res.status(403).json({ success: false, message: 'Доступ запрещен' });
	}

	try {
		// Simulate log reading (replace with DB or external logging service)
		const logs = []; // Placeholder
		const pageVisits = {};

		logs.forEach((log) => {
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

// Product sales
app.get('/api/product-sales', async (req, res) => {
	if (!req.session.user || req.session.user.роль !== 'руководитель') {
		return res.status(403).json({ success: false, message: 'Доступ запрещен' });
	}

	try {
		const result = await pool.query(`
            SELECT id_товара as product_id, SUM(количество) as count 
            FROM детали_заказа 
            GROUP BY id_товара
            ORDER BY count DESC
        `);
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({
			success: false,
			message: 'Ошибка получения статистики продаж товаров',
		});
	}
});

// Start server
app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});