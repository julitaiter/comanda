# Comanda

**Pedimos juntos, pagamos claro.**

Comanda es una webapp local para organizar pedidos grupales sin hacer cuentas a mano. Sirve para juntadas, oficina, reuniones, partidos, cooperativas chicas o cualquier situación donde una persona centraliza un pedido y después tiene que dividir lo que paga cada uno.

La app permite cargar productos distintos por persona, cerrar la comanda, copiar el pedido para el local, calcular deudas, marcar quién pagó y compartir el resumen por WhatsApp.

---

## Identidad del proyecto

**Nombre:** Comanda  
**Tagline:** Pedimos juntos, pagamos claro.  
**Hero:** Una comanda para toda la juntada.  
**Descripción corta:** Organizá pedidos grupales multiproducto, calculá deudas, marcá pagos y compartí el resumen por WhatsApp.  
**Tono:** simple, cercano, práctico.  
**Color principal:** naranja cálido.  
**Ícono:** ticket/comanda.

---

## Qué problema resuelve

Cuando varias personas piden comida juntas, suelen aparecer los mismos problemas:

- alguien tiene que anotar qué pidió cada uno;
- el pedido para el local queda mezclado;
- los precios cambian por producto;
- hay envío, recargo o descuento;
- no todos pagan al mismo tiempo;
- el resumen se termina armando a mano para WhatsApp.

Comanda ordena todo eso en una sola pantalla.

---

## Funcionalidades

### Carga de pedidos

- Cargar pedidos por persona.
- Combinar productos distintos dentro de una misma comanda.
- Cargar por renglón:
  - producto;
  - opción o variedad;
  - cantidad;
  - unidad;
  - precio unitario.
- Usar productos sugeridos, como:
  - Empanada;
  - Pizza;
  - Gaseosa;
  - Sanguche.
- Crear productos, opciones o unidades nuevas escribiéndolas directamente.
- Guardar automáticamente las nuevas sugerencias para próximas cargas.

### Cálculo de totales

- Total por producto y opción para enviar al local.
- Total por persona.
- Subtotal por persona.
- Recargo/envío.
- Descuento.
- Total general.
- Total pagado.
- Total pendiente.

### División de ajustes

El recargo/envío y el descuento pueden dividirse de dos formas:

1. **Proporcional al consumo**  
   Quien pidió más, paga una parte mayor del ajuste.

2. **Partes iguales**  
   El ajuste se reparte en partes iguales entre todas las personas cargadas.

La configuración está en la sección **Configuración**, en el campo:

```txt
Dividir recargo/descuento
```

### Pagos

- Marcar persona como pagada.
- Volver a marcar como pendiente.
- Ver total pagado y total pendiente.
- Incluir el estado de pago en los textos copiados.

### Textos para compartir

- Copiar resumen completo.
- Copiar sólo pedido para el local.
- Copiar sólo deudas por persona.
- Compartir resumen por WhatsApp.
- Imprimir resumen.

### Persistencia local

- Guarda la comanda en `localStorage`.
- No requiere backend.
- No requiere base de datos.
- No requiere login.
- Permite exportar/importar JSON para mover una comanda entre equipos.

---

## Modelo de uso

Ejemplo de carga:

```txt
Persona: Nico

Producto      Opción          Cantidad   Unidad    Precio
Empanada      Jamón y queso   3          unidad    1200
Empanada      Carne           2          unidad    1200
Gaseosa       Coca 1.5L       1          botella   2800
```

Otra persona:

```txt
Persona: Timo

Producto      Opción          Cantidad   Unidad    Precio
Pizza         Muzzarella      0.5        pizza     9000
Gaseosa       Sprite 1.5L     1          botella   2800
```

---

## Ejemplo de pedido para el local

```txt
🧾 Viernes oficina

Pedido para el local:

Empanada:
- Carne: 2 unidades
- Jamón y queso: 3 unidades

Gaseosa:
- Coca 1.5L: 1 botella
- Sprite 1.5L: 1 botella

Pizza:
- Muzzarella: 0,5 pizzas

Total: 5 unidades · 2 botellas · 0,5 pizzas
```

---

## Ejemplo de deudas

```txt
💸 Viernes oficina

Deudas por persona:
- Nico: $8.800 - PENDIENTE
- Timo: $7.300 - PAGADO

Recargo/envío: $1.500
División del ajuste: proporcional

Total pagado: $7.300
Total pendiente: $8.800
Total general: $16.100
```

---

## Stack técnico

Comanda está construida como una app web estática modular.

- HTML
- CSS
- JavaScript ES Modules
- Vite
- localStorage
- PWA básica con `manifest.json` y `sw.js`

No usa backend, base de datos ni framework frontend pesado.

---

## Estructura del proyecto

```txt
comanda-grupal/
├── index.html
├── manifest.json
├── sw.js
├── package.json
├── README.md
├── .gitignore
├── assets/
│   └── icon.svg
└── src/
    ├── main.js
    ├── ui.js
    ├── state.js
    ├── catalog.js
    ├── normalize.js
    ├── totals.js
    ├── texts.js
    ├── dom.js
    └── styles.css
```

---

## Archivos principales

### `src/ui.js`

