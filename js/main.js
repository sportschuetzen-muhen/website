// Simple smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            targetElement.scrollIntoView({
                behavior: 'smooth'
            });
            
            // Update active state in nav
            document.querySelectorAll('.desktop-nav a').forEach(navLink => {
                navLink.classList.remove('active');
            });
            this.classList.add('active');
            
            // Close mobile menu if open
            document.getElementById('nav-links').classList.remove('open');
        }
    });
});

// Mobile Menu Toggle
const mobileToggle = document.getElementById('mobile-toggle');
const navLinks = document.getElementById('nav-links');

if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
}

// Fetch Termine
async function loadTermine() {
    const container = document.getElementById('termine-container');
    if (!container) return;

    try {
        const WORKER_TERMINE_URL = "https://termine.dan-hunziker73.workers.dev?action=getTermine";
        
        const response = await fetch(WORKER_TERMINE_URL);
        if (!response.ok) throw new Error('Netzwerk-Antwort war nicht ok');
        
        let termine = await response.json();
        
        // Prefix logic
        const rules = {
            "Gruppenmeisterschaft SSV": 3,
            "Gruppenmeisterschaft AGSV": 3,
            "Grenzland-Cup": 3,
            "Mannschaftsmeisterschaft": 7
        };

        const counters = {};

        termine = termine.map(t => {
            const title = t.titel.trim();
            if (title.toLowerCase().startsWith("final")) return t;

            for (const baseTitle in rules) {
                if (title === baseTitle) {
                    counters[baseTitle] = (counters[baseTitle] || 0) + 1;
                    if (counters[baseTitle] <= rules[baseTitle]) {
                        return {
                            ...t,
                            titel: `${counters[baseTitle]}. Runde ${title}`
                        };
                    }
                }
            }
            return t;
        });

        // Filter out past events
        const today = new Date();
        today.setHours(0,0,0,0);
        
        termine = termine.filter(t => {
            const parse = (obj) => {
                if (obj.datum_iso) return new Date(obj.datum_iso);
                if (obj.datum && obj.datum.includes('.')) {
                    const [d, m, y] = obj.datum.split('.');
                    return new Date(y, m - 1, d);
                }
                return null;
            };
            const dateObj = parse(t);
            if (!dateObj) return false;
            dateObj.setHours(0,0,0,0);
            return dateObj >= today;
        });

        // Sort by date
        termine.sort((a, b) => {
            const parse = (obj) => {
                if (obj.datum_iso) return new Date(obj.datum_iso);
                if (obj.datum && obj.datum.includes('.')) {
                    const [d, m, y] = obj.datum.split('.');
                    return new Date(y, m - 1, d);
                }
                return new Date(8640000000000000);
            };
            return parse(a) - parse(b);
        });

        // Take next 4 events
        const nextTermine = termine.slice(0, 4);
        
        if (nextTermine.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Zurzeit stehen keine Termine an.</p>';
            return;
        }

        container.innerHTML = '';
        const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

        nextTermine.forEach(t => {
            let dObj;
            if (t.datum_iso) dObj = new Date(t.datum_iso);
            else if (t.datum && t.datum.includes('.')) {
                const [d, m, y] = t.datum.split('.');
                dObj = new Date(y, m - 1, d);
            }
            
            const day = dObj.getDate();
            const month = months[dObj.getMonth()];
            
            container.innerHTML += `
                <div class="termin-item">
                    <div class="termin-date">
                        <span class="day">${day}</span>
                        <span class="month">${month}</span>
                    </div>
                    <div class="termin-details">
                        <h3>${t.titel}</h3>
                        <p>${t.start ? '🕒 ' + t.start + ' Uhr | ' : ''}📍 ${t.ort || 'Schützenhaus Muhen'}</p>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error('Fehler beim Laden der Termine:', error);
        container.innerHTML = '<p class="text-center text-muted">Termine konnten nicht geladen werden.</p>';
    }
}

// Fetch Reports
async function loadReports() {
    const container = document.getElementById('reports-container');
    if (!container) return;

    try {
        // Cache-Busting durch Timestamp hinzugefügt
        const response = await fetch('data/berichte.json?v=' + new Date().getTime());
        if (!response.ok) throw new Error('Berichte nicht gefunden');
        
        const reports = await response.json();
        
        if (!reports || reports.length === 0) {
            container.innerHTML = '<p class="text-center text-muted" style="grid-column: 1 / -1;">Zurzeit sind keine Berichte vorhanden.</p>';
            return;
        }

        container.innerHTML = '';

        // Display up to 6 reports
        const recentReports = reports.slice(0, 6);

        recentReports.forEach(r => {
            const dateObj = new Date(r.date);
            const dateStr = dateObj.toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' });
            
            // Create a short excerpt from the HTML content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = r.content;
            let excerpt = tempDiv.textContent || tempDiv.innerText || "";
            if (excerpt.length > 120) {
                excerpt = excerpt.substring(0, 120) + '...';
            }

            const imgHtml = r.image || r.imageUrl 
                ? `<div class="report-image" style="background-image: url('${r.image || r.imageUrl}'); background-size: cover; background-position: center;"></div>`
                : `<div class="report-image" style="background: linear-gradient(45deg, #1e293b, #334155); display: flex; align-items: center; justify-content: center; font-size: 2rem;">📰</div>`;

            container.innerHTML += `
                <div class="glass-card report-card">
                    ${imgHtml}
                    <div class="report-content" style="padding: 20px;">
                        <span class="report-date" style="color: var(--primary-color); font-weight: 600; font-size: 0.85rem;">${dateStr} | ${r.author}</span>
                        <h3 style="margin: 10px 0;">${r.title}</h3>
                        <p style="color: var(--text-muted); font-size: 0.95rem;">${excerpt}</p>
                        <button class="read-more btn btn-outline" style="margin-top: 15px; width: 100%; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.05);" onclick="alert('In einer vollständigen Implementierung würde sich hier der ganze Bericht öffnen:\\n\\n${r.content.replace(/"/g, '&quot;').replace(/\n/g, ' ')}')">Ganzen Bericht lesen</button>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error('Fehler beim Laden der Berichte:', error);
        container.innerHTML = '<p class="text-center text-muted" style="grid-column: 1 / -1;">Berichte konnten nicht geladen werden.</p>';
    }
}

// Load Termine and Reports on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    loadTermine();
    loadReports();
});
