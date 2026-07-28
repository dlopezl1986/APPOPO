// Cada tema tiene un "peso" (importancia relativa) usado para repartir las preguntas
// del Test Aleatorio y de los Test por Bloque, dando más presencia a los temas que las
// academias de la oposición suelen destacar como más preguntados en el examen real.
// peso: 1 = normal, 1.5 = importante, 2 = muy importante. Todos los temas entran siempre,
// solo cambia cuántas preguntas les corresponden proporcionalmente.
const TEMAS_OPOSICION = [
  // Bloque I: Ciencias Jurídicas (1 - 26)
  { id: 1, categoria: "Jurídicas", numero: 1, titulo: "El Derecho", descripcion: "El Derecho: concepto y fuentes. La ley, la costumbre y los principios generales del derecho.", peso: 1 },
  { id: 2, categoria: "Jurídicas", numero: 2, titulo: "La Constitución Española (I)", descripcion: "La Constitución Española de 1978: estructura, características y principios rectores.", peso: 2 },
  { id: 3, categoria: "Jurídicas", numero: 3, titulo: "La Constitución Española (II)", descripcion: "Los derechos y deberes fundamentales. Las garantías constitucionales y suspensión de derechos.", peso: 2 },
  { id: 4, categoria: "Jurídicas", numero: 4, titulo: "La Unión Europea", descripcion: "Origen, instituciones y fuentes del derecho de la Unión Europea.", peso: 1 },
  { id: 5, categoria: "Jurídicas", numero: 5, titulo: "La organización y funcionamiento de la AGE", descripcion: "La organización y funcionamiento de la Administración General del Estado (AGE).", peso: 1 },
  { id: 6, categoria: "Jurídicas", numero: 6, titulo: "Los funcionarios públicos", descripcion: "El Estatuto Básico del Empleado Público. Derechos, deberes y régimen disciplinario.", peso: 1.5 },
  { id: 7, categoria: "Jurídicas", numero: 7, titulo: "El Ministerio del Interior", descripcion: "Estructura orgánica y funciones del Ministerio del Interior y la Secretaría de Estado.", peso: 1 },
  { id: 8, categoria: "Jurídicas", numero: 8, titulo: "La Dirección General de la Policía", descripcion: "Estructura, organización y funciones de la Dirección General de la Policía (DGP).", peso: 1 },
  { id: 9, categoria: "Jurídicas", numero: 9, titulo: "La Ley Orgánica 2/1986, de Fuerzas y Cuerpos de Seguridad", descripcion: "La Ley Orgánica 2/1986, de 13 de marzo. Principios básicos de actuación y competencias.", peso: 2 },
  { id: 10, categoria: "Jurídicas", numero: 10, titulo: "Entrada, libre circulación y residencia de extranjeros", descripcion: "Entrada, libre circulación y residencia de ciudadanos de la UE y de otros Estados en el EEE.", peso: 1.5 },
  { id: 11, categoria: "Jurídicas", numero: 11, titulo: "Infracciones en extranjería y su régimen sancionador", descripcion: "Infracciones en materia de extranjería, sanciones, salidas, expulsiones y devoluciones.", peso: 1.5 },
  { id: 12, categoria: "Jurídicas", numero: 12, titulo: "La protección internacional", descripcion: "El asilo, la protección subsidiaria y el estatuto de refugiado en España.", peso: 1 },
  { id: 13, categoria: "Jurídicas", numero: 13, titulo: "Seguridad privada en España", descripcion: "Disposiciones generales, personal de seguridad privada, funciones y Ley 5/2014.", peso: 1 },
  { id: 14, categoria: "Jurídicas", numero: 14, titulo: "La Ley Orgánica 4/2015, de protección de la seguridad ciudadana", descripcion: "La Ley Orgánica 4/2015, de 30 de marzo. Actuaciones de indagación y régimen sancionador.", peso: 2 },
  { id: 15, categoria: "Jurídicas", numero: 15, titulo: "Protección de infraestructuras críticas", descripcion: "Medidas y marco legal de protección de las infraestructuras críticas del Estado.", peso: 1 },
  { id: 16, categoria: "Jurídicas", numero: 16, titulo: "Derecho Penal, parte general", descripcion: "El Derecho Penal: concepto y principios. Delito, causas de exclusión, penas y medidas.", peso: 2 },
  { id: 17, categoria: "Jurídicas", numero: 17, titulo: "Derecho Penal especial", descripcion: "Homicidio, asesinato, lesiones, aborto y delitos contra la libertad e indemnidad sexual.", peso: 2 },
  { id: 18, categoria: "Jurídicas", numero: 18, titulo: "Delitos contra el patrimonio y orden socioeconómico", descripcion: "Hurtos, robos, estafas, usurpaciones, daños e infracciones de orden socioeconómico.", peso: 1.5 },
  { id: 19, categoria: "Jurídicas", numero: 19, titulo: "Delitos contra el orden público", descripcion: "Atentados, resistencia, desobediencia, desórdenes públicos y delitos de terrorismo.", peso: 2 },
  { id: 20, categoria: "Jurídicas", numero: 20, titulo: "Delitos informáticos", descripcion: "Estafas informáticas, daños informáticos, accesos no autorizados y ciberdelitos penales.", peso: 1.5 },
  { id: 21, categoria: "Jurídicas", numero: 21, titulo: "Noción de Derecho Procesal Penal", descripcion: "La jurisdicción penal, el juicio oral, las partes en el proceso, la detención y Habeas Corpus.", peso: 2 },
  { id: 22, categoria: "Jurídicas", numero: 22, titulo: "La Ley 4/2015, del estatuto de la víctima del delito", descripcion: "La Ley 4/2015, de 27 de abril. Derechos de la víctima, protección y oficinas de asistencia.", peso: 1 },
  { id: 23, categoria: "Jurídicas", numero: 23, titulo: "Políticas de igualdad, protección y no discriminación", descripcion: "Igualdad efectiva de mujeres y hombres en la AGE. Violencia de género e inclusión LGTBI.", peso: 1 },
  { id: 24, categoria: "Jurídicas", numero: 24, titulo: "Introducción a la prevención de riesgos laborales", descripcion: "Conceptos básicos de seguridad y salud en el trabajo. Riesgos y medidas preventivas.", peso: 1 },
  { id: 25, categoria: "Jurídicas", numero: 25, titulo: "Marco normativo básico en prevención de riesgos", descripcion: "La Ley 31/1995 de Prevención de Riesgos Laborales y normativa de aplicación en la DGP.", peso: 1 },
  { id: 26, categoria: "Jurídicas", numero: 26, titulo: "La protección de datos de carácter personal", descripcion: "Reglamento (UE) 2016/679 (RGPD) y Ley Orgánica 3/2018 (LOPDGDD). Principios y derechos.", peso: 1.5 },

  // Bloque II: Ciencias Sociales (27 - 35) [Se eliminan Ortografía y Gramática de este bloque]
  { id: 27, categoria: "Sociales", numero: 27, titulo: "Derechos humanos", descripcion: "Declaración Universal de Derechos Humanos y Convenio Europeo de Derechos Humanos.", peso: 1.5 },
  { id: 28, categoria: "Sociales", numero: 28, titulo: "Globalización y antiglobalización", descripcion: "Concepto de globalización, dimensiones económicas, sociales y movimientos alternativos.", peso: 1 },
  { id: 29, categoria: "Sociales", numero: 29, titulo: "Actitudes y valores sociales", descripcion: "Concepto de actitud, valores, estereotipos, prejuicios y discriminación. Ley 4/2023.", peso: 1 },
  { id: 30, categoria: "Sociales", numero: 30, titulo: "Principios éticos de la sociedad actual", descripcion: "Ética, moral, códigos deontológicos policiales y derechos de las minorías.", peso: 1.5 },
  { id: 31, categoria: "Sociales", numero: 31, titulo: "Inmigración", descripcion: "Causas, consecuencias, integración y movimientos migratorios contemporáneos.", peso: 1 },
  { id: 32, categoria: "Sociales", numero: 32, titulo: "Concepto de geografía humana", descripcion: "La población, demografía, pirámides de población, distribución espacial y urbanismo.", peso: 1 },
  { id: 33, categoria: "Sociales", numero: 33, titulo: "La seguridad", descripcion: "Concepto de seguridad ciudadana, seguridad vial, delincuencia organizada y terrorismo.", peso: 1.5 },
  { id: 34, categoria: "Sociales", numero: 34, titulo: "Drogodependencias", descripcion: "Tipos de sustancias, dependencias físicas y psíquicas, efectos y delincuencia asociada.", peso: 1 },
  { id: 35, categoria: "Sociales", numero: 35, titulo: "El desarrollo sostenible", descripcion: "Protección del medio ambiente, cumbres climáticas, Agenda 2030 y desarrollo sostenible.", peso: 1 },

  // Bloque III: Materias Técnico-Científicas (38 - 45) [Mantienen su numeración oficial]
  { id: 38, categoria: "Técnicas", numero: 38, titulo: "Fundamentos de sistemas operativos", descripcion: "Conceptos de hardware y software, arquitectura de sistemas y sistemas operativos.", peso: 1 },
  { id: 39, categoria: "Técnicas", numero: 39, titulo: "Redes informáticas", descripcion: "Concepto de red, Internet, direccionamiento IP, protocolos de comunicación y seguridad.", peso: 1.5 },
  { id: 40, categoria: "Técnicas", numero: 40, titulo: "Inteligencia", descripcion: "Concepto de inteligencia, ciclo de inteligencia, ciberinteligencia y servicios de información.", peso: 1 },
  { id: 41, categoria: "Técnicas", numero: 41, titulo: "Ciberdelincuencia y agentes de la amenaza", descripcion: "Tipos de ciberdelitos, malware, ingeniería social y perfil de los ciberdelincuentes.", peso: 1.5 },
  { id: 42, categoria: "Técnicas", numero: 42, titulo: "Origen de las armas de fuego", descripcion: "Clasificación de las armas de fuego, partes, munición y medidas de seguridad.", peso: 1.5 },
  { id: 43, categoria: "Técnicas", numero: 43, titulo: "El vehículo prioritario", descripcion: "Normas de circulación aplicables a los vehículos en servicios de urgencia.", peso: 1 },
  { id: 44, categoria: "Técnicas", numero: 44, titulo: "La seguridad en la conducción de vehículos prioritarios", descripcion: "Técnicas de conducción evasiva, defensiva y ergonomía de conducción policial.", peso: 1 },
  { id: 45, categoria: "Técnicas", numero: 45, titulo: "Prevención de riesgos laborales en seguridad vial", descripcion: "Riesgos en conducción, fatiga, ergonomía y medidas preventivas para el conductor policial.", peso: 1 }
];
