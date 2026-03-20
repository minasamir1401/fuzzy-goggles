const API_URL = 'https://patient-corrinne-ewgr-6bd914bd.koyeb.app'; // Production server

document.addEventListener('DOMContentLoaded', () => {
    const startBtn      = document.getElementById('startBtn');
    const landingSection = document.getElementById('landingSection');
    const formSection   = document.getElementById('formSection');
    const fileInput     = document.getElementById('image');
    const fileName      = document.getElementById('fileName');
    const registerForm  = document.getElementById('registerForm');
    const formMsg       = document.getElementById('formMsg');
    const submitBtn     = document.getElementById('submitBtn');
    const backToHomeBtn = document.getElementById('backToHomeBtn');

    // ─── قفل الزرار نهائياً ────────────────────────────────
    const lockRegistration = (contact = '') => {
        startBtn.textContent = '✅ لقد قمت بالتسجيل مسبقاً';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.65';
        startBtn.style.cursor = 'not-allowed';
        startBtn.classList.remove('pulse-anim');

        // رسالة توضيحية تحت الزرار
        if (!document.getElementById('alreadyMsg')) {
            const msg = document.createElement('p');
            msg.id = 'alreadyMsg';
            msg.style.cssText = 'color:#10b981; margin-top:12px; font-size:0.9rem;';
            msg.textContent = contact
                ? `تم تسجيلك بالفعل برقم: ${contact}`
                : 'تم تسجيلك بالفعل في هذه المسابقة.';
            startBtn.insertAdjacentElement('afterend', msg);
        }
    };

    // ─── فحص التسجيل المسبق عند تحميل الصفحة ──────────────
    const savedContact = localStorage.getItem('registeredContact');
    if (localStorage.getItem('registered') === 'true' || savedContact) {
        lockRegistration(savedContact || '');
    }

    // ─── فحص رقم الموبايل أو الإيميل من السيرفر ────────────
    const checkDuplicate = async (contact) => {
        try {
            // إضافة timestamp لضمان عدم استخدام الـ Cache
            const res = await fetch(`${API_URL}/api/participants?_t=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (data && data.participants) {
                // توحيد الحروف وحذف الفواصل/المسافات للمقارنة الدقيقة
                const normalized = contact.toLowerCase().replace(/[\s\-\(\)]/g, '');
                return data.participants.some(p => {
                    const existing = (p.contact || '').toLowerCase().replace(/[\s\-\(\)]/g, '');
                    return existing && existing === normalized;
                });
            }
        } catch (e) {
            console.error('Duplicate check failed:', e);
        }
        return false;
    };

    // ─── زرار "التسجيل في المسابقة" ────────────────────────
    startBtn.addEventListener('click', () => {
        if (localStorage.getItem('registered') === 'true' || localStorage.getItem('registeredContact')) {
            return; // مسجّل مسبقاً — تجاهل الضغط
        }
        landingSection.classList.add('hidden');
        formSection.classList.remove('hidden');
    });

    // ─── زرار "العودة" ─────────────────────────────────────
    backToHomeBtn.addEventListener('click', () => {
        formSection.classList.add('hidden');
        landingSection.classList.remove('hidden');
    });

    // ─── تحديث اسم الملف المختار ───────────────────────────
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileName.textContent = e.target.files[0].name;
            fileName.style.color = 'var(--primary-color)';
        } else {
            fileName.textContent = 'اختر صورة';
            fileName.style.color = 'inherit';
        }
    });

    let isSubmitting = false;

    // ─── إرسال الفورم ──────────────────────────────────────
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        // 🔒 طبقة 1: حماية الجهاز (localStorage)
        if (localStorage.getItem('registered') === 'true' || localStorage.getItem('registeredContact')) {
            formMsg.textContent = '🔒 لقد سجّلت مسبقاً، لا يمكن التسجيل مرة أخرى.';
            formMsg.className = 'form-msg error';
            return;
        }

        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.textContent = '🔍 جاري التحقق...';
        formMsg.className = 'form-msg';
        formMsg.textContent = '';

        const formData = new FormData(registerForm);
        const contactValue = (formData.get('contact') || '').trim();

        // 🔒 طبقة 2: فحص رقم الموبايل مع السيرفر
        if (contactValue) {
            const isDuplicate = await checkDuplicate(contactValue);
            if (isDuplicate) {
                formMsg.textContent = '❌ هذا الرقم/الإيميل مسجّل بالفعل لا يمكن التسجيل به أكثر من مرة.';
                formMsg.className = 'form-msg error';
                submitBtn.disabled = false;
                submitBtn.textContent = 'إرسال البيانات';
                isSubmitting = false;
                return;
            }
        }

        submitBtn.textContent = '📤 جاري الإرسال...';

        try {
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                // 🔒 حفظ التسجيل في localStorage
                localStorage.setItem('registered', 'true');
                localStorage.setItem('registeredContact', contactValue);

                formMsg.textContent = '🎊 تم تسجيلك بنجاح! حظ موفق.';
                formMsg.className = 'form-msg success';
                registerForm.reset();
                fileName.textContent = 'اختر صورة';
                fileName.style.color = 'inherit';

                // الانتقال للصفحة الرئيسية بعد 3 ثواني وقفل الزرار
                setTimeout(() => {
                    formSection.classList.add('hidden');
                    landingSection.classList.remove('hidden');
                    formMsg.className = 'form-msg';
                    lockRegistration(contactValue);
                    isSubmitting = false;
                }, 3000);

            } else {
                formMsg.textContent = result.error || 'حدث خطأ أثناء التسجيل، حاول مجدداً.';
                formMsg.className = 'form-msg error';
                submitBtn.disabled = false;
                submitBtn.textContent = 'إرسال البيانات';
                isSubmitting = false;
            }
        } catch (error) {
            formMsg.textContent = '⚠️ خطأ في الاتصال بالسيرفر. تأكد من الإنترنت وحاول مجدداً.';
            formMsg.className = 'form-msg error';
            submitBtn.disabled = false;
            submitBtn.textContent = 'إرسال البيانات';
            isSubmitting = false;
        }
    });
});
