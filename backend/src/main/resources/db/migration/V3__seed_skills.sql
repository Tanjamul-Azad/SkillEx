-- ============================================================
-- SkillEX — Seed: Skill Catalog  V3
-- 20 skills from mockData.ts seeded so the platform works on fresh DB
-- ============================================================

INSERT IGNORE INTO skills (id, name, icon, category, description) VALUES
  (UUID(), 'Video Editing',      'Video',          'Creative',      'Edit and produce professional videos using modern tools like Premiere Pro and DaVinci Resolve'),
  (UUID(), 'Guitar',             'Music',          'Creative',      'Learn acoustic or electric guitar from beginner chords to advanced techniques'),
  (UUID(), 'Python',             'Code',           'Tech',          'Write clean Python code for automation, data science, web backends and more'),
  (UUID(), 'Figma',              'Figma',          'Design',        'Design stunning interfaces and prototypes using Figma'),
  (UUID(), 'Photography',        'Camera',         'Creative',      'Capture and edit beautiful photographs with DSLR or mirrorless cameras'),
  (UUID(), 'Public Speaking',    'Mic',            'Communication', 'Build confidence and deliver compelling presentations to any audience'),
  (UUID(), 'Data Science',       'BarChart',       'Tech',          'Analyse and visualise data using Python, pandas, matplotlib and machine learning'),
  (UUID(), 'Graphic Design',     'Palette',        'Design',        'Create logos, posters and brand identities using Adobe Illustrator and Photoshop'),
  (UUID(), 'English Writing',    'PenTool',        'Communication', 'Write clear, persuasive essays, reports and creative content in English'),
  (UUID(), 'Web Development',    'Globe',          'Tech',          'Build responsive websites with HTML, CSS, JavaScript and modern frameworks'),
  (UUID(), 'Music Production',   'Headphones',     'Creative',      'Produce original tracks using DAWs like Ableton Live or FL Studio'),
  (UUID(), '3D Modeling',        'Box',            'Design',        'Create 3D assets and animations using Blender or Maya'),
  (UUID(), 'Digital Marketing',  'TrendingUp',     'Business',      'Run impactful campaigns across social media, SEO and paid advertising'),
  (UUID(), 'French Language',    'Languages',      'Language',      'Learn French from conversational basics to business-level fluency'),
  (UUID(), 'Calligraphy',        'Edit3',          'Creative',      'Master the art of beautiful handwriting and lettering'),
  (UUID(), 'Cooking',            'ChefHat',        'Lifestyle',     'Learn to cook delicious meals from different cuisines around the world'),
  (UUID(), 'Drawing',            'Pencil',         'Creative',      'Develop drawing skills from basic sketching to detailed illustration'),
  (UUID(), 'Chess',              'Crown',          'Strategy',      'Learn chess openings, tactics and endgame strategy'),
  (UUID(), 'Excel',              'Table',          'Business',      'Master Microsoft Excel for data analysis, dashboards and automation with VBA'),
  (UUID(), 'UI/UX Design',       'Layout',         'Design',        'Design user-centred digital products with research, wireframes and usability testing');
