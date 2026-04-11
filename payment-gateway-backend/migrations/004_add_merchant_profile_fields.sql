ALTER TABLE merchants
ADD COLUMN website VARCHAR(255),
ADD COLUMN industry VARCHAR(100),
ADD COLUMN tax_id VARCHAR(100),
ADD COLUMN gst_number VARCHAR(100),
ADD COLUMN address_street TEXT,
ADD COLUMN address_city VARCHAR(100),
ADD COLUMN address_state VARCHAR(100),
ADD COLUMN address_country VARCHAR(100),
ADD COLUMN address_postal_code VARCHAR(50);
