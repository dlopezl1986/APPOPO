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

  // Construir el fragmento de prompt que pide a Gemini variar el contenido y no repetir
  // lo ya generado antes para ese mismo tema (evita que salga siempre lo mismo).
  _buildVarietyPrompt(existentes = [], label) {
    if (!existentes || existentes.length === 0) return '';
    // Limitamos la lista para no disparar el tamaño del prompt si ya hay muchas acumuladas
    const lista = existentes.slice(-40).map(t => `- ${t}`).join('\n');
    return `\n\nIMPORTANTE: Ya se han generado antes ${label} sobre este mismo tema. NO los repitas ni generes variaciones casi idénticas de ellos; céntrate en aspectos, artículos o matices distintos que aún no se hayan cubierto:\n${lista}`;
  },

  // Hacer una consulta general a la API de Gemini.
  // fileData admite tanto un único objeto { mimeType, base64 } como un array de varios (multi-documento).
  // options.temperature permite aumentar la variedad de las respuestas (por defecto usa la del modelo).
  async _callGemini(prompt, fileData = null, options = {}) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Por favor, configura tu Gemini API Key en los ajustes.');
    }

    // Usamos gemini-2.5-flash ya que es rápido, potente y soporta entrada multimodal (PDFs, imágenes)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const parts = [];

    // Si hay uno o varios archivos adjuntos
    const fileDataList = Array.isArray(fileData) ? fileData : (fileData ? [fileData] : []);
    fileDataList.forEach(fd => {
      if (fd && fd.mimeType && fd.base64) {
        parts.push({
          inlineData: {
            mimeType: fd.mimeType,
            data: fd.base64
          }
        });
      }
    });

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
        responseMimeType: "application/json",
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {})
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

  // Extraer preguntas ya existentes (no generar nuevas) de un examen subido en PDF/Word/imagen
  async extraerPreguntasDeDocumento(fileDataList = [], extractedTextCombined = null, temasOficiales = []) {
    const temarioResumen = temasOficiales.map(t => `${t.id}: Tema ${t.numero} - ${t.titulo} (Bloque ${t.categoria})`).join('\n');

    let prompt = `Analiza en detalle el/los documento(s) adjuntos, que contienen un examen o listado de preguntas tipo test ya elaborado para la oposición a la Policía Nacional de España.
Extrae TODAS las preguntas de opción múltiple que encuentres, transcribiendo el enunciado EXACTAMENTE tal y como aparece en el documento. No inventes preguntas nuevas ni cambies su redacción.
Los exámenes oficiales de la Policía Nacional tienen SIEMPRE exactamente 3 opciones de respuesta (A, B, C). Cada pregunta que extraigas debe tener exactamente esas 3 opciones:
- Si el documento ya presenta 3 opciones, transcríbelas tal cual.
- Si por algún error de formato del documento aparecieran más de 3, quédate solo con las 3 que tengan sentido como respuestas reales de esa pregunta y descarta el resto.
Para cada pregunta:
- Si el documento incluye una plantilla o clave de respuestas correctas, úsala para marcar con total fiabilidad cuál opción es la correcta, y pon "revisar": false.
- Si el documento NO indica la respuesta correcta, determínala tú mismo aplicando tu propio conocimiento de la materia, y pon "revisar": true para avisar de que conviene revisarla manualmente.
Incluye siempre una breve explicación de por qué esa opción es la correcta.${temarioResumen ? `
Además, clasifica cada pregunta según el tema oficial del temario al que pertenece por su contenido. Usa el ID numérico EXACTO de esta lista en el campo "temaId" (si el contenido no encaja claramente en ninguno, pon "temaId": null):
${temarioResumen}` : ''}
El formato de respuesta DEBE SER UN OBJETO JSON estructurado exactamente así:
{
  "preguntas": [
    {
      "pregunta": "Enunciado exacto de la pregunta...",
      "opciones": ["Opción 1...", "Opción 2...", "Opción 3..."],
      "respuestaCorrecta": 0,
      "explicacion": "...",
      "revisar": false,
      "temaId": 9
    }
  ]
}
Si el documento no contiene ninguna pregunta de examen reconocible, devuelve "preguntas": [].`;

    if (extractedTextCombined) {
      prompt += `\n\nContenido adicional en texto (extraído de documentos Word adjuntos):\n${extractedTextCombined}`;
    }

    // Temperatura baja: aquí queremos fidelidad al documento original, no variedad creativa.
    return await this._callGemini(prompt, fileDataList, { temperature: 0.2 });
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

  // Generar test de 15 preguntas a partir de uno o varios documentos de un tema personalizado
  async generarTestDesdeDocumentosTema(nombreTema, fileDataList = [], extractedTextCombined = null, preguntasExistentes = []) {
    let prompt = `Genera un examen tipo test de exactamente 15 preguntas de opción múltiple basadas EXCLUSIVAMENTE en el/los documento(s) adjuntos, que tratan sobre "${nombreTema}".
Cada pregunta debe tener exactamente 3 opciones de respuesta (A, B, C) - que es el formato oficial de la Policía Nacional de España -, donde sólo una opción sea la correcta.
La dificultad del examen debe ser media-alta, similar a la oposición real.
El formato de respuesta DEBE SER UN OBJETO JSON estructurado exactamente así:
{
  "preguntas": [
    {
      "pregunta": "Enunciado de la pregunta...",
      "opciones": ["Opción A...", "Opción B...", "Opción C..."],
      "respuestaCorrecta": 0,
      "explicacion": "Explicación detallada de por qué es la opción correcta."
    }
  ]
}`;

    if (extractedTextCombined) {
      prompt += `\n\nContenido adicional en texto (extraído de documentos Word adjuntos):\n${extractedTextCombined}`;
    }

    prompt += this._buildVarietyPrompt(preguntasExistentes.map(p => p.pregunta || p), 'estas preguntas');

    return await this._callGemini(prompt, fileDataList, { temperature: 1.1 });
  },

  // Generar test rápido de 15 preguntas de un tema del temario oficial
  async generarTestDeTema(temaNumero, temaTitulo, temaDescripcion, preguntasExistentes = []) {
    let prompt = `Genera un examen tipo test de exactamente 15 preguntas de opción múltiple sobre el tema ${temaNumero}: "${temaTitulo}" de la oposición a la Policía Nacional de España (Escala Básica).
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

    prompt += this._buildVarietyPrompt(preguntasExistentes.map(p => p.pregunta || p), 'estas preguntas');

    return await this._callGemini(prompt, null, { temperature: 1.1 });
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

  // Generar flashcards a partir de uno o varios documentos de un tema personalizado
  async generarFlashcardsDesdeDocumentosTema(nombreTema, fileDataList = [], extractedTextCombined = null, anversosExistentes = []) {
    let prompt = `Genera una lista de exactamente 12 a 15 flashcards (tarjetas de memoria de repaso rápido) basadas EXCLUSIVAMENTE en el/los documento(s) adjuntos, que tratan sobre "${nombreTema}".
Estas tarjetas deben cubrir los términos clave, fechas, plazos, leyes o conceptos más importantes.
El anverso de la tarjeta debe ser una pregunta directa o concepto corto. El reverso debe ser la respuesta concisa o definición del concepto.
El formato de respuesta DEBE SER UN OBJETO JSON estructurado exactamente así:
{
  "flashcards": [
    {
      "anverso": "Pregunta o concepto corto...",
      "reverso": "Respuesta concisa..."
    }
  ]
}`;

    if (extractedTextCombined) {
      prompt += `\n\nContenido adicional en texto (extraído de documentos Word adjuntos):\n${extractedTextCombined}`;
    }

    prompt += this._buildVarietyPrompt(anversosExistentes, 'estas flashcards');

    return await this._callGemini(prompt, fileDataList, { temperature: 1.1 });
  },

  // Generar flashcards de un tema específico
  async generarFlashcardsDeTema(temaNumero, temaTitulo, temaDescripcion, anversosExistentes = []) {
    let prompt = `Genera una lista de exactamente 12 a 15 flashcards de repaso rápido para el tema ${temaNumero}: "${temaTitulo}" de la oposición a la Policía Nacional de España.
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

    prompt += this._buildVarietyPrompt(anversosExistentes, 'estas flashcards');

    return await this._callGemini(prompt, null, { temperature: 1.1 });
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
