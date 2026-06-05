# Pendientes — Acciones manuales

> Cosas que requieren tu intervención directa (cuentas, credenciales, hardware).
> Marca cada paso con [x] cuando lo completes.

---

## 🚀 Deploy a producción (Vercel free tier)

### 1. Neon — PostgreSQL
- [ ] Crear cuenta en [neon.tech](https://neon.tech)
- [ ] New project → nombre: `urapex`, región: EU West
- [ ] En el dashboard → **Connection string**
  - [ ] Copiar **Pooled connection** URL → será `DATABASE_URL`
  - [ ] Copiar **Direct connection** URL → será `DIRECT_URL`

### 2. Upstash — Redis
- [ ] Crear cuenta en [upstash.com](https://upstash.com)
- [ ] **Create database** → nombre: `urapex-redis`, región: EU West, tipo: Regional
- [ ] Copiar la **Redis URL** (formato `rediss://...`) → será `REDIS_URL`

### 3. Cloudflare R2 — Almacenamiento de ficheros
- [ ] Login en [dash.cloudflare.com](https://dash.cloudflare.com) → **R2**
- [ ] **Create bucket** → nombre: `urapex-uploads`
- [ ] Copiar el **S3 API endpoint** del bucket → será `S3_ENDPOINT`
  - Formato: `https://<account_id>.r2.cloudflarestorage.com`
- [ ] **R2 → Manage R2 API tokens** → **Create API token**
  - Permisos: *Object Read & Write* sobre `urapex-uploads`
  - [ ] Copiar **Access Key ID** → `S3_ACCESS_KEY`
  - [ ] Copiar **Secret Access Key** → `S3_SECRET_KEY` ⚠️ solo se muestra una vez

### 4. Resend — Email (password reset)
- [ ] Crear cuenta en [resend.com](https://resend.com)
- [ ] **API Keys** → Create API key → copiar → `RESEND_API_KEY`
- [ ] **Domains** → Add domain → verificar tu dominio con DNS
  - Sin dominio propio: usar `onboarding@resend.dev` para pruebas (máx. 100 emails/día)
- [ ] Definir `EMAIL_FROM` → `UrApex <noreply@tudominio.com>`

### 5. Vercel — Deployment
- [ ] Crear cuenta en [vercel.com](https://vercel.com)
- [ ] **New Project** → Import Git Repository → `AdriiBC02/UrApex`
- [ ] En la configuración del proyecto, **Build & Development Settings**:
  - Build Command: `prisma migrate deploy && next build`
  - Output Directory: `.next` (por defecto)
- [ ] **Environment Variables** — añadir todas estas:

  | Variable | Valor |
  |---|---|
  | `DATABASE_URL` | Neon pooled URL |
  | `DIRECT_URL` | Neon direct URL |
  | `AUTH_SECRET` | `openssl rand -base64 32` (ejecuta `! openssl rand -base64 32`) |
  | `AUTH_URL` | `https://<tu-app>.vercel.app` |
  | `REDIS_URL` | Upstash Redis URL |
  | `STORAGE_PROVIDER` | `s3` |
  | `S3_BUCKET` | `urapex-uploads` |
  | `S3_REGION` | `auto` |
  | `S3_ENDPOINT` | R2 endpoint |
  | `S3_ACCESS_KEY` | R2 Access Key ID |
  | `S3_SECRET_KEY` | R2 Secret Access Key |
  | `RESEND_API_KEY` | Resend API key |
  | `EMAIL_FROM` | `UrApex <noreply@tudominio.com>` |
  | `CRON_SECRET` | `openssl rand -hex 32` |
  | `NEXT_PUBLIC_APP_URL` | `https://<tu-app>.vercel.app` |

- [ ] **Deploy** → verificar que el build pasa
- [ ] Comprobar que `prisma migrate deploy` corrió sin errores en los build logs

### 6. GitHub Secrets — para el CI
- [ ] Ir a `https://github.com/AdriiBC02/UrApex/settings/secrets/actions`
- [ ] **New repository secret**: `DATABASE_URL` → Neon pooled URL
- [ ] **New repository secret**: `DIRECT_URL` → Neon direct URL

---

## 🖥️ Companion app — Windows

- [ ] Ir a [github.com/AdriiBC02/UrApex/releases/tag/companion-latest](https://github.com/AdriiBC02/UrApex/releases/tag/companion-latest)
- [ ] Descargar el `.exe` (NSIS) o `.msi`
- [ ] Instalar en el PC de Windows con LMU
- [ ] En UrApex web → **Settings → Companion app** → generar API key
- [ ] En la app → **Settings** → pegar API key + URL de UrApex + ruta de resultados LMU
  - Ruta típica: `C:\Users\<usuario>\Documents\Le Mans Ultimate\UserData\player\Results\`
- [ ] Pulsar **Start watching** y hacer una sesión en LMU para verificar el auto-upload

---

## 🔑 Variables de entorno locales (`.env`)

Algunas variables que puede que te falten en local:

```bash
# Añade esto a tu .env local para probar el password reset:
RESEND_API_KEY=""
EMAIL_FROM="UrApex <noreply@resend.dev>"

# Opcional — si quieres probar el cron manualmente:
CRON_SECRET=""
```

---

## 📋 Dominio personalizado (opcional, cuando quieras)

- [ ] Comprar dominio (ej. `urapex.gg` o `urapex.app`)
- [ ] En Vercel → **Domains** → añadir el dominio
- [ ] En Cloudflare → DNS → apuntar al dominio de Vercel
- [ ] Actualizar `AUTH_URL` y `NEXT_PUBLIC_APP_URL` en Vercel con el nuevo dominio
- [ ] Actualizar `EMAIL_FROM` en Vercel

---

*Última actualización: 2026-06-05*
