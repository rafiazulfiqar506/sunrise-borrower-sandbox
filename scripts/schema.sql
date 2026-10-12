CREATE TABLE IF NOT EXISTS borrowers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    national_id VARCHAR(20) NOT NULL,
    bank_account VARCHAR(30) NOT NULL,
    phone VARCHAR(20),
    loan_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
