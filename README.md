# Nabta – Full Stack Online Plant Store

A complete web store built for the **Full Stack Development (F0002)** course:
**React** frontend, **Node.js + Express** REST API, **MongoDB** database, tested with **Postman**,
checked by **Jenkins**, runnable on **Apache Tomcat**, and deployed on **Render**.

| Part | Folder | Tech |
|---|---|---|
| Web app (customer store + admin panel) | `client/` | React 19, React Router, Vite |
| REST API | `server/` | Node.js, Express 5, Mongoose, JWT, Multer, Nodemailer |
| Database | MongoDB (local or Atlas) | Collections: users, categories, products, orders, images, contactmessages |
| Static HTML/CSS/JS lab site | `static-site/` | Plain HTML5, CSS3, JavaScript |
| MongoDB shell labs | `server/mongo-shell/` | mongosh scripts |
| Node core-module labs | `server/labs/` | http, url, fs, events |
| API tests | `postman/` | Postman collection (40 requests, 47 tests) |
| CI / Tomcat / Render | `Jenkinsfile`, `deploy/`, `render.yaml` | Jenkins pipeline, WAR packaging, Render Blueprint |

---

## 1. Features

**Customers:** register / sign in, browse and search the catalogue, filter by category, sort, paginate,
product pages, cart (saved in the browser), checkout with cash on delivery, order tracking and cancelling,
favourites, profile and saved address, contact form, and a **Messages** page showing the store's replies.

**Admins:** dashboard with revenue, orders by status, 7-day sales chart, best sellers, revenue by category,
low-stock alerts and an activity feed. Admins can also manage products (with image upload), categories,
order statuses (pending → confirmed → shipped → delivered / cancelled), customer accounts and contact messages.
Admins reply to messages inside the app; the reply appears on the customer's Messages page and is emailed to them.

**Automation:** order confirmation and status-change emails, contact-form emails to the store, reply emails to customers,
and a daily report script.

---

## 2. Run it locally (Windows)

### Prerequisites
- **Node.js 20 or newer** – https://nodejs.org (check with `node -v`)
- **MongoDB** – either install MongoDB Community Server locally, or create a free **MongoDB Atlas** cluster (section 6)
- Optional: **mongosh** (MongoDB Shell), **Postman**, **Jenkins**, **Apache Tomcat 10**

### Step 1 – Backend
```powershell
cd server
copy .env.example .env        # then edit .env if needed (MONGODB_URI, admin login, email)
npm install
npm run seed                  # adds demo categories, products, a demo customer and sample orders
npm run dev                   # API on http://localhost:5000  (check http://localhost:5000/api/health)
```

### Step 2 – Frontend (second terminal)
```powershell
cd client
copy .env.example .env        # VITE_API_URL=http://localhost:5000
npm install
npm run dev                   # open http://localhost:5173
```

