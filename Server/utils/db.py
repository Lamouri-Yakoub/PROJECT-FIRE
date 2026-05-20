import os
import json
import bcrypt

# Database abstraction - uses MySQL if available, falls back to JSON file

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, '..', 'assets')
USERS_FILE = os.path.join(ASSETS_DIR, 'users.json')
FIRES_FILE = os.path.join(ASSETS_DIR, 'fires.json')

_mysql_available = False
_pool = None


def _try_mysql():
    global _mysql_available, _pool
    try:
        import mysql.connector
        from mysql.connector import pooling
        DB_CONFIG = {
            'host': os.environ.get('DB_HOST', 'localhost'),
            'port': int(os.environ.get('DB_PORT', 3306)),
            'user': os.environ.get('DB_USER', 'root'),
            'password': os.environ.get('DB_PASSWORD', ''),
            'database': os.environ.get('DB_NAME', 'project_fire'),
        }
        # Try to connect
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'], port=DB_CONFIG['port'],
            user=DB_CONFIG['user'], password=DB_CONFIG['password'],
        )
        cursor = conn.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS project_fire")
        cursor.close()
        conn.close()

        _pool = pooling.MySQLConnectionPool(pool_name="fire_pool", pool_size=5, **DB_CONFIG)
        _mysql_available = True
        return True
    except Exception:
        return False


def is_mysql():
    return _mysql_available


def get_db():
    if not _mysql_available:
        raise RuntimeError("MySQL not available")
    return _pool.get_connection()


# ===== JSON FALLBACK =====

def _load_json(filepath, default):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return default


def _save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)


def get_users():
    if _mysql_available:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT id, username, email, role, language, created_at FROM users ORDER BY created_at DESC')
        users = cur.fetchall()
        cur.close(); conn.close()
        for u in users:
            if u.get('created_at'): u['created_at'] = str(u['created_at'])
        return users
    return _load_json(USERS_FILE, [])


def find_user(username):
    if _mysql_available:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT * FROM users WHERE username = %s', (username,))
        user = cur.fetchone()
        cur.close(); conn.close()
        return user
    users = _load_json(USERS_FILE, [])
    return next((u for u in users if u['username'] == username), None)


def find_user_by_id(user_id):
    if _mysql_available:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT * FROM users WHERE id = %s', (user_id,))
        user = cur.fetchone()
        cur.close(); conn.close()
        return user
    users = _load_json(USERS_FILE, [])
    return next((u for u in users if u['id'] == user_id), None)


def create_user(username, email, password_hash, role='user'):
    if _mysql_available:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s)',
                    (username, email, password_hash, role))
        conn.commit()
        uid = cur.lastrowid
        cur.close(); conn.close()
        return uid
    users = _load_json(USERS_FILE, [])
    uid = max([u['id'] for u in users], default=0) + 1
    users.append({'id': uid, 'username': username, 'email': email,
                  'password_hash': password_hash, 'role': role, 'language': 'fr'})
    _save_json(USERS_FILE, users)
    return uid


def update_user(user_id, fields):
    if _mysql_available:
        conn = get_db()
        cur = conn.cursor()
        parts = [f'{k} = %s' for k in fields]
        vals = list(fields.values()) + [user_id]
        cur.execute(f'UPDATE users SET {", ".join(parts)} WHERE id = %s', vals)
        conn.commit(); cur.close(); conn.close()
        return
    users = _load_json(USERS_FILE, [])
    for u in users:
        if u['id'] == user_id:
            u.update(fields)
    _save_json(USERS_FILE, users)


def delete_user(user_id):
    if _mysql_available:
        conn = get_db()
        cur = conn.cursor()
        cur.execute('DELETE FROM users WHERE id = %s', (user_id,))
        conn.commit(); cur.close(); conn.close()
        return
    users = _load_json(USERS_FILE, [])
    users = [u for u in users if u['id'] != user_id]
    _save_json(USERS_FILE, users)


# ===== FIRES =====

