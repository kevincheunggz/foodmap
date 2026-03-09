// 美食地图 - 简化版
  (function() {
      'use strict';

      // 存储键名
      var STORAGE_KEY = 'foodmap_data';

      // 数据
      var restaurants = [];
      var currentTab = 'map';
      var map = null;
      var markers = [];

      // 初始化
      function init() {
          loadData();
          initMap();
          bindEvents();
          render();
          hideLoading();
      }

      // 隐藏加载动画
      function hideLoading() {
          document.getElementById('loading').style.display = 'none';
          document.getElementById('app').classList.remove('hidden');
      }

      // 加载数据
      function loadData() {
          var data = localStorage.getItem(STORAGE_KEY);
          if (data) {
              restaurants = JSON.parse(data);
          } else {
              // 示例数据
              restaurants = [
                  {
                      id: 1,
                      name: '示例 - 老成都火锅',
                      address: '成都市锦江区春熙路示例地址',
                      latitude: 30.6586,
                      longitude: 104.0665,
                      cuisineType: '火锅',
                      averagePrice: 120,
                      phone: '028-12345678',
                      videoUrl: '',
                      videoTitle: '',
                      rating: 4,
                      notes: 'UP主推荐',
                      businessHours: '11:00-22:00',
                      hasVisited: false
                  }
              ];
              saveData();
          }
      }

      // 保存数据
      function saveData() {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(restaurants));
          updateStats();
      }

      // 初始化地图
      function initMap() {
          if (typeof AMap === 'undefined') {
              console.log('地图API未加载');
              return;
          }

          try {
              map = new AMap.Map('mapContainer', {
                  zoom: 12,
                  center: [104.0665, 30.6586]
              });

              map.addControl(new AMap.Scale());
              updateMapMarkers();
          } catch (e) {
              console.error('地图初始化失败:', e);
          }
      }

      // 更新地图标记
      function updateMapMarkers() {
          if (!map) return;

          // 清除旧标记
          markers.forEach(function(m) { m.setMap(null); });
          markers = [];

          // 添加新标记
          restaurants.forEach(function(r) {
              var marker = new AMap.Marker({
                  position: [r.longitude, r.latitude],
                  title: r.name
              });
              marker.on('click', function() { showCard(r); });
              marker.setMap(map);
              markers.push(marker);
          });
      }

      // 显示地图卡片
      function showCard(r) {
          document.getElementById('cardTitle').textContent = r.name;
          document.getElementById('cardAddress').textContent = r.address;
          document.getElementById('cardCuisine').textContent = r.cuisineType || '其他';
          document.getElementById('cardPrice').textContent = r.averagePrice ? '¥' + r.averagePrice + '/人' : '';
          document.getElementById('mapInfoCard').classList.remove('hidden');

          // 保存当前选中
          window.selectedRestaurant = r;
      }

      // 渲染列表
      function render() {
          renderList();
          updateStats();
      }

      // 渲染店铺列表
      function renderList() {
          var container = document.getElementById('restaurantList');
          var empty = document.getElementById('emptyState');

          if (restaurants.length === 0) {
              container.innerHTML = '';
              container.classList.add('hidden');
              empty.classList.remove('hidden');
              return;
          }

          container.classList.remove('hidden');
          empty.classList.add('hidden');

          var html = '';
          restaurants.forEach(function(r) {
              html += '<div class="restaurant-item" data-id="' + r.id + '">';
              html += '<div class="visit-status ' + (r.hasVisited ? 'visited' : '') + '" data-id="' + r.id + '">';
              html += r.hasVisited ? '✓' : '';
              html += '</div>';
              html += '<div class="restaurant-info">';
              html += '<div class="restaurant-name">' + escapeHtml(r.name) + '</div>';
              html += '<div class="restaurant-address">' + escapeHtml(r.address) + '</div>';
              html += '<div class="restaurant-meta">';
              if (r.cuisineType) {
                  html += '<span class="cuisine-tag">' + escapeHtml(r.cuisineType) + '</span>';
              }
              if (r.averagePrice) {
                  html += '<span class="price-tag">¥' + r.averagePrice + '/人</span>';
              }
              html += '</div></div>';
              html += '<span class="arrow">›</span>';
              html += '</div>';
          });

          container.innerHTML = html;

          // 绑定点击事件
          document.querySelectorAll('.restaurant-item').forEach(function(item) {
              item.addEventListener('click', function(e) {
                  var id = parseInt(item.dataset.id);
                  if (e.target.classList.contains('visit-status')) {
                      toggleVisited(id);
                  } else {
                      showDetail(id);
                  }
              });
          });
      }

      // HTML转义
      function escapeHtml(text) {
          if (!text) return '';
          var div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
      }

      // 更新统计
      function updateStats() {
          var total = restaurants.length;
          var visited = restaurants.filter(function(r) { return r.hasVisited; }).length;
          document.getElementById('totalCount').textContent = total;
          document.getElementById('visitedCount').textContent = visited;
          document.getElementById('pendingCount').textContent = total - visited;
      }

      // 切换打卡状态
      function toggleVisited(id) {
          var r = restaurants.find(function(x) { return x.id === id; });
          if (r) {
              r.hasVisited = !r.hasVisited;
              saveData();
              render();
              showToast(r.hasVisited ? '已打卡' : '取消打卡');
          }
      }

      // 显示详情
      function showDetail(id) {
          var r = restaurants.find(function(x) { return x.id === id; });
          if (!r) return;

          window.selectedRestaurant = r;
          document.getElementById('detailTitle').textContent = r.name;

          var html = '';
          html += makeDetailItem('地址', r.address);
          if (r.cuisineType) html += makeDetailItem('菜系', r.cuisineType);
          if (r.averagePrice) html += makeDetailItem('人均消费', '¥' + r.averagePrice);
          if (r.phone) html += makeDetailItem('电话', r.phone);
          if (r.businessHours) html += makeDetailItem('营业时间', r.businessHours);
          if (r.videoUrl) {
              html += '<div class="detail-item"><div class="detail-label">B站视频</div>';
              html += '<div class="detail-value"><a href="' + r.videoUrl + '" target="_blank"
  style="color:#FF6B35">点击观看 ↗</a></div></div>';
          }
          if (r.notes) html += makeDetailItem('备注', r.notes);
          html += makeDetailItem('打卡状态', r.hasVisited ? '✅ 已打卡' : '⭕ 未打卡');

          document.getElementById('detailContent').innerHTML = html;
          document.getElementById('detailModal').classList.remove('hidden');
      }

      // 生成详情项
      function makeDetailItem(label, value) {
          return '<div class="detail-item"><div class="detail-label">' + escapeHtml(label) + '</div><div
  class="detail-value">' + escapeHtml(value) + '</div></div>';
      }

      // 显示添加弹窗
      function openAddModal() {
          document.getElementById('modalTitle').textContent = '添加店铺';
          document.getElementById('restaurantForm').reset();
          document.getElementById('restaurantId').value = '';
          document.getElementById('deleteBtn').classList.add('hidden');
          document.getElementById('modal').classList.remove('hidden');
      }

      // 编辑店铺
      function openEditModal() {
          var r = window.selectedRestaurant;
          if (!r) return;

          document.getElementById('modalTitle').textContent = '编辑店铺';
          document.getElementById('restaurantId').value = r.id;
          document.getElementById('formName').value = r.name;
          document.getElementById('formAddress').value = r.address;
          document.getElementById('formLat').value = r.latitude;
          document.getElementById('formLng').value = r.longitude;
          document.getElementById('formCuisine').value = r.cuisineType;
          document.getElementById('formPrice').value = r.averagePrice || '';
          document.getElementById('formPhone').value = r.phone || '';
          document.getElementById('formVideoTitle').value = r.videoTitle || '';
          document.getElementById('formVideoUrl').value = r.videoUrl || '';
          document.getElementById('formHours').value = r.businessHours || '';
          document.getElementById('formNotes').value = r.notes || '';
          document.getElementById('formVisited').checked = r.hasVisited;
          document.getElementById('deleteBtn').classList.remove('hidden');

          document.getElementById('detailModal').classList.add('hidden');
          document.getElementById('modal').classList.remove('hidden');
      }

      // 保存店铺
      function saveRestaurant(e) {
          e.preventDefault();

          var id = document.getElementById('restaurantId').value;
          var restaurant = {
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
              rating: 0,
              businessHours: document.getElementById('formHours').value.trim(),
              notes: document.getElementById('formNotes').value.trim(),
              hasVisited: document.getElementById('formVisited').checked
          };

          if (id) {
              var idx = restaurants.findIndex(function(x) { return x.id === parseInt(id); });
              if (idx !== -1) restaurants[idx] = restaurant;
          } else {
              restaurants.push(restaurant);
          }

          saveData();
          render();
          updateMapMarkers();
          document.getElementById('modal').classList.add('hidden');
          showToast(id ? '修改成功' : '添加成功');
      }

      // 删除店铺
      function deleteRestaurant() {
          var id = parseInt(document.getElementById('restaurantId').value);
          if (confirm('确定删除？')) {
              restaurants = restaurants.filter(function(x) { return x.id !== id; });
              saveData();
              render();
              updateMapMarkers();
              document.getElementById('modal').classList.add('hidden');
              showToast('删除成功');
          }
      }

      // 导航
      function navigate() {
          var r = window.selectedRestaurant;
          if (!r) return;

          var url = 'https://uri.amap.com/navigation?to=' + r.longitude + ',' + r.latitude + ',' +
  encodeURIComponent(r.name) + '&mode=car&coordinate=gaode';
          window.open(url, '_blank');
      }

      // 显示提示
      function showToast(msg) {
          var toast = document.getElementById('toast');
          document.getElementById('toastMessage').textContent = msg;
          toast.classList.remove('hidden');
          setTimeout(function() { toast.classList.add('hidden'); }, 2000);
      }

      // 绑定事件
      function bindEvents() {
          // 标签切换
          document.querySelectorAll('.tab-btn').forEach(function(btn) {
              btn.addEventListener('click', function() {
                  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
                  document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });

                  btn.classList.add('active');
                  document.getElementById(btn.dataset.tab + 'View').classList.add('active');
                  currentTab = btn.dataset.tab;

                  if (currentTab === 'map' && map) {
                      setTimeout(function() { map.resize(); updateMapMarkers(); }, 100);
                  }
              });
          });

          // 搜索
          var searchInput = document.getElementById('searchInput');
          var clearSearch = document.getElementById('clearSearch');

          searchInput.addEventListener('input', function() {
              var query = searchInput.value.toLowerCase();
              document.querySelectorAll('.restaurant-item').forEach(function(item) {
                  var name = item.querySelector('.restaurant-name').textContent.toLowerCase();
                  var addr = item.querySelector('.restaurant-address').textContent.toLowerCase();
                  item.style.display = (name.includes(query) || addr.includes(query)) ? 'flex' : 'none';
              });
              clearSearch.style.display = searchInput.value ? 'block' : 'none';
          });

          clearSearch.addEventListener('click', function() {
              searchInput.value = '';
              document.querySelectorAll('.restaurant-item').forEach(function(item) { item.style.display = 'flex'; });
              clearSearch.style.display = 'none';
          });

          // 菜系筛选
          document.getElementById('cuisineFilter').addEventListener('change', function(e) {
              var cuisine = e.target.value;
              document.querySelectorAll('.restaurant-item').forEach(function(item) {
                  if (!cuisine) {
                      item.style.display = 'flex';
                  } else {
                      var itemCuisine = item.querySelector('.cuisine-tag');
                      item.style.display = (itemCuisine && itemCuisine.textContent === cuisine) ? 'flex' : 'none';
                  }
              });
          });

          // 按钮事件
          document.getElementById('addBtn').addEventListener('click', openAddModal);
          document.getElementById('closeModal').addEventListener('click', function() {
  document.getElementById('modal').classList.add('hidden'); });
          document.getElementById('closeDetail').addEventListener('click', function() {
  document.getElementById('detailModal').classList.add('hidden'); });
          document.getElementById('closeCard').addEventListener('click', function() {
  document.getElementById('mapInfoCard').classList.add('hidden'); });
          document.getElementById('cardDetail').addEventListener('click', function() { if(window.selectedRestaurant)
  showDetail(window.selectedRestaurant.id); });
          document.getElementById('cardNavigate').addEventListener('click', navigate);
          document.getElementById('detailEdit').addEventListener('click', openEditModal);
          document.getElementById('detailNavigate').addEventListener('click', navigate);
          document.getElementById('restaurantForm').addEventListener('submit', saveRestaurant);
          document.getElementById('deleteBtn').addEventListener('click', deleteRestaurant);

          // 星级评分
          document.querySelectorAll('.rating-input .star').forEach(function(star, idx) {
              star.addEventListener('click', function() {
                  document.querySelectorAll('.rating-input .star').forEach(function(s, i) {
                      s.classList.toggle('active', i <= idx);
                  });
              });
          });

          // 点击弹窗背景关闭
          document.getElementById('modal').addEventListener('click', function(e) { if (e.target.id === 'modal')
  document.getElementById('modal').classList.add('hidden'); });
          document.getElementById('detailModal').addEventListener('click', function(e) { if (e.target.id ===
  'detailModal') document.getElementById('detailModal').classList.add('hidden'); });
      }

      // 启动
      if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', init);
      } else {
          init();
      }
  })();
