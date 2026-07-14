const GithubService = {
  // Obtener configuración de localStorage
  getConfig() {
    return {
      token: localStorage.getItem('appopo_github_token') || '',
      owner: localStorage.getItem('appopo_github_owner') || 'dlopezl21',
      repo: localStorage.getItem('appopo_github_repo') || 'APPOPO',
      branch: localStorage.getItem('appopo_github_branch') || 'main'
    };
  },

  // Guardar configuración en localStorage
  setConfig(token, owner, repo, branch) {
    localStorage.setItem('appopo_github_token', token.trim());
    localStorage.setItem('appopo_github_owner', owner.trim());
    localStorage.setItem('appopo_github_repo', repo.trim());
    localStorage.setItem('appopo_github_branch', branch.trim());
  },

  // Comprobar si las credenciales están configuradas
  hasCredentials() {
    const config = this.getConfig();
    return config.token && config.owner && config.repo;
  },

  // Encabezados para la API de GitHub
  _getHeaders(token) {
    return {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  },

  // Probar la conexión con la API de GitHub
  async testConnection() {
    const config = this.getConfig();
    if (!config.token || !config.owner || !config.repo) {
      throw new Error('Faltan configurar las credenciales de GitHub.');
    }
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}`;
    const response = await fetch(url, {
      headers: this._getHeaders(config.token)
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Repositorio no encontrado. Verifica el usuario y el nombre del repositorio.');
      } else if (response.status === 401) {
        throw new Error('Token de GitHub no válido o expirado.');
      } else {
        throw new Error(`Error de conexión con GitHub (${response.status})`);
      }
    }
    return true;
  },

  // Obtener un archivo del repositorio (ej. db.json)
  async fetchFile(path) {
    const config = this.getConfig();
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}&t=${Date.now()}`;
    const response = await fetch(url, {
      headers: this._getHeaders(config.token)
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Error al leer archivo ${path} de GitHub (${response.status})`);
    }

    const data = await response.json();
    // Decodificar Base64 (soportando caracteres especiales/UTF-8)
    const rawContent = atob(data.content.replace(/\s/g, ''));
    const content = decodeURIComponent(escape(rawContent));
    
    return {
      content: content,
      sha: data.sha
    };
  },

  // Subir o actualizar un archivo en el repositorio
  async commitFile(path, contentBase64, sha = null, message = 'Sync APPOPO') {
    const config = this.getConfig();
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
    
    const body = {
      message: message,
      content: contentBase64,
      branch: config.branch
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: this._getHeaders(config.token),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(`Error al escribir archivo en GitHub: ${errData.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content.sha;
  },

  // Cargar la base de datos (db.json)
  async loadDb() {
    if (!this.hasCredentials()) {
      return this._getDefaultDb();
    }
    
    try {
      const fileData = await this.fetchFile('db.json');
      if (!fileData) {
        // Si no existe, devolvemos base de datos por defecto
        return this._getDefaultDb();
      }
      const db = JSON.parse(fileData.content);
      // Almacenamos el SHA de db.json para futuras actualizaciones
      localStorage.setItem('appopo_db_sha', fileData.sha);
      return db;
    } catch (e) {
      console.error("Error al cargar db.json desde GitHub, usando local:", e);
      // Intentar cargar del localStorage local como fallback
      const localFallback = localStorage.getItem('appopo_local_db');
      if (localFallback) {
        return JSON.parse(localFallback);
      }
      return this._getDefaultDb();
    }
  },

  // Guardar la base de datos (db.json)
  async saveDb(db) {
    db.ultimoSync = new Date().toISOString();
    // Guardar en local primero
    localStorage.setItem('appopo_local_db', JSON.stringify(db));

    if (!this.hasCredentials()) {
      console.warn("No hay credenciales de GitHub configuradas. Guardado solo en local.");
      return false;
    }

    try {
      // 1. Obtener el sha actual del archivo db.json en GitHub para evitar conflictos
      let sha = localStorage.getItem('appopo_db_sha');
      const currentFile = await this.fetchFile('db.json');
      if (currentFile) {
        sha = currentFile.sha;
      }

      // 2. Codificar a Base64 soportando UTF-8
      const jsonStr = JSON.stringify(db, null, 2);
      const utf8Bytes = unescape(encodeURIComponent(jsonStr));
      const base64Content = btoa(utf8Bytes);

      // 3. Subir archivo
      const newSha = await this.commitFile('db.json', base64Content, sha, 'Actualización de progreso APPOPO');
      localStorage.setItem('appopo_db_sha', newSha);
      return true;
    } catch (e) {
      console.error("Error al guardar db.json en GitHub:", e);
      throw e;
    }
  },

  // Subir un documento (temario o calendario)
  async uploadDocument(section, id, file, onProgress = () => {}) {
    const config = this.getConfig();
    if (!this.hasCredentials()) {
      throw new Error('Configura la conexión con GitHub para poder subir archivos.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result;
          // Convertir ArrayBuffer a Base64
          let binary = '';
          const bytes = new Uint8Array(arrayBuffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Content = btoa(binary);

          // Ruta limpia en el repo: ej. temario/tema_5/ejercicio.pdf o calendario/2026-07-13/nota.png
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const repoPath = `${section}/${id}/${sanitizedFileName}`;

          // Verificamos si ya existe el archivo para obtener su sha en caso de sobreescritura
          let sha = null;
          const currentFile = await this.fetchFile(repoPath);
          if (currentFile) {
            sha = currentFile.sha;
          }

          const message = `Subida de documento: ${file.name} en ${section}/${id}`;
          await this.commitFile(repoPath, base64Content, sha, message);

          // Retornamos los datos del archivo subido
          resolve({
            name: file.name,
            path: repoPath,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
            url: `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${repoPath}`
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo en el navegador.'));
      reader.readAsArrayBuffer(file);
    });
  },

  // Eliminar un archivo del repositorio
  async deleteFile(path, sha) {
    const config = this.getConfig();
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
    
    const body = {
      message: `Eliminar documento: ${path}`,
      sha: sha,
      branch: config.branch
    };

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this._getHeaders(config.token),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Error al eliminar archivo en GitHub (${response.status})`);
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
      ultimoSync: null
    };
  }
};
