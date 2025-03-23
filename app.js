

// API key para Google Translate
const API_KEY = 'AIzaSyCwvY-vIYG0CPlAwJ_aIV1TISiiMrepKpo';

let escuchando = false;
let traduccionActual = '';
let historialTraducciones = [];
let idiomaDetectado = '';
let synth = window.speechSynthesis;
let estaHablando = false;

let selectorIdiomaOrigen = document.getElementById('idioma-origen');
let selectorIdiomaDestino = document.getElementById('idioma-destino');
let textoATraducir = document.getElementById('texto-a-traducir');
let textoTraducido = document.getElementById('texto-traducido');
let contadorCaracteres = document.getElementById('contador');
let btnIniciarReconocimientoVoz = document.getElementById('boton-voz');
let btnLimpiarOrigen = document.getElementById('boton-limpiar');
let btnCopiarTraduccion = document.getElementById('boton-copiar');
let btnEscucharTraduccion = document.getElementById('boton-escuchar');
let btnIntercambiarIdiomas = document.getElementById('boton-intercambiar');
let btnGuardarTraduccion = document.getElementById('boton-guardar');
let elementoHistorialTraducciones = document.getElementById('lista-historial');
let btnModoOscuro = document.getElementById('boton-modo-oscuro');
let btnLimpiarHistorial = document.getElementById('boton-limpiar-historial');
let historialVacio = document.getElementById('historial-vacio');

document.addEventListener('DOMContentLoaded', () => {
    cargarHistorialTraducciones();
    configurarEventListeners();
    actualizarContadorCaracteres();
    configurarModoOscuro();
});

function configurarEventListeners() {
    textoATraducir.addEventListener('input', debounce(() => {
        actualizarContadorCaracteres();
        traducirTexto();
    }, 500));
    
    selectorIdiomaOrigen.addEventListener('change', () => {
        const opcionAuto = Array.from(selectorIdiomaOrigen.options).find(opcion => opcion.value === 'auto');
        if (opcionAuto) {
            opcionAuto.textContent = 'Detectar idioma';
        }
        idiomaDetectado = '';
        traducirTexto();
    });
    
    selectorIdiomaDestino.addEventListener('change', traducirTexto);
    
    btnLimpiarOrigen.addEventListener('click', () => {
        textoATraducir.value = '';
        textoTraducido.textContent = 'La traducción aparecerá aquí';
        actualizarContadorCaracteres();
        const opcionAuto = Array.from(selectorIdiomaOrigen.options).find(opcion => opcion.value === 'auto');
        if (opcionAuto) {
            opcionAuto.textContent = 'Detectar idioma';
        }
    });
    
    btnCopiarTraduccion.addEventListener('click', () => {
        if (!traduccionActual) return;
        
        navigator.clipboard.writeText(traduccionActual)
            .then(() => {
                mostrarNotificacion('¡Traducción copiada al portapapeles!');
                btnCopiarTraduccion.innerHTML = '<i class="bi bi-check"></i>';
                setTimeout(() => {
                    btnCopiarTraduccion.innerHTML = '<i class="bi bi-clipboard"></i>';
                }, 2000);
            })
            .catch(err => {
                console.error('Error al copiar: ', err);
                mostrarNotificacion('Error al copiar al portapapeles', 'error');
            });
    });
    
    btnIntercambiarIdiomas.addEventListener('click', intercambiarIdiomas);
    btnGuardarTraduccion.addEventListener('click', guardarTraduccion);
    
    if (btnLimpiarHistorial) {
        btnLimpiarHistorial.addEventListener('click', limpiarHistorialCompleto);
    }
    
    configurarReconocimientoVoz();
    configurarSintesisVoz();
}

