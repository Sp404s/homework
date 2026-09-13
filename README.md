# Студенческий портал

Мобильный сайт с расписанием и домашними заданиями. Опубликованная версия использует Vercel Functions, Telegram webhook и Upstash Redis.

## Развёртывание на Vercel

1. Подключите к проекту интеграцию **Upstash Redis** из Vercel Marketplace.
2. Запустите локально `Generate-Vercel-Secrets.ps1` и сохраните три полученных значения только в Vercel.
3. В **Settings → Environment Variables** добавьте для Production:
   - `BOT_TOKEN` — токен от BotFather;
   - `BOT_USERNAME` — `Polytech_homework_bot`;
   - `TELEGRAM_WEBHOOK_SECRET`, `BOT_PAIRING_CODE`, `SETUP_SECRET` — разные значения из генератора;
   - `PUBLIC_BASE_URL` — адрес Production без завершающего `/`, например `https://homework-ashy-xi.vercel.app`.
4. Убедитесь, что интеграция добавила `UPSTASH_REDIS_REST_URL` и `UPSTASH_REDIS_REST_TOKEN` (допустимы также названия `KV_REST_API_URL` и `KV_REST_API_TOKEN`).
5. Сделайте **Redeploy**, чтобы Functions получили новые переменные.
6. Запустите `Configure-Vercel.ps1`, введите адрес сайта и `SETUP_SECRET`. Скрипт безопасно настроит webhook и при первом запуске перенесёт текущие публичные задания из локальной базы.
7. Отправьте боту `/start BOT_PAIRING_CODE`, подставив свой код. Первый правильно введённый код привяжет единственного владельца.

Проверка состояния: `https://ВАШ-ДОМЕН/api/health`. Все значения должны быть `true`.

## Локальный режим

`Start-bot.cmd` запускает старый локальный режим на <http://127.0.0.1:3210/>. После включения webhook Telegram запрещает одновременный `getUpdates`, поэтому для рабочего бота используйте только Vercel-версию.

## Безопасность

- Telegram принимает webhook только с правильным секретным заголовком.
- Единственный владелец привязывается длинным одноразовым кодом.
- Публичный сайт имеет только чтение; переключатель чётности сохраняется локально в браузере посетителя.
- Токены находятся только в Vercel Environment Variables и никогда не передаются клиентскому JavaScript.
- `server/private/`, `.env*`, `.vercel/` и журналы исключены из Git.

Подробности интерфейса бота находятся в `BOT-README.md`.
