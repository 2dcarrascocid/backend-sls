ALTER TABLE IF EXISTS tb_pagos 
ADD COLUMN IF NOT EXISTS email_notificado_en timestamptz;
