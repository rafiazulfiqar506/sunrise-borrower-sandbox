#!/usr/bin/env python3
"""
Sunrise Microfinance — Synthetic Borrower Data Generator

Generates entirely fake borrower records (names, mock national IDs,
mock bank account numbers, mock loan balances) and inserts them into
the sandbox PostgreSQL database. All data is randomly generated —
no real person's information is used anywhere in this script or its
output. See ../docs/Scope_Authorization.pdf for the authorized scope.
"""

import os
import random
import time
import psycopg2
import pandas as pd

RECORD_COUNT = int(os.environ.get("RECORD_COUNT", 500))

DB_HOST = os.environ.get("DB_HOST", "db")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_USER = os.environ.get("DB_USER", "sunrise")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "sunrisepass")
DB_NAME = os.environ.get("DB_NAME", "sunrise_sandbox")

FIRST_NAMES = [
    "Ayesha", "Bilal", "Sana", "Hamza", "Zainab", "Ali", "Fatima", "Usman",
    "Mariam", "Hassan", "Khadija", "Omar", "Sara", "Ahmed", "Noor", "Imran",
    "Amna", "Faisal", "Hira", "Tariq", "Lubna", "Kamran", "Rabia", "Shahid",
    "Nadia", "Waqas", "Saba", "Adeel", "Mahnoor", "Yasir"
]
LAST_NAMES = [
    "Khan", "Ahmed", "Hussain", "Malik", "Qureshi", "Butt", "Shah", "Raza",
    "Chaudhry", "Farooq", "Iqbal", "Siddiqui", "Abbasi", "Baig", "Chishti",
    "Dar", "Gill", "Hashmi", "Javed", "Kazmi"
]

def random_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def random_national_id():
    # Mock format only — NOT a real national ID format/checksum.
    return f"MOCK-{random.randint(10000,99999)}-{random.randint(1000000,9999999)}-{random.randint(1,9)}"

def random_bank_account():
    # Mock IBAN-like string — NOT a real bank account.
    return f"MOCKBANK{random.randint(10**12, 10**13 - 1)}"

def random_phone():
    return f"+92-3{random.randint(0,9)}{random.randint(0,9)}-{random.randint(1000000,9999999)}"

def random_loan_balance():
    return round(random.uniform(5000, 250000), 2)

def wait_for_db(max_attempts=20, delay=2):
    for attempt in range(1, max_attempts + 1):
        try:
            conn = psycopg2.connect(
                host=DB_HOST, port=DB_PORT, user=DB_USER,
                password=DB_PASSWORD, dbname=DB_NAME
            )
            conn.close()
            print("Database is ready.")
            return
        except psycopg2.OperationalError:
            print(f"Waiting for database... (attempt {attempt}/{max_attempts})")
            time.sleep(delay)
    raise RuntimeError("Database never became ready.")

def main():
    print(f"Generating {RECORD_COUNT} synthetic borrower records...")
    wait_for_db()

    records = []
    for _ in range(RECORD_COUNT):
        records.append({
            "full_name": random_name(),
            "national_id": random_national_id(),
            "bank_account": random_bank_account(),
            "phone": random_phone(),
            "loan_balance": random_loan_balance(),
        })

    # Use pandas purely to demonstrate structured generation / easy CSV
    # export for review — the actual DB insert uses psycopg2 directly.
    df = pd.DataFrame(records)
    csv_path = os.path.join(os.path.dirname(__file__), "generated_borrowers_preview.csv")
    df.head(20).to_csv(csv_path, index=False)
    print(f"Saved a 20-row preview to {csv_path}")

    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER,
        password=DB_PASSWORD, dbname=DB_NAME
    )
    cur = conn.cursor()

    # Idempotent-ish: don't double-seed if already populated.
    cur.execute("SELECT COUNT(*) FROM borrowers")
    existing = cur.fetchone()[0]
    if existing >= RECORD_COUNT:
        print(f"Borrowers table already has {existing} records — skipping insert.")
        cur.close()
        conn.close()
        return

    insert_query = """
        INSERT INTO borrowers (full_name, national_id, bank_account, phone, loan_balance)
        VALUES (%s, %s, %s, %s, %s)
    """
    for r in records:
        cur.execute(insert_query, (
            r["full_name"], r["national_id"], r["bank_account"],
            r["phone"], r["loan_balance"]
        ))

    conn.commit()
    cur.close()
    conn.close()
    print(f"Inserted {len(records)} synthetic borrower records into the database.")

if __name__ == "__main__":
    main()
