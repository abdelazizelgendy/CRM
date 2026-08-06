# تكامل القنوات الخارجية — عقد مؤجل

كل موصل مستقبلي يجب أن يطبق: التحقق من توقيع Webhook، تحويل هوية القناة إلى `external_identities`، Idempotency للرسائل، Queue مع retry/backoff، mapping لحالات التسليم، تشفير الأسرار خارج قاعدة التطبيق، وحدود معدل الإرسال.

القنوات المجهزة كنموذج موحد: WhatsApp، Facebook Messenger/Comments، Instagram Direct/Comments، Email، Telegram، Website Chat/Forms، Google Business، LinkedIn، Manual Entry، Phone Call.

لا توجد Tokens أو Webhooks أو رسائل حقيقية في المرحلة الثالثة. حالة كل قناة `demo` أو `disconnected` فقط.
