const API_URL = 'https://patient-corrinne-ewgr-6bd914bd.koyeb.app'; // Production server (Final)

document.addEventListener('DOMContentLoaded', () => {
    const participantsList = document.getElementById('participantsList');
    const totalCount = document.getElementById('totalCount');
    const winnerCountInput = document.getElementById('winnerCount');
    const pickWinnersBtn = document.getElementById('pickWinnersBtn');
    const winnersSection = document.getElementById('winnersSection');
    const winnersList = document.getElementById('winnersList');

    let allParticipants = [];

    // Fetch participants
    const fetchParticipants = async () => {
        try {
            // 1. Initial Local Data Load
            let rawData = [];
            try {
                const localRes = await fetch('old_data.json');
                if (localRes.ok) {
                    rawData = await localRes.json();
                    allParticipants = [...rawData];
                    renderParticipants(); // Update UI immediately
                }
            } catch (e) {
                console.warn('Local data error:', e);
            }

            // 2. Refresh with API Data (Merged with Local)
            const response = await fetch(`${API_URL}/api/participants`);
            if (response.ok) {
                const serverData = await response.json();
                const merged = [...(serverData.participants || []), ...rawData];
                
                // --- ULTRA CLEAN DUPLICATE FILTERING ---
                const seenPairs = new Set();
                const seenContacts = new Set();
                
                allParticipants = merged.filter(p => {
                    const normName = (p.name || '').trim().toLowerCase();
                    const normContact = (p.contact || '').trim().replace(/\s/g, ''); // phone without spaces
                    
                    // If either contact or name+contact pair is seen, skip it
                    const uniqueKey = `${normName}-${normContact}`;
                    
                    if (!normContact || seenContacts.has(normContact) || seenPairs.has(uniqueKey)) {
                        return false; 
                    }
                    
                    seenContacts.add(normContact);
                    seenPairs.add(uniqueKey);
                    return true;
                });
                // --- END FILTERING ---

                renderParticipants();
            }
        } catch (error) {
            console.error('Fetch error:', error);
            if (allParticipants.length === 0) {
                participantsList.innerHTML = '<div class="error w-100 text-center" style="color:var(--danger)">خطأ في جلب البيانات</div>';
            }
        }
    };

    const renderParticipants = () => {
        totalCount.textContent = allParticipants.length;

        if (allParticipants.length === 0) {
            participantsList.innerHTML = '<div class="text-center w-100" style="color:var(--text-muted); grid-column: 1 / -1;">لا يوجد مشتركون حتى الآن</div>';
            return;
        }

        participantsList.innerHTML = allParticipants.map(createParticipantCard).join('');
    };

    const createParticipantCard = (p) => {
        const imgHtml = p.image
            ? `<img src="${p.image}" class="participant-img clickable-image" alt="${escapeHtml(p.name)}" data-fullsrc="${p.image}">`
            : `<div class="participant-img-placeholder">👤</div>`;

        return `
            <div class="participant-card">
                ${imgHtml}
                <div class="participant-name">${escapeHtml(p.name)}</div>
                <div class="participant-contact">${escapeHtml(p.contact)}</div>
            </div>
        `;
    };

    // Pick random winners
    pickWinnersBtn.addEventListener('click', () => {
        const count = parseInt(winnerCountInput.value) || 1;

        if (allParticipants.length === 0) {
            alert('لا يوجد متسابقين لاختيار فائزين!');
            return;
        }

        if (count > allParticipants.length) {
            alert('عدد الفائزين المطلوب أكبر من عدد المتسابقين!');
            return;
        }

        pickWinnersBtn.disabled = true;
        pickWinnersBtn.textContent = 'جاري الاختيار...';
        winnersSection.classList.remove('hidden');

        // Helper for completely random shuffle (Fisher-Yates)
        const pureRandomShuffle = (array) => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        // Fake shuffling effect
        let shuffleInterval = setInterval(() => {
            const tempShuffled = pureRandomShuffle(allParticipants).slice(0, count);
            winnersList.innerHTML = tempShuffled.map(p => `
                <div class="participant-card" style="opacity: 0.5">
                    ${p.image ? `<img src="${p.image}" class="participant-img clickable-image" data-fullsrc="${p.image}">` : `<div class="participant-img-placeholder">👤</div>`}
                    <div class="participant-name">${escapeHtml(p.name)}</div>
                </div>
            `).join('');
        }, 100);

        // Final result
        setTimeout(() => {
            clearInterval(shuffleInterval);

            // Actually pick winners (Completely Random)
            const shuffled = pureRandomShuffle(allParticipants);
            const winners = shuffled.slice(0, count);

            winnersList.innerHTML = winners.map((p, index) => {
                const imgHtml = p.image
                    ? `<img src="${p.image}" class="participant-img clickable-image" data-fullsrc="${p.image}">`
                    : `<div class="participant-img-placeholder">👤</div>`;

                return `
                    <div class="participant-card winner-anim" style="animation-delay: ${index * 0.15}s">
                        ${imgHtml}
                        <div class="participant-name">${escapeHtml(p.name)}</div>
                        <div class="participant-contact">${escapeHtml(p.contact)}</div>
                        <div style="color: #fbbf24; margin-top: 0.5rem; font-weight: bold; font-size: 1.5rem;">🏆</div>
                    </div>
                `;
            }).join('');

            // Confetti
            fireConfetti();

            pickWinnersBtn.disabled = false;
            pickWinnersBtn.textContent = 'إعادة الاختيار 🎲';

            // Scroll to winners
            winnersSection.scrollIntoView({ behavior: 'smooth' });
        }, 2000);
    });

    // Confetti effect using canvas-confetti
    const fireConfetti = () => {
        if (typeof confetti === 'undefined') return;
        var duration = 3 * 1000;
        var end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#3b82f6', '#8b5cf6', '#fbbf24', '#10b981']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#3b82f6', '#8b5cf6', '#fbbf24', '#10b981']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    };

    // Helper to prevent XSS
    const escapeHtml = (unsafe) => {
        return (unsafe || '').toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Initial fetch
    fetchParticipants();

    // Auto refresh every 10 seconds
    setInterval(fetchParticipants, 10000);

    // Modal Logic
    const imageModal = document.getElementById('imageModal');
    const fullImage = document.getElementById('fullImage');

    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('clickable-image')) {
            fullImage.src = e.target.getAttribute('data-fullsrc');
            imageModal.classList.remove('hidden');
        } else if (e.target.classList.contains('close-modal') || e.target === imageModal) {
            imageModal.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !imageModal.classList.contains('hidden')) {
            imageModal.classList.add('hidden');
        }
    });
});
