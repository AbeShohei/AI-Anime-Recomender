// script.js

// ————————————————————————————————
// モジュール読み込み（開発中は nodeIntegration: true 前提）
// ————————————————————————————————
const fs   = require('fs');
const path = require('path');
const Papa = require('papaparse');

// ————————————————————————————————
// グローバル変数
// ————————————————————————————————
let animeListData = [];
let allGenres = [];
let userPreferenceVector = [];
let filterCheckboxes = {};
const currentFilters = { TV: true, Movie: true, Others: true, showEcchi: true };
let currentPage = 1;
const itemsPerPage = 24;

// CSV ヘッダー名定数
const ANIME_COL_TITLE_JP   = 'Other name';
const ANIME_COL_TITLE_EN   = 'Name';
const ANIME_COL_GENRES     = 'Genres';
const ANIME_COL_TYPE       = 'Type';
const ANIME_COL_EPISODES   = 'Episodes';
const ANIME_COL_RATING     = 'Score';
const ANIME_COL_MEMBERS    = 'Members';
const ANIME_COL_IMAGE_URL  = 'Image URL';
const ANIME_COL_SYNOPSIS   = 'Synopsis';

// 英→和ジャンル辞書
const genreDictionary = {
  Action: 'アクション', Adventure: '冒険', Cars: '車', Comedy: 'コメディ',
  Dementia: '鬱', Demons: '悪魔', Drama: 'ドラマ', Ecchi: 'エッチ',
  Fantasy: 'ファンタジー', Game: 'ゲーム', Harem: 'ハーレム', Hentai: 'ヘンタイ',
  Historical: '歴史', Horror: 'ホラー', Josei: '女性向け', Kids: '子供向け',
  Magic: '魔法', 'Martial Arts': '武道', Mecha: 'メカ', Military: '軍事',
  Music: '音楽', Mystery: 'ミステリー', Parody: 'パロディ', Police: '警察',
  Psychological: '心理', Romance: 'ロマンス', Samurai: '侍', School: '学園',
  'Sci-Fi': 'SF', Seinen: '青年向け', Shoujo: '少女向け', 'Shoujo Ai': '百合',
  Shounen: '少年向け', 'Shounen Ai': 'やおい',
  'Slice of Life': '日常', Space: '宇宙', Sports: 'スポーツ',
  'Super Power': 'スーパーパワー', Supernatural: '超常現象', Thriller: 'スリラー',
  Vampire: 'ヴァンパイア', Yaoi: 'やおい', Yuri: '百合'
};

// ————————————————————————————————
// ユーティリティ関数
// ————————————————————————————————

/** HTMLエンティティをデコード */
function decodeHtmlEntities(text) {
  if (typeof text !== 'string') return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/** コサイン類似度を計算 */
function calculateCosineSimilarity(vecA, vecB) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot  += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  return (magA && magB) ? dot / (magA * magB) : 0;
}

// ————————————————————————————————
// ローカルCSV読み込み関数
// ————————————————————————————————

/**
 * プロジェクト直下の anime-dataset-2023.csv を読み込んでパースする
 * @returns {Promise<{ data: object[], meta: { fields: string[] } }>}
 */
function loadAnimeCSV() {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, 'anime-dataset-2023.csv');
    fs.readFile(filePath, 'utf8', (err, fileData) => {
      if (err) {
        return reject(new Error('CSVファイルの読み込みに失敗しました: ' + err.message));
      }
      const results = Papa.parse(fileData, {
        header: true,
        skipEmptyLines: true
      });
      if (results.errors.length) {
        console.warn('CSVパース中のエラー:', results.errors);
      }
      resolve({ data: results.data, meta: results.meta });
    });
  });
}

// ————————————————————————————————
// 全体処理のキックオフ
// ————————————————————————————————

