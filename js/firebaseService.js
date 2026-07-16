const FirebaseService = {
  _app: null,
  _auth: null,
  _db: null,
  _storage: null,

  // Configuración pública del proyecto Firebase (no son valores secretos: están
  // pensados para ir en el código del cliente y se protegen con las reglas de
  // seguridad de Firestore/Storage, no ocultándolos).
  _config: {
    apiKey: "AIzaSyDWbMHLMRtyNfjhKaYmMKxCJcfxHxA7kO8",
    authDomain: "appopo-71904.firebaseapp.com",
    projectId: "appopo-71904",
    storageBucket: "appopo-71904.firebasestorage.app",
    messagingSenderId: "578448221230",
    appId: "1:578448221230:web:7aadaf1f0c8a9424f0ebbf",
    measurementId: "G-LF1HF2ZJB0"
  },

  // Inicializar la app de Firebase (idempotente)
  init() {
    if (this._app) return;
    this._app = firebase.initializeApp(this._config);
    this._auth = firebase.auth();
    this._db = firebase.firestore();
    this._storage = firebase.storage();
    // Mantener la sesión iniciada aunque se cierre el navegador
    this._auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
  },

  // Suscribirse a los cambios de sesión (login / logout). Devuelve función para cancelar la suscripción.
  onAuthChange(callback) {
    this.init();
    return this._auth.onAuthStateChanged(callback);
  },

  // Esperar a que Firebase determine si hay una sesión activa (se resuelve una sola vez)
  waitForAuthReady() {
    this.init();
    return new Promise((resolve) => {
      const unsubscribe = this._auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    });
  },

  // Comprobar si hay una sesión de Firebase iniciada
  hasCredentials() {
    return !!(this._auth && this._auth.currentUser);
  },

  getCurrentUserEmail() {
    return (this._auth && this._auth.currentUser) ? this._auth.currentUser.email : '';
  },

  async register(email, password) {
    this.init();
    const cred = await this._auth.createUserWithEmailAndPassword(email.trim(), password);
    return cred.user;
  },

  async login(email, password) {
    this.init();
    const cred = await this._auth.signInWithEmailAndPassword(email.trim(), password);
    return cred.user;
  },

  async logout() {
    this.init();
    await this._auth.signOut();
  },

  async resetPassword(email) {
    this.init();
    await this._auth.sendPasswordResetEmail(email.trim());
  },

  _uid() {
    if (!this._auth.currentUser) {
      throw new Error('Debes iniciar sesión para sincronizar tus datos.');
    }
    return this._auth.currentUser.uid;
  },

  // Cargar la base de datos (equivalente a db.json en Firestore)
  async loadDb() {
    this.init();
    if (!this.hasCredentials()) {
      return this._getDefaultDb();
    }

    try {
      const snap = await this._db.collection('appopo').doc(this._uid()).get();
      if (!snap.exists || !snap.data().json) {
        return this._getDefaultDb();
      }
      return JSON.parse(snap.data().json);
    } catch (e) {
      console.error("Error al cargar la base de datos desde Firebase, usando local:", e);
      const localFallback = localStorage.getItem('appopo_local_db');
      if (localFallback) {
        return JSON.parse(localFallback);
      }
      return this._getDefaultDb();
    }
  },

  // Guardar la base de datos
  async saveDb(db) {
    this.init();
    db.ultimoSync = new Date().toISOString();
    // Guardar en local primero
    localStorage.setItem('appopo_local_db', JSON.stringify(db));

    if (!this.hasCredentials()) {
      console.warn("No has iniciado sesión en Firebase. Guardado solo en local.");
      return false;
    }

    try {
      await this._db.collection('appopo').doc(this._uid()).set({
        json: JSON.stringify(db),
        actualizado: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (e) {
      console.error("Error al guardar en Firebase:", e);
      throw e;
    }
  },

  // Subir un documento (temario, calendario, test) a Firebase Storage
  async uploadDocument(section, id, file, onProgress = () => {}) {
    this.init();
    if (!this.hasCredentials()) {
      throw new Error('Inicia sesión para poder subir archivos.');
    }

    const uid = this._uid();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `documentos/${uid}/${section}/${id}/${Date.now()}_${sanitizedFileName}`;
    const ref = this._storage.ref(storagePath);
    const contentType = file.type || this._guessMimeType(file.name);

    return new Promise((resolve, reject) => {
      const task = ref.put(file, { contentType });
      task.on('state_changed', (snapshot) => {
        const progress = snapshot.totalBytes ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 : 0;
        onProgress(progress);
      }, reject, async () => {
        try {
          const url = await task.snapshot.ref.getDownloadURL();
          resolve({
            name: file.name,
            path: storagePath,
            size: file.size,
            type: contentType,
            uploadedAt: new Date().toISOString(),
            url: url
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  },

  // Obtener un archivo de Storage. Con requireContent=false solo comprueba que existe
  // (usado antes de borrar). Con requireContent=true descarga y devuelve el contenido en Base64.
  async fetchFile(path, requireContent = true) {
    this.init();
    if (!this.hasCredentials()) return null;

    const ref = this._storage.ref(path);
    try {
      if (!requireContent) {
        await ref.getMetadata();
        return { sha: path };
      }

      const url = await ref.getDownloadURL();
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error al descargar el archivo desde Firebase Storage (${response.status})`);
      }
      const blob = await response.blob();
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1].replace(/\s/g, ''));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      return { content, sha: path };
    } catch (e) {
      if (e && e.code === 'storage/object-not-found') return null;
      throw e;
    }
  },

  // Eliminar un archivo de Storage (el segundo parámetro se ignora, se mantiene por compatibilidad)
  async deleteFile(path) {
    this.init();
    if (!path) return true;
    try {
      await this._storage.ref(path).delete();
    } catch (e) {
      if (!e || e.code !== 'storage/object-not-found') {
        throw new Error(`Error al eliminar archivo en Firebase Storage: ${e.message || e}`);
      }
    }
    return true;
  },

  // Base de datos por defecto de APPOPO
  _getDefaultDb() {
    return {
      temario: {}, // temaId -> { vueltas: 0, archivos: [] }
      calendario: {}, // YYYY-MM-DD -> { notas: "", archivos: [], temasEstudiados: [] }
      planEstudio: null, // { fechaInicio, distribucion: { YYYY-MM-DD: [temaId, temaId...] } }
      preguntasFalladas: [], // array de { id, temaId, temaTitulo, pregunta, opciones, respuestaCorrecta, explicacion, fallasCount }
      flashcardsDificiles: [], // array de { id, temaId, anverso, reverso, fallasCount }
      documentosTest: [], // array de documentos guardados para generar tests
      preguntasGeneradas: [], // pool general de preguntas generadas por Gemini
      preguntasImpugnadas: [], // array de preguntas reportadas con errores
      ultimoSync: null
    };
  },

  // Estimar tipo MIME del archivo por extensión
  _guessMimeType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const map = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'txt': 'text/plain',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return map[ext] || 'application/octet-stream';
  }
};
