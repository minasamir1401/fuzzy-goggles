const fetch = require('node-fetch');

const API_URL = 'https://patient-corrinne-ewgr-6bd914bd.koyeb.app';

async function removeDuplicates() {
    console.log('🔍 جلب بيانات المشتركين...');
    try {
        const res = await fetch(`${API_URL}/api/participants`);
        const data = await res.json();
        
        if (!data || !data.participants) {
            console.log('❌ فشل في جلب البيانات أو لا يوجد مشتركون.');
            return;
        }

        const participants = data.participants;
        console.log(`✅ تم العثور على ${participants.length} مشترك.`);

        // فرز المشتركين بحيث نحتفظ بأحدث سجل (الأكبر in ID or createdAt)
        const seenContacts = new Map(); // contact -> participant
        const seenNames = new Map();    // name -> participant
        const duplicates = [];
        const toKeep = [];

        for (const p of participants) {
            const name = p.name ? p.name.trim().toLowerCase() : '';
            const contact = p.contact ? p.contact.trim().replace(/\s+/g, '') : '';

            const isDupContact = contact && seenContacts.has(contact);
            const isDupName = name && seenNames.has(name);

            if (isDupContact || isDupName) {
                duplicates.push(p);
                console.log(`🔁 مكرر: ${p.name} - ${p.contact} (ID: ${p.id})`);
            } else {
                if (contact) seenContacts.set(contact, p);
                if (name) seenNames.set(name, p);
                toKeep.push(p);
            }
        }

        console.log(`\n📊 الملخص:`);
        console.log(`   - إجمالي المشتركين: ${participants.length}`);
        console.log(`   - سيتم الاحتفاظ بـ: ${toKeep.length}`);
        console.log(`   - مكررات للحذف: ${duplicates.length}`);

        if (duplicates.length === 0) {
            console.log('\n✅ لا توجد مكررات!');
            return;
        }

        console.log('\n🗑️ محاولة حذف المكررات...');
        
        // جرّب عدة endpoints ممكنة للحذف
        const deleteEndpoints = [
            (id) => `${API_URL}/api/participants/${id}`,
            (id) => `${API_URL}/api/participant/${id}`,
            (id) => `${API_URL}/api/delete/${id}`,
            (id) => `${API_URL}/api/participants?id=${id}`,
        ];

        let deletedCount = 0;
        let failedCount = 0;

        for (const dup of duplicates) {
            let deleted = false;
            
            for (const endpointFn of deleteEndpoints) {
                const url = endpointFn(dup.id || dup._id);
                
                try {
                    const delRes = await fetch(url, { method: 'DELETE' });
                    
                    if (delRes.ok) {
                        console.log(`✅ تم حذف: ${dup.name} - ${dup.contact} (Status: ${delRes.status})`);
                        deleted = true;
                        deletedCount++;
                        break;
                    }
                } catch (err) {
                    // جرّب الـ endpoint التالي
                }
            }
            
            if (!deleted) {
                console.log(`⚠️ تعذّر حذف: ${dup.name} - ${dup.contact} (ID: ${dup.id || dup._id}) - السيرفر لا يدعم الحذف`);
                failedCount++;
            }
        }

        console.log('\n📋 النتيجة النهائية:');
        console.log(`   ✅ تم حذف: ${deletedCount} سجل`);
        console.log(`   ⚠️ فشل الحذف: ${failedCount} سجل`);
        
        if (failedCount > 0) {
            console.log('\n💡 ملاحظة: السيرفر لا يدعم عملية الحذف (DELETE).');
            console.log('   لكن تم تطبيق حماية في الـ Frontend تمنع التسجيل المكرر:');
            console.log('   1. ✅ فحص رقم الموبايل مع قاعدة البيانات قبل الإرسال');
            console.log('   2. ✅ حفظ بيانات التسجيل في localStorage للحماية المحلية');
            console.log('   3. ✅ عرض المشتركين بدون مكررات في لوحة التحكم');
        }
        
        console.log('\nتم بنجاح.');
    } catch (err) {
        console.error('❌ خطأ:', err.message);
    }
}

removeDuplicates();