function traducirTexto() {
    const texto = textoATraducir.value.trim();
    
    if (!texto) {
        textoTraducido.textContent = 'La traducción aparecerá aquí';
        traduccionActual = '';
        return;
    }

    textoTraducido.innerHTML = '<div class="spinner-traduccion"></div> Traduciendo...';

    const idiomaOrigen = selectorIdiomaOrigen.value;
    const idiomaDestino = selectorIdiomaDestino.value;
    
    const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
    
    const datos = {
        q: texto,
        target: idiomaDestino,
    };

    if (idiomaOrigen !== 'auto') {
        datos.source = idiomaOrigen;
    }

    fetch(url, {
        method: 'POST',
        body: JSON.stringify(datos),
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(respuesta => respuesta.json())
    .then(datos => {
        if (datos.data && datos.data.translations && datos.data.translations.length > 0) {
            traduccionActual = datos.data.translations[0].translatedText;
            textoTraducido.textContent = traduccionActual;

            if (idiomaOrigen === 'auto' && datos.data.translations[0].detectedSourceLanguage) {
                idiomaDetectado = datos.data.translations[0].detectedSourceLanguage;
                actualizarUIIdiomaDetectado(idiomaDetectado);
            }
        } else {
            textoTraducido.textContent = 'No se pudo realizar la traducción';
            traduccionActual = '';
        }
    })
    .catch(error => {
        console.error("Error al traducir:", error);
        textoTraducido.textContent = 'Error al traducir. Por favor, inténtalo de nuevo.';
        traduccionActual = '';
        mostrarNotificacion('Error al conectar con el servicio de traducción', 'error');
    });
}

function actualizarUIIdiomaDetectado(codigoIdioma) {
    if (!codigoIdioma) return;
    
    try {
        const nombresIdiomas = new Intl.DisplayNames(['es'], { type: 'language' });
        const nombreIdioma = nombresIdiomas.of(codigoIdioma);
        
        const opcionesActuales = Array.from(selectorIdiomaOrigen.options);
        const opcionAuto = opcionesActuales.find(opcion => opcion.value === 'auto');
        
        if (opcionAuto) {
            opcionAuto.textContent = `Detectado: ${nombreIdioma}`;
        }
    } catch (error) {
        console.error('Error al actualizar idioma detectado:', error);
    }
}

function intercambiarIdiomas() {
    if (synth.speaking) {
        synth.cancel();
        estaHablando = false;
        btnEscucharTraduccion.innerHTML = '<i class="bi bi-volume-up"></i>';
    }
    
    if (selectorIdiomaOrigen.value === 'auto') {
        if (!idiomaDetectado) return;
        
        const nuevoIdiomaOrigen = selectorIdiomaDestino.value;
        const nuevoIdiomaDestino = idiomaDetectado;
        
        selectorIdiomaOrigen.value = nuevoIdiomaOrigen;
        selectorIdiomaDestino.value = nuevoIdiomaDestino;
    } else {
        const idiomaOrigen = selectorIdiomaOrigen.value;
        selectorIdiomaOrigen.value = selectorIdiomaDestino.value;
        selectorIdiomaDestino.value = idiomaOrigen;
    }
    
    const textoOrigen = textoATraducir.value;
    textoATraducir.value = traduccionActual;
    
    btnIntercambiarIdiomas.classList.add('rotacion');
    setTimeout(() => {
        btnIntercambiarIdiomas.classList.remove('rotacion');
    }, 500);
    
    setTimeout(() => {
        const opcionAuto = Array.from(selectorIdiomaOrigen.options).find(opcion => opcion.value === 'auto');
        if (opcionAuto) {
            opcionAuto.textContent = 'Detectar idioma';
        }
        idiomaDetectado = '';
        traducirTexto();
    }, 100);
}

function actualizarContadorCaracteres() {
    const texto = textoATraducir.value || '';
    const cantidad = texto.length;
    contadorCaracteres.textContent = `${cantidad}/5000`;

    if (cantidad > 4500) {
        contadorCaracteres.classList.add('texto-peligro');
    } else {
        contadorCaracteres.classList.remove('texto-peligro');
    }
}

function configurarReconocimientoVoz() {
    try {
        const ReconocimientoVoz = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!ReconocimientoVoz) {
            console.error('El reconocimiento de voz no está disponible en este navegador');
            btnIniciarReconocimientoVoz.style.display = 'none';
            return;
        }
        
        const reconocimiento = new ReconocimientoVoz();
        
        reconocimiento.continuous = false;
        reconocimiento.interimResults = true;
        
        function actualizarIdiomaReconocimiento() {
            const idioma = selectorIdiomaOrigen.value;
            if (idioma !== 'auto') {
                switch(idioma) {
                    case 'en': reconocimiento.lang = 'en-US'; break;
                    case 'es': reconocimiento.lang = 'es-ES'; break;
                    case 'fr': reconocimiento.lang = 'fr-FR'; break;
                    case 'de': reconocimiento.lang = 'de-DE'; break;
                    case 'it': reconocimiento.lang = 'it-IT'; break;
                    case 'pt': reconocimiento.lang = 'pt-PT'; break;
                    case 'ru': reconocimiento.lang = 'ru-RU'; break;
                    case 'zh': reconocimiento.lang = 'zh-CN'; break;
                    case 'ja': reconocimiento.lang = 'ja-JP'; break;
                    case 'ko': reconocimiento.lang = 'ko-KR'; break;
                    default: reconocimiento.lang = `${idioma}-${idioma.toUpperCase()}`; break;
                }
            } else {
                reconocimiento.lang = 'es-ES';
            }
            console.log('Idioma de reconocimiento ajustado a:', reconocimiento.lang);
        }
        
        selectorIdiomaOrigen.addEventListener('change', actualizarIdiomaReconocimiento);
        actualizarIdiomaReconocimiento();
        
        btnIniciarReconocimientoVoz.addEventListener('click', () => {
            if (synth.speaking) {
                synth.cancel();
                estaHablando = false;
                btnEscucharTraduccion.innerHTML = '<i class="bi bi-volume-up"></i>';
            }
            
            if (escuchando) {
                reconocimiento.stop();
                btnIniciarReconocimientoVoz.innerHTML = '<i class="bi bi-mic"></i>';
                btnIniciarReconocimientoVoz.classList.remove('boton-activo');
                btnIniciarReconocimientoVoz.classList.remove('pulsacion');
            } else {
                actualizarIdiomaReconocimiento();
                reconocimiento.start();
                btnIniciarReconocimientoVoz.innerHTML = '<i class="bi bi-mic-fill"></i>';
                btnIniciarReconocimientoVoz.classList.add('boton-activo');
                btnIniciarReconocimientoVoz.classList.add('pulsacion');
            }
            
            escuchando = !escuchando;
        });
        
        reconocimiento.onresult = function(evento) {
            const transcripcion = Array.from(evento.results)
                .map(resultado => resultado[0].transcript)
                .join('');
                
            if (textoATraducir.value.trim() === '') {
                textoATraducir.value = '';
            }
            
            if (evento.results[0].isFinal) {
                textoATraducir.value = transcripcion;
                actualizarContadorCaracteres();
                traducirTexto();
            }
        };
        
        reconocimiento.onend = function() {
            escuchando = false;
            btnIniciarReconocimientoVoz.innerHTML = '<i class="bi bi-mic"></i>';
            btnIniciarReconocimientoVoz.classList.remove('boton-activo');
            btnIniciarReconocimientoVoz.classList.remove('pulsacion');
        };
        
        reconocimiento.onerror = function(evento) {
            console.error('Error en reconocimiento de voz:', evento.error);
            escuchando = false;
            btnIniciarReconocimientoVoz.innerHTML = '<i class="bi bi-mic"></i>';
            btnIniciarReconocimientoVoz.classList.remove('boton-activo');
            btnIniciarReconocimientoVoz.classList.remove('pulsacion');
            mostrarNotificacion('Error en reconocimiento de voz. Intenta de nuevo.', 'error');
        };
        
    } catch (error) {
        console.error('El reconocimiento de voz no es soportado:', error);
        btnIniciarReconocimientoVoz.style.display = 'none';
    }
}

function configurarSintesisVoz() {
    if ('speechSynthesis' in window) {
        synth = window.speechSynthesis;
        
        btnEscucharTraduccion.addEventListener('click', () => {
            const texto = traduccionActual;
            
            if (!texto) return;
            
            if (estaHablando) {
                synth.cancel();
                estaHablando = false;
                btnEscucharTraduccion.innerHTML = '<i class="bi bi-volume-up"></i>';
                return;
            }
            
            synth.cancel();
            
            const locucion = new SpeechSynthesisUtterance(texto);
            
            const idiomaDestino = selectorIdiomaDestino.value;
            
            switch(idiomaDestino) {
                case 'en': locucion.lang = 'en-US'; break;
                case 'es': locucion.lang = 'es-ES'; break;
                case 'fr': locucion.lang = 'fr-FR'; break;
                case 'de': locucion.lang = 'de-DE'; break;
                case 'it': locucion.lang = 'it-IT'; break;
                case 'pt': locucion.lang = 'pt-PT'; break;
                case 'ru': locucion.lang = 'ru-RU'; break;
                case 'zh': locucion.lang = 'zh-CN'; break;
                case 'ja': locucion.lang = 'ja-JP'; break;
                case 'ko': locucion.lang = 'ko-KR'; break;
                default: locucion.lang = `${idiomaDestino}-${idiomaDestino.toUpperCase()}`; break;
            }
            
            console.log('Idioma de síntesis de voz:', locucion.lang);
            
            let voces = [];
            
            function encontrarVozAdecuada() {
                voces = synth.getVoices();
                console.log('Voces disponibles para síntesis:', voces);
                
                let vozSeleccionada = null;
                
                vozSeleccionada = voces.find(voz => 
                    voz.lang.toLowerCase() === locucion.lang.toLowerCase()
                );
                
                if (!vozSeleccionada) {
                    const codigoIdiomaBase = locucion.lang.split('-')[0].toLowerCase();
                    vozSeleccionada = voces.find(voz => 
                        voz.lang.toLowerCase().startsWith(codigoIdiomaBase)
                    );
                }
                
                if (!vozSeleccionada && voces.length > 0) {
                    console.log("No se encontró voz específica para", locucion.lang, "usando voz por defecto");
                }
                
                if (vozSeleccionada) {
                    locucion.voice = vozSeleccionada;
                    console.log('Voz seleccionada:', vozSeleccionada.name, vozSeleccionada.lang);
                }
                
                locucion.rate = 1.0;  
                locucion.pitch = 1.0; 
                
                iniciarSintesis();
            }
            
            function iniciarSintesis() {
                estaHablando = true;
                btnEscucharTraduccion.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
                
                locucion.onend = function() {
                    estaHablando = false;
                    btnEscucharTraduccion.innerHTML = '<i class="bi bi-volume-up"></i>';
                };
                
                locucion.onerror = function(e) {
                    console.error('Error en síntesis de voz:', e);
                    estaHablando = false;
                    btnEscucharTraduccion.innerHTML = '<i class="bi bi-volume-up"></i>';
                    mostrarNotificacion('Error al reproducir audio', 'error');
                };
                
                synth.speak(locucion);
                
                setTimeout(() => {
                    if (estaHablando) {
                        estaHablando = false;
                        btnEscucharTraduccion.innerHTML = '<i class="bi bi-volume-up"></i>';
                    }
                }, 20000); 
            }
            
            if (voces.length > 0) {
                encontrarVozAdecuada();
            } else {
                synth.onvoiceschanged = function() {
                    encontrarVozAdecuada();
                    synth.onvoiceschanged = null;
                };
                
                setTimeout(() => {
                    if (!estaHablando) {
                        voces = synth.getVoices();
                        if (voces.length > 0) {
                            encontrarVozAdecuada();
                        } else {
                            mostrarNotificacion('No se pudieron cargar las voces de síntesis', 'error');
                        }
                    }
                }, 1000);
            }
        });
        
        function cargarVoces() {
            const voces = synth.getVoices();
            console.log('Voces disponibles cargadas:', voces.length);
        }
        
        cargarVoces();
        
        if (synth.onvoiceschanged !== undefined) {
            synth.onvoiceschanged = cargarVoces;
        }
        
    } else {
        btnEscucharTraduccion.style.display = 'none';
        console.error('La síntesis de voz no está disponible en este navegador');
    }
}

function guardarTraduccion() {
    if (!textoATraducir.value.trim() || !traduccionActual) return;
    
    const traduccion = {
        original: textoATraducir.value,
        traducido: traduccionActual,
        idiomaOrigen: selectorIdiomaOrigen.value === 'auto' ? idiomaDetectado : selectorIdiomaOrigen.value,
        idiomaDestino: selectorIdiomaDestino.value,
        marca: new Date().getTime()
    };
    
    historialTraducciones.unshift(traduccion);
    
    if (historialTraducciones.length > 50) {
        historialTraducciones = historialTraducciones.slice(0, 50);
    }
    
    localStorage.setItem('historialTraducciones', JSON.stringify(historialTraducciones));
    
    actualizarUIHistorialTraducciones();
    
    btnGuardarTraduccion.innerHTML = '<i class="bi bi-star-fill"></i>';
    mostrarNotificacion('Traducción guardada en historial');
    
    setTimeout(() => {
        btnGuardarTraduccion.innerHTML = '<i class="bi bi-star"></i>';
    }, 2000);
}

function cargarHistorialTraducciones() {
    try {
        const historialGuardado = localStorage.getItem('historialTraducciones');
        if (historialGuardado) {
            historialTraducciones = JSON.parse(historialGuardado);
            actualizarUIHistorialTraducciones();
        }
    } catch (error) {
        console.error('Error al cargar historial:', error);
        historialTraducciones = [];
        localStorage.removeItem('historialTraducciones');
    }
}

function actualizarUIHistorialTraducciones() {
    if (!elementoHistorialTraducciones) return;
    
    elementoHistorialTraducciones.innerHTML = '';
    
    if (historialTraducciones.length === 0) {
        if (historialVacio) {
            historialVacio.style.display = 'flex';
        }
        return;
    }
    
    if (historialVacio) {
        historialVacio.style.display = 'none';
    }
    
    historialTraducciones.forEach((item, indice) => {
        const originalCorto = item.original.length > 30 ? 
            item.original.substring(0, 30) + '...' : 
            item.original;
        const traducidoCorto = item.traducido.length > 30 ? 
            item.traducido.substring(0, 30) + '...' : 
            item.traducido;
        
        const nombreIdiomaOrigen = obtenerNombreIdioma(item.idiomaOrigen);
        const nombreIdiomaDestino = obtenerNombreIdioma(item.idiomaDestino);
        
        const tiempoRelativo = obtenerTiempoRelativo(item.marca);
        
        const elementoHistorial = document.createElement('div');
        elementoHistorial.className = 'elemento-historial';
        elementoHistorial.innerHTML = 
        `<div class="contenido-historial">
            <div class="cabecera-historial">
                <div class="texto-historial">${originalCorto} → ${traducidoCorto}</div>
                <div class="tiempo-historial">${tiempoRelativo}</div>
            </div>
            <div class="idiomas-historial">${nombreIdiomaOrigen} → ${nombreIdiomaDestino}</div>
        </div>
        <div class="acciones-historial">
            <button class="boton-cuadrado restaurar-traduccion" title="Restaurar traducción" data-index="${indice}">
                <i class="bi bi-arrow-return-left"></i>
            </button>
            <button class="boton-cuadrado-rojo eliminar-traduccion" title="Eliminar traducción" data-index="${indice}">
                <i class="bi bi-trash"></i>
            </button>
        </div>`;
        
        elementoHistorialTraducciones.appendChild(elementoHistorial);
    });
    
    document.querySelectorAll('.restaurar-traduccion').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const indice = parseInt(e.currentTarget.getAttribute('data-index'));
            restaurarTraduccion(indice);
        });
    });
    
    document.querySelectorAll('.eliminar-traduccion').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const indice = parseInt(e.currentTarget.getAttribute('data-index'));
            eliminarTraduccion(indice);
        });
    });
}

