/**
 * APPOPO - Controlador y Lógica de Aplicación
 * Manejo del estado local, interfaz de usuario (UI), eventos y persistencia en GitHub / LocalStorage
 */

const app = {
  // Estado de la Aplicación
  db: null,
  activeTab: 'temario',
  currentMonth: new Date(),
  selectedDate: '', // YYYY-MM-DD
  selectedTemaId: null,

  // Estado del Examen
  activeExam: {
    questions: [],
    currentQuestionIndex: 0,
    answers: [],
    timeRemaining: 0,
    timerInterval: null,
    tipoExamen: '', // 'aleatorio', 'tema', 'documento', 'falladas'
    temaId: null
  },

  // Estado de Flashcards
  activeFlashcardDeck: [],
  activeFlashcardIndex: 0,
  flashcardMode: 'normal', // 'normal' o 'dificiles'
  
  // Temporales para carga de archivos
  selectedTestDocFile: null,
  selectedTestDocBase64: '',

  // Banco de preguntas de prueba iniciales (por si no tienen conexión a internet/IA)
  mockQuestions: [
    {
      pregunta: "¿Qué artículo de la Constitución Española establece la estructura del Tribunal Constitucional?",
      opciones: ["Artículo 159", "Artículo 161", "Artículo 165"],
      respuestaCorrecta: 0,
      explicacion: "El artículo 159 de la Constitución regula la composición y designación de los miembros del Tribunal Constitucional."
    },
    {
      pregunta: "Según la LO 2/1986 de Fuerzas y Cuerpos de Seguridad, ¿a cuál de las siguientes administraciones corresponden las Policías Locales?",
      opciones: ["A la Administración del Estado", "A la Administración Autonómica", "A la Administración Local"],
      respuestaCorrecta: 2,
      explicacion: "El artículo 51 y siguientes de la LO 2/1986 atribuye la dependencia de los Cuerpos de Policía Local a los Municipios (Administración Local)."
    },
    {
      pregunta: "¿Cuál es el plazo máximo de detención preventiva ordinaria según la Constitución Española?",
      opciones: ["48 horas", "72 horas", "96 horas"],
      respuestaCorrecta: 1,
      explicacion: "El artículo 17.2 de la CE indica que la detención preventiva no podrá durar más del tiempo estrictamente necesario y, en todo caso, en el plazo máximo de 72 horas el detenido deberá ser puesto en libertad o a disposición judicial."
    },
    {
      pregunta: "En el Derecho Penal español, ¿a qué edad se fija la mayoría de edad penal?",
      opciones: ["A los 16 años", "A los 18 años", "A los 21 años"],
      respuestaCorrecta: 1,
      explicacion: "La mayoría de edad penal se establece a los 18 años, según lo dispuesto en el Código Penal. Los menores de esta edad entran en la Ley de Responsabilidad Penal del Menor."
    },
    {
      pregunta: "El mando superior de las Fuerzas y Cuerpos de Seguridad del Estado, bajo la dependencia del Gobierno, corresponde a:",
      opciones: ["El Secretario de Estado de Seguridad", "El Ministro del Interior", "El Director General de la Policía"],
      respuestaCorrecta: 1,
      explicacion: "Según el artículo 9 de la LO 2/1986 de Fuerzas y Cuerpos de Seguridad, el mando superior de las FCSE se ejerce por el Ministro del Interior."
    },
    {
      pregunta: "La Ley Orgánica 4/2015 es conocida popularmente como:",
      opciones: ["Ley de Enjuiciamiento Criminal", "Ley de Protección de la Seguridad Ciudadana", "Ley de Extranjería"],
      respuestaCorrecta: 1,
      explicacion: "La Ley Orgánica 4/2015, de 30 de marzo, es la Ley de protección de la seguridad ciudadana."
    },
    {
      pregunta: "¿Qué tipo de datos goza de la máxima protección según el RGPD?",
      opciones: ["Datos de salud y afiliación sindical", "Dirección de correo electrónico", "Número de teléfono móvil"],
      respuestaCorrecta: 0,
      explicacion: "El Reglamento General de Protección de Datos considera categorías especiales de datos con protección reforzada a aquellos que revelen origen étnico, opiniones políticas, convicciones religiosas, afiliación sindical, datos genéticos, biométricos y de salud."
    },
    {
      pregunta: "¿Cuál es el órgano de gobierno del poder judicial en España?",
      opciones: ["El Tribunal Supremo", "El Consejo General del Poder Judicial", "El Ministerio de Justicia"],
      respuestaCorrecta: 1,
      explicacion: "El Consejo General del Poder Judicial (CGPJ) es el órgano de gobierno del Poder Judicial en España, independiente del Gobierno y los tribunales."
    },
    {
      pregunta: "¿En qué año se proclamó la Declaración Universal de los Derechos Humanos por la Asamblea General de las Naciones Unidas?",
      opciones: ["En 1945", "En 1948", "En 1950"],
      respuestaCorrecta: 1,
      explicacion: "La Declaración Universal de los Derechos Humanos fue proclamada en París el 10 de diciembre de 1948 por la Asamblea General de la ONU."
    },
    {
      pregunta: "¿Qué parte de la pistola desvía los gases de la pólvora para expulsar la vaina en armas semiautomáticas?",
      opciones: ["El percutor", "El extractor", "La recámara / corredera"],
      respuestaCorrecta: 2,
      explicacion: "El retroceso de la corredera o el empuje de gases es el encargado del automatismo de expulsión y carga de cartucho en recámara."
    }
  ],

  // Banco de flashcards de prueba
  mockFlashcards: [
    { id: 'f1', temaId: 2, anverso: "¿Qué fecha se aprobó en referéndum la Constitución Española?", reverso: "El 6 de diciembre de 1978. Entró en vigor el 29 de diciembre del mismo año tras publicarse en el BOE." },
    { id: 'f2', temaId: 9, anverso: "¿Qué Cuerpos policiales componen las Fuerzas y Cuerpos de Seguridad del Estado (FCSE)?", reverso: "La Policía Nacional (civil) y la Guardia Civil (militar), conforme al art. 9 de la LO 2/1986." },
    { id: 'f3', temaId: 21, anverso: "¿En qué consiste el procedimiento de 'Habeas Corpus'?", reverso: "Garantía constitucional para obtener la inmediata puesta a disposición judicial de cualquier persona detenida ilegalmente (art. 17.4 CE)." },
    { id: 'f4', temaId: 23, anverso: "¿Qué Ley Orgánica regula las Medidas de Protección Integral contra la Violencia de Género?", reverso: "La Ley Orgánica 1/2004, de 28 de diciembre." },
    { id: 'f5', temaId: 34, anverso: "¿Qué es el síndrome de abstinencia?", reverso: "Conjunto de reacciones físicas y psicológicas que sufre una persona con adicción cuando deja de consumir la sustancia de golpe." },
    { id: 'f6', temaId: 41, anverso: "¿Qué diferencia hay entre Phishing y Ransomware?", reverso: "Phishing: Suplantación de identidad para robar claves. Ransomware: Secuestro de archivos cifrándolos para pedir un rescate." },
    { id: 'f7', temaId: 42, anverso: "Partes principales de un cartucho metálico de pistola", reverso: "Vaina, pistón o cápsula iniciadora, pólvora (carga de proyección) y bala (proyectil)." },
    { id: 'f8', temaId: 44, anverso: "¿Qué prioridad tienen las señales de los Agentes de Tráfico sobre el resto de señales?", reverso: "Máxima prioridad. Tienen preferencia sobre semáforos, señales verticales, marcas viales y normas de circulación." },
    { id: 'f9', temaId: 14, anverso: "¿Se puede realizar una identificación policial en la vía pública?", reverso: "Sí, los agentes podrán requerirla cuando existan indicios de participación en una infracción o para prevenir un delito (art. 16 LO 4/2015)." },
    { id: 'f10', temaId: 45, anverso: "¿Cuáles son las tres principales causas de accidentes en la conducción policial?", reverso: "La fatiga, el exceso de velocidad inadecuada y las distracciones por el uso de dispositivos electrónicos de comunicación." }
  ],

  // ================= INICIALIZACIÓN DE LA APP =================
  async init() {
    this.showLoading("Cargando APPOPO...");
    
    // 1. Cargar base de datos local / remota
    this.db = await GithubService.loadDb();
    
    // Si la db está vacía en los campos clave, los rellenamos con la base de datos por defecto de los servicios
    if (!this.db.temario) this.db.temario = {};
    if (!this.db.calendario) this.db.calendario = {};
    if (!this.db.preguntasFalladas) this.db.preguntasFalladas = [];
    if (!this.db.flashcardsDificiles) this.db.flashcardsDificiles = [];
    if (!this.db.historialExamenes) this.db.historialExamenes = [];
    if (!this.db.flashcardsGeneradas) this.db.flashcardsGeneradas = [];

    // 2. Comprobar credenciales de sincronización
    this.updateSyncStatusUI();

    // 3. Renderizar vistas
    this.renderTemas();
    this.renderCalendar();
    this.updateTodayChecklist();
    this.updateProgressStats();

    // 4. Ocultar Loading
    this.hideLoading();
  },

  // Mostrar / Ocultar Overlay de Carga
  showLoading(text = "Procesando...") {
    const overlay = document.getElementById('app-loading-overlay');
    const label = document.getElementById('app-loading-text');
    if (overlay && label) {
      label.innerText = text;
      overlay.style.display = 'flex';
    }
  },

  hideLoading() {
    const overlay = document.getElementById('app-loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  },

  // ================= AJUSTES Y CONFIGURACIÓN =================
  openSettings() {
    const config = GithubService.getConfig();
    const geminiKey = GeminiService.getApiKey();

    document.getElementById('settings-github-token').value = config.token;
    document.getElementById('settings-github-owner').value = config.owner;
    document.getElementById('settings-github-repo').value = config.repo;
    document.getElementById('settings-github-branch').value = config.branch;
    document.getElementById('settings-gemini-key').value = geminiKey;

    document.getElementById('modal-settings').classList.add('active');
  },

  closeSettings() {
    document.getElementById('modal-settings').classList.remove('active');
  },

  async saveSettings() {
    const token = document.getElementById('settings-github-token').value;
    const owner = document.getElementById('settings-github-owner').value;
    const repo = document.getElementById('settings-github-repo').value;
    const branch = document.getElementById('settings-github-branch').value;
    const geminiKey = document.getElementById('settings-gemini-key').value;

    this.showLoading("Verificando conexión...");

    try {
      GithubService.setConfig(token, owner, repo, branch);
      GeminiService.setApiKey(geminiKey);

      // Si hay credenciales de github, testear la conexión
      if (token && owner && repo) {
        await GithubService.testConnection();
      }

      this.closeSettings();
      this.updateSyncStatusUI();
      
      // Intentar cargar la base de datos de GitHub tras sincronizar credenciales
      this.showLoading("Cargando base de datos desde GitHub...");
      this.db = await GithubService.loadDb();
      this.renderTemas();
      this.renderCalendar();
      this.updateTodayChecklist();
      this.updateProgressStats();

      alert("Configuración guardada e importada correctamente.");
    } catch (e) {
      alert(`Error al configurar: ${e.message}`);
    } finally {
      this.hideLoading();
    }
  },

  updateSyncStatusUI() {
    const dot = document.getElementById('sync-status-dot');
    const label = document.getElementById('sync-status-text');
    if (!dot || !label) return;

    if (GithubService.hasCredentials()) {
      dot.className = "sync-dot connected";
      label.innerText = "GitHub Conectado";
    } else {
      dot.className = "sync-dot";
      label.innerText = "Sin GitHub (Solo Local)";
    }
  },

  async syncWithGithub() {
    if (!GithubService.hasCredentials()) {
      alert("Configura primero las credenciales de GitHub para sincronizar.");
      this.openSettings();
      return;
    }

    this.showLoading("Sincronizando progreso con tu repositorio...");
    try {
      // 1. Guardar local a remoto
      await GithubService.saveDb(this.db);
      // 2. Volver a cargar para asegurarnos que tenemos lo último
      this.db = await GithubService.loadDb();
      
      // 3. Actualizar vistas
      this.renderTemas();
      this.renderCalendar();
      this.updateTodayChecklist();
      this.updateProgressStats();

      alert("¡Sincronización completada! Todos tus datos están guardados en tu GitHub.");
    } catch (e) {
      alert(`Error de sincronización: ${e.message}`);
    } finally {
      this.hideLoading();
    }
  },

  // ================= NAVEGACIÓN Y PESTAÑAS =================
  switchTab(tabId) {
    this.activeTab = tabId;

    // Cambiar clases del nav menu
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    // Encontrar el botón correspondiente
    const links = Array.from(document.querySelectorAll('.nav-link'));
    let matchedLink = null;
    if (tabId === 'temario') matchedLink = links[0];
    else if (tabId === 'calendario') matchedLink = links[1];
    else if (tabId === 'test') matchedLink = links[2];
    else if (tabId === 'flashcards') matchedLink = links[3];
    else if (tabId === 'progreso') matchedLink = links[4];

    if (matchedLink) {
      matchedLink.classList.add('active');
    }

    // Cambiar la vista de la pestaña activa
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.remove('active');
    });
    const targetView = document.getElementById(`tab-${tabId}`);
    if (targetView) {
      targetView.classList.add('active');
    }

    // Actualizar título de la barra superior
    const titleMap = {
      'temario': 'Temario Oficial',
      'calendario': 'Planificador de Estudio',
      'test': 'Simulador de Test',
      'flashcards': 'Repaso con Flashcards',
      'progreso': 'Estadísticas y Progreso'
    };
    document.getElementById('navbar-title').innerText = titleMap[tabId];

    // Acciones al cambiar a pestañas específicas
    if (tabId === 'progreso') {
      this.updateProgressStats();
    } else if (tabId === 'flashcards') {
      this.initFlashcards();
    } else if (tabId === 'test') {
      this.resetTestTab();
    }
  },

  // Modales generales
  openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  },

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  },

  // ================= PESTAÑA: TEMARIO =================
  renderTemas() {
    const container = document.getElementById('temas-grid-container');
    if (!container) return;
    container.innerHTML = '';

    // Filtrados
    const searchVal = (document.getElementById('search-temas')?.value || '').toLowerCase();
    
    TEMAS_OPOSICION.forEach(tema => {
      // Filtrado por categoría activa
      if (this.filterBlockActive && this.filterBlockActive !== 'Todos' && tema.categoria !== this.filterBlockActive) {
        return;
      }

      // Filtrado por barra de búsqueda
      if (searchVal && !tema.titulo.toLowerCase().includes(searchVal) && !tema.descripcion.toLowerCase().includes(searchVal)) {
        return;
      }

      // Datos de progreso del tema
      const temaProg = this.db.temario[tema.id] || { vueltas: 0, archivos: [] };
      const totalDocs = temaProg.archivos?.length || 0;

      // Crear tarjeta
      const card = document.createElement('div');
      card.className = `tema-card ${tema.categoria.toLowerCase()}`;
      card.onclick = () => this.openTemaDetail(tema.id);

      card.innerHTML = `
        <div class="tema-header">
          <span class="tema-badge-block">${tema.categoria}</span>
          <span class="tema-number">Tema ${tema.numero}</span>
        </div>
        <h3 class="tema-title">${tema.titulo}</h3>
        <p class="tema-desc">${tema.descripcion}</p>
        <div class="tema-footer">
          <div class="tema-vueltas" title="Vueltas al tema">
            <svg viewBox="0 0 24 24"><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L5.7 14.8C5.25 13.97 5 13.01 5 12c0-3.87 3.13-7 7-7z"/></svg>
            <span>${temaProg.vueltas} vueltas</span>
          </div>
          <div class="tema-docs-count" title="Documentos del tema">
            <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            <span>${totalDocs} docs</span>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  },

  filterBlockActive: 'Todos',
  filterTemasBlock(block) {
    this.filterBlockActive = block;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const btnIdMap = {
      'Todos': 'btn-filter-todos',
      'Jurídicas': 'btn-filter-juridicas',
      'Sociales': 'btn-filter-sociales',
      'Técnicas': 'btn-filter-tecnicas'
    };
    document.getElementById(btnIdMap[block])?.classList.add('active');
    this.renderTemas();
  },

  filterTemas() {
    this.renderTemas();
  },

  // Modal Detalle de Tema
  openTemaDetail(temaId) {
    this.selectedTemaId = temaId;
    const tema = TEMAS_OPOSICION.find(t => t.id === temaId);
    if (!tema) return;

    const prog = this.db.temario[temaId] || { vueltas: 0, archivos: [] };

    document.getElementById('modal-tema-title').innerText = `Tema ${tema.numero}: ${tema.titulo}`;
    document.getElementById('modal-tema-desc').innerText = tema.descripcion;
    document.getElementById('modal-tema-vueltas-val').innerText = prog.vueltas;
    document.getElementById('modal-tema-docs-val').innerText = prog.archivos?.length || 0;

    // Renderizar documentos
    this.renderTemaDocsList(prog.archivos || []);

    this.openModal('modal-tema-detail');
  },

  renderTemaDocsList(archivos) {
    const list = document.getElementById('modal-tema-docs-list');
    if (!list) return;

    if (archivos.length === 0) {
      list.innerHTML = `<p style="color:var(--text-muted); font-size:13px; text-align:center; padding:10px;">No hay documentos cargados para este tema.</p>`;
      return;
    }

    list.innerHTML = '';
    archivos.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'uploaded-doc-item';
      
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const isImage = file.type.startsWith('image/');
      
      item.innerHTML = `
        <div class="doc-info">
          <div class="doc-icon">
            <!-- Icono según tipo -->
            <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          </div>
          <div style="min-width:0;">
            <div class="doc-name" title="${file.name}">${file.name}</div>
            <div class="doc-meta">${sizeMb} MB | Subido el ${new Date(file.uploadedAt).toLocaleDateString()}</div>
          </div>
        </div>
        <div class="doc-actions">
          <a href="${file.url}" target="_blank" class="btn-icon" title="Ver / Descargar">
            <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
          </a>
          <button class="btn-icon" style="color:var(--color-error);" onclick="app.handleTemaDocDelete(${index})" title="Eliminar">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;
      list.appendChild(item);
    });
  },

  // Modificar Vueltas
  incrementarVueltaTemaActivo() {
    if (!this.selectedTemaId) return;
    if (!this.db.temario[this.selectedTemaId]) {
      this.db.temario[this.selectedTemaId] = { vueltas: 0, archivos: [] };
    }
    this.db.temario[this.selectedTemaId].vueltas++;
    document.getElementById('modal-tema-vueltas-val').innerText = this.db.temario[this.selectedTemaId].vueltas;
    
    // Autoguardado local
    GithubService.saveDb(this.db);
    this.renderTemas();
  },

  decrementarVueltaTemaActivo() {
    if (!this.selectedTemaId) return;
    if (!this.db.temario[this.selectedTemaId]) return;
    if (this.db.temario[this.selectedTemaId].vueltas > 0) {
      this.db.temario[this.selectedTemaId].vueltas--;
      document.getElementById('modal-tema-vueltas-val').innerText = this.db.temario[this.selectedTemaId].vueltas;
      
      // Autoguardado local
      GithubService.saveDb(this.db);
      this.renderTemas();
    }
  },

  // Subir Documento a Tema
  async handleTemaDocUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!GithubService.hasCredentials()) {
      alert("Para subir archivos, debes configurar primero tus credenciales de GitHub.");
      this.openSettings();
      return;
    }

    this.showLoading(`Subiendo ${file.name} a tu GitHub...`);

    try {
      // Subir archivo al repo
      const uploadedFile = await GithubService.uploadDocument('temario', `tema_${this.selectedTemaId}`, file);

      // Actualizar base de datos
      if (!this.db.temario[this.selectedTemaId]) {
        this.db.temario[this.selectedTemaId] = { vueltas: 0, archivos: [] };
      }
      if (!this.db.temario[this.selectedTemaId].archivos) {
        this.db.temario[this.selectedTemaId].archivos = [];
      }
      this.db.temario[this.selectedTemaId].archivos.push(uploadedFile);

      // Guardar base de datos
      await GithubService.saveDb(this.db);

      // Actualizar UI
      this.renderTemaDocsList(this.db.temario[this.selectedTemaId].archivos);
      document.getElementById('modal-tema-docs-val').innerText = this.db.temario[this.selectedTemaId].archivos.length;
      this.renderTemas();

      alert("Archivo subido con éxito.");
    } catch (e) {
      alert(`Error al subir el archivo: ${e.message}`);
    } finally {
      this.hideLoading();
      // Limpiar input file
      event.target.value = '';
    }
  },

  // Eliminar Documento de Tema
  async handleTemaDocDelete(index) {
    if (!confirm("¿Seguro que deseas eliminar este documento de tu GitHub?")) return;

    const archivos = this.db.temario[this.selectedTemaId].archivos;
    const fileToDelete = archivos[index];

    this.showLoading(`Eliminando ${fileToDelete.name} de tu GitHub...`);

    try {
      // Para eliminar en GitHub necesitamos el SHA. Lo obtenemos del servicio
      const res = await GithubService.fetchFile(fileToDelete.path);
      if (res && res.sha) {
        await GithubService.deleteFile(fileToDelete.path, res.sha);
      }

      // Actualizar base de datos
      archivos.splice(index, 1);
      await GithubService.saveDb(this.db);

      // Actualizar UI
      this.renderTemaDocsList(archivos);
      document.getElementById('modal-tema-docs-val').innerText = archivos.length;
      this.renderTemas();

      alert("Archivo eliminado con éxito.");
    } catch (e) {
      alert(`Error al eliminar: ${e.message}`);
    } finally {
      this.hideLoading();
    }
  },

  // ================= PESTAÑA: CALENDARIO =================
  renderCalendar() {
    const container = document.getElementById('calendar-grid-container');
    const monthTitle = document.getElementById('calendar-month-title');
    if (!container) return;

    container.innerHTML = '';

    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    // Establecer título del mes
    const nombreMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthTitle.innerText = `${nombreMeses[month]} ${year}`;

    // Primer día del mes (1-indexado de lunes a domingo)
    let firstDayIndex = new Date(year, month, 1).getDay();
    // En JS 0 es Domingo. Nosotros queremos que sea Lunes (0=L, 6=D)
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Días del mes actual
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Días del mes anterior para rellenar
    const prevMonthDays = new Date(year, month, 0).getDate();

    // 1. Rellenar días del mes anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell other-month';
      cell.innerHTML = `<span class="calendar-day-number">${prevMonthDays - i}</span>`;
      container.appendChild(cell);
    }

    // 2. Rellenar días del mes actual
    const hoy = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement('div');
      
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      let classes = 'calendar-cell';
      if (hoy.getFullYear() === year && hoy.getMonth() === month && hoy.getDate() === day) {
        classes += ' today';
      }

      cell.className = classes;
      cell.onclick = () => this.openCalendarDayModal(dateStr);

      // Comprobar indicadores
      const dayData = this.db.calendario[dateStr] || { notas: '', archivos: [], temasEstudiados: [] };
      const hasStudy = dayData.temasEstudiados?.length > 0;
      const hasDocs = dayData.archivos?.length > 0;
      const hasNotes = !!dayData.notas;

      let indicators = '';
      if (hasStudy) indicators += '<span class="indicator-dot study" title="Temas estudiados"></span>';
      if (hasDocs) indicators += '<span class="indicator-dot docs" title="Archivos adjuntos"></span>';
      if (hasNotes) indicators += '<span class="indicator-dot notes" title="Anotaciones"></span>';

      // Si hay plan de estudio de 5 temas
      let planBadge = '';
      if (this.db.planEstudio && this.db.planEstudio.distribucion && this.db.planEstudio.distribucion[dateStr]) {
        const totalPlanificados = this.db.planEstudio.distribucion[dateStr].length;
        const totalHechos = dayData.temasEstudiados ? dayData.temasEstudiados.filter(tid => this.db.planEstudio.distribucion[dateStr].includes(tid)).length : 0;
        
        planBadge = `
          <div style="font-size:9px; background:rgba(229,169,60,0.15); border:1px solid var(--color-accent); color:var(--color-accent); padding:2px 4px; border-radius:4px; margin-top:4px; font-weight:600; text-align:center;">
            Plan: ${totalHechos}/${totalPlanificados}
          </div>
        `;
      }

      cell.innerHTML = `
        <span class="calendar-day-number">${day}</span>
        ${planBadge}
        <div class="calendar-cell-indicators">
          ${indicators}
        </div>
      `;
      container.appendChild(cell);
    }

    // 3. Rellenar días del mes siguiente para cuadrar grilla de 6 filas (42 celdas en total)
    const totalCells = container.children.length;
    const remainingCells = 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell other-month';
      cell.innerHTML = `<span class="calendar-day-number">${day}</span>`;
      container.appendChild(cell);
    }
  },

  changeMonth(direction) {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
    this.renderCalendar();
  },

  // Generador de plan de estudio (5 temas por día)
  async generarPlanEstudio() {
    const hasAI = GeminiService.hasApiKey();
    let useAI = false;

    if (hasAI) {
      useAI = confirm("¿Quieres generar tu plan de estudio personalizado usando Gemini AI? (Si pulsas Cancelar, se generará usando el algoritmo optimizado local).");
    } else {
      if (!confirm("Se va a generar el plan de estudio de 9 días respetando tus agrupaciones específicas (5 temas/día, alternando bloques). ¿Deseas continuar?")) {
        return;
      }
    }

    const plan = {
      fechaInicio: new Date().toISOString().split('T')[0],
      distribucion: {}
    };
    const hoy = new Date();

    if (useAI) {
      this.showLoading("Gemini AI está organizando tu plan de estudio personalizado...");
      try {
        const response = await GeminiService.generarPlanEstudioConGemini(TEMAS_OPOSICION);
        if (!response.distribucion) {
          throw new Error("Respuesta de IA no válida.");
        }
        
        // Mapear los días devueltos por Gemini (ej: "Dia 1", "Dia 2"...) a fechas reales
        const keys = Object.keys(response.distribucion).sort((a, b) => {
          // Extraer número de día para ordenar correctamente
          const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
          const justifyB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
          return numA - justifyB;
        });

        keys.forEach((key, index) => {
          const targetDate = new Date();
          targetDate.setDate(hoy.getDate() + index);
          const targetDateStr = targetDate.toISOString().split('T')[0];
          // Guardar los IDs de temas asignados a ese día
          plan.distribucion[targetDateStr] = response.distribucion[key].map(id => parseInt(id));
        });

        this.db.planEstudio = plan;
        await GithubService.saveDb(this.db);
        this.renderCalendar();
        this.updateTodayChecklist();
        alert("¡Plan de estudio generado con éxito usando Gemini AI!");
      } catch (e) {
        console.error("Error con Gemini, usando plan optimizado local:", e);
        alert("Hubo un problema con la IA. Generando el plan local optimizado como alternativa...");
        this.generarPlanEstudioLocal(plan, hoy);
      } finally {
        this.hideLoading();
      }
    } else {
      this.generarPlanEstudioLocal(plan, hoy);
    }
  },

  // Generador local optimizado con las agrupaciones y alternancias del usuario
  async generarPlanEstudioLocal(plan, hoy) {
    // Planificación fija optimizada que cumple 100% las restricciones del usuario:
    // T1, T2, T3 juntos; T5, T6 juntos; T16, T21 juntos; T20, T38, T39, T40, T41 juntos; T24, T25, T26 juntos
    // Sin ortografía ni gramática (T36 y T37 de la lista antigua eliminados)
    const fallbackDistrib = [
      [1, 2, 3, 27, 42],        // Día 1: T.1, T.2, T.3 juntos (Jurídicos) + T.27 (Sociales) + T.42 (Técnico)
      [5, 6, 28, 43, 4],        // Día 2: T.5, T.6 juntos (Jurídicos) + T.28 (Sociales) + T.43 (Técnico) + T.4 (Jurídico)
      [16, 21, 29, 44, 7],      // Día 3: T.16, T.21 juntos (Jurídicos) + T.29 (Sociales) + T.44 (Técnico) + T.7 (Jurídico)
      [20, 38, 39, 40, 41],     // Día 4: T.20, T.38, T.39, T.40, T.41 juntos (Informáticos/Técnicos)
      [24, 25, 26, 30, 45],     // Día 5: T.24, T.25, T.26 juntos (Jurídico/PRL) + T.30 (Sociales) + T.45 (Técnico)
      [8, 9, 10, 11, 31],       // Día 6: Jurídicos varios + T.31 (Sociales)
      [12, 13, 14, 15, 32],     // Día 7: Jurídicos varios + T.32 (Sociales)
      [17, 18, 19, 22, 33],     // Día 8: Penales/Jurídicos + T.33 (Sociales)
      [23, 34, 35]              // Día 9: T.23 (Jurídico) + T.34, T.35 (Sociales) -> 3 temas restantes
    ];

    fallbackDistrib.forEach((temaIds, index) => {
      const targetDate = new Date();
      targetDate.setDate(hoy.getDate() + index);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      plan.distribucion[targetDateStr] = temaIds;
    });

    this.db.planEstudio = plan;
    await GithubService.saveDb(this.db);
    this.renderCalendar();
    this.updateTodayChecklist();
    alert("¡Plan de estudio optimizado generado con éxito en base a tus reglas!");
  },

  updateTodayChecklist() {
    const container = document.getElementById('today-checklist-container');
    if (!container) return;

    const hoyStr = new Date().toISOString().split('T')[0];
    
    // Ver si hoy está en el plan
    if (!this.db.planEstudio || !this.db.planEstudio.distribucion || !this.db.planEstudio.distribucion[hoyStr]) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No hay temas planificados para hoy. Pulsa el botón "Generar Plan" para distribuir tus temas de estudio.</p>`;
      return;
    }

    const temasIds = this.db.planEstudio.distribucion[hoyStr];
    const dayData = this.db.calendario[hoyStr] || { temasEstudiados: [] };

    container.innerHTML = `
      <p style="font-size:12px; margin-bottom:8px; color:var(--color-accent); font-weight:600;">Temas del plan de hoy:</p>
    `;

    temasIds.forEach(id => {
      const tema = TEMAS_OPOSICION.find(t => t.id === id);
      if (!tema) return;

      const isChecked = dayData.temasEstudiados ? dayData.temasEstudiados.includes(id) : false;

      const item = document.createElement('div');
      item.className = `checklist-preview-item ${isChecked ? 'checked' : ''}`;
      
      item.innerHTML = `
        <input type="checkbox" id="chk-today-plan-${id}" ${isChecked ? 'checked' : ''} onchange="app.toggleTodayPlanTheme(${id})">
        <label for="chk-today-plan-${id}" style="cursor:pointer; flex-grow:1;">
          <strong>Tema ${tema.numero}:</strong> ${tema.titulo}
        </label>
      `;
      container.appendChild(item);
    });
  },

  // Toggle rápido de temas desde el sidebar de hoy
  toggleTodayPlanTheme(temaId) {
    const hoyStr = new Date().toISOString().split('T')[0];
    if (!this.db.calendario[hoyStr]) {
      this.db.calendario[hoyStr] = { notas: '', archivos: [], temasEstudiados: [] };
    }
    if (!this.db.calendario[hoyStr].temasEstudiados) {
      this.db.calendario[hoyStr].temasEstudiados = [];
    }

    const index = this.db.calendario[hoyStr].temasEstudiados.indexOf(temaId);
    
    if (index === -1) {
      // Estudiado: añadir y sumarle una vuelta
      this.db.calendario[hoyStr].temasEstudiados.push(temaId);
      if (!this.db.temario[temaId]) {
        this.db.temario[temaId] = { vueltas: 0, archivos: [] };
      }
      this.db.temario[temaId].vueltas++;
    } else {
      // Desmarcado: quitar y restar vuelta si es > 0
      this.db.calendario[hoyStr].temasEstudiados.splice(index, 1);
      if (this.db.temario[temaId] && this.db.temario[temaId].vueltas > 0) {
        this.db.temario[temaId].vueltas--;
      }
    }

    // Guardar base de datos
    GithubService.saveDb(this.db);
    this.renderCalendar();
    this.updateTodayChecklist();
    this.updateProgressStats();
  },

  // Modal de Detalle de Día del Calendario
  openCalendarDayModal(dateStr) {
    this.selectedDate = dateStr;
    const dayData = this.db.calendario[dateStr] || { notas: '', archivos: [], temasEstudiados: [] };

    // Formatear fecha del título
    const dateObj = new Date(dateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateFormatted = dateObj.toLocaleDateString('es-ES', options);

    document.getElementById('modal-calendar-date-title').innerText = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
    document.getElementById('calendar-day-notes').value = dayData.notes || dayData.notas || '';

    // Renderizar Checkboxes de los 45 temas
    const container = document.getElementById('day-themes-checkbox-container');
    container.innerHTML = '';

    TEMAS_OPOSICION.forEach(tema => {
      const isChecked = dayData.temasEstudiados ? dayData.temasEstudiados.includes(tema.id) : false;
      const item = document.createElement('label');
      item.className = 'theme-checkbox-item';
      item.innerHTML = `
        <input type="checkbox" value="${tema.id}" ${isChecked ? 'checked' : ''} class="chk-day-theme">
        <span><strong>T.${tema.numero}</strong> - ${tema.titulo}</span>
      `;
      container.appendChild(item);
    });

    // Renderizar archivos adjuntos del día
    this.renderCalendarDocsList(dayData.archivos || []);

    this.openModal('modal-calendario-detail');
  },

  renderCalendarDocsList(archivos) {
    const list = document.getElementById('modal-calendar-docs-list');
    if (!list) return;

    if (archivos.length === 0) {
      list.innerHTML = `<p style="color:var(--text-muted); font-size:13px; text-align:center; padding:10px;">No hay documentos adjuntos para este día.</p>`;
      return;
    }

    list.innerHTML = '';
    archivos.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'uploaded-doc-item';
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      
      item.innerHTML = `
        <div class="doc-info">
          <div class="doc-icon">
            <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
          </div>
          <div style="min-width:0;">
            <div class="doc-name" title="${file.name}">${file.name}</div>
            <div class="doc-meta">${sizeMb} MB | Subido</div>
          </div>
        </div>
        <div class="doc-actions">
          <a href="${file.url}" target="_blank" class="btn-icon" title="Ver / Descargar">
            <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
          </a>
          <button class="btn-icon" style="color:var(--color-error);" onclick="app.handleCalendarDocDelete(${index})">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;
      list.appendChild(item);
    });
  },

  // Guardar datos del día
  saveCalendarDayData() {
    const notesVal = document.getElementById('calendar-day-notes').value;
    
    // Obtener checkboxes seleccionados
    const checkedThemes = [];
    document.querySelectorAll('.chk-day-theme:checked').forEach(chk => {
      checkedThemes.push(parseInt(chk.value));
    });

    if (!this.db.calendario[this.selectedDate]) {
      this.db.calendario[this.selectedDate] = { notas: '', archivos: [], temasEstudiados: [] };
    }

    const previousStudied = this.db.calendario[this.selectedDate].temasEstudiados || [];
    
    // 1. Actualizar notas
    this.db.calendario[this.selectedDate].notas = notesVal;

    // 2. Controlar sumas/restas de vueltas del temario
    // Temas nuevos marcados: sumar vuelta
    checkedThemes.forEach(tid => {
      if (!previousStudied.includes(tid)) {
        if (!this.db.temario[tid]) {
          this.db.temario[tid] = { vueltas: 0, archivos: [] };
        }
        this.db.temario[tid].vueltas++;
      }
    });

    // Temas antiguos desmarcados: restar vuelta
    previousStudied.forEach(tid => {
      if (!checkedThemes.includes(tid)) {
        if (this.db.temario[tid] && this.db.temario[tid].vueltas > 0) {
          this.db.temario[tid].vueltas--;
        }
      }
    });

    this.db.calendario[this.selectedDate].temasEstudiados = checkedThemes;

    // Guardar
    GithubService.saveDb(this.db);
    this.closeModal('modal-calendario-detail');
    
    this.renderCalendar();
    this.updateTodayChecklist();
    this.updateProgressStats();
    alert("Datos guardados.");
  },

  // Subir Archivo al Día del Calendario
  async handleCalendarDocUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!GithubService.hasCredentials()) {
      alert("Para subir archivos, debes configurar primero tus credenciales de GitHub.");
      this.openSettings();
      return;
    }

    this.showLoading(`Subiendo ${file.name} a tu GitHub...`);

    try {
      const uploadedFile = await GithubService.uploadDocument('calendario', this.selectedDate, file);

      if (!this.db.calendario[this.selectedDate]) {
        this.db.calendario[this.selectedDate] = { notas: '', archivos: [], temasEstudiados: [] };
      }
      if (!this.db.calendario[this.selectedDate].archivos) {
        this.db.calendario[this.selectedDate].archivos = [];
      }
      this.db.calendario[this.selectedDate].archivos.push(uploadedFile);

      await GithubService.saveDb(this.db);

      this.renderCalendarDocsList(this.db.calendario[this.selectedDate].archivos);
      this.renderCalendar();
      alert("Archivo subido al día del calendario.");
    } catch (e) {
      alert(`Error al subir: ${e.message}`);
    } finally {
      this.hideLoading();
      event.target.value = '';
    }
  },

  // Eliminar archivo de calendario
  async handleCalendarDocDelete(index) {
    if (!confirm("¿Seguro que deseas eliminar este documento de tu GitHub?")) return;

    const archivos = this.db.calendario[this.selectedDate].archivos;
    const fileToDelete = archivos[index];

    this.showLoading(`Eliminando ${fileToDelete.name}...`);

    try {
      const res = await GithubService.fetchFile(fileToDelete.path);
      if (res && res.sha) {
        await GithubService.deleteFile(fileToDelete.path, res.sha);
      }

      archivos.splice(index, 1);
      await GithubService.saveDb(this.db);

      this.renderCalendarDocsList(archivos);
      this.renderCalendar();
      alert("Archivo eliminado con éxito.");
    } catch (e) {
      alert(`Error al eliminar: ${e.message}`);
    } finally {
      this.hideLoading();
    }
  },

  // ================= PESTAÑA: TEST (SIMULADOR) =================
  resetTestTab() {
    document.getElementById('test-main-header').style.display = 'flex';
    document.getElementById('test-selection-view').style.display = 'block';
    document.getElementById('test-exam-view').style.display = 'none';
    document.getElementById('test-results-view').style.display = 'none';

    // Actualizar contador de falladas en el botón
    const count = this.db.preguntasFalladas?.length || 0;
    document.getElementById('lbl-fallidas-count').innerText = `Practica exclusivamente tus ${count} preguntas falladas en tests previos.`;
    
    const cardFallidas = document.getElementById('card-test-fallidas');
    if (count === 0) {
      cardFallidas.style.opacity = '0.5';
      cardFallidas.style.cursor = 'not-allowed';
    } else {
      cardFallidas.style.opacity = '1';
      cardFallidas.style.cursor = 'pointer';
    }
  },

  // Examen de 15 Preguntas Aleatorias
  iniciarTestAleatorio() {
    this.activeExam.tipoExamen = 'aleatorio';
    this.activeExam.temaId = null;

    // Obtener preguntas base
    const totalDisponibles = this.mockQuestions.length;
    // Barajarlas
    const shuffled = [...this.mockQuestions].sort(() => 0.5 - Math.random());
    
    // Seleccionar 15 (o las disponibles si son menos)
    this.activeExam.questions = shuffled.slice(0, Math.min(15, totalDisponibles));

    this.iniciarInterfazExamen();
  },

  // Abrir modal test de tema
  openTestPorTemaModal() {
    if (!GeminiService.hasApiKey()) {
      alert("Para generar tests por tema con Inteligencia Artificial, debes configurar tu Gemini API Key en ajustes.");
      this.openSettings();
      return;
    }

    const select = document.getElementById('test-select-tema-dropdown');
    select.innerHTML = '';
    
    TEMAS_OPOSICION.forEach(tema => {
      const opt = document.createElement('option');
      opt.value = tema.id;
      opt.innerText = `Tema ${tema.numero}: ${tema.titulo}`;
      select.appendChild(opt);
    });

    this.openModal('modal-test-select-tema');
  },

  // Generar test por tema con Gemini IA
  async iniciarTestPorTema() {
    const temaId = parseInt(document.getElementById('test-select-tema-dropdown').value);
    const tema = TEMAS_OPOSICION.find(t => t.id === temaId);
    if (!tema) return;

    this.closeModal('modal-test-select-tema');
    this.showLoading(`Generando test del Tema ${tema.numero} con Gemini AI (esto puede tardar unos 10-15 segundos)...`);

    try {
      const response = await GeminiService.generarTestDeTema(tema.numero, tema.titulo, tema.descripcion);
      
      if (!response.preguntas || response.preguntas.length === 0) {
        throw new Error("No se devolvieron preguntas de test válidas.");
      }

      this.activeExam.tipoExamen = 'tema';
      this.activeExam.temaId = temaId;
      this.activeExam.questions = response.preguntas.slice(0, 15);

      this.iniciarInterfazExamen();
    } catch (e) {
      alert(`Error al generar el test por IA: ${e.message}`);
    } finally {
      this.hideLoading();
    }
  },

  // Abrir modal test desde documento
  openTestPorDocModal() {
    if (!GeminiService.hasApiKey()) {
      alert("Para generar tests desde documentos con Inteligencia Artificial, debes configurar tu Gemini API Key en ajustes.");
      this.openSettings();
      return;
    }

    this.selectedTestDocFile = null;
    this.selectedTestDocBase64 = '';
    document.getElementById('lbl-test-upload-status').innerText = 'Haz clic para subir un documento o imagen';
    document.getElementById('test-doc-file-info').style.display = 'none';
    document.getElementById('btn-generate-test-doc').disabled = true;

    this.openModal('modal-test-upload-doc');
  },

  // Seleccionar archivo para test
  handleTestDocSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedTestDocFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      // Obtener base64 crudo sin el prefijo data:...;base64,
      const rawBase64 = reader.result.split(',')[1];
      this.selectedTestDocBase64 = rawBase64;

      document.getElementById('test-doc-filename').innerText = file.name;
      document.getElementById('test-doc-file-info').style.display = 'block';
      document.getElementById('lbl-test-upload-status').innerText = 'Archivo cargado con éxito.';
      document.getElementById('btn-generate-test-doc').disabled = false;
    };
    reader.readAsDataURL(file);
  },

  // Iniciar test desde documento cargado con Gemini
  async iniciarTestDesdeDocumento() {
    if (!this.selectedTestDocFile || !this.selectedTestDocBase64) return;

    this.closeModal('modal-test-upload-doc');
    this.showLoading(`Gemini está analizando ${this.selectedTestDocFile.name} y redactando preguntas...`);

    try {
      const response = await GeminiService.generarTestDesdeDocumento(this.selectedTestDocFile, this.selectedTestDocBase64);
      
      if (!response.preguntas || response.preguntas.length === 0) {
        throw new Error("No se devolvieron preguntas de test válidas.");
      }

      this.activeExam.tipoExamen = 'documento';
      this.activeExam.temaId = null;
      this.activeExam.questions = response.preguntas.slice(0, 15);

      this.iniciarInterfazExamen();
    } catch (e) {
      alert(`Error al procesar el documento con Gemini: ${e.message}`);
    } finally {
      this.hideLoading();
    }
  },

  // Test de preguntas falladas
  iniciarTestFallidas() {
    const falladas = this.db.preguntasFalladas || [];
    if (falladas.length === 0) return;

    this.activeExam.tipoExamen = 'falladas';
    this.activeExam.temaId = null;

    // Barajar y coger máximo 15 preguntas
    const shuffled = [...falladas].sort(() => 0.5 - Math.random());
    this.activeExam.questions = shuffled.slice(0, Math.min(15, shuffled.length));

    this.iniciarInterfazExamen();
  },

  // Lógica de examen activo
  iniciarInterfazExamen() {
    this.activeExam.currentQuestionIndex = 0;
    // Rellenar respuestas en blanco
    this.activeExam.answers = Array(this.activeExam.questions.length).fill(null);

    // Ocultar cabecera y selección, mostrar examen
    document.getElementById('test-main-header').style.display = 'none';
    document.getElementById('test-selection-view').style.display = 'none';
    document.getElementById('test-exam-view').style.display = 'block';

    // Establecer título del modo de examen
    const modeTitles = {
      'aleatorio': 'Examen Aleatorio General',
      'tema': 'Examen de Tema Oficial (IA)',
      'documento': 'Examen desde tu Documento (IA)',
      'falladas': 'Test de Repaso de Preguntas Falladas'
    };
    document.getElementById('exam-mode-title').innerText = modeTitles[this.activeExam.tipoExamen];

    // Generar puntos de progreso
    const dotsContainer = document.getElementById('exam-dots-container');
    dotsContainer.innerHTML = '';
    this.activeExam.questions.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.className = `exam-dot ${idx === 0 ? 'active' : ''}`;
      dot.id = `exam-dot-${idx}`;
      dotsContainer.appendChild(dot);
    });

    // Iniciar Temporizador (15 minutos = 900 segundos)
    this.activeExam.timeRemaining = 900;
    this.updateTimerClock();
    
    if (this.activeExam.timerInterval) clearInterval(this.activeExam.timerInterval);
    this.activeExam.timerInterval = setInterval(() => {
      this.activeExam.timeRemaining--;
      this.updateTimerClock();
      if (this.activeExam.timeRemaining <= 0) {
        clearInterval(this.activeExam.timerInterval);
        alert("¡Tiempo finalizado! Se enviará tu examen automáticamente.");
        this.finalizarExamen();
      }
    }, 1000);

    this.loadQuestion(0);
  },

  updateTimerClock() {
    const mins = Math.floor(this.activeExam.timeRemaining / 60);
    const secs = this.activeExam.timeRemaining % 60;
    document.getElementById('exam-timer-clock').innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  // Cargar una pregunta
  loadQuestion(index) {
    this.activeExam.currentQuestionIndex = index;
    const q = this.activeExam.questions[index];

    // Actualizar etiquetas
    document.getElementById('q-number-label').innerText = `Pregunta ${index + 1} de ${this.activeExam.questions.length}`;
    document.getElementById('q-text-container').innerText = q.pregunta;

    // Actualizar botones de navegación
    document.getElementById('btn-exam-prev').disabled = index === 0;
    const btnNext = document.getElementById('btn-exam-next');
    if (index === this.activeExam.questions.length - 1) {
      btnNext.innerText = "Finalizar Examen";
      btnNext.className = "btn btn-primary";
    } else {
      btnNext.innerText = "Siguiente";
      btnNext.className = "btn btn-primary";
    }

    // Actualizar puntos de progreso
    document.querySelectorAll('.exam-dot').forEach((dot, idx) => {
      dot.classList.remove('active');
      if (idx === index) dot.classList.add('active');
    });

    // Renderizar opciones (A, B, C)
    const optionsContainer = document.getElementById('q-options-container');
    optionsContainer.innerHTML = '';

    const letters = ["A", "B", "C"];
    q.opciones.forEach((opcionText, oIdx) => {
      const btn = document.createElement('button');
      
      const isSelected = this.activeExam.answers[index] === oIdx;
      btn.className = `option-button ${isSelected ? 'selected' : ''}`;
      btn.onclick = () => this.selectOption(oIdx);

      btn.innerHTML = `
        <span class="option-letter">${letters[oIdx]}</span>
        <span class="option-text">${opcionText}</span>
      `;
      optionsContainer.appendChild(btn);
    });
  },

  selectOption(optionIndex) {
    const qIdx = this.activeExam.currentQuestionIndex;
    
    // Si hace click en la ya seleccionada, desmarcar (dejar en blanco)
    if (this.activeExam.answers[qIdx] === optionIndex) {
      this.activeExam.answers[qIdx] = null;
      document.getElementById(`exam-dot-${qIdx}`).className = "exam-dot active";
    } else {
      this.activeExam.answers[qIdx] = optionIndex;
      document.getElementById(`exam-dot-${qIdx}`).className = "exam-dot answered active";
    }

    // Recargar pregunta para actualizar clases visuales
    this.loadQuestion(qIdx);
  },

  prevQuestion() {
    if (this.activeExam.currentQuestionIndex > 0) {
      this.loadQuestion(this.activeExam.currentQuestionIndex - 1);
    }
  },

  nextQuestion() {
    const qIdx = this.activeExam.currentQuestionIndex;
    if (qIdx < this.activeExam.questions.length - 1) {
      this.loadQuestion(qIdx + 1);
    } else {
      this.finalizarExamen();
    }
  },

  confirmCancelExam() {
    if (confirm("¿Estás seguro de que quieres abandonar el examen? Perderás todo el progreso de este test.")) {
      clearInterval(this.activeExam.timerInterval);
      this.resetTestTab();
    }
  },

  // Finalizar y Corregir
  finalizarExamen() {
    clearInterval(this.activeExam.timerInterval);

    let aciertos = 0;
    let fallos = 0;
    let blanco = 0;

    const questionsReview = [];

    this.activeExam.questions.forEach((q, idx) => {
      const userAns = this.activeExam.answers[idx];
      const correctAns = q.respuestaCorrecta;
      
      const isCorrect = userAns === correctAns;
      const isBlank = userAns === null;

      if (isBlank) blanco++;
      else if (isCorrect) aciertos++;
      else fallos++;

      // Guardar pregunta en historial de revisión
      questionsReview.push({
        ...q,
        userAnswer: userAns,
        isCorrect: isCorrect,
        isBlank: isBlank
      });

      // Si falló, guardarla en el banco de falladas
      if (!isCorrect && !isBlank) {
        this.addPreguntaFallada(q);
      }

      // Si el test es de "falladas" y acertó la pregunta, la eliminamos/decrementamos de la lista
      if (this.activeExam.tipoExamen === 'falladas' && isCorrect) {
        this.removePreguntaFallada(q);
      }
    });

    // Calcular nota con penalización Policía Nacional (resta 1/(N-1) donde N=3 opciones -> resta 1/2 = 0.5 puntos por fallo)
    // Nota = (Aciertos - (Fallos / 2)) * 10 / TotalPreguntas
    const penalizacion = fallos * 0.5;
    let score = ((aciertos - penalizacion) / this.activeExam.questions.length) * 10;
    if (score < 0) score = 0.0;
    score = parseFloat(score.toFixed(2));

    // Guardar en el historial de exámenes para el gráfico
    const examLog = {
      fecha: new Date().toISOString(),
      tipo: this.activeExam.tipoExamen,
      nota: score,
      aciertos: aciertos,
      fallos: fallos,
      blanco: blanco
    };
    if (!this.db.historialExamenes) this.db.historialExamenes = [];
    this.db.historialExamenes.push(examLog);

    // Guardar base de datos
    GithubService.saveDb(this.db);

    // Mostrar UI de resultados
    document.getElementById('test-exam-view').style.display = 'none';
    document.getElementById('test-results-view').style.display = 'block';

    document.getElementById('score-value-display').innerText = score.toFixed(1);
    document.getElementById('val-aciertos').innerText = aciertos;
    document.getElementById('val-fallos').innerText = fallos;
    document.getElementById('val-blanco').innerText = blanco;
    
    // Título descriptivo
    const typeLabel = {
      'aleatorio': 'Examen Aleatorio',
      'tema': 'Examen del Tema',
      'documento': 'Examen desde Archivo',
      'falladas': 'Repaso de Falladas'
    }[this.activeExam.tipoExamen];
    document.getElementById('result-meta-title').innerText = `${typeLabel} completado el ${new Date().toLocaleDateString()}`;

    // Almacenar las preguntas para revisión
    this.currentExamReviewQuestions = questionsReview;
  },

  // Banco de preguntas falladas
  addPreguntaFallada(q) {
    if (!this.db.preguntasFalladas) this.db.preguntasFalladas = [];
    
    // Evitar duplicados comparando el texto de la pregunta
    const exist = this.db.preguntasFalladas.find(item => item.pregunta === q.pregunta);
    if (!exist) {
      this.db.preguntasFalladas.push({
        ...q,
        fallasCount: 1,
        addedAt: new Date().toISOString()
      });
    } else {
      exist.fallasCount++;
    }
  },

  removePreguntaFallada(q) {
    if (!this.db.preguntasFalladas) return;
    this.db.preguntasFalladas = this.db.preguntasFalladas.filter(item => item.pregunta !== q.pregunta);
  },

  // Mostrar corrección detallada de respuestas
  showResultsReview() {
    const container = document.getElementById('results-review-container');
    container.innerHTML = '';
    
    const letters = ["A", "B", "C"];

    this.currentExamReviewQuestions.forEach((q, idx) => {
      const item = document.createElement('div');
      item.className = 'review-question-item';

      let optionsHtml = '';
      q.opciones.forEach((op, oIdx) => {
        let opClass = 'neutral';
        let icon = '';

        if (oIdx === q.respuestaCorrecta) {
          opClass = 'correct';
          icon = '✔️ ';
        } else if (oIdx === q.userAnswer && !q.isCorrect) {
          opClass = 'wrong';
          icon = '❌ ';
        }

        optionsHtml += `
          <div class="review-option ${opClass}">
            <strong>${icon}${letters[oIdx]})</strong> ${op}
          </div>
        `;
      });

      let userAnsLabel = q.isBlank ? 'Dejada en blanco' : `Respondiste: ${letters[q.userAnswer]}`;
      let statusColor = q.isCorrect ? 'var(--color-success)' : 'var(--color-error)';
      if (q.isBlank) statusColor = 'var(--text-muted)';

      item.innerHTML = `
        <div class="review-question-header">
          <span style="color:var(--color-accent);">P.${idx+1}</span> ${q.pregunta}
        </div>
        <div class="review-options">
          ${optionsHtml}
        </div>
        <div style="font-size:12px; margin-bottom:10px; font-weight:500; color:${statusColor}">
          ${userAnsLabel} | ${q.isCorrect ? 'Correcta' : (q.isBlank ? 'Sin responder' : 'Incorrecta')}
        </div>
        <div class="review-explanation">
          <strong>Explicación:</strong> ${q.explicacion}
        </div>
      `;
      container.appendChild(item);
    });

    container.style.display = 'block';
  },

  // ================= PESTAÑA: FLASHCARDS =================
  initFlashcards() {
    this.flashcardMode = 'normal';
    document.getElementById('btn-flashcards-modo-normal').className = 'btn btn-primary';
    document.getElementById('btn-flashcards-modo-dificiles').className = 'btn btn-secondary';

    // Construir mazo
    this.buildFlashcardDeck();
  },

  setFlashcardMode(mode) {
    this.flashcardMode = mode;
    
    if (mode === 'normal') {
      document.getElementById('btn-flashcards-modo-normal').className = 'btn btn-primary';
      document.getElementById('btn-flashcards-modo-dificiles').className = 'btn btn-secondary';
      document.getElementById('btn-flashcard-mark-dificil').style.display = 'inline-flex';
      document.getElementById('btn-flashcard-mark-facil').style.display = 'none';
    } else {
      document.getElementById('btn-flashcards-modo-normal').className = 'btn btn-secondary';
      document.getElementById('btn-flashcards-modo-dificiles').className = 'btn btn-danger';
      document.getElementById('btn-flashcard-mark-dificil').style.display = 'none';
      document.getElementById('btn-flashcard-mark-facil').style.display = 'inline-flex';
    }

    this.buildFlashcardDeck();
  },

  buildFlashcardDeck() {
    let rawCards = [];

    if (this.flashcardMode === 'normal') {
      // 1. Usar las de prueba (mock)
      rawCards = [...this.mockFlashcards];
      // 2. Añadir flashcards generadas por IA si existieran
      if (this.db.flashcardsGeneradas) {
        rawCards = [...rawCards, ...this.db.flashcardsGeneradas];
      }
    } else {
      // Cargar del mazo de difíciles
      rawCards = [...(this.db.flashcardsDificiles || [])];
    }

    // ALGORITMO DE RUEDA ALEATORIA: Barajar aleatoriamente
    this.activeFlashcardDeck = rawCards.sort(() => 0.5 - Math.random());
    this.activeFlashcardIndex = 0;

    // Actualizar badge
    document.getElementById('lbl-dificiles-badge').innerText = this.db.flashcardsDificiles?.length || 0;

    // Cargar primera
    this.showFlashcard(0);
  },

  showFlashcard(index) {
    const inner = document.getElementById('active-flashcard-inner');
    if (!inner) return;

    // Asegurarse de quitar giro antes de cambiar
    inner.classList.remove('is-flipped');

    const total = this.activeFlashcardDeck.length;
    document.getElementById('flashcard-total-count').innerText = total;

    if (total === 0) {
      document.getElementById('flashcard-current-index').innerText = 0;
      document.getElementById('card-front-text').innerText = this.flashcardMode === 'normal' 
        ? "No hay flashcards cargadas." 
        : "¡Excelente! No tienes tarjetas difíciles pendientes.";
      document.getElementById('card-back-text').innerText = "Vuelve a la Baraja Completa o genera nuevas desde el Temario.";
      return;
    }

    this.activeFlashcardIndex = index;
    document.getElementById('flashcard-current-index').innerText = index + 1;

    const card = this.activeFlashcardDeck[index];
    
    // Determinar categoría
    const tema = TEMAS_OPOSICION.find(t => t.id === card.temaId);
    const badgeText = tema ? `TEMA ${tema.numero}: ${tema.titulo}` : "REPASO RÁPIDO";

    document.getElementById('card-front-badge').innerText = badgeText;
    document.getElementById('card-back-badge').innerText = "RESPUESTA";

    document.getElementById('card-front-text').innerText = card.anverso;
    document.getElementById('card-back-text').innerText = card.reverso;
  },

  flipFlashcard() {
    const inner = document.getElementById('active-flashcard-inner');
    if (inner) {
      inner.classList.toggle('is-flipped');
    }
  },

  nextFlashcard() {
    const total = this.activeFlashcardDeck.length;
    if (total === 0) return;
    
    const nextIdx = (this.activeFlashcardIndex + 1) % total;
    this.showFlashcard(nextIdx);
  },

  // Marcar como difícil / fácil
  markFlashcardHard(isHard) {
    const deck = this.activeFlashcardDeck;
    if (deck.length === 0) return;

    const currentCard = deck[this.activeFlashcardIndex];

    if (!this.db.flashcardsDificiles) this.db.flashcardsDificiles = [];

    if (isHard) {
      // Añadir a difíciles si no existe ya
      const exist = this.db.flashcardsDificiles.find(c => c.anverso === currentCard.anverso);
      if (!exist) {
        this.db.flashcardsDificiles.push(currentCard);
        alert("Tarjeta guardada en el Mazo de Difíciles.");
      } else {
        alert("Esta tarjeta ya estaba marcada como difícil.");
      }
    } else {
      // Eliminar de difíciles (modo fácil)
      this.db.flashcardsDificiles = this.db.flashcardsDificiles.filter(c => c.anverso !== currentCard.anverso);
      alert("Tarjeta removida de difíciles.");
      
      // Si estamos en modo difíciles, recargar mazo de inmediato
      if (this.flashcardMode === 'dificiles') {
        this.buildFlashcardDeck();
        return;
      }
    }

    // Actualizar badge e indicador
    document.getElementById('lbl-dificiles-badge').innerText = this.db.flashcardsDificiles.length;
    GithubService.saveDb(this.db);
  },

  // ================= PESTAÑA: PROGRESO =================
  updateProgressStats() {
    if (!this.db) return;

    // 1. Contar vueltas y temas estudiados
    let totalEstudiados = 0;
    const vueltasList = [];

    TEMAS_OPOSICION.forEach(tema => {
      const temaProg = this.db.temario[tema.id] || { vueltas: 0 };
      vueltasList.push(temaProg.vueltas);
      if (temaProg.vueltas > 0) {
        totalEstudiados++;
      }
    });

    // Una vuelta completa al temario es el MÍNIMO valor de estudio en todos los 45 temas.
    // Ej: si todos los temas se han estudiado al menos 1 vez, llevas 1 vuelta.
    const vueltasGlobales = Math.min(...vueltasList);

    document.getElementById('progreso-vueltas-globales').innerText = vueltasGlobales;
    document.getElementById('progreso-temas-estudiados').innerText = `${totalEstudiados} / ${TEMAS_OPOSICION.length}`;

    // 2. Calcular nota media
    const examenes = this.db.historialExamenes || [];
    let notaMedia = 0.0;
    if (examenes.length > 0) {
      const suma = examenes.reduce((acc, curr) => acc + curr.nota, 0);
      notaMedia = suma / examenes.length;
    }
    document.getElementById('progreso-nota-media').innerText = notaMedia.toFixed(1);

    // 3. Renderizar listado de vueltas por tema
    const listContainer = document.getElementById('progreso-temas-list-container');
    if (listContainer) {
      listContainer.innerHTML = '';
      
      TEMAS_OPOSICION.forEach(tema => {
        const prog = this.db.temario[tema.id] || { vueltas: 0 };
        const row = document.createElement('div');
        row.className = 'progress-tema-row';
        
        row.innerHTML = `
          <div class="progress-tema-row-title">
            <span class="progress-tema-row-number">Tema ${tema.numero}:</span> ${tema.titulo}
          </div>
          <div class="progress-tema-row-count">
            <span class="loop-badge">${prog.vueltas} estudios</span>
          </div>
        `;
        listContainer.appendChild(row);
      });
    }

    // 4. Dibujar Gráfico SVG Histórico
    this.drawProgressChart(examenes);
  },

  drawProgressChart(examenes) {
    const svg = document.getElementById('progreso-svg-chart');
    if (!svg) return;
    svg.innerHTML = '';

    // Si no hay exámenes
    if (examenes.length === 0) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", "250");
      text.setAttribute("y", "125");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "var(--text-muted)");
      text.setAttribute("font-size", "14");
      text.textContent = "Realiza tu primer test para ver la evolución de tus notas";
      svg.appendChild(text);
      return;
    }

    // Coger últimos 10 exámenes
    const ultimosEx = examenes.slice(-10);
    
    // Dimensiones del gráfico
    const width = 500;
    const height = 250;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    // 1. Dibujar líneas de cuadrícula y etiquetas del eje Y (Notas 0 a 10)
    for (let nota = 0; nota <= 10; nota += 2) {
      const y = paddingTop + chartH - (nota / 10) * chartH;
      
      // Línea de red
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", paddingLeft);
      line.setAttribute("y1", y);
      line.setAttribute("x2", width - paddingRight);
      line.setAttribute("y2", y);
      line.setAttribute("class", "chart-grid-line");
      svg.appendChild(line);

      // Texto de la nota
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", paddingLeft - 10);
      text.setAttribute("y", y + 4);
      text.setAttribute("text-anchor", "end");
      text.setAttribute("class", "chart-axis-text");
      text.textContent = nota.toString();
      svg.appendChild(text);
    }

    // Defs para el degradado bajo la curva
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.0"/>
      </linearGradient>
    `;
    svg.appendChild(defs);

    // 2. Trazar los puntos de los exámenes
    const totalPuntos = ultimosEx.length;
    const stepX = totalPuntos > 1 ? chartW / (totalPuntos - 1) : chartW;

    let pointsPath = '';
    let areaPath = '';

    const coordinates = [];

    ultimosEx.forEach((ex, idx) => {
      const x = paddingLeft + idx * stepX;
      // y proporcional a la nota de 0 a 10
      const y = paddingTop + chartH - (ex.nota / 10) * chartH;
      
      coordinates.push({ x, y, nota: ex.nota });

      if (idx === 0) {
        pointsPath = `M ${x} ${y}`;
        areaPath = `M ${x} ${paddingTop + chartH} L ${x} ${y}`;
      } else {
        pointsPath += ` L ${x} ${y}`;
      }

      if (idx === totalPuntos - 1) {
        areaPath += ` L ${x} ${y} L ${x} ${paddingTop + chartH} Z`;
      } else if (idx > 0) {
        areaPath += ` L ${x} ${y}`;
      }
    });

    // Dibujar área con degradado
    if (totalPuntos > 1) {
      const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
      area.setAttribute("d", areaPath);
      area.setAttribute("class", "chart-area");
      svg.appendChild(area);
    }

    // Dibujar línea de la curva
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pointsPath);
    path.setAttribute("class", "chart-line");
    svg.appendChild(path);

    // Dibujar los círculos y etiquetas de los puntos
    coordinates.forEach((pt, idx) => {
      // Círculo interactivo
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", pt.x);
      circle.setAttribute("cy", pt.y);
      circle.setAttribute("r", "5");
      circle.setAttribute("class", "chart-point");
      
      // Mostrar nota rápida en hover
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `Test #${idx+1} | Nota: ${pt.nota}`;
      circle.appendChild(title);
      svg.appendChild(circle);

      // Etiqueta del eje X (ej: Test 1, Test 2...)
      const textX = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textX.setAttribute("x", pt.x);
      textX.setAttribute("y", paddingTop + chartH + 18);
      textX.setAttribute("text-anchor", "middle");
      textX.setAttribute("class", "chart-axis-text");
      textX.textContent = `T${idx+1}`;
      svg.appendChild(textX);

      // Nota pequeña encima del punto
      const textVal = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textVal.setAttribute("x", pt.x);
      textVal.setAttribute("y", pt.y - 10);
      textVal.setAttribute("text-anchor", "middle");
      textVal.setAttribute("fill", "#fff");
      textVal.setAttribute("font-size", "9");
      textVal.setAttribute("font-weight", "600");
      textVal.textContent = pt.nota.toFixed(1);
      svg.appendChild(textVal);
    });
  }
};

// Autoinicialización cuando la ventana esté lista
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
