document.addEventListener("DOMContentLoaded", () => {
    initGallery();
});

let galleryData = [];

async function initGallery() {
    const grid = document.getElementById("galerie-grid");
    if (!grid) return;

    // 1. Fetch images from galerie.json
    try {
        const response = await fetch("data/galerie.json?v=" + new Date().getTime());
        if (!response.ok) throw new Error("Netzwerk-Antwort war nicht ok");
        galleryData = await response.json();
        
        // 2. Render initial gallery (Show All)
        renderGallery("all");
        
        // 3. Setup category filter listeners
        document.querySelectorAll(".gallery-filter-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".gallery-filter-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                renderGallery(btn.getAttribute("data-category"));
            });
        });

        // 4. Setup search listener
        const searchInput = document.getElementById("gallery-search");
        if (searchInput) {
            searchInput.addEventListener("input", () => {
                const activeBtn = document.querySelector(".gallery-filter-btn.active");
                renderGallery(activeBtn ? activeBtn.getAttribute("data-category") : "all");
            });
        }

    } catch (error) {
        console.error("Fehler beim Laden der Fotogalerie:", error);
        grid.innerHTML = '<p class="text-center text-muted" style="grid-column: 1 / -1; padding: 3rem;">Bilder konnten nicht geladen werden.</p>';
    }
}