async function loadAllDataAndProcess() {
  const loadingEl = document.getElementById('loadingMessage');
  if (loadingEl) loadingEl.style.display = 'block';

  try {
    // ローカル読み込みを呼び出し
    const { data, meta } = await loadAnimeCSV();

    // 必須カラムチェック
    const required = [
      ANIME_COL_TITLE_JP, ANIME_COL_TITLE_EN,
      ANIME_COL_GENRES,   ANIME_COL_TYPE,
      ANIME_COL_RATING,   ANIME_COL_IMAGE_URL,
      ANIME_COL_EPISODES
    ];
    const missing = required.filter(col => !meta.fields.includes(col));
    if (missing.length) {
      throw new Error(`CSVに必要な列がありません: ${missing.join(', ')}`);
    }

    // データ整形
    animeListData = data.map(item => {
      let titleJp = item[ANIME_COL_TITLE_JP];
      let title = (titleJp && titleJp.trim() && titleJp !== 'UNKNOWN')
        ? titleJp.trim()
        : (item[ANIME_COL_TITLE_EN] || '').trim();
      if (!title) title = 'タイトル不明';

      const genresArr = (item[ANIME_COL_GENRES] || '')
        .split(',')
        .map(g => g.trim())
        .filter(g => g && g !== 'Hentai');

      return {
        id:       item.anime_id || '',
        title,
        english:  item[ANIME_COL_TITLE_EN] || '',
        genres_array: genresArr,
        type:     item[ANIME_COL_TYPE] || '不明',
        episodes: item[ANIME_COL_EPISODES] || '不明',
        rating:   parseFloat(item[ANIME_COL_RATING]) || 0,
        members:  parseInt(item[ANIME_COL_MEMBERS], 10) || 0,
        imageUrl: item[ANIME_COL_IMAGE_URL] || '',
        synopsis: item[ANIME_COL_SYNOPSIS] || ''
      };
    }).filter(a => a.title !== 'タイトル不明');

    // 推薦用処理
    processAnimeDataForRecommendations();
    loadUserPreferencesAndVectorize();
    updateCurrentFilters();
    displayRecommendations();

  } catch (err) {
    console.error(err);
    const area = document.getElementById('recommendationsArea');
    if (area) {
      area.innerHTML = `<p style="color:red;">エラー: ${err.message}</p>`;
    }
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

// ————————————————————————————————
// ジャンルベクトル化
// ————————————————————————————————

function processAnimeDataForRecommendations() {
  const genreSet = new Set();
  animeListData.forEach(a => {
    a.genres_array.forEach(g => genreSet.add(g));
  });
  allGenres = Array.from(genreSet).sort();
  animeListData.forEach(a => {
    a.genre_vector = allGenres.map(g => a.genres_array.includes(g) ? 1 : 0);
  });
}

// ————————————————————————————————
// ユーザ設定読み込み
// ————————————————————————————————

function loadUserPreferencesAndVectorize() {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem('userAnimeGenres')) || [];
  } catch {
    saved = [];
  }
  userPreferenceVector = allGenres.map(g => saved.includes(g) ? 1 : 0);
}

// ————————————————————————————————
// フィルター更新
// ————————————————————————————————

function updateCurrentFilters() {
  currentFilters.TV        = filterCheckboxes.tv.checked;
  currentFilters.Movie     = filterCheckboxes.movie.checked;
  currentFilters.Others    = filterCheckboxes.others.checked;
  currentFilters.showEcchi = filterCheckboxes.ecchi.checked;
}

function filterAnimeByType(a) {
  const t = (a.type || '').trim().toLowerCase();
  if (t === 'tv' && currentFilters.TV)        return true;
  if (t === 'movie' && currentFilters.Movie)  return true;
  if (!['tv','movie'].includes(t) && currentFilters.Others) return true;
  return false;
}

// ————————————————————————————————
// 表示ロジック
// ————————————————————————————————

