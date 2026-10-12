# تجهيز Chrome Web Store

حزمة الإصدار التجريبي: `katilim-finans-chrome-v1.2.0.zip`. يحتوي جذر ZIP ملف manifest.json مباشرة. لا يحتاج مستخدم الإضافة إلى خادم محلي.

الغرض الواحد المقترح:
> Seçilen hisse veya fon kodunu/adını resmi KAP kimliğiyle eşleştirmek, kaynak bağlantılarını açmak ve KAP sayfasında gösterilen endeks üyeliğini ya da fonun şemsiye türünü kontrol etmek.

تبرير الأذونات:
- contextMenus: قائمة فحص النص المحدد.
- activeTab: الوصول المؤقت للصفحة بعد طلب المستخدم.
- scripting: عرض بطاقة النتيجة عند الطلب.
- storage: تخزين دليل الشركات والنتائج المؤقتة محليًا.
- https://www.kap.org.tr/*: جلب دليل الشركات وصفحات العضوية الرسمية عبر HTTPS.

لا يوجد كود تنفيذي محمل عن بعد. HTML المسترجع من KAP يُحلل كنص، ولا يُحقن أو يُنفذ. الروابط الخارجية تُفتح بطلب المستخدم.

قبل الإرسال الفعلي: اختبر النسخة كإضافة مثبتة في Chrome، جهّز صور الشاشة ووصف المتجر وبيانات المطور والدعم، انشر سياسة الخصوصية على رابط عام، واملأ Privacy practices بما يطابق السلوك الحقيقي. لا تستخدم ادعاءات «نسب مالية حديثة» أو «نتائج شرعية متحققة»؛ هذه الوظائف غير موصولة في هذه النسخة.

مسودة الخصوصية التركية في `docs/privacy-policy.html`، وتحتاج بيانات الناشر ووسيلة التواصل قبل نشرها. وجود ملف محلي لا يعادل رابط سياسة عام. إرسال الحزمة إلى المتجر واعتمادها لم يحدثا.

المراجع الرسمية:
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
