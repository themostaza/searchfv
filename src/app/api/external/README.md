# API Esterne - Prodotti e Manuali

Queste API sono protette da token di autenticazione e permettono operazioni CRUD sulle tabelle `prodotti` e `manuali`.

## Autenticazione

Tutte le richieste devono includere un header Authorization:
```
Authorization: Bearer a6e3723199a83dfdba8bcac0ac4c57927de93099714fa29c568aa25d48bca9e0
```

esempio
curl -X POST \
  -H "Authorization: Bearer a6e3723199a83dfdba8bcac0ac4c57927de93099714fa29c568aa25d48bca9e0" \
  -H "Content-Type: application/json" \
  -d '[{"serial_number": "ABC123", "codice_manuale": "MVC_STD", "revisione_code": "001"}]' \
  https://searchfv.vercel.app/api/external/prodotti


## API Prodotti

### GET /api/external/prodotti
Recupera lista prodotti con filtri opzionali.

**Query Parameters:**
- `serial_number` (string, optional): Filtra per numero seriale (like search)
- `codice_manuale` (string, optional): Filtra per codice manuale (like search)
- `revisione_code` (string, optional): Filtra per codice revisione (like search)
- `limit` (number, optional): Limita numero risultati
- `offset` (number, optional): Offset per paginazione

**Response:**
```json
{
  "data": [...],
  "count": 10,
  "filters": {
    "serial_number": "ABC123",
    "codice_manuale": "MVC_STD",
    "revisione_code": "001"
  }
}
```

### POST /api/external/prodotti
Creazione bulk di prodotti con controllo duplicati.

**Body:** Array di oggetti prodotto o singolo oggetto
```json
[
  {
    "serial_number": "ABC123",
    "codice_manuale": "MVC_STD",
    "revisione_code": "001"
  }
]
```

**Response:**
```json
{
  "success": [...],
  "errors": [...],
  "summary": {
    "total": 5,
    "created": 3,
    "errors": 1,
    "skipped": 1
  }
}
```

### GET /api/external/prodotti/[id]
Recupera singolo prodotto per ID.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "serial_number": "ABC123",
    "codice_manuale": "MVC_STD",
    "revisione_code": "001",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

## API Manuali

### GET /api/external/manuali
Recupera lista manuali con filtri opzionali.

**Query Parameters:**
- `codice_manuale` (string, optional): Filtra per codice manuale (like search)
- `lingua` (string, optional): Filtra per lingua (like search)
- `revisione_code` (string, optional): Filtra per codice revisione (like search)
- `name` (string, optional): Filtra per nome (like search)
- `limit` (number, optional): Limita numero risultati
- `offset` (number, optional): Offset per paginazione

### POST /api/external/manuali
Creazione bulk di manuali con controllo duplicati.

**Body:** Array di oggetti manuale o singolo oggetto
```json
[
  {
    "codice_manuale": "MVC_STD",
    "lingua": "IT",
    "revisione_code": "001",
    "name": "Manuale Standard",
    "descrizione": "Manuale completo per ventilatore",
    "file_url": "https://..."
  }
]
```

### GET /api/external/manuali/[id]
Recupera singolo manuale per ID.

## Controllo Duplicati

### Prodotti
Un prodotto è considerato duplicato se ha gli stessi valori per:
- `serial_number`
- `codice_manuale` 
- `revisione_code`

### Manuali
Un manuale è considerato duplicato se ha gli stessi valori per:
- `codice_manuale`
- `lingua`
- `revisione_code`

## Codici di Errore

- `401`: Token di autenticazione mancante o non valido
- `400`: Errore nei parametri della richiesta
- `404`: Risorsa non trovata
- `500`: Errore interno del server

## Esempi di Utilizzo

### Creare prodotti in bulk
```bash
curl -X POST \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "serial_number": "ABC123",
      "codice_manuale": "MVC_STD",
      "revisione_code": "001"
    },
    {
      "serial_number": "DEF456",
      "codice_manuale": "ROLLOUT",
      "revisione_code": "002"
    }
  ]' \
  http://localhost:3000/api/external/prodotti
```

### Filtrare prodotti
```bash
curl -H "Authorization: Bearer your-secret-token" \
  "http://localhost:3000/api/external/prodotti?serial_number=ABC&limit=10"
```

### Recuperare singolo prodotto
```bash
curl -H "Authorization: Bearer your-secret-token" \
  "http://localhost:3000/api/external/prodotti/uuid-here"
```
