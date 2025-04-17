-- Таблица пользователей
CREATE TABLE пользователи (
    id SERIAL PRIMARY KEY,
    имя VARCHAR(100) NOT NULL,
    фамилия VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    пароль VARCHAR(255) NOT NULL,
    роль VARCHAR(20) NOT NULL DEFAULT 'покупатель' CHECK (роль IN ('администратор', 'руководитель', 'покупатель'))
);

-- Таблица категорий
CREATE TABLE категории (
    id SERIAL PRIMARY KEY,
    название VARCHAR(255) NOT NULL UNIQUE,
    описание TEXT
);

-- Таблица товаров
CREATE TABLE товары (
    id SERIAL PRIMARY KEY,
    название VARCHAR(255) NOT NULL,
    описание TEXT,
    цена NUMERIC(10, 2) NOT NULL CHECK (цена >= 0),
    количество INTEGER NOT NULL CHECK (количество >= 0),
    размер VARCHAR(10),
    изображение VARCHAR(255),
    id_категории INTEGER NOT NULL REFERENCES категории(id),
    пол VARCHAR(10) DEFAULT 'Унисекс' CHECK (пол IN ('Мужской', 'Женский', 'Унисекс')),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Таблица заказов
CREATE TABLE заказы (
    id SERIAL PRIMARY KEY,
    id_пользователя INTEGER NOT NULL REFERENCES пользователи(id),
    дата_заказа TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    сумма NUMERIC(10, 2) NOT NULL CHECK (сумма >= 0),
    адрес_доставки VARCHAR(255) NOT NULL,
    способ_доставки VARCHAR(50) NOT NULL
);

-- Таблица деталей заказа
CREATE TABLE детали_заказа (
    id SERIAL PRIMARY KEY,
    id_заказа INTEGER NOT NULL REFERENCES заказы(id),
    id_товара INTEGER NOT NULL REFERENCES товары(id),
    количество INTEGER NOT NULL,
    цена NUMERIC(10, 2) NOT NULL
);

-- Таблица отчетов
CREATE TABLE отчёты (
    id SERIAL PRIMARY KEY,
    название VARCHAR(255) NOT NULL,
    дата_создания TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    файл VARCHAR(255) NOT NULL,
    создан_пользователем INTEGER NOT NULL REFERENCES пользователи(id),
    статус VARCHAR(20) DEFAULT 'Ожидание' CHECK (статус IN ('Ожидание', 'Принято', 'Не принято'))
);

-- Вставка данных
ALTER TABLE заказы ADD COLUMN статус VARCHAR(20) DEFAULT 'Новый' CHECK (статус IN ('Новый', 'В обработке', 'Отправлен', 'Доставлен', 'Отменен'));

INSERT INTO категории (название, описание) VALUES
('Кросовки', 'В этой категории собраны различные виды кроссовок');

INSERT INTO товары (название, описание, цена, количество, размер, изображение, id_категории, пол)
VALUES
('Кроссовки LV', 'Качественные кожаные кроссовки', 500000, 10, 'M', 'img/lv1.jpg', 1, 'Унисекс'),
('Кроссовки Nike', 'Качественные кожаные кроссовки', 500000, 15, 'M', 'img/nike1.jpg', 1, 'Унисекс'),
('Кроссовки Golden Goose', 'Качественные кожаные кроссовки', 100000, 20, 'L', 'img/gg1.jpg', 1, 'Унисекс'),
('Кроссовки Jordan', 'Качественные кожаные кроссовки', 150000, 25, 'M', 'img/jordan1.jpg', 1, 'Унисекс'),
('Кроссовки McQueen', 'Качественные кожаные кроссовки', 50000, 30, 'S', 'img/mc1.jpg', 1, 'Унисекс'),
('Кроссовки Adidas', 'Качественные кожаные кроссовки', 3000000, 5, 'M', 'img/adidas1.jpg', 1, 'Унисекс'),
('Кроссовки Loewe', 'Качественные кожаные кроссовки', 200000, 12, 'L', 'img/loewe1.jpg', 1, 'Унисекс');

INSERT INTO пользователи (имя, фамилия, email, пароль, роль)
VALUES
('Захар', 'Макаров', 'admin@mail.ru', '1111', 'администратор'),
('Иван', 'Иванов', 'pyk@mail.ru', '1111', 'руководитель');

INSERT INTO заказы (id_пользователя, дата_заказа, сумма, адрес_доставки, способ_доставки, статус)
VALUES (1, '2025-03-05 14:00:00', 0, 'Москва, ул. Садовая, д. 3', 'Курьер', 'Новый');


-- Функции (замена хранимых процедур)
CREATE OR REPLACE FUNCTION ДобавитьТовар(
    p_название VARCHAR(255),
    p_описание TEXT,
    p_цена NUMERIC(10,2),
    p_количество INTEGER,
    p_размер VARCHAR(10),
    p_изображение VARCHAR(255),
    p_id_категории INTEGER,
    p_пол VARCHAR(10)
) RETURNS VOID AS $$
BEGIN
    INSERT INTO товары (название, описание, цена, количество, размер, изображение, id_категории, пол)
    VALUES (p_название, p_описание, p_цена, p_количество, p_размер, p_изображение, p_id_категории, p_пол);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ОбновитьСтатусОтчета(
    p_id INTEGER,
    p_новый_статус VARCHAR(20)
) RETURNS VOID AS $$
BEGIN
    UPDATE отчёты
    SET статус = p_новый_статус
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Триггеры
CREATE OR REPLACE FUNCTION update_order_sum() RETURNS TRIGGER AS $$
BEGIN
    UPDATE заказы
    SET сумма = (
        SELECT SUM(количество * цена)
        FROM детали_заказа
        WHERE id_заказа = NEW.id_заказа
    )
    WHERE id = NEW.id_заказа;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ОбновлениеСуммыЗаказа
    AFTER INSERT ON детали_заказа
    FOR EACH ROW
    EXECUTE FUNCTION update_order_sum();

CREATE OR REPLACE FUNCTION update_product_quantity_and_status() RETURNS TRIGGER AS $$
BEGIN
    UPDATE товары
    SET количество = количество - NEW.количество
    WHERE id = NEW.id_товара;

    IF (SELECT количество FROM товары WHERE id = NEW.id_товара) = 0 THEN
        UPDATE товары
        SET is_deleted = TRUE
        WHERE id = NEW.id_товара;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_quantity_and_status_after_order
    AFTER INSERT ON детали_заказа
    FOR EACH ROW
    EXECUTE FUNCTION update_product_quantity_and_status();

ALTER TABLE заказы
ADD COLUMN session_id VARCHAR(36);
ALTER TABLE пользователи
ADD COLUMN телефон VARCHAR(20),
ADD COLUMN дата_регистрации TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- Добавление заказов за разные месяцы
INSERT INTO заказы (id_пользователя, дата_заказа, сумма, адрес_доставки, способ_доставки, статус)
VALUES
(1, '2025-01-15 10:00:00', 0, 'Москва, ул. Ленина, д. 10', 'Курьер', 'Новый'), -- Заказ в январе
(2, '2025-02-10 12:30:00', 0, 'Москва, ул. Мира, д. 5', 'Свмовывоз', 'Новый');   -- Заказ в феврале

-- Добавление деталей заказа для каждого заказа
-- Заказ 1 (январь): покупка 2 кожаных бейсболок и 1 хлопковой бейсболки Essential Cap
INSERT INTO детали_заказа (id_заказа, id_товара, количество, цена)
VALUES ((SELECT id FROM заказы WHERE дата_заказа = '2025-01-15 10:00:00'), 1, 2, 500000);

INSERT INTO детали_заказа (id_заказа, id_товара, количество, цена)
VALUES ((SELECT id FROM заказы WHERE дата_заказа = '2025-01-15 10:00:00'), 2, 1, 500000);

-- Заказ 2 (февраль): покупка 3 хлопковых бейсболок Mesh Signature
INSERT INTO детали_заказа (id_заказа, id_товара, количество, цена)
VALUES ((SELECT id FROM заказы WHERE дата_заказа = '2025-02-10 12:30:00'), 3, 3, 100000);

-- Заказ 3 (март): покупка 1 бейсболки Damier Graphite Cap и 2 хлопковых Monogram Cap
INSERT INTO детали_заказа (id_заказа, id_товара, количество, цена)
VALUES ((SELECT id FROM заказы WHERE дата_заказа = '2025-03-05 14:00:00'), 6, 1, 3000000);

INSERT INTO детали_заказа (id_заказа, id_товара, количество, цена)
VALUES ((SELECT id FROM заказы WHERE дата_заказа = '2025-03-05 14:00:00'), 7, 2, 200000);