function restaurarTraduccion(indice) {
    if (indice < 0 || indice >= historialTraducciones.length) return;
    
    const item = historialTraducciones[indice];
    
    textoATraducir.value = item.original;
    traduccionActual = item.traducido;
    textoTraducido.textContent = item.traducido;
    
    selectorIdiomaOrigen.value = item.idiomaOrigen;
    selectorIdiomaDestino.value = item.idiomaDestino;
    
    actualizarContadorCaracteres();
    
    mostrarNotificacion('Traducción restaurada');
}

function eliminarTraduccion(indice) {
    if (indice < 0 || indice >= historialTraducciones.length) return;
    
    historialTraducciones.splice(indice, 1);
    
    localStorage.setItem('historialTraducciones', JSON.stringify(historialTraducciones));
    
    actualizarUIHistorialTraducciones();
    
    mostrarNotificacion('Traducción eliminada del historial');
}

function limpiarHistorialCompleto() {
    if (historialTraducciones.length === 0) return;
    
    if (confirm('¿Estás seguro que deseas eliminar todo el historial de traducciones?')) {
        historialTraducciones = [];
        localStorage.removeItem('historialTraducciones');
        actualizarUIHistorialTraducciones();
        mostrarNotificacion('Historial de traducciones borrado');
    }
}