### Demo accounts
| Role | Email | Password |
|---|---|---|
| Admin | `admin@nabta.local` | `AdminPass123!` (from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env`) |
| Customer | `demo@nabta.local` | `DemoPass123` |

> The admin account is created automatically the first time the server starts.
> Change the admin password in `.env` before deploying.

### Useful scripts (`server/`)
| Command | What it does |
|---|---|
| `npm run dev` | Start the API and restart on file changes |
| `npm run debug` | Start with the Node debugger (`chrome://inspect` or VS Code "Attach") |
| `npm run seed -- --reset` | Wipe store data and reseed |
| `npm test` | Unit tests (validation & sanitization) – no database needed |
| `npm run email:test -- you@example.com` | Send a test email |
| `npm run report:daily` | Email the store a 24-hour sales + low-stock report |

---

## 3. Syllabus coverage

| Unit | Syllabus topic | Where it is in this project |
|---|---|---|
| **1** | HTML5 document structure, semantic elements | `static-site/*.html` (`header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, `figure`, `table/caption`); React pages use the same tags (`client/src/components/Header.jsx`, `Footer.jsx`, `pages/*`) |
| 1 | Forms, inputs, HTML validation attributes | `static-site/contact.html` (`required`, `minlength`, `maxlength`, `type=email/tel/number`, `pattern`, `min/max`, `select`, `fieldset/legend`); React forms in `Register.jsx`, `Checkout.jsx`, `Contact.jsx`, `AdminProducts.jsx` |
| **2** | Selectors, box model | `static-site/css/style.css` (element, class, id, attribute selectors; margin/padding/border) and `client/src/styles.css` |
| 2 | Flexbox & CSS Grid | Header/nav/toolbars use Flexbox; product grid, category grid, dashboard, cart and checkout use Grid |
| 2 | Responsive design, media queries, mobile-first | Both stylesheets: base styles for phones, `@media (min-width: …)` for 560/768/1024 px; also `prefers-reduced-motion` and `print` |
| **3** | JavaScript logic & maths, DOM | `static-site/js/main.js` (watering calculator, DOM updates, `alert`/`confirm`) |
| 3 | RegExp, secure validation & sanitization | Client: `client/src/utils/validation.js`, `static-site/js/main.js` (escaping, tag stripping). Server: `server/src/utils/validate.js` (sanitizeText, escapeRegex for safe search, ObjectId checks against NoSQL injection) |
| 3 | Node.js core, modules, HTTP module | `server/src/server.js` (`http.createServer`), `server/labs/01-http-url-fs.js` (server with no Express) |
| 3 | File System, URL module | `server/src/services/activityLog.js` (append/read log file), `mailer.js` (reads HTML templates, writes email files); URL module in `config/env.js` and the pagination `next` link in `routes/products.js` |
| 3 | Events | `server/src/services/events.js` (`EventEmitter`: order placed → email + log), `server/labs/02-events.js` |
| 3 | Upload files | `server/src/routes/images.js` (Multer, type/size limits, file-signature check), admin product form |
| 3 | Email automation | `server/src/services/mailer.js` (Nodemailer), order/contact emails, `scripts/daily-report.js` |
| 3 | Debugger | `npm run debug` (`node --inspect`) |
| **4** | SQL vs NoSQL, MongoDB setup, create/drop DB | `server/mongo-shell/01-create-drop.js` |
| 4 | CRUD | REST endpoints for every collection + `mongo-shell/02-crud.js` |
| 4 | Data modelling, one-to-one, one-to-many, many-to-many | `server/src/models/*`: user ↔ address (embedded 1-1), category → products (1-many, referenced), message → replies (1-many, embedded), users ↔ products favourites (many-many); `mongo-shell/03-relationships.js` |
| 4 | Aggregation, indexes, storage, replication | Dashboard pipelines in `routes/admin.js` (`$group`, `$unwind`, `$lookup`, `$dateToString`); indexes in every model; `mongo-shell/04-aggregation-indexes.js` (explain plan, `db.stats()`, replica-set check) |
| 4 | MongoDB Atlas | Section 6 below – the deployed app runs on Atlas |
| **CO2** | React components & hooks | `useState`, `useEffect`, `useContext`, `useReducer` (cart), `useMemo`, `useCallback`, `useRef`; custom hooks `useFetch`, `useDebounce`, `useDocumentTitle` |
| **CO3** | REST API with Express, tested in Postman | `server/src/routes/*`, `postman/Nabta.postman_collection.json` |
| **5** | Git | Repository with `.gitignore` (section 7) |
| 5 | Jenkins | `Jenkinsfile` – install, syntax check, unit tests, frontend build, WAR package, optional Tomcat deploy |
| 5 | Apache Tomcat | `deploy/build-war.ps1` / `build-war.sh` + `deploy/tomcat/WEB-INF/web.xml` |
| **6** | Login & registration | JWT auth (`routes/auth.js`, `middleware/auth.js`), bcrypt hashing, role-based admin routes |
| 6 | Environment variables | `server/.env.example`, `client/.env.example`, `config/env.js` |
| 6 | Render deployment (backend + frontend) | `render.yaml` + section 6 |

---

## 4. Testing the API with Postman
1. Start the server and run `npm run seed`.
2. In Postman, choose **Import** and select `postman/Nabta.postman_collection.json`.
3. Open the collection's **Variables** tab. Set `baseUrl` to `http://localhost:5000` (or your Render URL), and make `adminEmail` / `adminPassword` match `.env`.
4. Click **Run collection**. Requests run in order and save tokens and IDs automatically, and all 47 tests should pass.
   Command-line alternative: `postman collection run postman/Nabta.postman_collection.json` (Postman CLI) or `npx newman run postman/Nabta.postman_collection.json`.
5. For the upload request, choose an image in the **Body → form-data → image** field.

---

## 5. MongoDB shell labs
With `mongosh` installed and the database seeded:
```powershell
cd server
mongosh "mongodb://127.0.0.1:27017" mongo-shell/01-create-drop.js
mongosh "mongodb://127.0.0.1:27017/nabta" mongo-shell/02-crud.js
mongosh "mongodb://127.0.0.1:27017/nabta" mongo-shell/03-relationships.js
mongosh "mongodb://127.0.0.1:27017/nabta" mongo-shell/04-aggregation-indexes.js
```
For Atlas, replace the connection string with your `mongodb+srv://…` URI.

Node core-module labs: `node labs/01-http-url-fs.js` (open http://localhost:3001/?name=Nabta) and `node labs/02-events.js`.
Static site: open `static-site/index.html` in a browser.

---

## 6. Deploy live (MongoDB Atlas + Render)

### 6.1 MongoDB Atlas
1. Sign up at https://www.mongodb.com/cloud/atlas and create a free **M0** cluster.
2. Under **Database Access**, add a database user and password.
3. Under **Network Access**, add `0.0.0.0/0`. Render's free IP addresses change, so you can't list one fixed IP.
4. Click **Connect → Drivers** and copy the URI. Add the database name before the `?`:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/nabta?retryWrites=true&w=majority`
5. Optional: seed Atlas from your PC. Put that URI in `server/.env` as `MONGODB_URI`, run `npm run seed`, then switch `.env` back.

### 6.2 Render
1. Push this project to GitHub.
2. On https://render.com, choose **New → Blueprint**, pick the repository, and Render reads `render.yaml`.
3. When asked, fill in:
   - `MONGODB_URI`: your Atlas URI
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD`: your admin login (password of 10+ characters)
   - `CLIENT_URL`: the frontend URL, e.g. `https://nabta-web.onrender.com`
   - `VITE_API_URL` (on nabta-web): the backend URL, e.g. `https://nabta-api.onrender.com`
   - SMTP values: optional (see 6.3)
4. Deploy. Render's service names may get a suffix, so if the URLs differ, update `CLIENT_URL` and `VITE_API_URL`. Then use **Manual Deploy → Clear build cache & deploy** on the frontend, because Vite builds the API URL into the site.
5. Test: open `https://<api>/api/health`, then the frontend URL. Run the Postman collection with `baseUrl` set to the API URL.

**Debugging deployment issues**
| Symptom | Fix |
|---|---|
| Frontend says "Cannot reach the Nabta server" | Check `VITE_API_URL` on nabta-web and redeploy it. The first request to a sleeping free API can take ~50 s |
| Browser console shows a CORS error | `CLIENT_URL` on nabta-api must exactly match the frontend address (https, no trailing slash) |
| API logs show `MongoServerSelectionError` | Atlas Network Access is missing `0.0.0.0/0`, or the user/password in the URI is wrong (URL-encode special characters) |
| API crashes with `JWT_SECRET must be at least 32 characters` | Leave `generateValue: true` in `render.yaml` or set a long value |
| Can't sign in as admin | The admin is created only if that email doesn't exist yet and the password has 10+ characters. Check the logs for "Admin account created" |

### 6.3 Real emails (optional)
With Gmail, turn on 2-Step Verification and create an **App password**. Then set:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=yourname@gmail.com
SMTP_PASS=<16-character app password>
MAIL_FROM="Nabta Store <yourname@gmail.com>"
STORE_EMAIL=yourname@gmail.com
```
Without SMTP settings, every email is saved as an HTML file in `server/logs/emails/`, so you can still demo the feature offline.

---

## 7. Git, Jenkins and Tomcat

### Git
```powershell
git init
git add .
git commit -m "Nabta full stack store"
git branch -M main
git remote add origin https://github.com/<you>/nabta-fullstack.git
git push -u origin main
```
`.gitignore` already keeps `node_modules`, builds, `.env` files and logs out of the repository.
For the master/child repository lab, create a feature branch (`git checkout -b feature/x`), commit, push it, and merge it back through a pull request.

### Jenkins
1. Install Jenkins and Node.js 20+ on the same machine. With the **Pipeline** and **Git** plugins (part of the suggested plugins), create a **Pipeline** job.
2. Choose **Pipeline script from SCM** → Git → your repo URL → Script Path `Jenkinsfile`.
3. Click **Build with Parameters**. The pipeline installs dependencies, syntax-checks the backend, runs the unit tests, builds React and packages `nabta.war`.
4. Tick **DEPLOY_TO_TOMCAT** and set **TOMCAT_HOME** to also copy the WAR into Tomcat. A green build means the code is safe to push.

### Apache Tomcat (local)
1. Install Tomcat 10 (version 8+ also works) and start it (`bin\startup.bat`).
2. From the project root:
   ```powershell
   powershell -ExecutionPolicy Bypass -File deploy\build-war.ps1 -TomcatHome "C:\apache-tomcat-10.1.30"
   ```
3. Open http://localhost:8080/nabta/. Tomcat serves the React app, and the Node API keeps running on port 5000.
   `CLIENT_URL` in `server/.env` already includes `http://localhost:8080`.

---

## 8. Project structure
```
nabta-fullstack/
├── client/                 React app (Vite)
│   └── src/
│       ├── api.js          fetch wrapper (token, errors)
│       ├── context/        Auth, Cart (useReducer), Favourites, Toast providers
│       ├── hooks/          useFetch, useDebounce, useDocumentTitle
│       ├── components/     Header, Footer, ProductCard, ProtectedRoute, ui
│       ├── pages/          store pages + admin/ pages
│       └── styles.css      mobile-first responsive styles
├── server/                 Express API
│   ├── src/
│   │   ├── server.js       http.createServer + startup
│   │   ├── app.js          middleware + routes
│   │   ├── config/         env + MongoDB connection
│   │   ├── models/         Mongoose schemas
│   │   ├── routes/         auth, categories, products, orders, favorites, images, contact, admin
│   │   ├── middleware/     JWT auth, error handler
│   │   ├── services/       events, mailer, activity log
│   │   ├── templates/      email HTML templates
│   │   └── utils/          validation & sanitization
│   ├── scripts/            seed, test email, daily report
│   ├── labs/               plain Node http/url/fs and events labs
│   ├── mongo-shell/        mongosh lab scripts
│   └── test/               unit tests (node:test)
├── static-site/            plain HTML/CSS/JS multi-page site (Units 1-3)
├── postman/                Postman collection
├── deploy/                 Tomcat WAR build scripts + web.xml
├── Jenkinsfile
└── render.yaml
```

---

## 9. API reference (summary)
| Method | Path | Access |
|---|---|---|
| GET | `/api/health` | public |
| POST | `/api/auth/register`, `/api/auth/login` | public |
| GET/PUT | `/api/auth/me`, PUT `/api/auth/me/password` | signed in |
| GET | `/api/categories` · `/api/products` (q, category, minPrice, maxPrice, inStock, sort, page, limit) · `/api/products/:id` | public |
| POST/PUT/DELETE | `/api/categories[/:id]`, `/api/products[/:id]`, PATCH `/api/products/:id/stock` | admin |
| POST | `/api/orders` · GET `/api/orders/mine` · GET `/api/orders/:id` · PATCH `/api/orders/:id/cancel` | customer |
| GET | `/api/orders` · PATCH `/api/orders/:id/status` | admin |
| GET/POST/DELETE | `/api/favorites[/:productId]` | signed in |
| POST | `/api/images` (multipart, field `image`) | admin |
| GET | `/api/images/:id` | public |
| POST | `/api/contact` (linked to the account when signed in) | public |
| GET | `/api/contact/mine` (the customer's messages + replies) | signed in |
| GET | `/api/admin/stats`, `/low-stock`, `/users`, `/messages`, `/activity` · PATCH `/users/:id`, `/messages/:id/read` · POST `/messages/:id/reply` · DELETE `/messages/:id` | admin |

Errors always look like `{ "error": { "status": 400, "message": "...", "details": { "field": "reason" } } }`.
