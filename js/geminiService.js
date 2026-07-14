const GeminiService = {
  // Obtener API Key de localStorage
  getApiKey() {
    return localStorage.getItem('appopo_gemini_key') || '';
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
      const textResponse = result.candidates[0].content.parts[0].text;
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
  async generarTestDesdeDocumento(file, base64Content) {
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
    const prompt = `Organiza los siguientes temas de la oposición de la Policía Nacional de España en un plan de estudio diario de máximo 5 temas por día.
Lista de temas oficiales en formato JSON:
${JSON.stringify(temas.map(t => ({ id: t.id, numero: t.numero, titulo: t.titulo, categoria: t.categoria })))}

DEBES CUMPLIR ESTRICTAMENTE CON ESTAS REGLAS DE AGRUPACIÓN Y DISTRIBUCIÓN:
1. Las siguientes agrupaciones de temas DEBEN estudiarse juntas el mismo día (es decir, en el mismo grupo de día):
   * Los temas 1, 2 y 3 deben ir juntos el mismo día.
   * Los temas 5 y 6 deben ir juntos el mismo día.
   * Los temas 16 y 21 deben ir juntos el mismo día.
   * Los temas 20, 38, 39, 40 y 41 deben ir juntos el mismo día.
   * Los temas 24, 25 y 26 deben ir juntos el mismo día.
2. Alterna entre los tres bloques de temas (Jurídicas, Sociales y Técnicas) a lo largo de los días para que el estudio sea dinámico y no sea monótono estudiar siempre el mismo bloque.
3. El plan debe organizarse en 9 días (los primeros 8 días de 5 temas y el último día de 3 temas, totalizando los 43 temas).
4. El formato de respuesta DEBE SER UN OBJETO JSON estructurado exactamente así (devolviendo solo la correspondencia de días con los arreglos de IDs de temas):
{
  "distribucion": {
    "Dia 1": [1, 2, 3, 27, 42],
    "Dia 2": [5, 6, 28, 43, 4],
    "Dia 3": [16, 21, 29, 44, 7],
    "Dia 4": [20, 38, 39, 40, 41],
    "Dia 5": [24, 25, 26, 30, 45],
    "Dia 6": [8, 9, 10, 11, 31],
    "Dia 7": [12, 13, 14, 15, 32],
    "Dia 8": [17, 18, 19, 22, 33],
    "Dia 9": [23, 34, 35]
  }
}`;

    return await this._callGemini(prompt);
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
