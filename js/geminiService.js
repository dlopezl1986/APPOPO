const GeminiService = {
  // Obtener API Key de localStorage
  getApiKey() {
    return localStorage.getItem('appopo_gemini_key') || atob('QVEuQWI4Uk42SU1XMjFlcHZoUldONTFPS0k5X2hxV2wyWXo2QVNZdnpXVTBfYmxubkRCWXc=');
  },

  // Guardar API Key en localStorage
  setApiKey(key) {
    localStorage.setItem('appopo_gemini_key', key.trim());
  },

  // Comprobar si la API Key está configurada
  hasApiKey() {
    return !!this.getApiKey();
  },

  // Hacer una consulta general a la API de Gemini
  async _callGemini(prompt, fileData = null) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Por favor, configura tu Gemini API Key en los ajustes.');
    }

    // Usamos gemini-2.5-flash ya que es rápido, potente y soporta entrada multimodal (PDFs, imágenes)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const parts = [];

    // Si hay un archivo adjunto
    if (fileData) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64
        }
      });
    }

    // Añadir el prompt de texto
    parts.push({
      text: prompt
    });

    const body = {
      contents: [
        {
          parts: parts
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || `Error ${response.status}: ${response.statusText}`;
      throw new Error(`Error en la API de Gemini: ${msg}`);
    }

    const result = await response.json();
    try {
      let textResponse = result.candidates[0].content.parts[0].text.trim();
      
      // Limpiar bloques de código Markdown que Gemini puede inyectar (ej. ```json ... ```)
      if (textResponse.startsWith("```")) {
        textResponse = textResponse.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
      }
      
      return JSON.parse(textResponse);
    } catch (e) {
      console.error("Error al parsear la respuesta JSON de Gemini:", e, result);
      throw new Error("La respuesta de la IA no tenía el formato JSON esperado. Vuelve a intentarlo.");
    }
  },

  // Testear si la API key es válida
  async testApiKey() {
    try {
      const res = await this._callGemini("Responde con un JSON: { 'status': 'ok' }");
      return res.status === 'ok';
    } catch (e) {
      throw e;
    }
  },

  // Generar test de 15 preguntas a partir de un archivo
  async generarTestDesdeDocumento(file, base64Content, extractedText = null) {
    const prompt = `Genera un examen tipo test de exactamente 15 preguntas de opción múltiple basadas exclusivamente en el documento o imagen adjunto.
Cada pregunta debe tener exactamente 3 opciones de respuesta (A, B, C) - que es el formato oficial de la Policía Nacional de España -, donde sólo una opción sea la correcta.
La dificultad del examen debe ser media-alta, similar a la oposición real.
El formato de respuesta DEBE SER UN OBJETO JSON estructurado exactamente así:
{
  "preguntas": [
    {
      "pregunta": "Enunciado de la pregunta...",
      "opciones": ["Opción A...", "Opción B...", "Opción C..."],
      "respuestaCorrecta": 0, // Índice de la respuesta correcta (0 para la primera opción, 1 para la segunda, 2 para la tercera)
      "explicacion": "Explicación detallada de por qué es la opción correcta citando si es posible la ley o concepto correspondiente."
    }
  ]
}`;

    if (extractedText) {
      // Si el texto ya fue extraído (ej: de un archivo Word .docx mediante Mammoth.js)
      const fullPrompt = `${prompt}\n\nAquí tienes el contenido de texto del documento para analizar:\n${extractedText}`;
      return await this._callGemini(fullPrompt);
    }

    const fileData = {
      mimeType: file.type || this._guessMimeType(file.name),
      base64: base64Content
    };

    return await this._callGemini(prompt, fileData);
  },

  // Generar test rápido de 15 preguntas de un tema del temario oficial
  async generarTestDeTema(temaNumero, temaTitulo, temaDescripcion) {
    const prompt = `Genera un examen tipo test de exactamente 15 preguntas de opción múltiple sobre el tema ${temaNumero}: "${temaTitulo}" de la oposición a la Policía Nacional de España (Escala Básica).
Descripción de la materia: ${temaDescripcion}.
Cada pregunta debe tener exactamente 3 opciones (A, B, C), de las cuales sólo una es correcta.
Las preguntas deben tratar sobre leyes reales, plazos, competencias o conceptos sociológicos/técnicos aplicables a este tema específico según la normativa vigente en España.
El formato de respuesta DEBE SER UN OBJETO JSON estructurado exactamente así:
{
  "preguntas": [
    {
      "pregunta": "Enunciado de la pregunta...",
      "opciones": ["Opción A...", "Opción B...", "Opción C..."],
      "respuestaCorrecta": 0,
      "explicacion": "Explicación detallada citando el artículo de la Constitución, Código Penal o ley correspondiente."
    }
  ]
}`;

    return await this._callGemini(prompt);
  },

  // Generar flashcards de un documento
  async generarFlashcardsDesdeDocumento(file, base64Content) {
    const prompt = `Genera una lista de exactamente 12 a 15 flashcards (tarjetas de memoria de repaso rápido) basadas en el documento o imagen adjunto.
Estas tarjetas deben cubrir los términos clave, fechas, plazos, leyes o conceptos más importantes.
El anverso de la tarjeta debe ser una pregunta directa o concepto corto. El reverso debe ser la respuesta concisa o definición del concepto.
El formato de respuesta DEBE SER UN OBJETO JSON estructurado exactamente así:
{
  "flashcards": [
    {
      "anverso": "¿Qué plazo de detención preventiva establece el art. 17.2 de la CE?",
      "reverso": "Un máximo de 72 horas, plazo en el cual el detenido debe ser puesto en libertad o a disposición judicial."
    }
  ]
}`;

    const fileData = {
      mimeType: file.type || this._guessMimeType(file.name),
      base64: base64Content
    };

    return await this._callGemini(prompt, fileData);
  },

  // Generar flashcards de un tema específico
  async generarFlashcardsDeTema(temaNumero, temaTitulo, temaDescripcion) {
    const prompt = `Genera una lista de exactamente 12 a 15 flashcards de repaso rápido para el tema ${temaNumero}: "${temaTitulo}" de la oposición a la Policía Nacional de España.
Materia: ${temaDescripcion}.
El anverso debe ser la pregunta corta (ej. plazos, artículos de leyes, definiciones clave) y el reverso la respuesta exacta y directa.
El formato de respuesta DEBE SER UN OBJETO JSON estructurado exactamente así:
{
  "flashcards": [
    {
      "anverso": "¿Pregunta corta...?",
      "reverso": "Respuesta corta y concisa..."
    }
  ]
}`;

    return await this._callGemini(prompt);
  },

  // Generar plan de estudio de 5 temas/día respetando agrupaciones y alternancia de bloques
  async generarPlanEstudioConGemini(temas) {
    const prompt = `Organiza los siguientes 43 temas de la oposición de la Policía Nacional de España en un plan de estudio diario de exactamente 9 días.
Lista de temas oficiales en formato JSON:
${JSON.stringify(temas.map(t => ({ id: t.id, numero: t.numero, titulo: t.titulo, categoria: t.categoria })))}

REGLAS QUE DEBES CUMPLIR ESTRICTAMENTE:
1. Distribuye los 43 temas en exactamente 9 días de estudio (los días 1 al 8 deben tener 5 temas cada uno, y el día 9 debe tener exactamente los 3 temas restantes. Total = 43 temas).
2. CADA TEMA DEBE ASIGNARSE EXACTAMENTE A UN SOLO DÍA. No puedes repetir ningún tema en diferentes días y no puedes omitir ningún tema. Cada ID de tema del 1 al 45 (omitiendo 36 y 37 que no existen) debe aparecer una sola vez en toda la distribución.
3. Las siguientes agrupaciones de temas DEBEN ir juntas en el mismo día obligatoriamente:
   * Temas 1, 2 y 3 (El Derecho, Constitución I y Constitución II) el mismo día.
   * Temas 5 y 6 (Administración General del Estado y Funcionarios públicos) el mismo día.
   * Temas 16 y 21 (Derecho Penal parte general y Procesal Penal) el mismo día.
   * Temas 20, 38, 39, 40 y 41 (Delitos informáticos, Sistemas operativos, Redes, Inteligencia y Ciberdelincuencia) el mismo día.
   * Temas 24, 25 y 26 (Intro PRL, Normativa PRL y Protección de Datos) el mismo día.
4. Mezcla y alterna de forma dinámica y equilibrada entre las tres categorías de temas (Jurídicas, Sociales, Técnicas) cada día, excepto el día del bloque de informática que ya suma 5 temas técnicos. Evita agrupar solo temas de derecho o solo temas de ciencias sociales en un solo día. Cruza las materias para hacerlo dinámico.
5. El formato de respuesta DEBE SER UN OBJETO JSON estructurado exactamente así:
{
  "distribucion": {
    "Dia 1": [ids de los 5 temas],
    "Dia 2": [ids de los 5 temas],
    "Dia 3": [ids de los 5 temas],
    "Dia 4": [ids de los 5 temas],
    "Dia 5": [ids de los 5 temas],
    "Dia 6": [ids de los 5 temas],
    "Dia 7": [ids de los 5 temas],
    "Dia 8": [ids de los 5 temas],
    "Dia 9": [ids de los 3 temas]
  }
}`;

    return await this._callGemini(prompt);
  },

  // Transcribir apuntes a mano o impresos a partir de una imagen
  async transcribirApuntes(base64Image, mimeType) {
    const prompt = `Por favor, transcribe de forma exacta todo el texto manuscrito o impreso que aparece en esta imagen.
Devuelve ÚNICAMENTE el texto transcrito de forma muy limpia, estructurada e inteligible, respetando los saltos de línea y párrafos originales.
No añadas introducciones, explicaciones ni saludos. Devuelve solo el texto de la imagen en formato JSON estructurado así:
{
  "transcripcion": "Texto completo transcrito aquí..."
}`;

    const fileData = {
      mimeType: mimeType,
      base64: base64Image
    };

    return await this._callGemini(prompt, fileData);
  },

  // Adivinar el tipo MIME basado en la extensión de archivo si no se suministra
  _guessMimeType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const map = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return map[ext] || 'application/octet-stream';
  }
};