def get_fires(search='', date_from='', date_to='', page=1, per_page=50):
    if _mysql_available:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        query = 'SELECT * FROM fires WHERE 1=1'
        params = []
        if search:
            query += ' AND (forest_name LIKE %s OR daira LIKE %s OR commune LIKE %s)'
            like = f'%{search}%'
            params.extend([like, like, like])
        if date_from:
            query += ' AND fire_date >= %s'; params.append(date_from)
        if date_to:
            query += ' AND fire_date <= %s'; params.append(date_to)
        count_q = query.replace('SELECT *', 'SELECT COUNT(*) as total', 1)
        cur.execute(count_q, params)
        total = cur.fetchone()['total']
        query += ' ORDER BY fire_date DESC LIMIT %s OFFSET %s'
        params.extend([per_page, (page - 1) * per_page])
        cur.execute(query, params)
        fires = cur.fetchall()
        cur.close(); conn.close()
        for f in fires:
            if f.get('fire_date'): f['fire_date'] = str(f['fire_date'])
            if f.get('created_at'): f['created_at'] = str(f['created_at'])
        return fires, total
    # JSON fallback
    fires = _load_json(FIRES_FILE, [])
    if search:
        s = search.lower()
        fires = [f for f in fires if s in f.get('forest_name', '').lower() or s in f.get('daira', '').lower()]
    if date_from:
        fires = [f for f in fires if f.get('fire_date', '') >= date_from]
    if date_to:
        fires = [f for f in fires if f.get('fire_date', '') <= date_to]
    total = len(fires)
    start = (page - 1) * per_page
    return fires[start:start + per_page], total


def create_fire(data, user_id=None):
    if _mysql_available:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            '''INSERT INTO fires (forest_name, daira, commune, latitude, longitude,
               fire_date, surface_burned, cause, severity, notes, created_by)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''',
            (data['forest_name'], data.get('daira', ''), data.get('commune', ''),
             data.get('latitude'), data.get('longitude'), data['fire_date'],
             data.get('surface_burned', 0), data.get('cause', 'Unknown'),
             data.get('severity', 'medium'), data.get('notes', ''), user_id)
        )
        conn.commit()
        fid = cur.lastrowid
        cur.close(); conn.close()
        return fid
    fires = _load_json(FIRES_FILE, [])
    fid = max([f['id'] for f in fires], default=0) + 1
    data['id'] = fid
    data['created_by'] = user_id
    fires.append(data)
    _save_json(FIRES_FILE, fires)
    return fid


def get_fire_stats():
    if _mysql_available:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT COUNT(*) as total FROM fires')
        total = cur.fetchone()['total']
        cur.execute("SELECT COUNT(*) as count FROM fires WHERE MONTH(fire_date) = MONTH(CURDATE()) AND YEAR(fire_date) = YEAR(CURDATE())")
        this_month = cur.fetchone()['count']
        cur.execute('SELECT daira, COUNT(*) as cnt FROM fires GROUP BY daira ORDER BY cnt DESC LIMIT 1')
        row = cur.fetchone()
        top_zone = row['daira'] if row else 'N/A'
        cur.execute('SELECT severity, COUNT(*) as cnt FROM fires GROUP BY severity')
        by_severity = {r['severity']: r['cnt'] for r in cur.fetchall()}
        cur.execute('SELECT latitude, longitude, surface_burned FROM fires WHERE latitude IS NOT NULL AND longitude IS NOT NULL')
        heatmap = [{'lat': r['latitude'], 'lng': r['longitude'], 'intensity': r['surface_burned'] or 1} for r in cur.fetchall()]
        cur.close(); conn.close()
        return {'total': total, 'this_month': this_month, 'top_zone': top_zone, 'by_severity': by_severity, 'heatmap': heatmap}
    # JSON fallback
    fires = _load_json(FIRES_FILE, [])
    from datetime import datetime
    now = datetime.now()
    this_month = sum(1 for f in fires if f.get('fire_date', '').startswith(f'{now.year}-{now.month:02d}'))
    zones = {}
    for f in fires:
        d = f.get('daira', 'Unknown')
        zones[d] = zones.get(d, 0) + 1
    top_zone = max(zones, key=zones.get) if zones else 'N/A'
    sev = {}
    for f in fires:
        s = f.get('severity', 'medium')
        sev[s] = sev.get(s, 0) + 1
    heatmap = [{'lat': f['latitude'], 'lng': f['longitude'], 'intensity': f.get('surface_burned', 1)}
               for f in fires if f.get('latitude') and f.get('longitude')]
    return {'total': len(fires), 'this_month': this_month, 'top_zone': top_zone, 'by_severity': sev, 'heatmap': heatmap}


# ===== INIT =====

