# تجهيز Chrome Web Store

حزمة الإصدار التجريبي: `katilim-finans-chrome-v1.3.0.zip`. يحتوي جذر ZIP ملف manifest.json مباشرة. لا يحتاج مستخدم الإضافة إلى خادم محلي أو مفتاح API أو حساب بيانات. تسجيل مطور Chrome Store يتطلب رسومًا مرة واحدة؛ لم يتم التسجيل أو الدفع أو الإرسال.

الغرض الواحد المقترح:
> Seçilen hisse veya fonu resmi kimliğiyle eşleştirmek; BIST katılım endeks üyeliği, KAP KAFİF beyanları ve mevcut TEFAS fon verilerini kaynak tarihleriyle göstermek.

تبرير الأذونات:
- contextMenus: قائمة فحص النص المحدد.
- activeTab: الوصول المؤقت للصفحة بعد طلب المستخدم.
- scripting: عرض بطاقة النتيجة عند الطلب.
- storage: تخزين دليل الشركات والنتائج المؤقتة محليًا.
- https://www.kap.org.tr/*: جلب دليل الشركات وصفحات العضوية الرسمية عبر HTTPS.
- https://borsaistanbul.com/*: قراءة ملف العضوية الرسمي المؤرخ.
- https://www.tefas.gov.tr/*: قراءة ملف الصندوق وتوزيع أنواع الأصول دون جلسة أو مفاتيح.

لا يوجد كود تنفيذي محمل عن بعد. HTML المسترجع من KAP يُحلل كنص، ولا يُحقن أو يُنفذ. الروابط الخارجية تُفتح بطلب المستخدم.

قبل الإرسال الفعلي: اختبر النسخة كإضافة مثبتة في Chrome، جهّز صور الشاشة ووصف المتجر وبيانات المطور والدعم، انشر سياسة الخصوصية على رابط عام، واملأ Privacy practices بما يطابق السلوك الحقيقي. تعرض النسخة نسبًا معلنة لفترة مالية وتوزيع أنواع أصول بتاريخ المصدر؛ لا تدّعِ تغطية شرعية شاملة لكل سهم وصندوق، أو بيانات لحظية أو أمانًا مطلقًا. راجع شروط المصادر لإعادة توزيع بياناتها في إضافة عامة.

مسودة الخصوصية التركية في `docs/privacy-policy.html`، وتحتاج بيانات الناشر ووسيلة التواصل قبل نشرها. وجود ملف محلي لا يعادل رابط سياسة عام. إرسال الحزمة إلى المتجر واعتمادها لم يحدثا.

المراجع الرسمية:
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
