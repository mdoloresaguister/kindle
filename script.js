// Variable global para almacenar el listado de libros (recupera del LocalStorage o arranca vacío)
let misLibros = JSON.parse(localStorage.getItem('bibliotecaKindle')) || [];


let criterioOrden = 'titulo'; // Puede ser 'titulo' o 'fecha'

const btnOrdenTitulo = document.getElementById('btn-orden-titulo');
const btnOrdenFecha = document.getElementById('btn-orden-fecha');

// Ordenamos el array misLibros alfabéticamente por el título antes de guardar y pintar
//   misLibros.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' }));

// Elementos de la interfaz (DOM)
const contenedorLibros = document.getElementById('contenedor-libros');
const formAnadir = document.getElementById('formulario-libro');
const formEditar = document.getElementById('formulario-editar-libro');
const contenedorEditar = document.getElementById('contenedor-editar-libro');
const buscador = document.getElementById('buscador');
const btnExportar = document.getElementById('btn-exportar');
const inputImportar = document.getElementById('input-importar');
const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
const totalLibrosContador = document.getElementById('total-libros');

// ==========================================
// 1. FUNCIONES PRINCIPALES (RENDERIZADO Y ACCIONES)
// ==========================================

// Pinta todas las fichas de libros registradas en la parte derecha
function renderizarLibros() {
    // Actualiza el número total basándose en el tamaño de la lista de leídos
    if (totalLibrosContador) {
        const librosLeidos = misLibros.filter(libro => !libro.pendiente);
        totalLibrosContador.innerText = librosLeidos.length;
    }
    contenedorLibros.innerHTML = '';

    misLibros.forEach((libro, index) => {
        const rutaPortada = libro.portada ? `portadas/${libro.portada}` : 'https://via.placeholder.com/120x180?text=Sin+Portada';

        // 1. Calculamos las clases de la tarjeta ANTES del HTML
        let claseTarjeta = 'ficha-libro';
        if (libro.saga && libro.saga > 0) {
            claseTarjeta += ' es-saga';
        }
        if (libro.pendiente) {
            claseTarjeta += ' es-pendiente';
        }

        // 2. Calculamos las estrellas o etiqueta de pendiente ANTES de construir el HTML
        let estrellasHTML = '';
        if (libro.pendiente) {
            estrellasHTML = '<span class="tag-pendiente-voto">Lectura Pendiente</span>';
        } else {
            const nota = Number(libro.valoracion) || 0;
            for (let i = 1; i <= 5; i++) {
                if (i <= nota) {
                    estrellasHTML += '<span class="estrella-ficha rellena">★</span>';
                } else {
                    estrellasHTML += '<span class="estrella-ficha vacia">☆</span>';
                }
            }
        }

        // 3. Construimos la ficha de forma limpia (Sin reseña, ahora mostrando Sinopsis)
        const fichaHTML = `
           <article class="${claseTarjeta}">
                ${(libro.saga && libro.saga > 0) ? `<div class="cinta-saga">Vol. ${libro.saga}</div>` : ''}
                <img src="${rutaPortada}" alt="Portada de ${libro.titulo}" class="portada">
                <div class="titulo">${libro.titulo}</div>
                <div class="autor">${libro.autor}</div>
                
                <div class="meta-info">
                    <strong>Género:</strong> ${libro.genero || 'No especificado'} <br>
                    ${libro.pendiente ? '<strong style="color: #e67e22;">Estado: Pendiente</strong>' : `<strong>Leído en:</strong> ${libro.fecha ? libro.fecha.split('-').reverse().join('/') : 'No especificada'}`}
                </div>
                
                <div class="valoracion-contenedor">${estrellasHTML}</div>

                ${libro.hermana ? `<div class="tag-hermana">👥 Pasado a mi hermana</div>` : ''}
                
                ${libro.sinopsis ? `
                    <p style="margin-bottom: 5px;"><strong>Sinopsis:</strong></p>
                    <div class="notas-kindle">"${libro.sinopsis}"</div>
                ` : ''}
                
                <div class="botones-ficha">
                    <button onclick="prepararEdicion(${index})" class="btn-accion btn-editar">Editar</button>
                    <button onclick="eliminarLibro(${index})" class="btn-accion btn-eliminar">Eliminar</button>
                </div>
            </article>
        `;
        contenedorLibros.innerHTML += fichaHTML;
    });

    cancelarEdicion();
}

