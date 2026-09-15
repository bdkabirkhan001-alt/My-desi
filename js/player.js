let allVideos = [];
let currentVideo = null;

async function loadManifest() {
  try {
    const res = await fetch('json/manifest.json');
    const data = await res.json();
    return data.videos || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function loadVideo(id) {
  try {
    const res = await fetch(`json/${id}.json`);
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function loadAllVideos() {
  const ids = await loadManifest();
  const results = await Promise.all(ids.map(id => loadVideo(id)));
  allVideos = results.filter(v => v !== null);
}

function formatViews(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function renderPlayer() {
  if (!currentVideo) {
    document.getElementById('player-main').innerHTML = '<div class="loading">Video not found.</div>';
    return;
  }

  const v = currentVideo;
  document.title = v.title + ' - Mydesi.net';

  // Update OG tags dynamically if needed
  updateMetaTags(v);

  document.getElementById('player-main').innerHTML = `
    <div class="video-player-wrapper" id="video-wrapper">
      <video id="main-video" playsinline preload="metadata">
        <source src="${v.video_url}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
      <div class="play-overlay" id="play-overlay">
        <div class="play-btn">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
    </div>
    <div class="video-details">
      <h1>${v.title}</h1>
      <div class="meta">
        ${formatViews(v.views)} views • ${v.category} • ${v.date}
      </div>
      <div class="description">${v.description}</div>
      <div class="tags">
        ${v.tags.map(t => `<a href="index.html?tag=${encodeURIComponent(t)}" class="tag">${t}</a>`).join('')}
      </div>
    </div>
  `;

  // Setup video controls & play overlay
  setupVideoPlayer();

  // Suggestions
  const suggestions = allVideos
    .filter(vid => vid.id !== v.id)
    .sort((a, b) => {
      const aSame = a.category === v.category ? 1 : 0;
      const bSame = b.category === v.category ? 1 : 0;
      if (bSame !== aSame) return bSame - aSame;
      return b.views - a.views;
    })
    .slice(0, 8);

  const sugContainer = document.getElementById('suggestions-list');
  if (sugContainer) {
    sugContainer.innerHTML = suggestions.map(s => `
      <div class="suggestion-item" onclick="location.href='player.html?id=${s.id}'">
        <img src="${s.thumbnail}" alt="${s.title}" loading="lazy">
        <div class="info">
          <h4>${s.title}</h4>
          <p>${formatViews(s.views)} views</p>
        </div>
      </div>
    `).join('');
  }

  // View count simulation
  try {
    const key = 'views_' + v.id;
    let localViews = parseInt(localStorage.getItem(key) || '0');
    localViews++;
    localStorage.setItem(key, localViews);
  } catch (e) {}
}

function setupVideoPlayer() {
  const video = document.getElementById('main-video');
  const overlay = document.getElementById('play-overlay');
  if (!video || !overlay) return;

  // Click overlay → play
  overlay.addEventListener('click', () => {
    video.play();
  });

  // Show/hide overlay based on play state
  video.addEventListener('play', () => {
    overlay.classList.add('hidden');
    // Enable native controls after first play
    video.setAttribute('controls', 'controls');
  });

  video.addEventListener('pause', () => {
    // Only show overlay if not ended and user paused
    if (!video.ended) {
      overlay.classList.remove('hidden');
    }
  });

  video.addEventListener('ended', () => {
    overlay.classList.remove('hidden');
    video.removeAttribute('controls');
  });

  // Click on video itself also toggles (after controls appear)
  video.addEventListener('click', (e) => {
    // Let native controls handle most clicks
  });
}

function updateMetaTags(v) {
  // Dynamic OG for current video
  const setMeta = (property, content) => {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMeta('og:title', v.title + ' - Mydesi.net');
  setMeta('og:description', v.description);
  setMeta('og:image', v.thumbnail);
  setMeta('og:url', window.location.href);
  setMeta('og:type', 'video.other');
  setMeta('og:video', v.video_url);
}

document.addEventListener('DOMContentLoaded', async () => {
  const id = getQueryParam('id');
  if (!id) {
    document.getElementById('player-main').innerHTML = '<div class="loading">No video selected. <a href="index.html">Go Home</a></div>';
    return;
  }

  await loadAllVideos();
  currentVideo = allVideos.find(v => v.id === id) || await loadVideo(id);

  renderPlayer();
});