Maneja la interfaz, eventos y renderizado.

Contiene:

- formulario de configuración;
- selector de división del ajuste;
- carga de personas;
- carga de productos;
- resumen por producto;
- resumen por persona;
- acciones de copiar, compartir, cerrar y reabrir.

El selector de división del recargo/descuento está en este archivo:

```html
<select id="adjustmentMode">
  <option value="proportional">Proporcional al consumo</option>
  <option value="equal">Partes iguales</option>
</select>
```

### `src/state.js`

Maneja el estado inicial, guardado, carga, exportación e importación.

El estado principal tiene esta forma:

```js
{
  name: "Comanda",
  closed: false,
  adjustments: {
    surcharge: 0,
    discount: 0,
    mode: "proportional"
  },
  catalog: {
    products: []
  },
  people: []
}
```

### `src/totals.js`

Contiene los cálculos.

Responsabilidades:

- agrupar productos para el local;
- calcular subtotal general;
- calcular total por persona;
- calcular recargo/descuento;
- dividir el ajuste proporcionalmente o en partes iguales;
- calcular pagado y pendiente.

### `src/texts.js`

Genera los textos para copiar o compartir.

Incluye:

- `generateStoreText`;
- `generateDebtsText`;
- `generateFullSummaryText`.

### `src/catalog.js`

Define productos iniciales y sugerencias dinámicas.

Productos base:

- Empanada;
- Pizza;
- Gaseosa;
- Sanguche.

Cada producto puede tener:

```js
{
  name: "Pizza",
  key: "pizza",
  unit: "pizza",
  unitOptions: ["pizza", "porción", "unidad"],
  basePrice: 9000,
  allowDecimals: true,
  options: ["Muzzarella", "Napolitana", "Fugazzeta"]
}
```

### `src/normalize.js`

Normaliza productos y opciones para evitar duplicados.

Ejemplos:

```txt
"empanadas" → "empanada"
"JyQ" → "jamon y queso"
"jamon queso" → "jamon y queso"
```

---

## Instalar y correr

Requisitos:

- Node.js instalado.
- npm funcionando.

Instalar dependencias:

```bash
npm install
```

Correr en desarrollo:

```bash
npm run dev
```

Abrir:

```txt
http://localhost:5173
```

---

## Cambiar puerto

En `package.json`:

```json
"dev": "vite --host 0.0.0.0 --port 5173"
```

Cambiar `5173` por el puerto deseado.

Ejemplo:

```json
"dev": "vite --host 0.0.0.0 --port 3000"
```

---

## Build de producción

```bash
npm run build
```

El resultado queda en:

```txt
dist/
```

Vista previa del build:

```bash
npm run preview
```

---

## Deploy

Al ser una app estática, se puede desplegar en:

- GitHub Pages;
- Netlify;
- Vercel;
- Cloudflare Pages;
- cualquier hosting estático.

---

## Datos y privacidad

Comanda guarda los datos localmente en el navegador.

Eso significa:

- los datos no se suben a ningún servidor;
- cada navegador/equipo tiene su propia comanda;
- si se borra el almacenamiento del navegador, se pierden los datos;
- para mover datos a otra máquina se debe usar exportar/importar JSON.

---

## Exportar e importar

La app permite exportar la comanda a un archivo `.json`.

El archivo se descarga con nombre similar a:

```txt
comanda-2026-06-30.json
```

Luego puede importarse desde otro navegador o computadora.

---

## Decisiones de diseño

### Por qué no backend

La primera versión está pensada para una persona que centraliza el pedido. Por eso no necesita usuarios, login ni base de datos.

Ventajas:

- más simple;
- más rápida;
- funciona localmente;
- no requiere deploy obligatorio;
- se puede usar offline parcialmente;
- no hay costos de servidor.

### Por qué multiproducto

Aunque nació como una idea para empanadas, el modelo se generalizó para soportar:

- empanadas;
- pizza;
- bebidas;
- sanguches;
- helado;
- facturas;
- cualquier otro producto.

La unidad mínima es un ítem:

```js
{
  product: "Empanada",
  option: "Jamón y queso",
  quantity: 3,
  unit: "unidad",
  price: 1200
}
```

---

## Próximos pasos posibles

### Etapa 1. Mejoras locales

- Editar personas ya cargadas.
- Duplicar persona.
- Duplicar comanda anterior.
- Historial local de comandas.
- Alias o datos de pago.
- Notas para el local.
- Plantillas personalizadas.
- Precios por unidad, por ejemplo pizza completa y porción.
- Modo oscuro.

### Etapa 2. PWA más completa

- Instalable con mejor iconografía.
- Mejor soporte offline.
- Pantalla de inicio.
- Cache de assets más robusto.

### Etapa 3. Modo colaborativo

Para que cada persona cargue desde su celular habría que sumar backend o base remota.

Opciones posibles:

- Supabase;
- Firebase;
- Django + Postgres;
- API propia.

Funciones posibles:

- crear comanda con link;
- compartir link;
- cada persona carga su pedido;
- organizador cierra la comanda;
- resumen en tiempo real.

---

## Nombre del repo recomendado

```txt
comanda-grupal
```

---

## Licencia

MIT.
