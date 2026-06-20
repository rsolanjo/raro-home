-- v114 — Versão de obra/pedreiro do Projeto Executivo
-- Guarda o HTML da versão simplificada (cabos, alturas, caixas 4×4) separada da completa.
-- O app não quebra sem rodar isto (saveProposal remove a coluna e re-tenta),
-- mas a versão de obra só PERSISTE depois de rodar este SQL uma vez.

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS exec_doc_obra TEXT;
