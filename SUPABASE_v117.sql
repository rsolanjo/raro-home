-- v117 — Documento Elétrico separado (planta NBR 5444 + cobertura Wi-Fi)
-- Guarda o HTML da versão Elétrica do Projeto Executivo, separada da Completa e da Obra.
-- O app não quebra sem rodar isto (saveProposal remove a coluna e re-tenta),
-- mas a versão Elétrica só PERSISTE depois de rodar este SQL uma vez.

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS exec_doc_eletrica TEXT;
