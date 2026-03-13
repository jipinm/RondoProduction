-- Create why_rondo_sports table
CREATE TABLE IF NOT EXISTS why_rondo_sports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR(255) NOT NULL,
    position_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT UNSIGNED,
    updated_by BIGINT UNSIGNED,
    FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial data based on current static component
INSERT INTO why_rondo_sports (title, description, icon_url, position_order, status) VALUES
('Where Live Lives', 'Get immediate access to tickets for the most anticipated sports events worldwide.', '/images/icons/why-rondo-1.png', 1, 'active'),
('Experience the Atmosphere', 'Secure your seat for a spectacular view and an unforgettable experience.', '/images/icons/why-rondo-2.png', 2, 'active'),
('Official Reseller', 'We work closely with official venues to ensure authentic experiences.', '/images/icons/why-rondo-3.png', 3, 'active');
