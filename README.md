# Система регистрации входящих писем

Веб-приложение для регистрации и учета входящей корреспонденции с разграничением прав доступа.

## Функциональные возможности

- Регистрация входящих писем с присвоением уникального номера
- Загрузка и хранение вложений
- Назначение исполнителей и контроль сроков исполнения
- Три уровня доступа: администратор, регистратор, исполнитель
- Управление пользователями системы
- Поиск и фильтрация писем


Приложение будет доступно по адресу: http://localhost:3000


## Роли пользователей

1. Администратор (admin)
- Полный доступ к системе
- Управление пользователями
- Просмотр и редактирование всех писем

2. Регистратор (registrar)
- Регистрация новых писем
- Редактирование зарегистрированных им писем
- Просмотр писем

3. Исполнитель (executor)
- Просмотр назначенных ему писем
- Внесение результатов исполнения
- Изменение статуса исполнения

## Разработка

Структура проекта:
```
src/
  ├── config/         # Конфигурация приложения
  ├── controllers/    # Контроллеры
  ├── models/         # Модели
  ├── public/         # Статические файлы
  │   ├── css/
  │   └── js/
  ├── routes/         # Маршруты
  ├── views/          # Шаблоны
  └── app.js          # Точка входа
```

## Тестирование

```bash
npm test
```

## Лицензия

MIT
