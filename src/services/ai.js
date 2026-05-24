/**
 * AI Coach integration service using Gemini API
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Unified caller that routes to Gemini or Groq depending on the API key format
 */
async function callAI(apiKey, prompt) {
  if (apiKey.startsWith('gsk_')) {
    return callGroq(apiKey, prompt);
  }
  return callGemini(apiKey, prompt);
}

/**
 * Call Gemini API using native fetch
 */
async function callGemini(apiKey, prompt) {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error en la petición de Gemini');
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No se recibió respuesta del Coach.';
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

/**
 * Call Groq API using native fetch (OpenAI compatible)
 */
async function callGroq(apiKey, prompt) {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error en la petición de Groq');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No se recibió respuesta del Coach (Groq).';
  } catch (error) {
    console.error('Groq API Error:', error);
    throw error;
  }
}

/**
 * Fallback AI Coach (Rule-Based engine when API Key is missing)
 */
const getLocalFeedback = {
  audit: (routines) => {
    if (!routines || routines.length === 0) {
      return `### ⚠️ No hay rutinas que auditar
Crea una rutina en el panel de **"Mis Rutinas"** para que el AI Coach pueda auditar la distribución de tus ejercicios.`;
    }

    // Count categories
    const categoryCount = {};
    routines.forEach(r => {
      if (r.exercises) {
        r.exercises.forEach(ex => {
          categoryCount[ex.category] = (categoryCount[ex.category] || 0) + 1;
        });
      }
    });

    const chestCount = categoryCount['Pecho'] || 0;
    const backCount = categoryCount['Espalda'] || 0;
    const legCount = (categoryCount['Cuádriceps'] || 0) + (categoryCount['Femorales'] || 0) + (categoryCount['Pantorrillas'] || 0);
    const shoulderCount = categoryCount['Hombro'] || 0;
    
    let analysis = '### 🏋️ Análisis del AI Coach (Motor Local)\n\n';
    analysis += 'Hemos analizado la distribución de tus ejercicios en tus rutinas actuales:\n\n';
    
    for (const [cat, count] of Object.entries(categoryCount)) {
      analysis += `- **${cat}**: ${count} ejercicio(s)\n`;
    }
    
    analysis += '\n### 🔍 Diagnóstico de Balance:\n';
    
    if (chestCount > backCount + 2) {
      analysis += `⚠️ **Desbalance Pecho/Espalda**: Tienes bastantes más ejercicios de empuje horizontal (${chestCount} de Pecho) que de tracción (${backCount} de Espalda). Se recomienda equiparar para proteger tus hombros y mejorar tu postura.\n\n`;
    } else if (backCount > chestCount + 2) {
      analysis += `💡 **Buen enfoque dorsal**: Excelente trabajo enfocándote en la espalda traccionando. Asegúrate de añadir algo de empuje para balancear.\n\n`;
    } else {
      analysis += `✅ **Buen Balance Torso**: La distribución entre pecho y espalda se ve equilibrada y segura.\n\n`;
    }

    if (legCount === 0) {
      analysis += `🚨 **Día de Piernas Requerido**: No tienes ejercicios registrados para las piernas (Cuádriceps, Femorales o Pantorrillas). El entrenamiento de tren inferior es clave para la simetría y el estímulo hormonal.\n\n`;
    } else if (legCount < 3) {
      analysis += `💡 **Estímulo Tren Inferior**: Tienes ejercicios de pierna, pero podrías aumentar el volumen de femorales/gemelos para evitar desbalances.\n\n`;
    } else {
      analysis += `✅ **Fuerte base**: Excelente volumen de entrenamiento de tren inferior.\n\n`;
    }

    analysis += `\n*Nota: Conecta tu **Gemini API Key** en la sección Perfil para obtener auditorías detalladas e hiper-personalizadas por IA.*`;
    return analysis;
  },

  optimize: (history) => {
    if (!history || history.length === 0) {
      return `### 📈 Falta Historial de Entrenamientos
Comienza a entrenar y a registrar tus series de peso levantadas. Cuando tengas logs en el historial, analizaremos la progresión de tus cargas.`;
    }

    // Find exercises
    const grouped = {};
    history.forEach(log => {
      if (!grouped[log.name]) grouped[log.name] = [];
      grouped[log.name].push(log);
    });

    let feedback = '### ⚡ Optimización de Cargas (Motor de Progresión Local)\n\n';
    feedback += 'Basándonos en tu historial reciente, aquí tienes las sugerencias para tus próximos entrenamientos:\n\n';

    let needsProgress = false;
    for (const [exName, logs] of Object.entries(grouped)) {
      if (logs.length >= 2) {
        needsProgress = true;
        // sort by date
        const sorted = [...logs].sort((a,b) => new Date(a.date) - new Date(b.date));
        const first = sorted[0];
        const latest = sorted[sorted.length - 1];
        
        if (latest.weight > first.weight) {
          feedback += `- **${exName}**: 🚀 ¡Excelente progresión! Has subido de ${first.weight}kg a ${latest.weight}kg. **Mantén esta carga** en la próxima sesión buscando dominar la técnica y llegar a las repeticiones objetivo antes de volver a subir.\n`;
        } else if (latest.weight === first.weight && latest.reps > first.reps) {
          feedback += `- **${exName}**: 💪 Incrementaste las repeticiones de ${first.reps} a ${latest.reps} con ${latest.weight}kg. **Sugerencia**: Es hora de subir la carga levemente (de 1.25kg a 2.5kg por lado) en la primera serie de la próxima sesión.\n`;
        } else {
          feedback += `- **${exName}**: ⚖️ Has entrenado con la misma carga de ${latest.weight}kg. Si completas todas tus series estimadas en tu rango de repeticiones objetivo, **intenta incrementar un 2.5% el peso** para forzar la sobrecarga progresiva.\n`;
        }
      }
    }

    if (!needsProgress) {
      feedback += `Analizando cargas... Registra al menos 2 sesiones de un mismo ejercicio para poder estimar el ritmo de sobrecarga progresiva.`;
    }

    feedback += `\n\n*Nota: Conecta tu **Gemini API Key** en la sección Perfil para obtener auditorías detalladas e hiper-personalizadas por IA.*`;
    return feedback;
  },

  generate: (goal, daysCount) => {
    let routineText = `### 📋 Rutina Sugerida: Objetivo ${goal} (${daysCount} días a la semana)\n\n`;
    
    if (daysCount === '3') {
      routineText += `#### Split Full-Body (Cuerpo Completo) - Recomendado para principiantes o media frecuencia
- **Día 1**: Torso/Pierna Enf. Fuerza (Sentadillas, Press Banca, Remo con Barra, Elevaciones Laterales)
- **Día 2**: Core/Brazos (Dominadas, Fondos, Peso Muerto Rumano, Crunch Abdominal)
- **Día 3**: Torso/Pierna Enf. Hipertrofia (Sentadilla Búlgara, Press Inclinado Mancuernas, Jalón Polea, Curl Bíceps)`;
    } else if (daysCount === '4') {
      routineText += `#### Split Torso/Pierna (Frecuencia 2) - Excelente balance de volumen y recuperación
- **Día 1 (Lunes)**: Torso A (Press Banca, Remo con Barra, Press Militar, Jalón al Pecho)
- **Día 2 (Martes)**: Pierna A (Sentadillas, Peso Muerto Rumano, Extensiones, Gemelos)
- **Día 3 (Jueves)**: Torso B (Press Inclinado Mancuernas, Dominadas, Fondos en Paralelas, Curl Martillo)
- **Día 4 (Viernes)**: Pierna B (Prensa, Curl Femoral, Zancadas, Abdominales)`;
    } else {
      routineText += `#### Split Empuje/Tirón/Pierna (Frecuencia Variable)
- **Día de Empuje (Push)**: Pecho, Hombro Frontal/Lateral y Tríceps (Press Banca, Press Militar, Fondos, Elevaciones)
- **Día de Tirón (Pull)**: Espalda, Deltoides Posterior y Bíceps (Remo, Dominadas, Pájaros, Curl Barra)
- **Día de Pierna (Legs)**: Cuádriceps, Femorales, Pantorrillas (Sentadilla, Peso Muerto Rumano, Gemelos)`;
    }

    routineText += `\n\n*Nota: Conecta tu **Gemini API Key** en la sección Perfil para recibir plantillas e instrucciones de series exactas por IA.*`;
    return routineText;
  }
};