def init_db():
    """Initialize database. Try MySQL first, fall back to JSON."""
    if _try_mysql():
        conn = get_db()
        cur = conn.cursor()
        cur.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'user') DEFAULT 'user',
                language VARCHAR(10) DEFAULT 'fr',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cur.execute('''
            CREATE TABLE IF NOT EXISTS fires (
                id INT AUTO_INCREMENT PRIMARY KEY,
                forest_name VARCHAR(255) NOT NULL,
                daira VARCHAR(255),
                commune VARCHAR(255),
                latitude DOUBLE,
                longitude DOUBLE,
                fire_date DATE NOT NULL,
                surface_burned DOUBLE DEFAULT 0,
                cause VARCHAR(255),
                severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                notes TEXT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        ''')
        # Seed admin
        cur.execute('SELECT id FROM users WHERE username = %s', ('admin',))
        if not cur.fetchone():
            pw = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode('utf-8')
            cur.execute('INSERT INTO users (username, email, password_hash, role) VALUES (%s, %s, %s, %s)',
                        ('admin', 'admin@projectfire.dz', pw, 'admin'))
        # Seed fires
        cur.execute('SELECT COUNT(*) as c FROM fires')
        if cur.fetchone()[0] == 0:
            _seed_fires_mysql(cur)
        conn.commit(); cur.close(); conn.close()
        print("[OK] MySQL database initialized")
    else:
        print("[INFO] MySQL not available, using JSON file storage")
        _seed_json_data()


def _seed_fires_mysql(cur):
    sample = _get_sample_fires()
    cur.executemany(
        '''INSERT INTO fires (forest_name, daira, commune, latitude, longitude, fire_date, surface_burned, cause, severity, notes)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''', sample)


def _seed_json_data():
    # Seed users if not exist
    if not os.path.exists(USERS_FILE):
        pw = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode('utf-8')
        _save_json(USERS_FILE, [
            {'id': 1, 'username': 'admin', 'email': 'admin@projectfire.dz',
             'password_hash': pw, 'role': 'admin', 'language': 'fr'}
        ])
        print("[OK] Created default admin user (admin / admin123)")
    # Seed fires if not exist
    if not os.path.exists(FIRES_FILE):
        fires = []
        for i, row in enumerate(_get_sample_fires()):
            fires.append({
                'id': i + 1, 'forest_name': row[0], 'daira': row[1], 'commune': row[2],
                'latitude': row[3], 'longitude': row[4], 'fire_date': row[5],
                'surface_burned': row[6], 'cause': row[7], 'severity': row[8], 'notes': row[9]
            })
        _save_json(FIRES_FILE, fires)
        print("[OK] Seeded sample fire history data")


def _get_sample_fires():
    return [
        ('MAHOUNA', 'GUELMA', 'GUELMA', 36.45, 7.43, '2024-07-15', 120.5, 'Natural', 'high', 'Major summer fire'),
        ('BENI SALAH', 'BOUCHEGOUF', 'BOUCHEGOUF', 36.46, 7.71, '2024-08-02', 85.0, 'Human', 'critical', 'Arson suspected'),
        ('DJ DEBAGH', 'HAMMAM DEBAGH', 'HAMMAM DEBAGH', 36.47, 7.23, '2024-06-20', 45.0, 'Natural', 'medium', 'Lightning strike'),
        ('DJ HALOUF', 'GUELMA', 'AIN BEN BEIDA', 36.50, 7.35, '2024-09-10', 200.0, 'Unknown', 'critical', 'Large fire'),
        ('EL MINA', 'OUED ZENATI', 'OUED ZENATI', 36.30, 7.17, '2024-07-28', 30.0, 'Human', 'low', 'Small brush fire'),
        ('FEKIRINA', 'KHEZARAS', 'KHEZARAS', 36.41, 7.55, '2025-06-10', 95.0, 'Natural', 'high', 'Dry season fire'),
        ('SILA', 'GUELMA', 'GUELMA', 36.44, 7.40, '2025-07-05', 150.0, 'Human', 'critical', 'Agricultural fire spread'),
        ('RAGOUBA', 'BOUCHEGOUF', 'BOUCHEGOUF', 36.48, 7.68, '2025-05-15', 22.0, 'Natural', 'low', 'Minor fire'),
        ('OUED FRAGHA', 'GUELMA', 'BELKHEIR', 36.42, 7.48, '2025-08-20', 180.0, 'Unknown', 'high', 'Fire near valley'),
        ('MOUBIA', 'HAMMAM DEBAGH', 'AIN LARBI', 36.52, 7.30, '2024-08-15', 65.0, 'Human', 'medium', 'Campfire spread'),
    ]
