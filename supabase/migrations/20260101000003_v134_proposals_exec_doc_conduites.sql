-- v134: coluna para salvar o Relatório de Conduítes (HTML)
-- Rode uma vez no SQL Editor do Supabase. O app funciona sem isso (salva resiliente),
-- mas o relatório de conduítes só PERSISTE ao reabrir se a coluna existir.
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS exec_doc_conduites TEXT;
