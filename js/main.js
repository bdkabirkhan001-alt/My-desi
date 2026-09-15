const VIDEOS_PER_PAGE = 6;
let allVideos = [];
let currentPage = 1;
let currentFilter = 'all'; // all, popular, new, category, tag
let currentCategory = '';
let currentTag = '';
let searchQuery = '';

async function loadManifest() {
  try {
    const res = await fetch('json/manifest.json');
    const data = await res.json();
    return data.videos || [];
  } catch (e) {
    console.error('Manifest load failed', e);
    return [];
  }
}

async function loadVideo(id) {
  try {
    const res = await fetch(`json/${id}.json`);
    return await res.json();
  } catch (e) {
    console.error('Failed to load', id, e);
    return null;
  }
}

async function loadAllVideos() {
  const ids = await loadManifest();
  const promises = ids.map(id => loadVideo(id));
  const results = await Promise.all(promises);
  allVideos = results.filter(v => v !== null);
  // Sort by date desc by default for "new"
  allVideos.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function formatViews(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getFilteredVideos() {
  let filtered = [...allVideos];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(v =>
      v.title.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.tags.some(t => t.toLowerCase().includes(q)) ||
      v.category.toLowerCase().includes(q)
    );
  }

  if (currentFilter === 'popular') {
    filtered.sort((a, b) => b.views - a.views);
  } else if (currentFilter === 'new') {
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (currentFilter === 'category' && currentCategory) {
    filtered = filtered.filter(v => v.category === currentCategory);
  } else if (currentFilter === 'tag' && currentTag) {
    filtered = filtered.filter(v => v.tags.includes(currentTag));
  }

  return filtered;
}

function renderVideos() {
  const container = document.getElementById('video-grid');
  const pagination = document.getElementById('pagination');
  if (!container) return;

  const filtered = getFilteredVideos();
  const totalPages = Math.ceil(filtered.length / VIDEOS_PER_PAGE) || 1;
  if (currentPage > totalPages) currentPage = 1;

  const start = (currentPage - 1) * VIDEOS_PER_PAGE;
  const pageVideos = filtered.slice(start, start + VIDEOS_PER_PAGE);

  if (pageVideos.length === 0) {
    container.innerHTML = '<div class="loading">No videos found.</div>';
    pagination.innerHTML = '';
    return;
  }

  container.innerHTML = pageVideos.map(v => `
    <div class="video-card" onclick="location.href='player.html?id=${v.id}'">
      <img src="${v.thumbnail}" alt="${v.title}" loading="lazy">
      <div class="video-info">
        <h3>${v.title}</h3>
        <div class="video-meta">
          <span>${formatViews(v.views)} views</span>
          <span>${v.category}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Pagination
  let pagHtml = '';
  if (totalPages > 1) {
    pagHtml += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
      pagHtml += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    pagHtml += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">Next</button>`;
  }
  pagination.innerHTML = pagHtml;
}

function goToPage(page) {
  currentPage = page;
  renderVideos();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setFilter(filter, value = '') {
  currentFilter = filter;
  currentCategory = filter === 'category' ? value : '';
  currentTag = filter === 'tag' ? value : '';
  currentPage = 1;
  searchQuery = '';
  document.getElementById('search-input').value = '';

  // Update active tabs
  document.querySelectorAll('.filter-tabs button').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filter === filter) btn.classList.add('active');
  });

  updateSectionTitle();
  renderVideos();
}

function updateSectionTitle() {
  const titleEl = document.getElementById('section-title');
  if (!titleEl) return;
  if (currentFilter === 'popular') titleEl.textContent = 'Popular Videos';
  else if (currentFilter === 'new') titleEl.textContent = 'New Videos';
  else if (currentFilter === 'category') titleEl.textContent = `Category: ${currentCategory}`;
  else if (currentFilter === 'tag') titleEl.textContent = `Tag: ${currentTag}`;
  else if (searchQuery) titleEl.textContent = `Search: "${searchQuery}"`;
  else titleEl.textContent = 'All Videos';
}

function doSearch() {
  searchQuery = document.getElementById('search-input').value.trim();
  currentFilter = 'all';
  currentPage = 1;
  document.querySelectorAll('.filter-tabs button').forEach(btn => btn.classList.remove('active'));
  updateSectionTitle();
  renderVideos();
}

function renderCategoriesAndTags() {
  const cats = [...new Set(allVideos.map(v => v.category))];
  const tags = [...new Set(allVideos.flatMap(v => v.tags))];

  const catContainer = document.getElementById('category-list');
  const tagContainer = document.getElementById('tag-list');

  if (catContainer) {
    catContainer.innerHTML = cats.map(c =>
      `<a href="#" onclick="setFilter('category','${c}'); return false;">${c}</a>`
    ).join('');
  }
  if (tagContainer) {
    tagContainer.innerHTML = tags.map(t =>
      `<a href="#" onclick="setFilter('tag','${t}'); return false;">${t}</a>`
    ).join('');
  }
}

// Modal functions
function openModal(id) {
  document.getElementById(id).classList.add('active');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'block';

  await loadAllVideos();

  if (loading) loading.style.display = 'none';

  renderCategoriesAndTags();
  renderVideos();

  // Search enter key
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') doSearch();
    });
  }
});