function displayRecommendations() {
  const area = document.getElementById('recommendationsArea');
  area.innerHTML = '';

  if (!userPreferenceVector.some(v => v)) {
    area.innerHTML = `<p>設定がありません。<a href="survey.html">アンケート</a>で診断してください。</p>`;
    renderPagination(0);
    return;
  }
  if (!animeListData.length) {
    area.innerHTML = `<p>アニメデータが読み込めませんでした。</p>`;
    renderPagination(0);
    return;
  }

  let list = animeListData.filter(filterAnimeByType);
  if (!currentFilters.showEcchi) {
    list = list.filter(a => !a.genres_array.includes('Ecchi'));
  }

  const scored = list.map(a => ({
    ...a,
    similarity: calculateCosineSimilarity(userPreferenceVector, a.genre_vector)
  }));
  scored.sort((a, b) => b.similarity - a.similarity);

  const total = scored.length;
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = scored.slice(start, start + itemsPerPage);

  if (!pageItems.length && total) {
    area.innerHTML = `<p>このページに表示できる作品がありません。</p>`;
  } else {
    pageItems.forEach(a => {
      const div = document.createElement('div');
      div.classList.add('recommend-item-list');

      const imgHtml = a.imageUrl
        ? `<img src="${a.imageUrl}" alt="${decodeHtmlEntities(a.title)}" loading="lazy">`
        : `<div class="no-image">画像なし</div>`;

      const eps = isNaN(parseInt(a.episodes, 10)) ? '不明' : parseInt(a.episodes, 10);
      const genres = (a.genres_array || [])
        .map(g => genreDictionary[g] || g)
        .join(', ') || '不明';

      div.innerHTML = `
        <div class="recommend-item-image">${imgHtml}</div>
        <div class="recommend-item-content">
          <div class="title-area">
            <h3>${decodeHtmlEntities(a.title)}</h3>
            <span class="similarity-score">✨ ${(a.similarity * 100).toFixed(1)}%</span>
          </div>
          <p class="info">
            <strong>種類:</strong> ${a.type} |
            <strong>評価:</strong> ${a.rating.toFixed(2)} |
            <strong>話数:</strong> ${eps}
          </p>
          <p class="genres"><strong>ジャンル:</strong> ${genres}</p>
        </div>
      `;
      area.appendChild(div);
    });
  }

  renderPagination(total);
}

function renderPagination(totalItems) {
  const pa = document.getElementById('paginationArea');
  pa.innerHTML = '';
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return;

  const ul = document.createElement('ul');
  ul.classList.add('pagination');

  const mk = (text, num, disabled, active) => {
    const li = document.createElement('li');
    li.classList.add('page-item');
    if (disabled) li.classList.add('disabled');
    if (active)   li.classList.add('active');
    const a = document.createElement('a');
    a.classList.add('page-link');
    a.href = '#';
    a.textContent = text;
    a.addEventListener('click', e => {
      e.preventDefault();
      if (!disabled && !active) goToPage(num);
    });
    li.appendChild(a);
    return li;
  };

  ul.appendChild(mk('前へ', currentPage - 1, currentPage === 1, false));

  let startP = Math.max(1, currentPage - 2);
  let endP   = Math.min(totalPages, startP + 4);
  if (endP - startP < 4) startP = Math.max(1, endP - 4);

  if (startP > 1) {
    ul.appendChild(mk('1', 1, false, false));
    if (startP > 2) ul.appendChild(mk('...', null, true, false));
  }
  for (let i = startP; i <= endP; i++) {
    ul.appendChild(mk(`${i}`, i, false, i === currentPage));
  }
  if (endP < totalPages) {
    if (endP < totalPages - 1) ul.appendChild(mk('...', null, true, false));
    ul.appendChild(mk(`${totalPages}`, totalPages, false, false));
  }

  ul.appendChild(mk('次へ', currentPage + 1, currentPage === totalPages, false));
  pa.appendChild(ul);
}

function goToPage(p) {
  currentPage = p;
  displayRecommendations();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ————————————————————————————————
// 初期化
// ————————————————————————————————
document.addEventListener('DOMContentLoaded', () => {
  filterCheckboxes.tv     = document.getElementById('filterTV');
  filterCheckboxes.movie  = document.getElementById('filterMovie');
  filterCheckboxes.others = document.getElementById('filterOthers');
  filterCheckboxes.ecchi  = document.getElementById('filterEcchi');
  Object.values(filterCheckboxes).forEach(cb => {
    cb.addEventListener('change', () => {
      updateCurrentFilters();
      currentPage = 1;
      displayRecommendations();
    });
  });

  loadAllDataAndProcess();
});
