INSERT INTO skills (id, name, icon, category, description)
SELECT UUID(),
       'Connection Meeting',
       'CalendarDays',
       'General',
       'A direct meeting arranged between accepted connections.'
WHERE NOT EXISTS (
    SELECT 1 FROM skills WHERE name = 'Connection Meeting'
);