function renderGallery(filter) {
    const grid = document.getElementById("galerie-grid");
    if (!grid) return;

    let filtered = filter === "all" 
        ? galleryData 
        : galleryData.filter(item => item.category === filter);

    const searchInput = document.getElementById("gallery-search");
    if (searchInput && searchInput.value) {
        const searchVal = searchInput.value.toLowerCase();
        filtered = filtered.filter(item => {
            const title = (item.title || "").toLowerCase();
            const desc = (item.description || "").toLowerCase();
            const tags = (item.tags || []).join(" ").toLowerCase();
            const persons = (item.detectedPersons || []).join(" ").toLowerCase();
            return title.includes(searchVal) || desc.includes(searchVal) || tags.includes(searchVal) || persons.includes(searchVal);
        });
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="text-center text-muted" style="grid-column: 1 / -1; padding: 3rem;">Keine Fotos gefunden, die zu deiner Suche passen.</p>';
        return;
    }

    grid.innerHTML = "";

    filtered.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "masonry-item fade-in-up";
        card.style.animationDelay = `${index * 0.05}s`;
        card.style.cursor = "pointer";
        card.addEventListener("click", () => openLightbox(item));

        // Use custom gradient fallbacks in case physical image doesn't exist yet
        const fallbacks = [
            "linear-gradient(135deg, #0f3c5c 0%, #1e40af 100%)",
            "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
            "linear-gradient(135deg, #064e3b 0%, #10b981 100%)",
            "linear-gradient(135deg, #7c2d12 0%, #f97316 100%)",
            "linear-gradient(135deg, #581c87 0%, #a855f7 100%)",
            "linear-gradient(135deg, #4c1d95 0%, #6366f1 100%)"
        ];
        const gradient = fallbacks[index % fallbacks.length];

        const imgPlaceholderId = `img-gallery-${item.id}`;

        card.innerHTML = `
            <div class="gallery-img-container">
                <img id="${imgPlaceholderId}" src="${item.imageUrl}" alt="${item.title}" class="masonry-img" onerror="window.handleImageError(this, '${gradient}')">
                <div class="gallery-img-overlay">
                    <span class="gallery-zoom-icon">🔍</span>
                </div>
            </div>
            <div class="masonry-caption">
                <div style="display:flex; justify-content:flex-end; align-items:center; margin-bottom: 0.25rem;">
                    <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${item.date}</span>
                </div>
                <h4 style="margin: 5px 0 0 0; font-size:1.05rem; font-weight:700; color:var(--primary-color);">${item.title}</h4>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Global image error helper to gracefully replace missing image files with an elegant text gradient card
window.handleImageError = (imgEl, gradient) => {
    const parent = imgEl.parentElement;
    if (!parent) return;

    // Create a beautiful placeholder div
    const placeholder = document.createElement("div");
    placeholder.className = "gallery-img-fallback-container";
    placeholder.style.background = gradient;
    placeholder.innerHTML = `
        <div class="fallback-icon">📷</div>
        <div class="fallback-text">Vorschau</div>
    `;
    
    // Replace imgEl
    imgEl.style.display = "none";
    parent.appendChild(placeholder);
};

function getCategoryLabel(cat) {
    switch (cat) {
        case "geschichte": return "Geschichte";
        case "events": return "Events";
        case "nachwuchs": return "Nachwuchs";
        default: return cat;
    }
}

// === LIGHTBOX FUNCTIONALITY ===
function openLightbox(item) {
    const lightbox = document.getElementById("galerie-lightbox");
    const img = document.getElementById("lightbox-img");
    const fallback = document.getElementById("lightbox-fallback");
    const title = document.getElementById("lightbox-title");
    const desc = document.getElementById("lightbox-desc");
    const category = document.getElementById("lightbox-category");
    const date = document.getElementById("lightbox-date");

    if (!lightbox || !img) return;

    // Reset visibility
    img.style.display = "block";
    if (fallback) fallback.style.display = "none";

    img.src = item.imageUrl;
    img.alt = item.title;

    // Handle lightbox image error (e.g. file missing)
    img.onerror = () => {
        img.style.display = "none";
        if (fallback) {
            fallback.style.display = "flex";
            fallback.style.background = "linear-gradient(135deg, #0f3c5c 0%, #ef4444 100%)";
            fallback.innerHTML = `
                <span style="font-size:3rem; margin-bottom:1rem;">📷</span>
                <span style="font-weight:600; text-transform:uppercase; letter-spacing:1px; font-size:0.85rem; opacity:0.8;">Keine Bilddatei vorhanden</span>
            `;
        }
    };

    title.textContent = item.title;
    desc.innerHTML = item.description;
    
    category.textContent = getCategoryLabel(item.category);
    category.className = `category-badge badge-${item.category}`;
    date.textContent = item.date;

    // Render detected persons (internal archive)
    const personsContainer = document.getElementById("lightbox-persons");
    if (personsContainer) {
        if (item.detectedPersons && item.detectedPersons.length > 0) {
            personsContainer.innerHTML = `
                <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.08); font-size: 0.85rem;">
                    <strong style="color: var(--primary-color); display: block; margin-bottom: 0.35rem;">Personen (Internes Archiv):</strong>
                    <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                        ${item.detectedPersons.map(person => `<span class="person-tag" style="background: rgba(15, 60, 92, 0.08); color: var(--primary-color); border: 1px solid rgba(15, 60, 92, 0.15); padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">👤 ${person}</span>`).join('')}
                    </div>
                </div>
            `;
            personsContainer.style.display = "block";
        } else {
            personsContainer.innerHTML = "";
            personsContainer.style.display = "none";
        }
    }

    // Render tags
    const tagsContainer = document.getElementById("lightbox-tags");
    if (tagsContainer) {
        if (item.tags && item.tags.length > 0) {
            tagsContainer.innerHTML = item.tags.map(tag => `<span style="background: rgba(239, 68, 68, 0.06); color: var(--accent-color); border: 1px solid rgba(239, 68, 68, 0.12); font-size: 0.7rem; padding: 2px 7px; border-radius: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">#${tag}</span>`).join(' ');
            tagsContainer.style.display = "flex";
        } else {
            tagsContainer.innerHTML = "";
            tagsContainer.style.display = "none";
        }
    }

    lightbox.style.display = "flex";
    document.body.style.overflow = "hidden"; // disable background scrolling
}

window.closeLightbox = () => {
    const lightbox = document.getElementById("galerie-lightbox");
    if (!lightbox) return;
    lightbox.style.display = "none";
    document.body.style.overflow = ""; // restore scrolling
};

// Close lightbox on clicking outside content
document.addEventListener("DOMContentLoaded", () => {
    const lightbox = document.getElementById("galerie-lightbox");
    if (lightbox) {
        lightbox.addEventListener("click", (e) => {
            if (e.target === lightbox) {
                window.closeLightbox();
            }
        });
    }
});