const DEFAULT_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

/**
 * Public Service Actions
 */
export const aiService = {
  // 1. Audit routines balance
  auditRoutines: async (apiKey, routines) => {
    const activeKey = apiKey || DEFAULT_API_KEY;
    if (!activeKey) {
      return getLocalFeedback.audit(routines);
    }
    
    const formattedRoutines = routines.map(r => ({
      name: r.name,
      exercises: r.exercises?.map(ex => ({ name: ex.name, category: ex.category }))
    }));

    const prompt = `Actúa como un Entrenador Personal de Élite y Experto en Biomecánica. 
    Audita las siguientes rutinas de entrenamiento del usuario y detecta desbalances musculares, superposición excesiva, o falta de volumen en grupos musculares clave.
    Rutinas: ${JSON.stringify(formattedRoutines)}.
    
    Por favor responde en Español con formato Markdown bien formateado, usando emoticonos y dividiéndolo en:
    1. Resumen de volumen semanal por grupo muscular.
    2. Diagnóstico de balance (pecho vs espalda, empuje vs tirón, balance tren inferior).
    3. Recomendaciones específicas de ejercicios a añadir o modificar.`;

    return callAI(activeKey, prompt);
  },

  // 2. Recommend load adjustments based on log history
  optimizeLoad: async (apiKey, history) => {
    const activeKey = apiKey || DEFAULT_API_KEY;
    if (!activeKey) {
      return getLocalFeedback.optimize(history);
    }

    const formattedHistory = history.map(h => ({
      date: h.date,
      exercise: h.name,
      weight: h.weight,
      reps: h.reps,
      volume: h.volume
    }));

    const prompt = `Actúa como un Entrenador Personal de Élite especializado en Hipertrofia y Fuerza.
    Analiza el historial de progreso de levantamientos del usuario para sugerir si debe subir el peso, mantenerlo, o si la carga es excesiva.
    Aplica los conceptos de Sobrecarga Progresiva (RPE, incremento gradual de peso al completar repeticiones objetivo).
    Historial: ${JSON.stringify(formattedHistory)}.
    
    Por favor responde en Español con formato Markdown claro y profesional, con apartados claros y sugerencias puntuales para cada ejercicio principal.`;

    return callAI(activeKey, prompt);
  },

  // 3. Generate custom routines
  generateRoutine: async (apiKey, { goal, daysCount, targetMuscles }) => {
    const activeKey = apiKey || DEFAULT_API_KEY;
    if (!activeKey) {
      return getLocalFeedback.generate(goal, daysCount);
    }

    const prompt = `Actúa como un Entrenador Personal de Élite.
    Diseña una rutina de entrenamiento personalizada completa en español basada en los siguientes requerimientos:
    - Objetivo del usuario: ${goal}
    - Días disponibles a la semana: ${daysCount}
    - Enfoque especial o áreas de interés: ${targetMuscles || 'Ninguna en particular'}
    
    Genera la rutina completa detallando días, ejercicios por día, series recomendadas, repeticiones sugeridas y consejos clave de ejecución y descanso.
    Estructura la respuesta usando Markdown impecable con listas y tablas para que sea fácil de leer en móvil y escritorio.`;

    return callAI(activeKey, prompt);
  },

  // 4. Generate custom progression advice based on physical stats
  generateProgressionAdvice: async (apiKey, { height, weight, age, goal }) => {
    // 1. Safety check for numeric inputs
    if (!height || !weight || !age || isNaN(height) || isNaN(weight) || isNaN(age) || height <= 0 || weight <= 0 || age <= 0) {
      return `### ⚠️ Datos Corporales Incompletos o Inválidos
Por favor, asegúrate de ingresar una estatura, peso y edad válidos en tu perfil para calcular tu diagnóstico de progresión de forma precisa.`;
    }

    const activeKey = apiKey || DEFAULT_API_KEY;
    
    try {
      const prompt = `Actúa como un Nutricionista Deportivo y Entrenador de Fuerza de Élite.
      Calcula e indica hacia dónde debe progresar el usuario basándose en los siguientes datos corporales:
      - Estatura: ${height} cm
      - Peso: ${weight} kg
      - Edad: ${age} años
      - Objetivo Fitness: ${goal}
      
      Genera un plan de progresión preciso en español (formato Markdown impecable, conciso, de unas 150-200 palabras) dividiéndolo en:
      1. Diagnóstico del estado físico actual (IMC y tasa metabólica estimada).
      2. Enfoque calórico sugerido y macronutrientes recomendados (proteínas, carbohidratos, grasas).
      3. Recomendación de entrenamiento para alcanzar esa meta (ritmo de progresión, cardio sugerido).`;

      return await callAI(activeKey, prompt);
    } catch (error) {
      console.warn("AI progression advice generation failed, falling back to local formulas:", error);
      
      // Fallback local calculations
      const heightM = height / 100;
      const bmi = (weight / (heightM * heightM)).toFixed(1);
      let classification = '';
      if (bmi < 18.5) classification = 'Bajo peso';
      else if (bmi < 25) classification = 'Peso saludable';
      else if (bmi < 30) classification = 'Sobrepeso';
      else classification = 'Obesidad';

      let advice = `### 📊 Diagnóstico Físico Estimado (Motor de Respaldo Local)\n\n`;
      advice += `Tu Índice de Masa Corporal (IMC) calculado es **${bmi}** (${classification}).\n\n`;
      
      if (goal === 'Definición Muscular' || goal === 'Pérdida de Peso') {
        advice += `🎯 **Objetivo de Reducción**: Se sugiere un déficit calórico moderado de unas 300-500 kcal diarias. Mantén una ingesta alta de proteína (1.8g - 2.2g por kg de peso) para proteger tu masa muscular y enfoca tus entrenamientos en fuerza con sobrecarga progresiva.\n\n`;
        advice += `🏃 **Cardio**: Añade de 2 a 3 sesiones de cardio LISS (baja intensidad) de 30-40 minutos a la semana para potenciar el gasto energético sin interferir con la recuperación de fuerza.`;
      } else if (goal === 'Ganancia Muscular') {
        advice += `🎯 **Objetivo de Superávit**: Se sugiere un superávit calórico controlado (+200 a +350 kcal) para maximizar la síntesis proteica minimizando la ganancia de grasa. Enfócate en el volumen y la intensidad de empujes y tracciones.\n\n`;
        advice += `💪 **Sobrecarga**: Intenta incrementar gradualmente las cargas o repeticiones en tus ejercicios compuestos (Sentadilla, Press de Banca) cada 1-2 semanas para forzar la hipertrofia.`;
      } else {
        advice += `🎯 **Objetivo de Recomposición / Mantenimiento**: Se sugiere comer en normocaloría o déficit muy leve. Ideal para perder grasa e incrementar fuerza y masa muscular al mismo tiempo.\n\n`;
        advice += `🥗 **Nutrición**: Prioriza la calidad de los alimentos de origen natural y mantén un consumo balanceado de carbohidratos complejos en torno a tus entrenamientos para rendir al máximo.`;
      }
      return advice;
    }
  }
};