function obtenerNombreIdioma(codigoIdioma) {
    try {
        const nombresIdiomas = new Intl.DisplayNames(['es'], { type: 'language' });
        return nombresIdiomas.of(codigoIdioma);
    } catch (e) {
        const idiomas = {
            'auto': 'Automático',
            'es': 'Español',
            'en': 'Inglés',
            'fr': 'Francés',
            'de': 'Alemán',
            'it': 'Italiano',
            'pt': 'Portugués',
            'ru': 'Ruso',
            'zh': 'Chino',
            'ja': 'Japonés',
            'ko': 'Coreano'
        };
        
        return idiomas[codigoIdioma] || codigoIdioma;
    }
}

function obtenerTiempoRelativo(marca) {
    const ahora = new Date().getTime();
    const diferencia = ahora - marca;
    
    const segundos = Math.floor(diferencia / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    
    if (dias > 0) {
        return `hace ${dias} día${dias !== 1 ? 's' : ''}`;
    } else if (horas > 0) {
        return `hace ${horas} hora${horas !== 1 ? 's' : ''}`;
    } else if (minutos > 0) {
        return `hace ${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    } else {
        return 'hace unos segundos';
    }
}

function debounce(funcion, espera) {
    let timeout;
    return function ejecutarFuncion(...args) {
        const later = () => {
            clearTimeout(timeout);
            funcion(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, espera);
    };
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    let contenedorNotificaciones = document.querySelector('.contenedor-notificaciones');
    
    if (!contenedorNotificaciones) {
        contenedorNotificaciones = document.createElement('div');
        contenedorNotificaciones.className = 'contenedor-notificaciones';
        document.body.appendChild(contenedorNotificaciones);
    }
    
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion ${tipo === 'error' ? 'notificacion-error' : 'notificacion-info'}`;
    
    const icono = tipo === 'error' ? 'bi-exclamation-circle' : 'bi-info-circle';
    
    notificacion.innerHTML = `
        <div class="notificacion-contenido">
            <i class="bi ${icono}"></i>
            <span>${mensaje}</span>
        </div>
        <button class="cerrar-notificacion">
            <i class="bi bi-x"></i>
        </button>
    `;
    
    contenedorNotificaciones.appendChild(notificacion);
    
    const botonCerrar = notificacion.querySelector('.cerrar-notificacion');
    botonCerrar.addEventListener('click', () => {
        notificacion.classList.add('notificacion-saliendo');
        setTimeout(() => {
            notificacion.remove();
            if (contenedorNotificaciones.children.length === 0) {
                contenedorNotificaciones.remove();
            }
        }, 300); 
    });
    
    setTimeout(() => {
        if (notificacion.isConnected) { 
            notificacion.classList.add('notificacion-saliendo');
            setTimeout(() => {
                if (notificacion.isConnected) {
                    notificacion.remove();
                    if (contenedorNotificaciones.children.length === 0) {
                        contenedorNotificaciones.remove();
                    }
                }
            }, 300); 
        }
    }, 5000); 
    
    setTimeout(() => {
        notificacion.classList.add('notificacion-visible');
    }, 10);
}

function configurarModoOscuro() {
    const cuerpo = document.body;
    
    if (!btnModoOscuro) {
        console.error('Botón de modo oscuro no encontrado en el DOM');
        return;
    }
    
    function actualizarUI(esModoOscuro) {
        if (esModoOscuro) {
            cuerpo.classList.add('modo-oscuro');
            btnModoOscuro.innerHTML = '<i class="bi bi-sun-fill"></i>';
            btnModoOscuro.setAttribute('title', 'Cambiar a modo claro');
        } else {
            cuerpo.classList.remove('modo-oscuro');
            btnModoOscuro.innerHTML = '<i class="bi bi-moon-fill"></i>';
            btnModoOscuro.setAttribute('title', 'Cambiar a modo oscuro');
        }
    }
    
    const prefiereModoOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let esModoOscuro;
    
    if (localStorage.getItem('modoOscuro') === null) {
        esModoOscuro = prefiereModoOscuro;
        localStorage.setItem('modoOscuro', esModoOscuro);
    } else {
        esModoOscuro = localStorage.getItem('modoOscuro') === 'true';
    }
    
    actualizarUI(esModoOscuro);
    
    btnModoOscuro.addEventListener('click', () => {
        esModoOscuro = !esModoOscuro;
        localStorage.setItem('modoOscuro', esModoOscuro);
        
        if (esModoOscuro) {
            cuerpo.classList.add('transicion-modo');
            setTimeout(() => {
                actualizarUI(esModoOscuro);
                setTimeout(() => {
                    cuerpo.classList.remove('transicion-modo');
                }, 300);
            }, 50);
        } else {
            cuerpo.classList.add('transicion-modo');
            setTimeout(() => {
                actualizarUI(esModoOscuro);
                setTimeout(() => {
                    cuerpo.classList.remove('transicion-modo');
                }, 300);
            }, 50);
        }
        
        mostrarNotificacion(esModoOscuro ? 
            'Modo oscuro activado' : 
            'Modo claro activado');
    });
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        if (localStorage.getItem('modoOscuro') === null) {
            esModoOscuro = event.matches;
            localStorage.setItem('modoOscuro', esModoOscuro);
            actualizarUI(esModoOscuro);
        }
    });
}