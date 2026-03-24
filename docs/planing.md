## QuizBattle – Konzeptdokument

### Produktvision

QuizBattle ist eine webbasierte Multiplayer-Quiz-Plattform mit zwei Spielmodi: einem entspannten asynchronen Modus à la *Quizduell* und einem kompetitiven Echtzeit-Ranked-Modus. Registrierte Nutzer bauen über Matchhistory und Leaderboard eine persistente Spieler-Identität auf.

---

### Spielmodi im Detail

**Unranked (Casual Duel)**
Zwei Spieler erhalten dieselben 10 Fragen aus einer zufälligen Kategorie-Mischung. Jeder spielt in seinem eigenen Tempo – die 10-Minuten-Frist läuft ab Matchbeginn. Am Ende wird verglichen, wer mehr richtige Antworten hatte. Kein Matchmaking-Druck, kein Rangverlust.

**Ranked (Best-of-Five-Battle)**
Fünf Runden, jede Runde besteht aus 3 Fragen einer gewählten Kategorie. Der Verlierer der letzten Runde wählt die nächste Kategorie aus drei vorgeschlagenen Optionen.

---

**user**

| Spalte | Typ | Constraint |
|---|---|---|
| id | uuid | PK |
| username | varchar(50) | NOT NULL, UNIQUE |
| password_hash | varchar | NOT NULL |
| created_at | timestamp | DEFAULT now() |

---

**session**

| Spalte | Typ | Constraint |
|---|---|---|
| id | uuid | PK |
| mode | enum('ranked','unranked') | NOT NULL |
| status | enum('waiting','active','finished') | NOT NULL |
| used_categories | json | |
| started_at | timestamp | |
| finished_at | timestamp | |

---

**match_participant**

| Spalte | Typ | Constraint |
|---|---|---|
| id | uuid | PK |
| session_id | uuid | FK → session.id |
| user_id | uuid | FK → user.id |
| score | int | DEFAULT 0 |
| rounds_won | int | DEFAULT 0 |
| is_category_picker | boolean | DEFAULT false |

---

**session_question**

| Spalte | Typ | Constraint |
|---|---|---|
| id | uuid | PK |
| session_id | uuid | FK → session.id |
| question_id | uuid | FK → question_cache.id |
| round_number | int | NOT NULL |
| category | varchar | NOT NULL |

---

**question_cache**

| Spalte | Typ | Constraint |
|---|---|---|
| id | uuid | PK |
| external_id | varchar | UNIQUE |
| question_text | text | NOT NULL |
| answers | json | NOT NULL |
| correct_answer | varchar | NOT NULL |
| category | varchar | NOT NULL |
| difficulty | varchar | |
| cached_at | timestamp | DEFAULT now() |

---

**leaderboard_entry**

| Spalte | Typ | Constraint |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → user.id, UNIQUE |
| elo_rating | int | DEFAULT 1000 |
| wins | int | DEFAULT 0 |
| losses | int | DEFAULT 0 |
| total_matches | int | DEFAULT 0 |
| updated_at | timestamp | DEFAULT now() |

---

### Session-Flow (Ranked)---

![Ranked](./images/ranked_session_flow.svg)


### Technische Ergänzungen

**Fragen-Caching:** Die-trivia-api.com-Antworten werden in `QUESTION_CACHE` gespeichert. Vor jedem API-Call prüft das Backend, ob ausreichend ungenutzte Fragen der gewünschten Kategorie im Cache liegen. Das reduziert Latenz und API-Ratenlimits.

**Matchmaking:** Für Unranked reicht eine einfache Queue (FIFO). Für Ranked bietet sich ELO-basiertes Matching an – Spieler werden innerhalb eines Toleranzfensters (±150 ELO) gematcht, das sich nach 30 Sekunden Wartezeit erweitert.

**Echtzeit-Kommunikation:** Für den Ranked-Modus empfiehlt sich WebSocket (z. B. Socket.io), damit beide Spieler synchron sehen, wann der Gegner eine Frage beantwortet hat. Unranked kann rein HTTP-basiert laufen.

**Auth:** JWT-Tokens für Session-Management, Passwörter mit bcrypt gehasht.

