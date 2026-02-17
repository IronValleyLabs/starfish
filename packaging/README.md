# Jellyfish packaging (Mac .app / Windows)

Permite generar una “app” instalable para usuarios que no quieren usar la terminal. El flujo por terminal (`./install.sh`, `./start.sh`) sigue igual.

## Requisitos para construir

- **Mac:** Bash, `curl`, `rsync`, `pnpm`. Ejecutar desde macOS.
- **Windows:** PowerShell 5+, `pnpm`. Ejecutar desde Windows.

## Mac: generar Jellyfish.app

Desde la raíz del repo:

```bash
./packaging/mac/build.sh
```

Salida: `packaging/out/mac/Jellyfish.app`. Arrastra a Aplicaciones o ábrelo con doble clic.

Para crear un .dmg (opcional):

```bash
hdiutil create -volname Jellyfish -srcfolder packaging/out/mac/Jellyfish.app -ov -format UDZO packaging/out/mac/Jellyfish.dmg
```

## Windows: generar carpeta + zip

### Si tienes Windows (PowerShell)

Desde la raíz del repo:

```powershell
.\packaging\windows\build.ps1
```

Salida: `packaging\out\windows\Jellyfish\` y `Jellyfish-win-x64.zip`. El usuario descomprime y hace doble clic en **Run Jellyfish.bat**.

### Si solo tienes Mac: usar GitHub Actions

El workflow **Build Windows** construye el zip en un runner Windows de GitHub:

1. Ve a **Actions** en el repo → **Build Windows** → **Run workflow**.
2. (Opcional) En **Release tag** escribe el tag del release donde quieres subir el zip (ej. `v1.0.0`). Si lo dejas vacío, el zip solo quedará como artefacto descargable.
3. Pulsa **Run workflow** y espera a que termine.
4. **Descargar el zip:** en la ejecución terminada, en **Artifacts** aparece **Jellyfish-win-x64**. Descárgalo y tendrás el `.zip` dentro (o ya estará en el release si pusiste tag).

## Configuración para el usuario de la app

- **Primera vez:** La app crea `~/Library/Application Support/Jellyfish/` (Mac) o `%APPDATA%\Jellyfish` (Windows) y copia ahí `.env.example` como `.env`. El usuario debe editar ese `.env` (o configurar desde el dashboard en Ajustes) con Redis, Telegram y API de LLM.
- **Redis:** Si no incluyes Redis embebido, el usuario debe usar Redis Cloud (gratis) y poner `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` en el .env.
- **Redis embebido (opcional):**
  - Mac: pon un binario `redis-server` en `packaging/resources/mac/` (por ejemplo compilado desde [Redis](https://redis.io/download) o desde Homebrew) y vuelve a ejecutar `build.sh`.
  - Windows: pon `redis-server.exe` en `packaging/resources/windows/` (p. ej. desde [tporadowski/redis](https://github.com/tporadowski/redis/releases)) y vuelve a ejecutar `build.ps1`.

## Release y botón "Descargar" en tu web

Para que tu web tenga un botón de descarga que apunte a los instaladores:

1. **Genera los archivos** (en Mac y en Windows, o en CI):
   - Mac: `./packaging/mac/build.sh` y luego el .dmg (comando de más arriba). Resultado: `Jellyfish.dmg`.
   - Windows: `.\packaging\windows\build.ps1`. Resultado: `Jellyfish-win-x64.zip`.

2. **Crea un release en GitHub:**
   - Repo → **Releases** → **Create a new release**.
   - Tag (ej. `v1.0.0`), título y descripción.
   - En **Attach binaries**, sube `Jellyfish.dmg` y `Jellyfish-win-x64.zip`.
   - Publica el release.

3. **Enlaces para tu web:**
   - Página del último release:  
     `https://github.com/IronValleyLabs/jellyfish/releases/latest`
   - Descarga directa (sustituye `VERSION` por el tag, ej. `v1.0.0`):
     - Mac: `https://github.com/IronValleyLabs/jellyfish/releases/download/VERSION/Jellyfish.dmg`
     - Windows: `https://github.com/IronValleyLabs/jellyfish/releases/download/VERSION/Jellyfish-win-x64.zip`

En tu web puedes poner dos botones: "Descargar para Mac" y "Descargar para Windows" con esas URLs (con el tag concreto, o usar la API de GitHub para obtener la URL del último release si quieres que sea siempre "latest").

## Resumen

| Quién              | Cómo                          |
|--------------------|-------------------------------|
| Usuario técnico    | Terminal: `./install.sh` → `./start.sh` |
| Usuario no técnico | Instalar la app (.app o descomprimir zip) y configurar .env / Ajustes en el dashboard |
