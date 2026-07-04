class AppController {
  constructor() {
    this.currentView = 'view-dashboard';
    this.captureStep = 1;
    this.maxSteps = 5;
    this.captureTitles = [
      "Ön Cephe Çekimi",
      "Sol Yan Çekimi",
      "Arka Cephe Çekimi",
      "Sağ Yan Çekimi",
      "Tavan ve İç Detay"
    ];
    
    // Camera state
    this.cameraStream = null;
    this.cameraReady = false;
    this.capturedPhotos = [];

    // Mock Garage Data
    this.garageData = [
      {
        id: 0, brand: 'BMW', model: 'X1 XDRIVE25e 1.5 245 M SPORT',
        img: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        year: 2023, km: '2.200', location: 'Aksam Samandıra',
        status: 'Yüksek Hasar', statusClass: 'hasar-yuksek',
        priceBuyNow: '2.445.000', priceAuction: '1.950.000',
        costs: { insurance: '520.000', authorized: '380.000', mechanic: '150.000' },
        damages: [
          { title: "GÖÇÜK VE YIRTIK", desc: "Ön Tampon ve Sol Çamurluk Ağır Hasarlı.", cost: "45.000", severity: "YÜKSEK", class: "hasar-yuksek" },
          { title: "ÇİZİK", desc: "Sol Ön Kapı derin çizik.", cost: "12.000", severity: "ORTA", class: "hasar-orta" }
        ]
      },
      {
        id: 1, brand: 'FORD', model: 'RANGER XLT 4x4 2.0 ECOBLUE',
        img: 'https://images.unsplash.com/photo-1551830820-330a71b99659?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        year: 2023, km: '2.581', location: 'Aksam Samandıra',
        status: 'Orta Hasar', statusClass: 'hasar-orta',
        priceBuyNow: '1.445.000', priceAuction: '1.200.000',
        costs: { insurance: '210.000', authorized: '145.000', mechanic: '85.000' },
        damages: [
          { title: "KAPORTA GÖÇÜĞÜ", desc: "Sağ arka çamurluk boyasız onarım mümkün.", cost: "15.000", severity: "DÜŞÜK", class: "hasar-dusuk" }
        ]
      },
      {
        id: 2, brand: 'VOLKSWAGEN', model: 'AMAROK STYLE PLUS 4MOTION',
        img: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        year: 2023, km: '89.433', location: 'Aksam Samandıra',
        status: 'Yüksek Hasar', statusClass: 'hasar-yuksek',
        priceBuyNow: '1.465.000', priceAuction: '1.100.000',
        costs: { insurance: '480.000', authorized: '310.000', mechanic: '190.000' },
        damages: [
          { title: "TAVAN EZİLMESİ", desc: "Tavan sacı ve direklerde hasar mevcut.", cost: "110.000", severity: "YÜKSEK", class: "hasar-yuksek" }
        ]
      }
    ];

    this.init();
  }

  init() {
    lucide.createIcons();
    this.bindEvents();
    this.renderGarage();
  }

  bindEvents() {
    // Start capture flow
    document.getElementById('btn-start-capture')?.addEventListener('click', () => {
      this.captureStep = 1;
      this.capturedPhotos = [];
      this.cameraReady = false;
      this.clearThumbnails();
      this.hidePreview();
      this.updateCaptureUI();
      this.showView('view-capture');
      this.startCamera();
    });

    // Shutter button: if live camera is active, take snapshot. Otherwise, trigger native file input.
    document.getElementById('btn-take-photo')?.addEventListener('click', () => {
      if (this.cameraReady) {
        this.takePhotoFromVideo();
      } else {
        // Trigger the hidden native camera file input
        document.getElementById('file-input-camera')?.click();
      }
    });

    // Native camera file input (capture="environment" opens camera app on mobile)
    document.getElementById('file-input-camera')?.addEventListener('change', (e) => {
      this.handleFileSelected(e);
    });

    // Gallery file input (no capture attribute = opens gallery/file picker)
    document.getElementById('file-input-gallery')?.addEventListener('change', (e) => {
      this.handleFileSelected(e);
    });

    // Close capture
    document.getElementById('btn-close-capture')?.addEventListener('click', () => {
      this.stopCamera();
      this.showView('view-dashboard');
    });

    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.showView(e.currentTarget.dataset.target);
      });
    });
  }

  // ==================== CAMERA (getUserMedia) ====================

  async startCamera() {
    const video = document.getElementById('camera-video');
    if (!video) return;

    // Check API support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('getUserMedia desteklenmiyor. Dosya seçici (native camera) kullanılacak.');
      this.cameraReady = false;
      return; // Shutter will fall back to file input
    }

    const attempts = [
      { video: { facingMode: { exact: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: { facingMode: 'environment' }, audio: false },
      { video: true, audio: false }
    ];

    let stream = null;
    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err) {
        console.warn('Kamera denemesi:', err.name, err.message);
      }
    }

    if (!stream) {
      console.warn('Kamera erişimi sağlanamadı. Dosya seçici kullanılacak.');
      this.cameraReady = false;
      return; // Shutter will fall back to file input
    }

    this.cameraStream = stream;
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play().then(() => {
        this.cameraReady = true;
        console.log('✅ Canlı kamera aktif');
      }).catch(() => {
        this.cameraReady = false;
      });
    };
  }

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
    this.cameraReady = false;
    const video = document.getElementById('camera-video');
    if (video) video.srcObject = null;
  }

  // ==================== PHOTO CAPTURE ====================

  // Method 1: Snapshot from live video
  takePhotoFromVideo() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    if (!video || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    this.processCapture(dataUrl);
  }

  // Method 2: From file input (native camera app or gallery)
  handleFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.processCapture(dataUrl);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    event.target.value = '';
  }

  // Common processing after capture (from any source)
  processCapture(dataUrl) {
    this.capturedPhotos.push(dataUrl);
    this.triggerFlash();
    this.addThumbnail(dataUrl);
    this.showPreview(dataUrl);

    // Auto-advance after a brief delay to show the preview
    setTimeout(() => {
      this.hidePreview();
      this.advanceStep();
    }, 800);
  }

  advanceStep() {
    if (this.captureStep < this.maxSteps) {
      this.captureStep++;
      this.updateCaptureUI();
    } else {
      this.stopCamera();
      this.startAnalysis();
    }
  }

  // ==================== UI EFFECTS ====================

  triggerFlash() {
    const flash = document.getElementById('capture-flash');
    if (!flash) return;
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 150);
  }

  addThumbnail(dataUrl) {
    const container = document.getElementById('captured-thumbnails');
    if (!container) return;
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = `Çekim ${this.captureStep}`;
    container.appendChild(img);
  }

  clearThumbnails() {
    const container = document.getElementById('captured-thumbnails');
    if (container) container.innerHTML = '';
  }

  showPreview(dataUrl) {
    const preview = document.getElementById('preview-image');
    if (!preview) return;
    preview.src = dataUrl;
    preview.classList.remove('hidden');
  }

  hidePreview() {
    const preview = document.getElementById('preview-image');
    if (preview) preview.classList.add('hidden');
  }

  // ==================== GARAGE ====================

  renderGarage() {
    const container = document.getElementById('garage-grid-container');
    if (!container) return;

    let html = '';
    this.garageData.forEach(car => {
      html += `
        <div class="garage-item glass-panel" onclick="app.viewCarDetail(${car.id})">
          <div class="g-image" style="background-image: url('${car.img}')">
            <div class="g-pill scan-status ${car.statusClass}">${car.status}</div>
          </div>
          <div class="g-content">
            <h3 class="g-title">${car.brand} ${car.model}</h3>
            <p class="g-meta">${car.year} | ${car.km} km | <i data-lucide="map-pin" class="icon-xs"></i> ${car.location}</p>
            <div class="g-prices">
              <div class="g-price-box">
                <span class="g-price-label">İhale Teklifi</span>
                <span class="g-price-val">₺${car.priceAuction}</span>
              </div>
              <div class="g-price-box" style="text-align: right;">
                <span class="g-price-label text-primary">Hemen Al</span>
                <span class="g-price-val primary">₺${car.priceBuyNow}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
    lucide.createIcons();
  }

  // ==================== UI HELPERS ====================

  updateCaptureUI() {
    const titleEl = document.getElementById('capture-title');
    const stepEl = document.getElementById('capture-step');
    const textEl = document.getElementById('car-silhouette-text');
    
    if (titleEl) titleEl.innerText = this.captureTitles[this.captureStep - 1];
    if (stepEl) stepEl.innerText = this.captureStep;
    if (textEl) textEl.innerText = `${this.captureTitles[this.captureStep - 1]} İçin Hizalayın`;
  }

  showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    this.currentView = viewId;
  }

  goBack() {
    if (this.currentView === 'view-report') {
      this.showView('view-garage');
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelector('[data-target="view-garage"]')?.classList.add('active');
    } else {
      this.showView('view-dashboard');
    }
  }

  // ==================== AI ANALYSIS ====================

  startAnalysis() {
    this.showView('view-analysis');
    
    const analysisImg = document.getElementById('analysis-image-bg');
    if (this.capturedPhotos.length > 0) {
      analysisImg.style.backgroundImage = `url('${this.capturedPhotos[this.capturedPhotos.length - 1]}')`;
    } else {
      analysisImg.style.backgroundImage = `url('https://images.unsplash.com/photo-1555215695-3004980ad54e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')`;
    }

    const container = document.querySelector('.analysis-image');
    container.classList.add('scanning');
    
    const progressFill = document.getElementById('analysis-progress');
    const statusText = document.getElementById('analysis-status-text');
    const btnReport = document.getElementById('btn-view-report');
    
    progressFill.style.width = '0%';
    btnReport.classList.add('hidden');
    document.querySelectorAll('.bounding-box').forEach(b => b.classList.add('hidden'));
    
    setTimeout(() => { progressFill.style.width = '30%'; statusText.innerText = 'Hasar tespiti yapılıyor...'; }, 1000);
    setTimeout(() => { 
      progressFill.style.width = '60%'; 
      statusText.innerText = 'Maliyet hesaplanıyor...';
      document.querySelector('.b-1')?.classList.remove('hidden');
    }, 2500);
    setTimeout(() => { 
      progressFill.style.width = '85%'; 
      statusText.innerText = 'Rapor oluşturuluyor...';
      document.querySelector('.b-2')?.classList.remove('hidden');
    }, 4000);
    setTimeout(() => { 
      progressFill.style.width = '100%'; 
      statusText.innerText = 'Analiz Tamamlandı!';
      container.classList.remove('scanning');
      btnReport.classList.remove('hidden');
    }, 5000);
  }

  // ==================== CAR DETAIL ====================

  viewCarDetail(carId) {
    const car = this.garageData.find(c => c.id === carId) || this.garageData[0];
    
    document.getElementById('detail-image').style.backgroundImage = `url('${car.img}')`;
    const statusEl = document.getElementById('detail-status');
    statusEl.className = `status-pill ${car.statusClass}`;
    statusEl.innerText = car.status;

    document.getElementById('detail-name').innerText = `${car.brand} ${car.model}`;
    document.getElementById('detail-info').innerText = `${car.year} | ${car.km} km | ${car.location}`;
    document.getElementById('detail-buy-price').innerText = `₺${car.priceBuyNow}`;
    document.getElementById('detail-auction-price').innerText = `₺${car.priceAuction}`;

    document.getElementById('cost-insurance').innerText = `₺${car.costs.insurance}`;
    document.getElementById('cost-authorized').innerText = `₺${car.costs.authorized}`;
    document.getElementById('cost-mechanic').innerText = `₺${car.costs.mechanic}`;

    const damagesList = document.getElementById('damages-list');
    let dHtml = '';
    car.damages.forEach(d => {
      dHtml += `
        <div class="damage-item glass-panel">
          <div class="damage-img" style="background-image: url('${car.img}')"></div>
          <div class="damage-info">
            <div class="d-row">
              <h4>${d.title}</h4>
              <span class="d-severity ${d.class}">${d.severity}</span>
            </div>
            <p>${d.desc}</p>
            <span class="d-cost">Tahmini Onarım: ₺${d.cost}</span>
          </div>
        </div>
      `;
    });
    damagesList.innerHTML = dHtml;

    this.showView('view-report');
  }
}

const app = new AppController();
