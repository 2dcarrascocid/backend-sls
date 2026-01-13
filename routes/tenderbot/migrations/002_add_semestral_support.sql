-- Agregar valor 'SEMESTRAL' al enum tb_periodicidad
ALTER TYPE tb_periodicidad ADD VALUE IF NOT EXISTS 'SEMESTRAL';

-- Agregar columna precio_semestral a la tabla tb_planes
ALTER TABLE tb_planes 
ADD COLUMN IF NOT EXISTS precio_semestral NUMERIC(12, 2) DEFAULT 0;

-- Opcional: Actualizar algún plan existente con precio semestral si es necesario (ejemplo)
-- UPDATE tb_planes SET precio_semestral = (precio_mensual * 6) * 0.9 WHERE precio_semestral = 0;