// Guarda un nuevo libro
formAnadir.addEventListener('submit', function (event) {
    event.preventDefault();
    // --- NUEVO: SEGUNDO CERROJO ANTIDUPLICADOS AL GUARDAR ---
    const tituloIngresado = document.getElementById('input-titulo').value.trim();
    const libroDuplicado = misLibros.find(libro => 
        libro.titulo.trim().toLowerCase() === tituloIngresado.toLowerCase()
    );

    if (libroDuplicado) {
        alert(`⚠️ ¡Error! No se puede guardar. El libro "${tituloIngresado}" ya existe en tu biblioteca.`);
        document.getElementById('input-titulo').value = "";
        document.getElementById('input-titulo').focus();
        return; // <--- Esto detiene la función aquí mismo y no deja crear el libro
    }
    // --- FIN DEL CERROJO ---
    const esPendiente = document.getElementById('input-pendiente').checked;

    let fechaSeleccionada = "";
    let valoracionSeleccionada = "0";

    if (!esPendiente) {
        fechaSeleccionada = document.getElementById('input-fecha').value;
        if (!fechaSeleccionada) {
            const hoy = new Date();
            const año = hoy.getFullYear();
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const dia = String(hoy.getDate()).padStart(2, '0');
            fechaSeleccionada = `${año}-${mes}-${dia}`;
        }
        const estrellaMarcada = document.querySelector('input[name="valoracion"]:checked');
        valoracionSeleccionada = estrellaMarcada ? estrellaMarcada.value : "0";
    }

    const nuevoLibro = {
        titulo: document.getElementById('input-titulo').value,
        autor: document.getElementById('input-autor').value,
        genero: document.getElementById('input-genero').value,
        fecha: fechaSeleccionada,
        portada: document.getElementById('input-portada').value,
        valoracion: valoracionSeleccionada,
        sinopsis: document.getElementById('input-sinopsis').value, // Corregido a sinopsis
        hermana: document.getElementById('input-hermana').checked,
        saga: Number(document.getElementById('input-saga').value) || 0,
        pendiente: esPendiente
    };

    misLibros.push(nuevoLibro);
    guardarYActualizar();

    const checkedRadio = document.querySelector('input[name="valoracion"]:checked');
    if (checkedRadio) checkedRadio.checked = false;
    formAnadir.reset();
});

// Elimina de forma definitiva una ficha
window.eliminarLibro = function (index) {
    if (confirm("¿Seguro que quieres eliminar esta ficha?")) {
        misLibros.splice(index, 1);
        guardarYActualizar();
    }
};

// ==========================================
// 2. LOGICA DE EDICIÓN DE LIBROS
// ==========================================

// Cambia el formulario lateral para editar el libro seleccionado
window.prepararEdicion = function (index) {
    const libro = misLibros[index];

    const estrellasEdicion = document.querySelectorAll('input[name="editar-valoracion"]');
    estrellasEdicion.forEach(radio => {
        radio.checked = false;
    });

    const estrellaAEditar = document.getElementById(`editar-estrellas-${String(libro.valoracion)}`);
    if (estrellaAEditar) {
        estrellaAEditar.checked = true;
    }

    document.getElementById('editar-index').value = index;
    document.getElementById('editar-titulo').value = libro.titulo;
    document.getElementById('editar-autor').value = libro.autor;
    const selectEditarGenero = document.getElementById('editar-genero');
    // Si el libro tiene un género guardado que existe en el desplegable, lo selecciona
    if (libro.genero && selectEditarGenero.querySelector('option[value="' + libro.genero + '"]')) {
        selectEditarGenero.value = libro.genero;
    } else {
        // Si era un texto libre antiguo que ya no coincide, lo marca como "Otros" (o vacío si no tenía)
        selectEditarGenero.value = libro.genero ? "Otros" : "";
    }
    document.getElementById('editar-fecha').value = libro.fecha || '';
    document.getElementById('editar-portada').value = libro.portada || '';
    document.getElementById('editar-sinopsis').value = libro.sinopsis || ''; // Corregido a sinopsis
    document.getElementById('editar-hermana').checked = libro.hermana || false;
    document.getElementById('editar-saga').value = libro.saga || 0;
    document.getElementById('editar-pendiente').checked = libro.pendiente || false;

    formAnadir.style.display = "none";
    contenedorEditar.style.display = "block";
};

// Cancela la edición y devuelve el formulario de añadir totalmente limpio
function cancelarEdicion() {
    if (formEditar) {
        formEditar.reset();
    }

    const estrellasRadioEdicion = document.querySelectorAll('input[name="editar-valoracion"]');
    estrellasRadioEdicion.forEach(radio => {
        radio.checked = false;
    });

    const estrellasRadioAnadir = document.querySelectorAll('input[name="valoracion"]');
    estrellasRadioAnadir.forEach(radio => {
        radio.checked = false;
    });

    formAnadir.style.display = "block";
    contenedorEditar.style.display = "none";
    document.getElementById('input-pendiente').checked = false;
    document.getElementById('editar-pendiente').checked = false;
}

btnCancelarEdicion.addEventListener('click', cancelarEdicion);

// Aplica los cambios editados del libro
formEditar.addEventListener('submit', function (event) {
    event.preventDefault();
    const index = document.getElementById('editar-index').value;
    const esPendienteEditar = document.getElementById('editar-pendiente').checked;

    let valoracionEditada = "0";
    let fechaEditada = "";

    if (!esPendienteEditar) {
        const estrellaEditadaMarcada = document.querySelector('input[name="editar-valoracion"]:checked');
        valoracionEditada = estrellaEditadaMarcada ? estrellaEditadaMarcada.value : "0";
        fechaEditada = document.getElementById('editar-fecha').value;
    }

    misLibros[index] = {
        titulo: document.getElementById('editar-titulo').value,
        autor: document.getElementById('editar-autor').value,
        genero: document.getElementById('editar-genero').value,
        fecha: fechaEditada,
        portada: document.getElementById('editar-portada').value,
        valoracion: valoracionEditada,
        sinopsis: document.getElementById('editar-sinopsis').value, // Corregido a sinopsis
        hermana: document.getElementById('editar-hermana').checked,
        saga: Number(document.getElementById('editar-saga').value) || 0,
        pendiente: esPendienteEditar
    };

    guardarYActualizar();
});

