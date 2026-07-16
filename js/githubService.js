const GithubService = {
  // Obtener configuración de localStorage
  getConfig() {
    return {
      token: localStorage.getItem('appopo_github_token') || atob('Z2hwX2FoTkJqWnB1YVE1cGJHcW9oZjhOUFJ1RWREb21haDBrdFdTQQ=='),
      owner: localStorage.getItem('appopo_github_owner') || 'dlopez1986',
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

  // Probar la conexión con la API de GitHub y validar permisos de escritura
  async testConnection() {
    const config = this.getConfig();
    if (!config.token || !config.owner || !config.repo) {
      throw new Error('Faltan configurar las credenciales de GitHub.');
    }

    // 1. Validar el token
    const userUrl = 'https://api.github.com/user';
    const userResponse = await fetch(userUrl, {
      headers: this._getHeaders(config.token)
    });

    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        throw new Error('El Token de GitHub no es válido, tiene un error tipográfico o ha expirado.');
      } else {
        throw new Error(`Error de conexión al validar usuario en GitHub (${userResponse.status})`);
      }
    }

    // Comprobar si el token tiene el permiso 'repo' (para tokens clásicos)
    const scopes = userResponse.headers.get('X-OAuth-Scopes');
    if (scopes !== null && scopes !== undefined) {
      const scopesStr = scopes.trim();
      if (scopesStr !== '') {
        const scopeList = scopesStr.split(',').map(s => s.trim());
        if (!scopeList.includes('repo')) {
          throw new Error('El token de GitHub NO tiene permisos de escritura. Debes volver a generarlo en GitHub y asegurarte de marcar la casilla "repo" (Permisos sobre repositorios).');
        }
      }
    }

    // 2. Validar acceso al repositorio específico y comprobar permisos de escritura (push)
    const repoUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
    const repoResponse = await fetch(repoUrl, {
      headers: this._getHeaders(config.token)
    });

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        throw new Error(`No se encontró el repositorio "${config.owner}/${config.repo}". Verifica si el nombre está bien escrito o si tu cuenta de GitHub tiene acceso al mismo.`);
      } else {
        throw new Error(`Error al acceder al repositorio en GitHub (${repoResponse.status})`);
      }
    }

    const repoData = await repoResponse.json();
    if (repoData.permissions && !repoData.permissions.push) {
      throw new Error(`Tu token no tiene permisos de escritura (push) en el repositorio "${config.owner}/${config.repo}".`);
    }

    return true;
  },

  // Obtener un archivo del repositorio (ej. db.json)
  async fetchFile(path, requireContent = true) {
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
    let content = '';
    
    // Determinar si es un archivo de texto por su extensión
    const isTextFile = path.endsWith('.json') || path.endsWith('.txt') || path.endsWith('.md');
    
    if (data.content !== undefined) {
      if (requireContent) {
        if (isTextFile) {
          try {
            // Decodificar Base64 (soportando caracteres especiales/UTF-8 para archivos de texto como db.json)
            const rawContent = atob(data.content.replace(/\s/g, ''));
            content = decodeURIComponent(escape(rawContent));
          } catch (e) {
            content = data.content;
          }
        } else {
          // Para archivos binarios (PDFs, imágenes, etc.), devolver el base64 original directamente sin espacios ni saltos de línea
          content = data.content.replace(/\s/g, '');
        }
      }
    } else if (requireContent) {
      // Archivo de más de 1MB (el API de contenidos omite el campo 'content' por tamaño).
      // Lo descargamos crudo desde el propio endpoint de contenidos de la API de GitHub usando el header
      // 'Accept: application/vnd.github.v3.raw'. Al ser en api.github.com, soporta CORS perfectamente.
      const rawHeaders = {
        ...this._getHeaders(config.token),
        'Accept': 'application/vnd.github.v3.raw'
      };
      const rawRes = await fetch(url, {
        headers: rawHeaders
      });
      if (rawRes.ok) {
        if (isTextFile) {
          content = await rawRes.text();
        } else {
          // Si es binario (PDF, imagen, etc.), lo convertimos a Base64 crudo
          const blob = await rawRes.blob();
          content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result) {
                resolve(reader.result.split(',')[1].replace(/\s/g, ''));
              } else {
                reject(new Error("Error al leer el archivo descargado como Data URL."));
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } else {
        throw new Error(`Error al descargar el archivo grande en crudo desde la API de GitHub (${rawRes.status})`);
      }
    }
    
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
      const currentFile = await this.fetchFile('db.json', false);
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
          // Obtener base64 de forma ultra rápida y nativa del navegador
          const base64Content = reader.result.split(',')[1].replace(/\s/g, '');

          // Ruta limpia en el repo
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const repoPath = `${section}/${id}/${sanitizedFileName}`;

          // Verificamos si ya existe el archivo para obtener su sha en caso de sobreescritura
          let sha = null;
          const currentFile = await this.fetchFile(repoPath, false);
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
            type: file.type || this._guessMimeType(file.name),
            uploadedAt: new Date().toISOString(),
            url: `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${repoPath}`
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo en el navegador.'));
      reader.readAsDataURL(file);
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
