-- Создание схемы public, если она не существует
CREATE SCHEMA IF NOT EXISTS public;

-- Предоставление прав на схему public
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

