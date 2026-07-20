-- v237 — Visita à Obra (opcional, ativa sincronia entre celular e desktop).
-- Sem esta coluna o app usa localStorage (funciona no mesmo aparelho).
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS visita jsonb;
