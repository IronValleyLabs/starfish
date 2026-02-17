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

Desde la raíz del repo (PowerShell):

```powershell
.\packaging\windows\build.ps1
```

Salida: `packaging\out\windows\Jellyfish\` y `Jellyfish-win-x64.zip`. El usuario descomprime y hace doble clic en **Run Jellyfish.bat**.

## Configuración para el usuario de la app

- **Primera vez:** La app crea `~/Library/Application Support/Jellyfish/` (Mac) o `%APPDATA%\Jellyfish` (Windows) y copia ahí `.env.example` como `.env`. El usuario debe editar ese `.env` (o configurar desde el dashboard en Ajustes) con Redis, Telegram y API de LLM.
- **Redis:** Si no incluyes Redis embebido, el usuario debe usar Redis Cloud (gratis) y poner `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` en el .env.
- **Redis embebido (opcional):**
  - Mac: pon un binario `redis-server` en `packaging/resources/mac/` (por ejemplo compilado desde [Redis](https://redis.io/download) o desde Homebrew) y vuelve a ejecutar `build.sh`.
  - Windows: pon `redis-server.exe` en `packaging/resources/windows/` (p. ej. desde [tporadowski/redis](https://github.com/tporadowski/redis/releases)) y vuelve a ejecutar `build.ps1`.

## Resumen

| Quién              | Cómo                          |
|--------------------|-------------------------------|
| Usuario técnico    | Terminal: `./install.sh` → `./start.sh` |
| Usuario no técnico | Instalar la app (.app o descomprimir zip) y configurar .env / Ajustes en el dashboard |
