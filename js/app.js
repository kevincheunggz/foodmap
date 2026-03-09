// 美食地图 Web App - 主逻辑

  const CONFIG = {
      STORAGE_KEY: 'foodmap_restaurants',
      LAST_SYNC_KEY: 'foodmap_last_sync',
      REMOTE_DATA_URL: 'data/restaurants.json',
      SYNC_INTERVAL: 24 * 60 * 60 * 1000
  };

  let state = {
      restaurants: [],
      currentTab: 'map',
      selectedCuisine: '',
      searchQuery: '',
      selectedRestaurant: null,
      map: null,
      markers: []
  };

  document.addEventListener('DOMContentLoaded', async () => {
      await initApp();
  });

  async function initApp() {
      loadLocalData();

      if (typeof AMap !== 'undefined') {
          initMap();
      } else {
          console.warn('高德地图API未加载');
          showToast('地图加载失败，请检查网络');
      }

      bindEvents();
      updateStats();
      renderList();
      checkAutoSync();

      document.getElementById('loading').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
  }

  function loadLocalData() {
      const data = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (data) {
          state.restaurants = JSON.parse(data);
      } else {
          state.restaurants = getSampleData();
          saveLocalData();
      }
  }

  function saveLocalData() {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.restaurants));
  }

  function getSampleData() {
      return [
          {
              id: Date.now(),
              name: "示例 - 成都老火锅",
              address: "成都市锦江区春熙路示例地址",
              latitude: 30.6586,
              longitude: 104.0665,
              cuisineType: "火锅",
              averagePrice: 120,
              phone: "028-12345678",
              videoUrl: "https://www.bilibili.com/video/BV1xx411c7mD",
              videoTitle: "【毛毛美食指南】示例视频",
              rating: 4.5,
              notes: "UP主强烈推荐",
              businessHours: "11:00-22:00",
              hasVisited: false,
              createdAt: new Date().toISOString(),
              isLocal: true
          }
      ];
  }

  function initMap() {
      state.map = new AMap.Map('mapContainer', {
          zoom: 12,
          center: [116.4074, 39.9042]
      });

      state.map.addControl(new AMap.Scale());
      state.map.addControl(new AMap.ToolBar());

      updateMapMarkers();

      if (state.restaurants.length > 0) {
          const first = state.restaurants[0];
          state.map.setCenter([first.longitude, first.latitude]);
      }
  }

  function updateMapMarkers() {
      if (!state.map) return;

      state.markers.forEach(marker => marker.setMap(null));
      state.markers = [];

      const filtered = getFilteredRestaurants();

      filtered.forEach(restaurant => {
          const marker = new AMap.Marker({
              position: [restaurant.longitude, restaurant.latitude],
              title: restaurant.name,
              icon: restaurant.hasVisited
                  ? 'https://webapi.amap.com/theme/v1.3/markers/n/mark_bs.png'
                  : 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png'
          });

          marker.on('click', () => {
              showMapCard(restaurant);
          });

          marker.setMap(state.map);
          state.markers.push(marker);
      });
  }

  function showMapCard(restaurant) {
      state.selectedRestaurant = restaurant;
      const card = document.getElementById('mapInfoCard');

      document.getElementById('cardTitle').textContent = restaurant.name;
      document.getElementById('cardAddress').textContent = restaurant.address;
      document.getElementById('cardCuisine').textContent = restaurant.cuisineType || '其他';
      document.getElementById('cardPrice').textContent = restaurant.averagePrice
          ? `¥${restaurant.averagePrice}/人`
          : '';

      card.classList.remove('hidden');
  }

  function getFilteredRestaurants() {
      return state.restaurants.filter(r => {
          const matchCuisine = !state.selectedCuisine || r.cuisineType === state.selectedCuisine;
          const matchSearch = !state.searchQuery ||
              r.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
              r.address.toLowerCase().includes(state.searchQuery.toLowerCase());
          return matchCuisine && matchSearch;
      });
  }

  function renderList() {
      const listEl = document.getElementById('restaurantList');
      const emptyEl = document.getElementById('emptyState');
      const filtered = getFilteredRestaurants();

      if (filtered.length === 0) {
          listEl.innerHTML = '';
          listEl.classList.add('hidden');
          emptyEl.classList.remove('hidden');
          return;
      }

      listEl.classList.remove('hidden');
      emptyEl.classList.add('hidden');

      listEl.innerHTML = filtered.map(r => `
          <div class="restaurant-item" data-id="${r.id}">
              <div class="visit-status ${r.hasVisited ? 'visited' : ''}" data-id="${r.id}">
                  ${r.hasVisited ? '✓' : ''}
              </div>
              <div class="restaurant-info">
                  <div class="restaurant-name">${r.name}</div>
                  <div class="restaurant-address">${r.address}</div>
                  <div class="restaurant-meta">
                      ${r.cuisineType ? `<span class="cuisine-tag">${r.cuisineType}</span>` : ''}
                      ${r.averagePrice ? `<span class="price-tag">¥${r.averagePrice}/人</span>` : ''}
                      ${r.rating ? `<span class="rating">${'⭐'.repeat(Math.floor(r.rating))}</span>` : ''}
                  </div>
              </div>
              <span class="arrow">›</span>
          </div>
      `).join('');

      document.querySelectorAll('.restaurant-item').forEach(item => {
          item.addEventListener('click', (e) => {
              if (e.target.classList.contains('visit-status')) {
                  toggleVisited(parseInt(e.target.dataset.id));
              } else {
                  showDetail(parseInt(item.dataset.id));
              }
          });
      });
  }

  function updateStats() {
      const total = state.restaurants.length;
      const visited = state.restaurants.filter(r => r.hasVisited).length;

      document.getElementById('totalCount').textContent = total;
      document.getElementById('visitedCount').textContent = visited;
      document.getElementById('pendingCount').textContent = total - visited;
  }

  function openAddModal() {
      document.getElementById('modalTitle').textContent = '添加店铺';
      document.getElementById('restaurantForm').reset();
      document.getElementById('restaurantId').value = '';
      document.getElementById('deleteBtn').classList.add('hidden');
      document.querySelectorAll('.rating-input .star').forEach(s => s.classList.remove('active'));
      document.getElementById('formRating').value = 0;
      document.getElementById('modal').classList.remove('hidden');
  }

  function openEditModal(id) {
      const restaurant = state.restaurants.find(r => r.id === id);
      if (!restaurant) return;

      document.getElementById('modalTitle').textContent = '编辑店铺';
      document.getElementById('restaurantId').value = restaurant.id;
      document.getElementById('formName').value = restaurant.name;
      document.getElementById('formAddress').value = restaurant.address;
      document.getElementById('formLat').value = restaurant.latitude;
      document.getElementById('formLng').value = restaurant.longitude;
      document.getElementById('formCuisine').value = restaurant.cuisineType;
      document.getElementById('formPrice').value = restaurant.averagePrice || '';
      document.getElementById('formPhone').value = restaurant.phone || '';
      document.getElementById('formVideoTitle').value = restaurant.videoTitle || '';
      document.getElementById('formVideoUrl').value = restaurant.videoUrl || '';
      document.getElementById('formHours').value = restaurant.businessHours || '';
      document.getElementById('formNotes').value = restaurant.notes || '';
      document.getElementById('formVisited').checked = restaurant.hasVisited;
      document.getElementById('formRating').value = restaurant.rating || 0;

      const rating = restaurant.rating || 0;
      document.querySelectorAll('.rating-input .star').forEach((star, index) => {
          star.classList.toggle('active', index < rating);
      });

      document.getElementById('deleteBtn').classList.remove('hidden');
      document.getElementById('modal').classList.remove('hidden');
      document.getElementById('detailModal').classList.add('hidden');
  }

  function saveRestaurant(e) {
      e.preventDefault();

      const id = document.getElementById('restaurantId').value;
      const restaurant = {
          id: id ? parseInt(id) : Date.now(),
          name: document.getElementById('formName').value.trim(),
          address: document.getElementById('formAddress').value.trim(),
          latitude: parseFloat(document.getElementById('formLat').value),
          longitude: parseFloat(document.getElementById('formLng').value),
          cuisineType: document.getElementById('formCuisine').value,
          averagePrice: parseInt(document.getElementById('formPrice').value) || 0,
          phone: document.getElementById('formPhone').value.trim(),
          videoTitle: document.getElementById('formVideoTitle').value.trim(),
          videoUrl: document.getElementById('formVideoUrl').value.trim(),
          rating: parseInt(document.getElementById('formRating').value) || 0,
          businessHours: document.getElementById('formHours').value.trim(),
          notes: document.getElementById('formNotes').value.trim(),
          hasVisited: document.getElementById('formVisited').checked,
          isLocal: true,
          createdAt: new Date().toISOString()
      };

      if (id) {
          const index = state.restaurants.findIndex(r => r.id === parseInt(id));
          if (index !== -1) {
              state.restaurants[index] = { ...state.restaurants[index], ...restaurant };
          }
      } else {
          state.restaurants.push(restaurant);
      }

      saveLocalData();
      updateUI();
      document.getElementById('modal').classList.add('hidden');
      showToast(id ? '修改成功' : '添加成功');
  }

  function deleteRestaurant() {
      const id = parseInt(document.getElementById('restaurantId').value);
      if (confirm('确定要删除这个店铺吗？')) {
          state.restaurants = state.restaurants.filter(r => r.id !== id);
          saveLocalData();
          updateUI();
          document.getElementById('modal').classList.add('hidden');
          showToast('删除成功');
      }
  }

  function toggleVisited(id) {
      const restaurant = state.restaurants.find(r => r.id === id);
      if (restaurant) {
          restaurant.hasVisited = !restaurant.hasVisited;
          saveLocalData();
          updateUI();
          showToast(restaurant.hasVisited ? '已标记为打卡' : '取消打卡');
      }
  }

  function showDetail(id) {
      const restaurant = state.restaurants.find(r => r.id === id);
      if (!restaurant) return;

      state.selectedRestaurant = restaurant;

      document.getElementById('detailTitle').textContent = restaurant.name;
      document.getElementById('detailContent').innerHTML = `
          <div class="detail-item">
              <div class="detail-label">地址</div>
              <div class="detail-value">${restaurant.address}</div>
          </div>
          ${restaurant.cuisineType ? `
          <div class="detail-item">
              <div class="detail-label">菜系</div>
              <div class="detail-value">${restaurant.cuisineType}</div>
          </div>` : ''}
          ${restaurant.averagePrice ? `
          <div class="detail-item">
              <div class="detail-label">人均消费</div>
              <div class="detail-value">¥${restaurant.averagePrice}</div>
          </div>` : ''}
          ${restaurant.phone ? `
          <div class="detail-item">
              <div class="detail-label">联系电话</div>
              <div class="detail-value">${restaurant.phone}</div>
          </div>` : ''}
          ${restaurant.businessHours ? `
          <div class="detail-item">
              <div class="detail-label">营业时间</div>
              <div class="detail-value">${restaurant.businessHours}</div>
          </div>` : ''}
          ${restaurant.rating ? `
          <div class="detail-item">
              <div class="detail-label">评分</div>
              <div class="detail-value">${'⭐'.repeat(Math.floor(restaurant.rating))} (${restaurant.rating}/5)</div>
          </div>` : ''}
          ${restaurant.videoUrl ? `
          <div class="detail-item">
              <div class="detail-label">B站视频</div>
              <div class="detail-value">
                  <a href="${restaurant.videoUrl}" target="_blank" style="color: #FF6B35;">
                      ${restaurant.videoTitle || '点击查看视频'} ↗
                  </a>
              </div>
          </div>` : ''}
          ${restaurant.notes ? `
          <div class="detail-item">
              <div class="detail-label">个人备注</div>
              <div class="detail-value">${restaurant.notes}</div>
          </div>` : ''}
          <div class="detail-item">
              <div class="detail-label">打卡状态</div>
              <div class="detail-value">${restaurant.hasVisited ? '✅ 已打卡' : '⭕ 未打卡'}</div>
          </div>
      `;

      document.getElementById('detailModal').classList.remove('hidden');
  }

  function navigateToRestaurant(restaurant) {
      if (!restaurant) restaurant = state.selectedRestaurant;
      if (!restaurant) return;

      const url = `amapuri://route/plan/?dlat=${restaurant.latitude}&dlon=${restaurant.longitude}&dname=${encodeURICompo
  nent(restaurant.name)}&dev=0&t=0`;

      const startTime = Date.now();
      window.location.href = url;

      setTimeout(() => {
          if (Date.now() - startTime < 2100) {
              const webUrl = `https://uri.amap.com/navigation?to=${restaurant.longitude},${restaurant.latitude},${encode
  URIComponent(restaurant.name)}&mode=car&coordinate=gaode`;
              window.open(webUrl, '_blank');
          }
      }, 2000);
  }

  async function checkAutoSync() {
      const lastSync = localStorage.getItem(CONFIG.LAST_SYNC_KEY);
      const now = Date.now();

      if (!lastSync || (now - parseInt(lastSync)) > CONFIG.SYNC_INTERVAL) {
          await syncData(false);
      }
  }

  async function syncData(showUI = true) {
      if (showUI) {
          document.getElementById('syncModal').classList.remove('hidden');
          document.getElementById('syncStatus').textContent = '正在获取最新数据...';
          document.getElementById('syncResult').classList.add('hidden');
      }

      try {
          const url = CONFIG.REMOTE_DATA_URL + '?t=' + Date.now();
          const response = await fetch(url);

          if (!response.ok) {
              throw new Error('获取数据失败');
          }

          const remoteData = await response.json();
          const merged = mergeData(state.restaurants, remoteData.restaurants || []);
          const newCount = merged.filter(r => r.isNew).length;

          state.restaurants = merged.map(r => {
              delete r.isNew;
              return r;
          });

          saveLocalData();
          updateUI();
          localStorage.setItem(CONFIG.LAST_SYNC_KEY, Date.now().toString());

          if (showUI) {
              const resultEl = document.getElementById('syncResult');
              resultEl.classList.remove('hidden');
              resultEl.innerHTML = newCount > 0
                  ? `<strong>更新成功！</strong><br>新增 ${newCount} 家店铺`
                  : `<strong>已是最新</strong><br>没有新店铺`;
              resultEl.className = 'sync-result ' + (newCount > 0 ? 'has-update' : '');
              document.getElementById('syncStatus').textContent = '同步完成';
          } else if (newCount > 0) {
              showToast(`发现 ${newCount} 家新店铺！`);
          }

      } catch (error) {
          console.error('同步失败:', error);
          if (showUI) {
              document.getElementById('syncStatus').textContent = '同步失败，请检查网络';
          }
      }
  }

  function mergeData(local, remote) {
      const merged = [...local];

      remote.forEach(r => {
          const exists = merged.some(m =>
              m.name === r.name && m.address === r.address
          );

          if (!exists) {
              merged.push({ ...r, isNew: true });
          }
      });

      return merged;
  }

  function updateUI() {
      updateStats();
      renderList();
      updateMapMarkers();
  }

  function showToast(message) {
      const toast = document.getElementById('toast');
      document.getElementById('toastMessage').textContent = message;
      toast.classList.remove('hidden');

      setTimeout(() => {
          toast.classList.add('hidden');
      }, 2000);
  }

  function bindEvents() {
      document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
              document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
              document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

              btn.classList.add('active');
              document.getElementById(btn.dataset.tab + 'View').classList.add('active');

              state.currentTab = btn.dataset.tab;

              if (state.currentTab === 'map' && state.map) {
                  setTimeout(() => {
                      state.map.resize();
                      updateMapMarkers();
                  }, 100);
              }
          });
      });

      const searchInput = document.getElementById('searchInput');
      const clearSearch = document.getElementById('clearSearch');

      searchInput.addEventListener('input', (e) => {
          state.searchQuery = e.target.value;
          clearSearch.style.display = state.searchQuery ? 'block' : 'none';
          renderList();
      });

      clearSearch.addEventListener('click', () => {
          searchInput.value = '';
          state.searchQuery = '';
          clearSearch.style.display = 'none';
          renderList();
      });

      document.getElementById('cuisineFilter').addEventListener('change', (e) => {
          state.selectedCuisine = e.target.value;
          renderList();
          updateMapMarkers();
      });

      document.getElementById('addBtn').addEventListener('click', openAddModal);
      document.getElementById('syncBtn').addEventListener('click', () => syncData(true));

      document.getElementById('closeModal').addEventListener('click', () => {
          document.getElementById('modal').classList.add('hidden');
      });

      document.getElementById('closeDetail').addEventListener('click', () => {
          document.getElementById('detailModal').classList.add('hidden');
      });

      document.getElementById('closeCard').addEventListener('click', () => {
          document.getElementById('mapInfoCard').classList.add('hidden');
      });

      document.getElementById('closeSync').addEventListener('click', () => {
          document.getElementById('syncModal').classList.add('hidden');
      });

      document.getElementById('cardDetail').addEventListener('click', () => {
          if (state.selectedRestaurant) {
              showDetail(state.selectedRestaurant.id);
          }
      });

      document.getElementById('cardNavigate').addEventListener('click', () => {
          navigateToRestaurant();
      });

      document.getElementById('detailEdit').addEventListener('click', () => {
          if (state.selectedRestaurant) {
              openEditModal(state.selectedRestaurant.id);
          }
      });

      document.getElementById('detailNavigate').addEventListener('click', () => {
          navigateToRestaurant();
      });

      document.getElementById('restaurantForm').addEventListener('submit', saveRestaurant);
      document.getElementById('deleteBtn').addEventListener('click', deleteRestaurant);

      document.querySelectorAll('.rating-input .star').forEach((star, index) => {
          star.addEventListener('click', () => {
              const value = index + 1;
              document.getElementById('formRating').value = value;
              document.querySelectorAll('.rating-input .star').forEach((s, i) => {
                  s.classList.toggle('active', i < value);
              });
          });
      });

      document.getElementById('modal').addEventListener('click', (e) => {
          if (e.target.id === 'modal') {
              document.getElementById('modal').classList.add('hidden');
          }
      });

      document.getElementById('detailModal').addEventListener('click', (e) => {
          if (e.target.id === 'detailModal') {
              document.getElementById('detailModal').classList.add('hidden');
          }
      });
  }

  if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => {
          console.log('Service Worker注册失败:', err);
      });
  }