// ==========================================
// 3. COPIAS DE SEGURIDAD Y HERRAMIENTAS
// ==========================================

btnExportar.addEventListener('click', function () {
    if (misLibros.length === 0) {
        alert("No tienes libros guardados para exportar.");
        return;
    }
    const dataStr = JSON.stringify(misLibros, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const nombreArchivo = `copia_biblioteca_kindle_${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', nombreArchivo);
    linkElement.click();
});

document.getElementById('btn-disparar-importar').addEventListener('click', function () {
    document.getElementById('input-importar').click();
});

inputImportar.addEventListener('change', function (event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function (e) {
        try {
            const librosCargados = JSON.parse(e.target.result);

            if (Array.isArray(librosCargados)) {
                if (confirm(`Se han detectado ${librosCargados.length} libros en la copia de seguridad. ¿Quieres restaurarlos?`)) {
                    misLibros = librosCargados;
                    guardarYActualizar();
                    alert("¡Biblioteca restaurada con éxito!");
                }
            } else {
                alert("El archivo seleccionado no tiene el formato correcto.");
            }
        } catch (error) {
            alert("Error al leer el archivo.");
        }
    };
    lector.readAsText(archivo);
    event.target.value = '';
});

buscador.addEventListener('keyup', function () {
    let input = buscador.value.toLowerCase();
    let fichas = document.getElementsByClassName('ficha-libro');

    for (let i = 0; i < fichas.length; i++) {
        let titulo = fichas[i].getElementsByClassName('titulo')[0].innerText.toLowerCase();
        let autor = fichas[i].getElementsByClassName('autor')[0].innerText.toLowerCase();

        if (titulo.includes(input) || autor.includes(input)) {
            fichas[i].style.display = "";
        } else {
            fichas[i].style.display = "none";
        }
    }
});

// Utilidad auxiliar para guardar, ordenar dinámicamente y actualizar la pantalla
function guardarYActualizar() {
    if (criterioOrden === 'titulo') {
        // Orden alfabético por título
        misLibros.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' }));
    } else if (criterioOrden === 'fecha') {
        // Orden por fecha de lectura (más recientes primero)
        misLibros.sort((a, b) => {
            // Si alguno es pendiente, lo mandamos al final
            if (a.pendiente && !b.pendiente) return 1;
            if (!a.pendiente && b.pendiente) return -1;
            if (a.pendiente && b.pendiente) return a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' });

            // Si ambos están leídos, comparamos las fechas de forma descendente
            return new Date(b.fecha) - new Date(a.fecha);
        });
    }

    localStorage.setItem('bibliotecaKindle', JSON.stringify(misLibros));
    renderizarLibros();
}

// Eventos para cambiar el criterio de ordenación
btnOrdenTitulo.addEventListener('click', function () {
    criterioOrden = 'titulo';
    btnOrdenTitulo.classList.add('activo');
    btnOrdenFecha.classList.remove('activo');
    guardarYActualizar();
});

btnOrdenFecha.addEventListener('click', function () {
    criterioOrden = 'fecha';
    btnOrdenFecha.classList.add('activo');
    btnOrdenTitulo.classList.remove('activo');
    guardarYActualizar();
});

// ==========================================
// CONTROL DE TÍTULOS REPETIDOS
// ==========================================

// Capturamos el input del título del formulario de añadir
const inputTitulo = document.getElementById('input-titulo');

// Escuchamos cuando el usuario sale de la caja del título
inputTitulo.addEventListener('blur', function() {
    const tituloIngresado = inputTitulo.value.trim();

    // Si la caja está vacía, no hacemos nada
    if (tituloIngresado === "") return;

    // Buscamos si ya existe un libro con el mismo título (sin importar mayúsculas/minúsculas o espacios)
    const libroDuplicado = misLibros.find(libro => 
        libro.titulo.trim().toLowerCase() === tituloIngresado.toLowerCase()
    );

    // Si lo encuentra, lanza el aviso, vacía el campo y te obliga a quedarte ahí
    if (libroDuplicado) {
        alert(`⚠️ ¡Atención! El libro "${libroIngresado}" ya está registrado en tu biblioteca (Autor: ${libroDuplicado.autor}). No puedes volver a añadirlo.`);
        inputTitulo.value = ""; // Vacía el campo automáticamente
        
        // Un pequeño retraso de un milisegundo para asegurar que el cursor vuelva al título 
        // y no te deje saltar al campo del autor
        setTimeout(() => {
            inputTitulo.focus();
        }, 10);
    }
});

renderizarLibros();